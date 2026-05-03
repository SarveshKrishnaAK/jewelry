import { NextResponse } from 'next/server';

import { finalizeRazorpayPayment } from '@/lib/razorpay-checkout';
import { ApiRouteError, assertContentLength, normalizeApiError } from '@/lib/security';
import { getBaseUrl } from '@/lib/site';

const CALLBACK_BODY_LIMIT_BYTES = 16 * 1024;

export const runtime = 'nodejs';

function buildRedirect(pathname: string, searchParams?: Record<string, string>) {
  const url = new URL(pathname, getBaseUrl());

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

export async function POST(request: Request) {
  try {
    assertContentLength(request, CALLBACK_BODY_LIMIT_BYTES);

    const formData = await request.formData();
    const orderId = String(formData.get('razorpay_order_id') ?? '').trim();
    const paymentId = String(formData.get('razorpay_payment_id') ?? '').trim();
    const signature = String(formData.get('razorpay_signature') ?? '').trim();

    if (!orderId || !paymentId || !signature) {
      throw new ApiRouteError('Missing payment verification fields.', 400);
    }

    const result = await finalizeRazorpayPayment({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    });

    return NextResponse.redirect(buildRedirect(result.redirectPath), 303);
  } catch (error) {
    const { message } = normalizeApiError(error, 'Unable to verify payment right now.');
    return NextResponse.redirect(buildRedirect('/checkout', { error: message }), 303);
  }
}
