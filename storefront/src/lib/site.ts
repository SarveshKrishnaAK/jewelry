import type { NavigationLink } from '@/lib/types';

export const siteConfig = {
  name: 'Aurum Coverings',
  description:
    'A curated jewelry destination for bridal celebrations, festive dressing, and everyday elegance with secure online checkout.',
  supportEmail: 'hello@aurumcoverings.com',
  supportPhone: '+91 98765 43210',
  tagline: 'Statement jewelry for celebrations, gifting, and everyday grace.',
};

export const navigationLinks: NavigationLink[] = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Collections' },
  { href: '/checkout', label: 'Checkout' },
];

function normalizeAbsoluteUrl(value: string) {
  const trimmedValue = value.trim().replace(/\/$/, '');

  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmedValue)) {
    return `http://${trimmedValue}`;
  }

  return `https://${trimmedValue}`;
}

export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_APP_URL) ?? 'http://localhost:3000';
  }

  if (process.env.VERCEL_URL) {
    return normalizeAbsoluteUrl(process.env.VERCEL_URL) ?? 'http://localhost:3000';
  }

  return 'http://localhost:3000';
}
