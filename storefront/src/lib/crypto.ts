import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import type { AuthSession } from '@/lib/types';

const SESSION_COOKIE_NAME = 'aurum_session';
const PENDING_AUTH_COOKIE_NAME = 'aurum_pending_auth';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64');
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error('Missing SESSION_SECRET. Configure it before using authentication.');
  }

  return secret;
}

function getFieldEncryptionKey() {
  const source = process.env.FIELD_ENCRYPTION_KEY ?? getSessionSecret();
  return createHash('sha256').update(source).digest();
}

function sign(value: string) {
  return base64UrlEncode(createHmac('sha256', getSessionSecret()).update(value).digest());
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getPendingAuthCookieName() {
  return PENDING_AUTH_COOKIE_NAME;
}

export function createSessionToken(session: Omit<AuthSession, 'expiresAt'> & { expiresAt?: number }) {
  const payload = {
    ...session,
    expiresAt: session.expiresAt ?? Date.now() + SESSION_TTL_SECONDS * 1000,
  } satisfies AuthSession;
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as AuthSession;

    if (payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function encryptJson(value: unknown) {
  const key = getFieldEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((part) => base64UrlEncode(part)).join('.');
}

export function decryptJson<T>(ciphertext: string | undefined) {
  if (!ciphertext) {
    return null;
  }

  const [ivPart, authTagPart, encryptedPart] = ciphertext.split('.');

  if (!ivPart || !authTagPart || !encryptedPart) {
    return null;
  }

  const decipher = createDecipheriv('aes-256-gcm', getFieldEncryptionKey(), base64UrlDecode(ivPart));
  decipher.setAuthTag(base64UrlDecode(authTagPart));
  const decrypted = Buffer.concat([decipher.update(base64UrlDecode(encryptedPart)), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as T;
}
