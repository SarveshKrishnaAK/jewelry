import { deriveOrderStatus, getOrderById, getOrderByRazorpayOrderId, updateOrderRecord } from '@/lib/order-store';
import { getRazorpayOrderRecord, isWebhookEventProcessed, markWebhookEventProcessed, updateRazorpayOrderRecord } from '@/lib/payment-store';
import { isRazorpayWebhookConfigured, verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import {
  ApiRouteError,
  assertContentLength,
  assertJsonContentType,
  assertRateLimit,
  getClientIp,
  normalizeApiError,
  secureJson,
  withRateLimitHeaders,
} from '@/lib/security';

const WEBHOOK_BODY_LIMIT_BYTES = 256 * 1024;

export const runtime = 'nodejs';

type RateLimitSnapshot = {
  limit: number;
  remaining: number;
  resetAt: number;
};

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    order?: {
      entity?: {
        id?: string;
      };
    };
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: 'authorized' | 'captured' | 'failed';
        error_description?: string | null;
      };
    };
  };
};

export async function POST(request: Request) {
  let rateLimit: RateLimitSnapshot | undefined;

  try {
    assertJsonContentType(request);
    assertContentLength(request, WEBHOOK_BODY_LIMIT_BYTES);
    rateLimit = assertRateLimit({
      bucket: 'razorpay-webhook',
      identifier: getClientIp(request),
      maxRequests: 120,
      windowMs: 60_000,
    });

    const signature = request.headers.get('x-razorpay-signature');
    const eventId = request.headers.get('x-razorpay-event-id');

    if (!isRazorpayWebhookConfigured() || !signature) {
      throw new ApiRouteError('Razorpay webhook secret or signature is missing.', 400);
    }

    if (eventId && (await isWebhookEventProcessed(eventId))) {
      const duplicateResponse = secureJson({ received: true, duplicate: true });
      return rateLimit ? withRateLimitHeaders(duplicateResponse, rateLimit) : duplicateResponse;
    }

    const rawBody = await request.text();

    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      throw new ApiRouteError('Invalid Razorpay webhook signature.', 400);
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const orderId = payload.payload?.payment?.entity?.order_id ?? payload.payload?.order?.entity?.id;
    const paymentId = payload.payload?.payment?.entity?.id;
    const paymentStatus = payload.payload?.payment?.entity?.status;

    if (orderId) {
      const orderRecord = await getRazorpayOrderRecord(orderId);
      const storedOrder =
        (orderRecord ? await getOrderById(orderRecord.storeOrderId) : null) ?? (await getOrderByRazorpayOrderId(orderId));

      if (orderRecord) {
        const nextStatus =
          payload.event === 'order.paid' || payload.event === 'payment.captured'
            ? 'captured'
            : payload.event === 'payment.authorized'
              ? 'authorized'
              : payload.event === 'payment.failed'
                ? 'failed'
                : orderRecord.status;

        await updateRazorpayOrderRecord({
          ...orderRecord,
          status: nextStatus,
          paymentId: paymentId ?? orderRecord.paymentId,
          failureReason:
            payload.event === 'payment.failed'
              ? payload.payload?.payment?.entity?.error_description ?? 'Payment failed at Razorpay.'
              : undefined,
          updatedAt: new Date().toISOString(),
        });
      }

      if (storedOrder) {
        const nextPaymentStatus =
          payload.event === 'order.paid' || payload.event === 'payment.captured'
            ? 'captured'
            : payload.event === 'payment.authorized'
              ? 'authorized'
              : payload.event === 'payment.failed'
                ? 'failed'
                : storedOrder.paymentStatus;
        const failureReason =
          payload.event === 'payment.failed'
            ? payload.payload?.payment?.entity?.error_description ?? 'Payment failed at Razorpay.'
            : undefined;
        const updatedAt = new Date().toISOString();

        await updateOrderRecord({
          ...storedOrder,
          paymentStatus: nextPaymentStatus,
          status: deriveOrderStatus({
            paymentStatus: nextPaymentStatus,
            fulfillmentStatus: storedOrder.fulfillmentStatus,
            failureReason,
          }),
          paymentId: paymentId ?? storedOrder.paymentId,
          failureReason,
          updatedAt,
          paidAt: nextPaymentStatus === 'captured' ? storedOrder.paidAt ?? updatedAt : storedOrder.paidAt,
        });
      }
    }

    if (eventId) {
      await markWebhookEventProcessed(eventId);
    }

    console.info('Razorpay webhook processed.', {
      event: payload.event,
      eventId,
      paymentStatus,
    });

    const response = secureJson({ received: true });
    return rateLimit ? withRateLimitHeaders(response, rateLimit) : response;
  } catch (error) {
    const { message, status } = normalizeApiError(error, 'Unable to process Razorpay webhook.');
    const response = secureJson({ error: message }, { status });
    return rateLimit ? withRateLimitHeaders(response, rateLimit) : response;
  }
}
