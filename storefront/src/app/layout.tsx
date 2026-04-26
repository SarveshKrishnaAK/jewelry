import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';

import { CartProvider } from '@/components/cart-provider';
import { SiteFrame } from '@/components/site-frame';
import { getCurrentSession } from '@/lib/auth';
import { getBaseUrl, siteConfig } from '@/lib/site';
import { getAllProducts } from '@/lib/product-store';

import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: 'Aurum Coverings | Occasion Jewelry Boutique',
    template: '%s | Aurum Coverings',
  },
  description: siteConfig.description,
  openGraph: {
    title: 'Aurum Coverings',
    description: siteConfig.description,
    url: getBaseUrl(),
    siteName: 'Aurum Coverings',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aurum Coverings',
    description: siteConfig.description,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [session, products] = await Promise.all([getCurrentSession(), getAllProducts()]);

  return (
    <html lang="en" className={`${manrope.variable} ${cormorant.variable}`}>
      <body className={`${manrope.className} min-h-screen bg-transparent text-stone-900`}>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <CartProvider initialProducts={products}>
          <div className="relative flex min-h-screen flex-col overflow-x-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.84),_transparent_36%),radial-gradient(circle_at_85%_20%,_rgba(217,188,140,0.22),_transparent_20%),linear-gradient(180deg,_#f8f2ea_0%,_#efe2d2_52%,_#f9f4ee_100%)]" />
            <SiteFrame session={session}>{children}</SiteFrame>
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
