import { NextResponse } from 'next/server';

import { getBaseUrl } from '@/lib/site';

type RateLimitOptions = {
  bucket: string;
  identifier: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitResult = {
  limit: number;
  remaining: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, Map<string, RateLimitResult & { count: number }>>();

export class ApiRouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ApiRouteError';
    this.status = status;
  }
}

function getAllowedOrigins(request: Request) {
  const allowedOrigins = new Set<string>();
  const requestOrigin = new URL(request.url).origin;

  allowedOrigins.add(requestOrigin);
  allowedOrigins.add('http://localhost:3000');
  allowedOrigins.add('http://127.0.0.1:3000');

  try {
    allowedOrigins.add(new URL(getBaseUrl()).origin);
  } catch {
    // Ignore malformed fallback values and rely on the request origin instead.
  }

  if (process.env.VERCEL_URL) {
    allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
  }

  return allowedOrigins;
}

function parseOrigin(origin: string | null) {
  if (!origin) {
    return null;
  }

  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

function getRateLimitBucket(bucket: string) {
  const existingBucket = rateLimitBuckets.get(bucket);

  if (existingBucket) {
    return existingBucket;
  }

  const nextBucket = new Map<string, RateLimitResult & { count: number }>();
  rateLimitBuckets.set(bucket, nextBucket);
  return nextBucket;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function assertJsonContentType(request: Request) {
  const contentType = request.headers.get('content-type');

  if (!contentType || !contentType.toLowerCase().includes('application/json')) {
    throw new ApiRouteError('Expected a JSON request body.', 415);
  }
}

export function assertContentLength(request: Request, maxBytes: number) {
  const contentLengthHeader = request.headers.get('content-length');

  if (!contentLengthHeader) {
    return;
  }

  const contentLength = Number(contentLengthHeader);

  if (!Number.isFinite(contentLength) || contentLength < 0) {
    throw new ApiRouteError('Invalid Content-Length header.', 400);
  }

  if (contentLength > maxBytes) {
    throw new ApiRouteError('Request body is too large.', 413);
  }
}

export function assertAllowedOrigin(request: Request) {
  const origin = parseOrigin(request.headers.get('origin'));

  if (!origin) {
    return;
  }

  if (!getAllowedOrigins(request).has(origin)) {
    throw new ApiRouteError('Invalid request origin.', 403);
  }
}

export function assertRateLimit({
  bucket,
  identifier,
  maxRequests,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const bucketStore = getRateLimitBucket(bucket);
  const now = Date.now();

  for (const [key, value] of bucketStore.entries()) {
    if (value.resetAt <= now) {
      bucketStore.delete(key);
    }
  }

  const current = bucketStore.get(identifier);

  if (!current || current.resetAt <= now) {
    const nextEntry = {
      count: 1,
      limit: maxRequests,
      remaining: Math.max(maxRequests - 1, 0),
      resetAt: now + windowMs,
    };

    bucketStore.set(identifier, nextEntry);
    return nextEntry;
  }

  if (current.count >= maxRequests) {
    throw new ApiRouteError('Too many requests. Please try again shortly.', 429);
  }

  current.count += 1;
  current.remaining = Math.max(maxRequests - current.count, 0);
  bucketStore.set(identifier, current);

  return current;
}

export function secureJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export function withRateLimitHeaders(response: NextResponse, rateLimit: RateLimitResult) {
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000)));
  return response;
}

export function normalizeApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiRouteError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof SyntaxError) {
    return {
      status: 400,
      message: 'Malformed JSON request body.',
    };
  }

  return {
    status: 500,
    message: fallbackMessage,
  };
}
