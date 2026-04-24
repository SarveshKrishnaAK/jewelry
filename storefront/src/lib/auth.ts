import { cookies } from 'next/headers';

import { createSessionToken, getPendingAuthCookieName, getSessionCookieName, verifySessionToken } from '@/lib/crypto';
import type { AuthSession } from '@/lib/types';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(getSessionCookieName())?.value);
}

export async function setSessionCookie(session: Omit<AuthSession, 'expiresAt'> & { expiresAt?: number }) {
  const cookieStore = await cookies();
  const token = createSessionToken(session);
  const parsed = verifySessionToken(token);

  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(parsed?.expiresAt ?? Date.now() + COOKIE_MAX_AGE_SECONDS * 1000),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName());
}

export async function setPendingAuthCookie(value: string) {
  const cookieStore = await cookies();
  cookieStore.set(getPendingAuthCookieName(), value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 15,
  });
}

export async function getPendingAuthCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(getPendingAuthCookieName())?.value ?? null;
}

export async function clearPendingAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(getPendingAuthCookieName());
}

export function getSessionFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const cookieMap = new Map(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf('=');
        return [part.slice(0, separatorIndex), part.slice(separatorIndex + 1)] as const;
      }),
  );

  return verifySessionToken(cookieMap.get(getSessionCookieName()) ?? null);
}
