import Link from 'next/link';

import { CheckoutSuccess } from '@/components/checkout-success';
import { formatCurrency } from '@/lib/currency';
import { getOrderById } from '@/lib/order-store';

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ order_id?: string; payment_status?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const { order_id: orderId, payment_status: paymentStatusParam } = await searchParams;
  const order = orderId ? await getOrderById(orderId) : null;
  const paymentStatus = paymentStatusParam === 'authorized' || paymentStatusParam === 'captured' ? paymentStatusParam : null;
  const eyebrow =
    paymentStatus === 'captured'
      ? 'Payment captured'
      : paymentStatus === 'authorized'
        ? 'Payment authorised'
        : 'Order received';
  const title = paymentStatus === 'authorized' ? 'Your order is being finalized.' : 'Thank you for your order.';
  const description =
    paymentStatus === 'captured'
      ? "Your payment has been confirmed and your order is safely recorded. We'll prepare the pieces for dispatch shortly and keep you updated by email at every important step."
      : paymentStatus === 'authorized'
        ? "Razorpay has authorised your payment and your order is safely recorded. We'll continue processing as soon as the captured confirmation reaches the store and will keep you updated by email."
        : "Your order has been recorded securely. We'll prepare it shortly and keep you updated by email on the next steps for delivery.";

  return (
    <div className="pb-20 pt-16 lg:pb-28">
      <div className="mx-auto w-[min(900px,calc(100%-1.5rem))]">
        <section className="rounded-[40px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_70px_rgba(87,60,14,0.1)] lg:p-12">
          <CheckoutSuccess />
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">{eyebrow}</p>
          <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">{title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-stone-600">{description}</p>
          {orderId ? <p className="mt-5 text-sm text-stone-500">Order reference: {orderId}</p> : null}
          {order?.items.length ? (
            <div className="mx-auto mt-8 max-w-2xl rounded-[28px] border border-stone-200 bg-stone-50/70 p-6 text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Ordered items</p>
              <div className="mt-4 space-y-4">
                {order.items.map((item) => (
                  <div key={`${item.productId}:${item.slug}`} className="flex items-start justify-between gap-4 rounded-[20px] border border-stone-200 bg-white/90 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{item.category}</p>
                      <p className="mt-1 text-base font-semibold text-stone-900">{item.name}</p>
                      <p className="mt-1 text-sm text-stone-600">Quantity: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-stone-900">{formatCurrency((item.unitAmount * item.quantity) / 100)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/products" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">
              Continue shopping
            </Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-900">
              Back home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
