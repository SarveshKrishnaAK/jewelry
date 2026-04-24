import { createHash } from 'node:crypto';

export function getAdminPortalSlug() {
  const explicitSlug = process.env.ADMIN_PORTAL_SLUG?.trim();

  if (explicitSlug) {
    return explicitSlug;
  }

  const sessionSecret = process.env.SESSION_SECRET?.trim();

  if (sessionSecret) {
    return `vault-${createHash('sha256').update(sessionSecret).digest('hex').slice(0, 24)}`;
  }

  return 'vault-aurum-entry';
}
