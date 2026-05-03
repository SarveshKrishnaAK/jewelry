import Link from 'next/link';

import { CheckoutSuccess } from '@/components/checkout-success';

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ order_id?: string; payment_status?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const { order_id: orderId, payment_status: paymentStatusParam } = await searchParams;
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
      ? 'Your payment has been confirmed and your order has been recorded securely. Our team can now review, prepare, and update you on the next steps for delivery.'
      : paymentStatus === 'authorized'
        ? 'Razorpay has authorised your payment and your order is safely recorded. We will continue processing as soon as the captured confirmation reaches the store.'
        : 'Your order has been recorded securely. Our team will keep tracking the payment status and update you on the next steps for delivery.';

  return (
    <div className="pb-20 pt-16 lg:pb-28">
      <div className="mx-auto w-[min(900px,calc(100%-1.5rem))]">
        <section className="rounded-[40px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_70px_rgba(87,60,14,0.1)] lg:p-12">
          <CheckoutSuccess />
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">{eyebrow}</p>
          <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">{title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-stone-600">{description}</p>
          {orderId ? <p className="mt-5 text-sm text-stone-500">Order reference: {orderId}</p> : null}
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
