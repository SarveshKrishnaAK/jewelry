import { deriveOrderStatus, getOrderById, updateOrderRecord } from '@/lib/order-store';
import { getRazorpayOrderRecord, updateRazorpayOrderRecord } from '@/lib/payment-store';
import { fetchRazorpayPayment, verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { ApiRouteError } from '@/lib/security';
import type { RazorpayPaymentStatus } from '@/lib/types';

type FinalizeRazorpayPaymentParams = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  userId?: string;
};

type SuccessfulPaymentStatus = Extract<RazorpayPaymentStatus, 'authorized' | 'captured'>;

export function buildCheckoutSuccessPath({
  storeOrderId,
  paymentStatus,
}: {
  storeOrderId: string;
  paymentStatus: SuccessfulPaymentStatus;
}) {
  const url = new URL('/checkout/success', 'http://localhost:3000');
  url.searchParams.set('order_id', storeOrderId);
  url.searchParams.set('payment_status', paymentStatus);
  return `${url.pathname}${url.search}`;
}

export async function finalizeRazorpayPayment({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  userId,
}: FinalizeRazorpayPaymentParams) {
  const orderRecord = await getRazorpayOrderRecord(razorpayOrderId);

  if (!orderRecord) {
    throw new ApiRouteError('Payment session expired. Please start checkout again.', 404);
  }

  if (userId && orderRecord.userId !== userId) {
    throw new ApiRouteError('This payment session does not belong to your account.', 403);
  }

  if (orderRecord.expiresAt <= Date.now()) {
    throw new ApiRouteError('Payment session expired. Please start checkout again.', 410);
  }

  if (
    !verifyRazorpayPaymentSignature({
      orderId: orderRecord.orderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    })
  ) {
    throw new ApiRouteError('Invalid payment signature.', 400);
  }

  const payment = await fetchRazorpayPayment(razorpayPaymentId);

  if (payment.order_id !== orderRecord.orderId) {
    throw new ApiRouteError('Payment order mismatch detected.', 400);
  }

  if (payment.amount !== orderRecord.amount || payment.currency !== orderRecord.currency) {
    throw new ApiRouteError('Payment amount mismatch detected.', 400);
  }

  if (payment.status !== 'authorized' && payment.status !== 'captured') {
    throw new ApiRouteError('Payment was not successfully authorized.', 400);
  }

  const updatedAt = new Date().toISOString();

  await updateRazorpayOrderRecord({
    ...orderRecord,
    status: payment.status,
    paymentId: razorpayPaymentId,
    failureReason: undefined,
    updatedAt,
  });

  const storedOrder = await getOrderById(orderRecord.storeOrderId);

  if (storedOrder) {
    await updateOrderRecord({
      ...storedOrder,
      paymentStatus: payment.status,
      status: deriveOrderStatus({
        paymentStatus: payment.status,
        fulfillmentStatus: storedOrder.fulfillmentStatus,
        failureReason: undefined,
      }),
      paymentId: razorpayPaymentId,
      failureReason: undefined,
      updatedAt,
      paidAt: payment.status === 'captured' ? storedOrder.paidAt ?? updatedAt : storedOrder.paidAt,
    });
  }

  return {
    storeOrderId: orderRecord.storeOrderId,
    paymentStatus: payment.status,
    redirectPath: buildCheckoutSuccessPath({
      storeOrderId: orderRecord.storeOrderId,
      paymentStatus: payment.status,
    }),
  };
}
