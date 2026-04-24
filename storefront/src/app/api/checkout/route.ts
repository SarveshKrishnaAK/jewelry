import { getSessionFromCookieHeader } from '@/lib/auth';
import { getUserById } from '@/lib/auth-store';
import { decryptJson } from '@/lib/crypto';
import { saveRazorpayOrderRecord } from '@/lib/payment-store';
import { getProductMap } from '@/lib/product-store';
import { createRazorpayOrder, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpay';
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
import { siteConfig } from '@/lib/site';
import type { CartEntry, PaymentCartItem, UserAddress } from '@/lib/types';
import { createId } from '@/lib/utils';

const CHECKOUT_BODY_LIMIT_BYTES = 8 * 1024;
const MAX_DISTINCT_CART_ITEMS = 10;
const ORDER_TTL_MS = 30 * 60 * 1000;

export const runtime = 'nodejs';

type RateLimitSnapshot = {
  limit: number;
  remaining: number;
  resetAt: number;
};

function normalizeCartItems(payload: unknown) {
  if (!Array.isArray(payload)) {
    return [];
  }

  const mergedItems = new Map<string, number>();

  for (const item of payload) {
    const cartEntry = item as Partial<CartEntry>;
    const quantity = Number(cartEntry.quantity ?? 1);

    if (typeof cartEntry.productId !== 'string' || Number.isNaN(quantity) || quantity <= 0) {
      continue;
    }

    const nextQuantity = Math.min(10, (mergedItems.get(cartEntry.productId) ?? 0) + Math.floor(quantity));
    mergedItems.set(cartEntry.productId, nextQuantity);
  }

  if (mergedItems.size > MAX_DISTINCT_CART_ITEMS) {
    throw new ApiRouteError('Too many products in a single checkout request.', 400);
  }

  return Array.from(mergedItems.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function createReceipt() {
  return createId('rcpt').slice(0, 36);
}

function isIndianAddressCountry(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'india' || normalized === 'in';
}

export async function POST(request: Request) {
  let rateLimit: RateLimitSnapshot | undefined;

  try {
    assertAllowedOrigin(request);
    assertJsonContentType(request);
    assertContentLength(request, CHECKOUT_BODY_LIMIT_BYTES);
    rateLimit = assertRateLimit({
      bucket: 'checkout',
      identifier: getClientIp(request),
      maxRequests: 10,
      windowMs: 60_000,
    });

    const session = getSessionFromCookieHeader(request.headers.get('cookie'));

    if (!session || session.role !== 'user') {
      throw new ApiRouteError('Please sign in before checkout.', 401);
    }

    if (!isRazorpayConfigured()) {
      throw new ApiRouteError('Configure Razorpay before starting checkout.', 503);
    }

    const body = (await request.json()) as { items?: unknown };
    const items = normalizeCartItems(body.items);

    if (items.length === 0) {
      throw new ApiRouteError('Your cart is empty.', 400);
    }

    const user = await getUserById(session.subject);

    if (!user) {
      throw new ApiRouteError('Please sign in again before checkout.', 401);
    }

    const savedAddress = decryptJson<UserAddress>(user.addressCiphertext);

    if (!savedAddress || !isIndianAddressCountry(savedAddress.country)) {
      throw new ApiRouteError('Save your Indian delivery address in your account before checkout.', 400);
    }

    const productMap = await getProductMap();
    const detailedItems = items.map((item) => {
      const product = productMap[item.productId];

      if (!product) {
        throw new ApiRouteError('One of the selected products is no longer available.', 400);
      }

      return {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        quantity: item.quantity,
        unitAmount: product.price * 100,
      } satisfies PaymentCartItem;
    });

    const amount = detailedItems.reduce((total, item) => total + item.unitAmount * item.quantity, 0);

    if (amount <= 0) {
      throw new ApiRouteError('Your cart total is invalid.', 400);
    }

    const razorpayOrder = await createRazorpayOrder({
      amount,
      currency: 'INR',
      receipt: createReceipt(),
      notes: {
        customer_id: session.subject,
        item_count: String(detailedItems.length),
      },
    });

    const now = new Date().toISOString();
    await saveRazorpayOrderRecord({
      orderId: razorpayOrder.id,
      receipt: razorpayOrder.receipt,
      userId: session.subject,
      email: session.email,
      amount: razorpayOrder.amount,
      currency: 'INR',
      status: 'created',
      items: detailedItems,
      createdAt: now,
      updatedAt: now,
      expiresAt: Date.now() + ORDER_TTL_MS,
    });

    const response = secureJson({
      keyId: getRazorpayKeyId(),
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: 'INR',
      storeName: siteConfig.name,
      description: `${detailedItems.length} item${detailedItems.length === 1 ? '' : 's'} from ${siteConfig.name}`,
      customer: {
        name: user.name,
        email: user.email,
        contact: savedAddress?.phone ?? '',
      },
    });

    return rateLimit ? withRateLimitHeaders(response, rateLimit) : response;
  } catch (error) {
    const { message, status } = normalizeApiError(error, 'Unable to start secure checkout right now.');
    const response = secureJson({ error: message }, { status });
    return rateLimit ? withRateLimitHeaders(response, rateLimit) : response;
  }
}
