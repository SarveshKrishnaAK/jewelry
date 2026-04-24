import crypto from 'node:crypto';

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function createOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}
