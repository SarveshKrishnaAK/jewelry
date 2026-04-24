import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { CheckoutPageClient } from '@/components/checkout-page-client';
import { getCurrentSession } from '@/lib/auth';
import { decryptJson } from '@/lib/crypto';
import { getUserById } from '@/lib/auth-store';
import type { UserAddress } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Secure Checkout',
  description: 'Review the cart and continue to secure online payment through Razorpay.',
};

export default async function CheckoutPage() {
  const session = await getCurrentSession();

  if (!session || session.role !== 'user') {
    redirect('/account?next=/checkout&notice=' + encodeURIComponent('Please sign in before checkout.'));
  }

  const user = await getUserById(session.subject);
  const savedAddress = decryptJson<UserAddress>(user?.addressCiphertext);

  return (
    <div className="pb-20 pt-10 lg:pb-28">
      <div className="mx-auto w-[min(1200px,calc(100%-1.5rem))] space-y-10">
        <section className="rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,236,219,0.94))] p-8 shadow-[0_24px_70px_rgba(87,60,14,0.12)] lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Checkout</p>
          <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">A polished online-only payment flow.</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-stone-600">You are signed in as {session.email}. Razorpay now handles secure India-focused payment collection for UPI, cards, and netbanking, while your account protects order access and saved address details.</p>
        </section>

        <CheckoutPageClient accountEmail={session.email} savedAddressSummary={savedAddress ? `${savedAddress.city}, ${savedAddress.state}` : null} />
      </div>
    </div>
  );
}
