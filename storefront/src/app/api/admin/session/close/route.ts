import {
  clearPendingAuthCookie,
  clearSessionCookie,
  getSessionFromCookieHeader,
} from '@/lib/auth';
import {
  assertAllowedOrigin,
  assertSameSiteBrowserRequest,
  normalizeApiError,
  secureJson,
} from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);
    assertSameSiteBrowserRequest(request);

    const session = getSessionFromCookieHeader(request.headers.get('cookie'));

    if (session?.role === 'admin') {
      await clearPendingAuthCookie();
      await clearSessionCookie();
    }

    return secureJson({ closed: true });
  } catch (error) {
    const { message, status } = normalizeApiError(error, 'Unable to close the admin session right now.');
    return secureJson({ error: message }, { status });
  }
}
