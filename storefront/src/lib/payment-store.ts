import { getRedis, isRedisConfigured } from '@/lib/redis';
import type { RazorpayOrderRecord } from '@/lib/types';

const ORDER_TTL_SECONDS = 60 * 60 * 24;
const WEBHOOK_EVENT_TTL_SECONDS = 60 * 60 * 24 * 7;

function razorpayOrderKey(orderId: string) {
  return `aurum:payment:razorpay:order:${orderId}`;
}

function razorpayWebhookEventKey(eventId: string) {
  return `aurum:payment:razorpay:webhook:${eventId}`;
}

export function isPaymentStoreConfigured() {
  return isRedisConfigured();
}

export async function saveRazorpayOrderRecord(record: RazorpayOrderRecord) {
  if (!isRedisConfigured()) {
    throw new Error('Configure Upstash Redis before using Razorpay order verification.');
  }

  await getRedis().set(razorpayOrderKey(record.orderId), record, { ex: ORDER_TTL_SECONDS });
}

export async function getRazorpayOrderRecord(orderId: string) {
  if (!isRedisConfigured()) {
    return null;
  }

  return (await getRedis().get<RazorpayOrderRecord>(razorpayOrderKey(orderId))) ?? null;
}

export async function updateRazorpayOrderRecord(record: RazorpayOrderRecord) {
  await saveRazorpayOrderRecord(record);
}

export async function isWebhookEventProcessed(eventId: string) {
  if (!isRedisConfigured()) {
    return false;
  }

  return Boolean(await getRedis().get<string>(razorpayWebhookEventKey(eventId)));
}

export async function markWebhookEventProcessed(eventId: string) {
  if (!isRedisConfigured()) {
    return;
  }

  await getRedis().set(razorpayWebhookEventKey(eventId), '1', { ex: WEBHOOK_EVENT_TTL_SECONDS });
}
