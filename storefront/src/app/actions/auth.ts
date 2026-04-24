'use server';

import { redirect } from 'next/navigation';

import {
  clearPendingAuthCookie,
  clearSessionCookie,
  getCurrentSession,
  getPendingAuthCookie,
  setPendingAuthCookie,
  setSessionCookie,
} from '@/lib/auth';
import {
  assertOtpChallenge,
  getUserByEmail,
  getUserById,
  hashOtpCode,
  isPersistentAuthConfigured,
  saveOtpChallenge,
  saveUserRecord,
} from '@/lib/auth-store';
import { encryptJson } from '@/lib/crypto';
import { isEmailConfigured, sendOtpEmail } from '@/lib/mailer';
import { getPasswordValidationError, hashPassword, verifyPassword } from '@/lib/password';
import { assertRateLimit } from '@/lib/security';
import type { UserAddress } from '@/lib/types';
import { createId, createOtpCode, normalizeEmail } from '@/lib/utils';

const OTP_TTL_MS = 10 * 60 * 1000;
const AUTH_WINDOW_MS = 15 * 60 * 1000;

function withMessage(pathname: string, type: 'error' | 'notice', message: string) {
  const url = new URL(pathname, 'http://localhost:3000');
  url.searchParams.set(type, message);
  return `${url.pathname}${url.search}`;
}

function buildAccountPath(next: string) {
  const url = new URL('/account', 'http://localhost:3000');
  url.searchParams.set('next', next);
  return `${url.pathname}${url.search}`;
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/checkout';
  }

  try {
    const normalizedUrl = new URL(value, 'http://localhost:3000');

    if (normalizedUrl.origin !== 'http://localhost:3000') {
      return '/checkout';
    }

    return `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`;
  } catch {
    return '/checkout';
  }
}

function readPendingChallenge(cookieValue: string | null, scope: string) {
  if (!cookieValue) {
    return null;
  }

  const [cookieScope, challengeId] = cookieValue.split(':');
  return cookieScope === scope && challengeId ? challengeId : null;
}

function ensureAuthFoundation(pathname: string) {
  if (!process.env.SESSION_SECRET) {
    redirect(withMessage(pathname, 'error', 'Add SESSION_SECRET before using authentication.'));
  }

  if (!isPersistentAuthConfigured()) {
    redirect(withMessage(pathname, 'error', 'Configure Upstash Redis before using customer accounts.'));
  }
}

function ensureOtpReadiness(pathname: string) {
  ensureAuthFoundation(pathname);

  if (!isEmailConfigured()) {
    redirect(withMessage(pathname, 'error', 'Configure Resend email before using OTP verification.'));
  }
}

function ensureRateLimit(pathname: string, bucket: string, identifier: string, maxRequests: number) {
  try {
    assertRateLimit({
      bucket,
      identifier,
      maxRequests,
      windowMs: AUTH_WINDOW_MS,
    });
  } catch (error) {
    redirect(withMessage(pathname, 'error', error instanceof Error ? error.message : 'Too many requests. Please try again shortly.'));
  }
}

function normalizeIndianCountry(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === 'india' || normalized === 'in';
}

export async function beginUserSignup(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const next = normalizeNextPath(formData.get('next')?.toString() ?? null);
  const accountPath = buildAccountPath(next);
  const passwordError = getPasswordValidationError(password);

  ensureOtpReadiness(accountPath);

  if (name.length < 2) {
    redirect(withMessage(accountPath, 'error', 'Enter your full name.'));
  }

  if (!email.includes('@')) {
    redirect(withMessage(accountPath, 'error', 'Enter a valid email address.'));
  }

  if (passwordError) {
    redirect(withMessage(accountPath, 'error', passwordError));
  }

  ensureRateLimit(accountPath, 'auth:user-signup', email, 5);

  if (await getUserByEmail(email)) {
    redirect(withMessage(accountPath, 'error', 'An account with that email already exists.'));
  }

  const code = createOtpCode();
  const challengeId = createId('otp');

  await saveOtpChallenge({
    id: challengeId,
    scope: 'user-signup',
    email,
    codeHash: hashOtpCode(code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attemptsRemaining: 5,
    payload: {
      name,
      passwordHash: hashPassword(password),
      next,
    },
  });

  await sendOtpEmail({
    to: email,
    code,
    subject: 'Verify your Aurum Coverings account',
    headline: 'Confirm your customer account',
    description: 'Use this one-time code to finish creating your Aurum Coverings account and protect access to your orders.',
  });

  await setPendingAuthCookie(`user-signup:${challengeId}`);
  redirect(
    withMessage(
      `/account?mode=verify-signup&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}`,
      'notice',
      'We sent an OTP to your email.',
    ),
  );
}

export async function completeUserSignup(formData: FormData) {
  const next = normalizeNextPath(formData.get('next')?.toString() ?? null);
  const accountPath = buildAccountPath(next);
  const otp = String(formData.get('otp') ?? '').trim();
  const challengeId = readPendingChallenge(await getPendingAuthCookie(), 'user-signup');

  ensureAuthFoundation(accountPath);

  if (!challengeId) {
    redirect(withMessage(accountPath, 'error', 'Your sign-up session expired. Please start again.'));
  }

  const result = await assertOtpChallenge(challengeId, 'user-signup', otp);

  if (!result.challenge) {
    redirect(withMessage(`/account?mode=verify-signup&next=${encodeURIComponent(next)}`, 'error', result.message ?? 'Invalid OTP.'));
  }

  if (await getUserByEmail(result.challenge.email)) {
    await clearPendingAuthCookie();
    redirect(withMessage(accountPath, 'error', 'That account already exists. Please sign in instead.'));
  }

  const user = {
    id: createId('user'),
    email: result.challenge.email,
    name: result.challenge.payload.name,
    passwordHash: result.challenge.payload.passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveUserRecord(user);
  await clearPendingAuthCookie();
  await setSessionCookie({ role: 'user', subject: user.id, email: user.email, name: user.name });

  redirect(withMessage(next, 'notice', 'Your account is ready and you are now signed in.'));
}

export async function beginUserLogin(formData: FormData) {
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const next = normalizeNextPath(formData.get('next')?.toString() ?? null);
  const accountPath = buildAccountPath(next);

  ensureOtpReadiness(accountPath);
  ensureRateLimit(accountPath, 'auth:user-login', email || 'unknown', 7);

  const user = await getUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect(withMessage(accountPath, 'error', 'Incorrect email or password.'));
  }

  const code = createOtpCode();
  const challengeId = createId('otp');

  await saveOtpChallenge({
    id: challengeId,
    scope: 'user-login',
    email: user.email,
    codeHash: hashOtpCode(code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attemptsRemaining: 5,
    payload: {
      userId: user.id,
      next,
    },
  });

  await sendOtpEmail({
    to: user.email,
    code,
    subject: 'Your Aurum Coverings sign-in code',
    headline: 'Approve this sign-in attempt',
    description: 'Enter this OTP to complete the second step of your customer login and protect your account data.',
  });

  await setPendingAuthCookie(`user-login:${challengeId}`);
  redirect(
    withMessage(
      `/account?mode=verify-login&next=${encodeURIComponent(next)}&email=${encodeURIComponent(user.email)}`,
      'notice',
      'We sent an OTP to your email.',
    ),
  );
}

export async function completeUserLogin(formData: FormData) {
  const next = normalizeNextPath(formData.get('next')?.toString() ?? null);
  const accountPath = buildAccountPath(next);
  const otp = String(formData.get('otp') ?? '').trim();
  const challengeId = readPendingChallenge(await getPendingAuthCookie(), 'user-login');

  ensureAuthFoundation(accountPath);

  if (!challengeId) {
    redirect(withMessage(accountPath, 'error', 'Your login session expired. Please sign in again.'));
  }

  const result = await assertOtpChallenge(challengeId, 'user-login', otp);

  if (!result.challenge) {
    redirect(withMessage(`/account?mode=verify-login&next=${encodeURIComponent(next)}`, 'error', result.message ?? 'Invalid OTP.'));
  }

  const user = await getUserById(result.challenge.payload.userId);

  if (!user) {
    await clearPendingAuthCookie();
    redirect(withMessage(accountPath, 'error', 'The account could not be found.'));
  }

  await clearPendingAuthCookie();
  await setSessionCookie({ role: 'user', subject: user.id, email: user.email, name: user.name });

  redirect(withMessage(next, 'notice', 'Welcome back. You are signed in.'));
}

export async function saveUserAddressAction(formData: FormData) {
  ensureAuthFoundation('/account');
  const session = await getCurrentSession();

  if (!session || session.role !== 'user') {
    redirect(withMessage('/account', 'error', 'Please sign in again to save your address.'));
  }

  const user = await getUserById(session.subject);

  if (!user) {
    redirect(withMessage('/account', 'error', 'We could not load your account.'));
  }

  const address: UserAddress = {
    fullName: String(formData.get('fullName') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    line1: String(formData.get('line1') ?? '').trim(),
    line2: String(formData.get('line2') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim(),
    state: String(formData.get('state') ?? '').trim(),
    postalCode: String(formData.get('postalCode') ?? '').trim(),
    country: String(formData.get('country') ?? '').trim(),
  };

  if (!address.fullName || !address.phone || !address.line1 || !address.city || !address.state || !address.postalCode || !address.country) {
    redirect(withMessage('/account', 'error', 'Complete all required address fields before saving.'));
  }

  if (!normalizeIndianCountry(address.country)) {
    redirect(withMessage('/account', 'error', 'This store currently supports delivery addresses in India only.'));
  }

  await saveUserRecord({
    ...user,
    addressCiphertext: encryptJson({
      ...address,
      country: 'India',
    }),
    updatedAt: new Date().toISOString(),
  });

  redirect(withMessage('/account', 'notice', 'Your address was saved securely.'));
}

export async function logoutUserAction() {
  await clearPendingAuthCookie();
  await clearSessionCookie();
  redirect('/account?notice=' + encodeURIComponent('You have been signed out.'));
}
