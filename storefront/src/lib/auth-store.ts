import { createHash } from 'node:crypto';

import { getRedis, isRedisConfigured } from '@/lib/redis';
import { normalizeEmail } from '@/lib/utils';
import type { AdminRecord, OtpChallenge, OtpChallengeScope, UserRecord } from '@/lib/types';

const ADMIN_KEY = 'aurum:admin';

function userKey(id: string) {
  return `aurum:user:${id}`;
}

function userEmailKey(email: string) {
  return `aurum:user:email:${normalizeEmail(email)}`;
}

function challengeKey(id: string) {
  return `aurum:otp:${id}`;
}

export function isPersistentAuthConfigured() {
  return isRedisConfigured();
}

export async function getAdminRecord() {
  if (!isRedisConfigured()) {
    return null;
  }

  return (await getRedis().get<AdminRecord>(ADMIN_KEY)) ?? null;
}

export async function adminExists() {
  return Boolean(await getAdminRecord());
}

export async function saveAdminRecord(record: AdminRecord) {
  if (!isRedisConfigured()) {
    throw new Error('Configure Upstash Redis before using admin authentication.');
  }

  await getRedis().set(ADMIN_KEY, record);
}

export async function getUserById(id: string) {
  if (!isRedisConfigured()) {
    return null;
  }

  return (await getRedis().get<UserRecord>(userKey(id))) ?? null;
}

export async function getUserByEmail(email: string) {
  if (!isRedisConfigured()) {
    return null;
  }

  const userId = await getRedis().get<string>(userEmailKey(email));

  if (!userId) {
    return null;
  }

  return getUserById(userId);
}

export async function saveUserRecord(record: UserRecord) {
  if (!isRedisConfigured()) {
    throw new Error('Configure Upstash Redis before using customer accounts.');
  }

  const redis = getRedis();
  await redis.set(userKey(record.id), record);
  await redis.set(userEmailKey(record.email), record.id);
}

export function hashOtpCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

export async function saveOtpChallenge(challenge: OtpChallenge) {
  if (!isRedisConfigured()) {
    throw new Error('Configure Upstash Redis before using OTP verification.');
  }

  const expiresInSeconds = Math.max(Math.ceil((challenge.expiresAt - Date.now()) / 1000), 1);
  await getRedis().set(challengeKey(challenge.id), challenge, { ex: expiresInSeconds });
}

export async function getOtpChallenge(id: string) {
  if (!isRedisConfigured()) {
    return null;
  }

  return (await getRedis().get<OtpChallenge>(challengeKey(id))) ?? null;
}

export async function updateOtpChallenge(challenge: OtpChallenge) {
  await saveOtpChallenge(challenge);
}

export async function deleteOtpChallenge(id: string) {
  if (!isRedisConfigured()) {
    return;
  }

  await getRedis().del(challengeKey(id));
}

export async function assertOtpChallenge(id: string, scope: OtpChallengeScope, code: string) {
  const challenge = await getOtpChallenge(id);

  if (!challenge || challenge.scope !== scope || challenge.expiresAt <= Date.now()) {
    return { challenge: null, message: 'The verification code expired. Please request a new one.' };
  }

  if (challenge.codeHash !== hashOtpCode(code)) {
    challenge.attemptsRemaining -= 1;

    if (challenge.attemptsRemaining <= 0) {
      await deleteOtpChallenge(id);
      return { challenge: null, message: 'Too many incorrect OTP attempts. Please start again.' };
    }

    await updateOtpChallenge(challenge);
    return { challenge: null, message: 'Incorrect OTP. Please check the code and try again.' };
  }

  await deleteOtpChallenge(id);
  return { challenge, message: null };
}
