import { createHmac, timingSafeEqual } from 'node:crypto';

type RazorpayOrderOptions = {
  amount: number;
  currency: 'INR';
  receipt: string;
  notes?: Record<string, string>;
};

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  amount_due: number;
  amount_paid: number;
  attempts: number;
  created_at: number;
  currency: string;
  entity: 'order';
  receipt: string;
  status: string;
};

type RazorpayPaymentResponse = {
  id: string;
  amount: number;
  currency: string;
  email?: string;
  contact?: string;
  method?: string;
  order_id?: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  captured?: boolean;
};

const RAZORPAY_API_BASE_URL = 'https://api.razorpay.com/v1';
const RAZORPAY_REQUEST_TIMEOUT_MS = 10_000;

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Missing Razorpay API credentials. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  return { keyId, keySecret };
}

function hexToBuffer(value: string) {
  return Buffer.from(value, 'hex');
}

function getExpectedSignature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

async function razorpayRequest<T>(pathname: string, init?: RequestInit) {
  const { keyId, keySecret } = getRazorpayCredentials();
  const response = await fetch(`${RAZORPAY_API_BASE_URL}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(RAZORPAY_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay request failed with status ${response.status}: ${errorText}`);
  }

  return (await response.json()) as T;
}

export function getRazorpayKeyId() {
  return getRazorpayCredentials().keyId;
}

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function isRazorpayWebhookConfigured() {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}

export async function createRazorpayOrder(options: RazorpayOrderOptions) {
  return razorpayRequest<RazorpayOrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function fetchRazorpayPayment(paymentId: string) {
  return razorpayRequest<RazorpayPaymentResponse>(`/payments/${paymentId}`, {
    method: 'GET',
  });
}

export function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { keySecret } = getRazorpayCredentials();
  const expectedSignature = getExpectedSignature(`${orderId}|${paymentId}`, keySecret);
  const expectedBuffer = hexToBuffer(expectedSignature);
  const providedBuffer = hexToBuffer(signature);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function verifyRazorpayWebhookSignature(payload: string, signature: string) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('Missing RAZORPAY_WEBHOOK_SECRET.');
  }

  const expectedSignature = getExpectedSignature(payload, webhookSecret);
  const expectedBuffer = hexToBuffer(expectedSignature);
  const providedBuffer = hexToBuffer(signature);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
