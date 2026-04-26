'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { CartDrawer } from '@/components/cart-drawer';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import type { AuthSession } from '@/lib/types';

async function closeAdminSession() {
  await fetch('/api/admin/session/close', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{}',
    keepalive: true,
  });
}

export function SiteFrame({
  children,
  session,
}: Readonly<{
  children: React.ReactNode;
  session: AuthSession | null;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminSession = session?.role === 'admin';
  const isAdminDashboard = isAdminSession && pathname.startsWith('/gateway/');

  useEffect(() => {
    if (!isAdminSession || isAdminDashboard) {
      return;
    }

    let cancelled = false;

    void (async () => {
      await closeAdminSession();

      if (!cancelled) {
        router.refresh();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdminDashboard, isAdminSession, router]);

  if (isAdminSession && !isAdminDashboard) {
    return (
      <main id="main-content" className="flex flex-1 items-center justify-center px-6 py-20">
        <section className="w-full max-w-xl rounded-[32px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_20px_60px_rgba(87,60,14,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Closing admin session</p>
          <h1 className="mt-4 text-3xl font-semibold text-stone-900">Returning to the storefront safely.</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            Admin access is limited to the dashboard only, so this session is being signed out before regular storefront navigation continues.
          </p>
        </section>
      </main>
    );
  }

  return (
    <>
      {isAdminDashboard ? null : <SiteHeader session={session} />}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {isAdminDashboard ? null : <SiteFooter />}
      {isAdminDashboard ? null : <CartDrawer />}
    </>
  );
}
