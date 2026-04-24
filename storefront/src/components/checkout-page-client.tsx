'use client';

import Link from 'next/link';

import { CheckoutButton } from '@/components/checkout-button';
import { useCart } from '@/components/cart-provider';
import { formatCurrency } from '@/lib/currency';

export function CheckoutPageClient({
  accountEmail,
  savedAddressSummary,
}: {
  accountEmail: string;
  savedAddressSummary: string | null;
}) {
  const { detailedItems, items, subtotal } = useCart();

  if (detailedItems.length === 0) {
    return (
      <section className="rounded-[36px] border border-dashed border-stone-300 bg-white/75 px-6 py-16 text-center shadow-[0_20px_60px_rgba(87,60,14,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Nothing to pay yet</p>
        <h2 className="mt-4 text-3xl font-semibold text-stone-900">Your secure checkout starts after you add products.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-stone-600">Browse the catalog, add your favorite covering jewelry pieces, and return here to complete online payment through Razorpay.</p>
        <Link href="/products" className="mt-8 inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">Shop products</Link>
      </section>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_0.8fr]">
      <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] backdrop-blur lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Order summary</p>
            <h2 className="mt-3 text-3xl font-semibold text-stone-900">Review your cart before payment.</h2>
          </div>
          <Link href="/products" className="text-sm font-semibold text-stone-600 transition hover:text-stone-900">Add more pieces</Link>
        </div>
        <div className="mt-4 rounded-[24px] bg-stone-50/70 p-4 text-sm text-stone-700">
          <p><span className="font-semibold text-stone-900">Signed-in account:</span> {accountEmail}</p>
          <p className="mt-1"><span className="font-semibold text-stone-900">Saved address:</span> {savedAddressSummary ?? 'No saved address yet. Add an Indian delivery address in your account before starting payment.'}</p>
        </div>
        <div className="mt-8 space-y-4">
          {detailedItems.map(({ product, quantity, lineTotal }) => (
            <article key={product.id} className="flex flex-col gap-3 rounded-[28px] border border-stone-200 bg-stone-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{product.category}</p>
                <h3 className="mt-2 text-lg font-semibold text-stone-900">{product.name}</h3>
                <p className="mt-2 text-sm leading-7 text-stone-600">{product.shortDescription}</p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-sm font-medium text-stone-500">Qty {quantity}</p>
                <p className="mt-2 text-lg font-semibold text-stone-900">{formatCurrency(lineTotal)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-[36px] border border-white/70 bg-stone-950 p-6 text-white shadow-[0_24px_70px_rgba(20,12,5,0.24)] lg:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200/80">Secure payment</p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between text-sm text-stone-300"><span>Subtotal</span><span className="text-base font-semibold text-white">{formatCurrency(subtotal)}</span></div>
            <div className="flex items-center justify-between text-sm text-stone-300"><span>Shipping</span><span>Confirmed after payment</span></div>
            <div className="flex items-center justify-between border-t border-white/15 pt-4"><span className="text-sm text-stone-300">Estimated total</span><span className="text-2xl font-semibold text-white">{formatCurrency(subtotal)}</span></div>
          </div>
          <p className="mt-6 text-sm leading-7 text-stone-300">Razorpay opens a hosted India-ready checkout for UPI, cards, and netbanking. Sensitive payment credentials stay off your storefront, and successful payments are verified again on the server before the order is treated as valid.</p>
          <div className="mt-6"><CheckoutButton items={items} /></div>
        </section>

        <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Why this flow fits an India-only store</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-600">
            <li>Hosted Razorpay Checkout keeps PCI-sensitive fields off your storefront.</li>
            <li>Every payment is tied to a server-created Razorpay order before checkout opens.</li>
            <li>Server-side signature verification and webhooks provide a second confirmation path after checkout.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
