import { getSessionFromCookieHeader } from '@/lib/auth';
import { finalizeRazorpayPayment } from '@/lib/razorpay-checkout';
import {
  ApiRouteError,
  assertAllowedOrigin,
  assertContentLength,
  assertJsonContentType,
  assertRateLimit,
  assertSameSiteBrowserRequest,
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
    assertSameSiteBrowserRequest(request);
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

    const result = await finalizeRazorpayPayment({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      userId: session.subject,
    });

    const response = secureJson({
      redirectUrl: result.redirectPath,
    });

    return rateLimit ? withRateLimitHeaders(response, rateLimit) : response;
  } catch (error) {
    const { message, status } = normalizeApiError(error, 'Unable to verify payment right now.');
    const response = secureJson({ error: message }, { status });
    return rateLimit ? withRateLimitHeaders(response, rateLimit) : response;
  }
}
