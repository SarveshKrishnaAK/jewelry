import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  beginAdminLogin,
  beginAdminSetup,
  completeAdminLogin,
  completeAdminSetup,
} from '@/app/actions/admin';
import { AdminDashboard } from '@/components/admin-dashboard';
import { AdminFlashUrlCleaner } from '@/components/admin-flash-url-cleaner';
import { getCurrentSession } from '@/lib/auth';
import { adminExists, getAdminRecord } from '@/lib/auth-store';
import { getAdminPortalSlug } from '@/lib/admin';
import { decryptJson } from '@/lib/crypto';
import { getOrderNotifications, getRecentOrders, isOrderStoreConfigured } from '@/lib/order-store';
import { getAllProducts } from '@/lib/product-store';
import type { OrderNotificationRecord, OrderRecord, UserAddress } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Admin Access',
  robots: {
    index: false,
    follow: false,
  },
};

type AdminPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AdminOrderView = OrderRecord & {
  address: UserAddress | null;
  notifications: OrderNotificationRecord[];
};

function readQueryParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeAdminTab(value: string | undefined) {
  switch (value) {
    case 'add-product':
    case 'modify-products':
      return value;
    default:
      return 'orders';
  }
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const portalSlug = getAdminPortalSlug();

  if (slug !== portalSlug) {
    notFound();
  }

  const portalPath = `/gateway/${portalSlug}`;
  const mode = readQueryParam(query.mode) ?? '';
  const error = readQueryParam(query.error);
  const notice = readQueryParam(query.notice);
  const emailHint = readQueryParam(query.email);
  const initialTab = normalizeAdminTab(readQueryParam(query.tab));
  const session = await getCurrentSession();
  const hasAdmin = await adminExists();
  const admin = await getAdminRecord();
  const products = await getAllProducts();
  const orderStoreReady = isOrderStoreConfigured();
  const orders: OrderRecord[] = orderStoreReady ? await getRecentOrders(50) : [];
  const ordersWithNotifications: AdminOrderView[] = await Promise.all(
    orders.map(async (order) => ({
      ...order,
      address: decryptJson<UserAddress>(order.shippingAddressCiphertext),
      notifications: await getOrderNotifications(order.id),
    })),
  );

  if (session?.role === 'admin') {
    return (
      <>
        <AdminFlashUrlCleaner />
        <AdminDashboard
          key={`${initialTab}:${notice ?? ''}:${error ?? ''}`}
          error={error ?? undefined}
          initialTab={initialTab}
          notice={notice ?? undefined}
          orderStoreReady={orderStoreReady}
          orders={ordersWithNotifications}
          portalPath={portalPath}
          products={products}
        />
      </>
    );
  }

  return (
    <>
      <AdminFlashUrlCleaner />
      <div className="pb-20 pt-10 lg:pb-28">
        <div className="mx-auto w-[min(900px,calc(100%-1.5rem))] space-y-8">
          <section className="rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,236,219,0.94))] p-8 shadow-[0_24px_70px_rgba(87,60,14,0.12)] lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Restricted admin access</p>
            <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">Hidden catalog control room.</h1>
            <p className="mt-5 text-base leading-8 text-stone-600">
              This route is intentionally unlinked and marked no-index. Still, the real protection comes from the single-admin setup, hashed
              credentials, signed cookies, rate limits, and OTP verification on every fresh login.
            </p>
            {notice ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p> : null}
            {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
          </section>

          {mode === 'verify-setup' || mode === 'verify-login' ? (
            <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Admin OTP</p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-900">Enter the code sent to {emailHint ?? admin?.email ?? 'the admin email'}.</h2>
              <form action={mode === 'verify-setup' ? completeAdminSetup : completeAdminLogin} className="mt-6 max-w-md space-y-4">
                <input type="hidden" name="portalPath" value={portalPath} />
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                  One-time password
                  <input
                    name="otp"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-lg tracking-[0.32em] outline-none focus:border-stone-900"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                >
                  Verify admin access
                </button>
              </form>
            </section>
          ) : hasAdmin ? (
            <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Admin sign-in</p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-900">Password plus email OTP.</h2>
              <form action={beginAdminLogin} className="mt-6 space-y-4">
                <input type="hidden" name="portalPath" value={portalPath} />
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                  Admin email
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    defaultValue={admin?.email ?? ''}
                    placeholder="Enter the locked admin email"
                    className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                  Password
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter the locked admin password"
                    className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                >
                  Send admin OTP
                </button>
              </form>
            </section>
          ) : (
            <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">First-time admin setup</p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-900">Choose the one admin identity for this store.</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                The first successful setup defines the only admin email and password. After that, the same credentials plus OTP are required every
                time. Nothing is prefilled or hardcoded into the page.
              </p>
              <form action={beginAdminSetup} className="mt-6 space-y-4">
                <input type="hidden" name="portalPath" value={portalPath} />
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                  Admin email
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                  Password
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="Choose a strong password"
                    className="rounded-2xl border border-stone-200 px-4 py-3 outline-none focus:border-stone-900"
                    required
                  />
                </label>
                <p className="text-sm leading-7 text-stone-500">
                  Choose the admin email and strong password you want to lock in for the store, then confirm the OTP sent to that email.
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                >
                  Send setup OTP
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
