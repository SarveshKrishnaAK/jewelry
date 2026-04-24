import type { NavigationLink } from '@/lib/types';

export const siteConfig = {
  name: 'Aurum Coverings',
  description:
    'A premium covering jewelry storefront for bridal, festive, and everyday statements with secure online checkout.',
  supportEmail: 'hello@aurumcoverings.com',
  supportPhone: '+91 98765 43210',
  tagline: 'Modern covering jewelry with bridal drama and everyday comfort.',
};

export const navigationLinks: NavigationLink[] = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Catalog' },
  { href: '/checkout', label: 'Checkout' },
];

export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}
