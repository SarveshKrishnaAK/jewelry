'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/components/cart-provider';
import type { AuthSession } from '@/lib/types';
import { navigationLinks, siteConfig } from '@/lib/site';

export function SiteHeader({ session }: { session: AuthSession | null }) {
  const pathname = usePathname();
  const { itemCount, openCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const accountLabel = session?.role === 'user' ? 'Account' : 'Sign in';

  return (
    <header className="sticky top-0 z-30 border-b border-white/40 bg-[rgba(249,243,236,0.78)] backdrop-blur-xl">
      <div className="border-b border-white/50 bg-stone-950 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-stone-100">
        <div className="mx-auto flex w-[min(1200px,calc(100%-1.5rem))] items-center justify-between gap-3 py-3">
          <span>Secure online checkout</span>
          <span className="hidden sm:inline">Carefully packed and dispatched within 48 to 72 hours</span>
        </div>
      </div>
      <div className="mx-auto flex w-[min(1200px,calc(100%-1.5rem))] items-center justify-between gap-4 py-4">
        <Link href="/" className="shrink-0" onClick={() => setMobileMenuOpen(false)}>
          <span className="block text-xs font-semibold uppercase tracking-[0.38em] text-stone-500">Fine occasion jewelry</span>
          <span className="mt-1 block [font-family:var(--font-cormorant)] text-3xl font-semibold text-stone-900">{siteConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-white/70 bg-white/70 p-2 shadow-[0_12px_35px_rgba(87,60,14,0.08)] md:flex">
          {navigationLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/account" className="hidden rounded-full border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-[0_10px_30px_rgba(87,60,14,0.08)] transition hover:-translate-y-0.5 hover:border-stone-900 md:inline-flex">
            {accountLabel}
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-[0_10px_30px_rgba(87,60,14,0.08)] transition hover:-translate-y-0.5 hover:border-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            aria-label="Open cart"
          >
            <span>Cart</span>
            <span suppressHydrationWarning className="inline-flex min-w-7 items-center justify-center rounded-full bg-stone-900 px-2 py-1 text-xs text-white">{itemCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white text-stone-900 shadow-[0_10px_30px_rgba(87,60,14,0.08)] md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation"
          >
            <span className="text-xl">≡</span>
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="border-t border-white/60 bg-[rgba(255,252,249,0.96)] px-4 py-4 md:hidden">
          <nav className="mx-auto flex w-[min(1200px,100%)] flex-col gap-2">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${pathname === link.href ? 'bg-stone-900 text-white' : 'bg-white text-stone-700'}`}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-stone-700">
              {accountLabel}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
