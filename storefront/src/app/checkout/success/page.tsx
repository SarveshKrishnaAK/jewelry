import Link from 'next/link';

import { CheckoutSuccess } from '@/components/checkout-success';

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ order_id?: string; payment_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const { order_id: orderId, payment_id: paymentId } = await searchParams;

  return (
    <div className="pb-20 pt-16 lg:pb-28">
      <div className="mx-auto w-[min(900px,calc(100%-1.5rem))]">
        <section className="rounded-[40px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_70px_rgba(87,60,14,0.1)] lg:p-12">
          <CheckoutSuccess />
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Payment received</p>
          <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">Thank you for your order.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-stone-600">Your payment has been verified against Razorpay and the storefront has marked the checkout as complete. This order is now stored in the secure orders database for admin follow-up, fulfillment, and customer notifications.</p>
          {orderId ? <p className="mt-5 text-sm text-stone-500">Order reference: {orderId}</p> : null}
          {paymentId ? <p className="mt-2 text-sm text-stone-500">Payment reference: {paymentId}</p> : null}
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
