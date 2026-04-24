import { getSessionFromCookieHeader } from '@/lib/auth';
import { getRazorpayOrderRecord, updateRazorpayOrderRecord } from '@/lib/payment-store';
import { fetchRazorpayPayment, verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import {
  ApiRouteError,
  assertAllowedOrigin,
  assertContentLength,
  assertJsonContentType,
  assertRateLimit,
  getClientIp,
  normalizeApiError,
  secureJson,
  withRateLimitHeaders,
} from '@/lib/security';

const VERIFY_BODY_LIMIT_BYTES = 4 * 1024;

export const runtime = 'nodejs';

type RateLimitSnapshot = {
  limit: number;
  remaining: number;
  resetAt: number;
};

export async function POST(request: Request) {
  let rateLimit: RateLimitSnapshot | undefined;

  try {
    assertAllowedOrigin(request);
    assertJsonContentType(request);
    assertContentLength(request, VERIFY_BODY_LIMIT_BYTES);
    rateLimit = assertRateLimit({
      bucket: 'checkout-verify',
      identifier: getClientIp(request),
      maxRequests: 20,
      windowMs: 60_000,
    });

    const session = getSessionFromCookieHeader(request.headers.get('cookie'));

    if (!session || session.role !== 'user') {
      throw new ApiRouteError('Please sign in before verifying payment.', 401);
    }

    const body = (await request.json()) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    const orderId = String(body.razorpay_order_id ?? '').trim();
    const paymentId = String(body.razorpay_payment_id ?? '').trim();
    const signature = String(body.razorpay_signature ?? '').trim();

    if (!orderId || !paymentId || !signature) {
      throw new ApiRouteError('Missing payment verification fields.', 400);
    }

    const orderRecord = await getRazorpayOrderRecord(orderId);

    if (!orderRecord) {
      throw new ApiRouteError('Payment session expired. Please start checkout again.', 404);
    }

    if (orderRecord.userId !== session.subject) {
      throw new ApiRouteError('This payment session does not belong to your account.', 403);
    }

    if (orderRecord.expiresAt <= Date.now()) {
      throw new ApiRouteError('Payment session expired. Please start checkout again.', 410);
    }

    if (!verifyRazorpayPaymentSignature({ orderId: orderRecord.orderId, paymentId, signature })) {
      throw new ApiRouteError('Invalid payment signature.', 400);
    }

    const payment = await fetchRazorpayPayment(paymentId);

    if (payment.order_id !== orderRecord.orderId) {
      throw new ApiRouteError('Payment order mismatch detected.', 400);
    }

    if (payment.amount !== orderRecord.amount || payment.currency !== orderRecord.currency) {
      throw new ApiRouteError('Payment amount mismatch detected.', 400);
    }

    if (payment.status !== 'authorized' && payment.status !== 'captured') {
      throw new ApiRouteError('Payment was not successfully authorized.', 400);
    }

    await updateRazorpayOrderRecord({
      ...orderRecord,
      status: payment.status,
      paymentId,
      updatedAt: new Date().toISOString(),
    });

    const response = secureJson({
      redirectUrl: `/checkout/success?order_id=${encodeURIComponent(orderRecord.orderId)}&payment_id=${encodeURIComponent(paymentId)}`,
    });

    return rateLimit ? withRateLimitHeaders(response, rateLimit) : response;
  } catch (error) {
    const { message, status } = normalizeApiError(error, 'Unable to verify payment right now.');
    const response = secureJson({ error: message }, { status });
    return rateLimit ? withRateLimitHeaders(response, rateLimit) : response;
  }
}
