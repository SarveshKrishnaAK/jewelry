import type { Metadata } from 'next';
import Link from 'next/link';

import { beginUserLogin, beginUserSignup, completeUserLogin, completeUserSignup, logoutUserAction, saveUserAddressAction } from '@/app/actions/auth';
import { getCurrentSession } from '@/lib/auth';
import { getUserById } from '@/lib/auth-store';
import { decryptJson } from '@/lib/crypto';
import type { UserAddress } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Your Account',
  description: 'Sign in securely to manage saved details and complete checkout.',
  robots: {
    index: false,
    follow: false,
  },
};

type AccountPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readQueryParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const mode = readQueryParam(params.mode) ?? '';
  const next = readQueryParam(params.next) ?? '/checkout';
  const error = readQueryParam(params.error);
  const notice = readQueryParam(params.notice);
  const emailHint = readQueryParam(params.email);
  const session = await getCurrentSession();
  const user = session?.role === 'user' ? await getUserById(session.subject) : null;
  const savedAddress = decryptJson<UserAddress>(user?.addressCiphertext);

  if (session?.role === 'user' && user) {
    return (
      <div className="pb-20 pt-10 lg:pb-28">
        <div className="mx-auto w-[min(1100px,calc(100%-1.5rem))] space-y-8">
          <section className="rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,236,219,0.94))] p-8 shadow-[0_24px_70px_rgba(87,60,14,0.12)] lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Your account</p>
            <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">Welcome, {user.name}.</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-stone-600">Manage your saved details, return to checkout in moments, and keep every purchase connected to one secure account.</p>
            {notice ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p> : null}
          </section>

          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Profile</p>
              <div className="mt-5 space-y-3 text-sm text-stone-700">
                <p><span className="font-semibold text-stone-900">Name:</span> {user.name}</p>
                <p><span className="font-semibold text-stone-900">Email:</span> {user.email}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={next} className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">
                  Continue to checkout
                </Link>
                <form action={logoutUserAction}>
                  <button type="submit" className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-900">
                    Sign out
                  </button>
                </form>
              </div>
            </section>

            <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Saved address</p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-900">Save your delivery details for a faster checkout.</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">Your address is encrypted before it is stored, so you can return for a smoother and more reassuring checkout experience.</p>
              {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
              <form action={saveUserAddressAction} className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Full name<input name="fullName" autoComplete="name" defaultValue={savedAddress?.fullName ?? user.name} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Phone<input name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={savedAddress?.phone ?? ''} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 sm:col-span-2">Address line 1<input name="line1" autoComplete="address-line1" defaultValue={savedAddress?.line1 ?? ''} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 sm:col-span-2">Address line 2<input name="line2" autoComplete="address-line2" defaultValue={savedAddress?.line2 ?? ''} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">City<input name="city" autoComplete="address-level2" defaultValue={savedAddress?.city ?? ''} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">State<input name="state" autoComplete="address-level1" defaultValue={savedAddress?.state ?? ''} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Postal code<input name="postalCode" autoComplete="postal-code" inputMode="numeric" defaultValue={savedAddress?.postalCode ?? ''} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Country<input name="country" defaultValue="India" readOnly className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <div className="sm:col-span-2">
                  <button type="submit" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">
                    Save address securely
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-10 lg:pb-28">
      <div className="mx-auto w-[min(1100px,calc(100%-1.5rem))] space-y-8">
        <section className="rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,236,219,0.94))] p-8 shadow-[0_24px_70px_rgba(87,60,14,0.12)] lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Secure account access</p>
          <h1 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-semibold text-stone-900">Create an account for a smoother checkout.</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-stone-600">Save your delivery details, keep track of your purchases, and confirm sign-ins with a one-time email code for added peace of mind.</p>
          {notice ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
        </section>

        {mode === 'verify-signup' || mode === 'verify-login' ? (
          <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">OTP verification</p>
            <h2 className="mt-3 text-3xl font-semibold text-stone-900">Enter the code sent to {emailHint ?? 'your email'}.</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">The code expires in 10 minutes to help protect your account.</p>
            <form action={mode === 'verify-signup' ? completeUserSignup : completeUserLogin} className="mt-6 max-w-md space-y-4">
              <input type="hidden" name="next" value={next} />
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">One-time password<input name="otp" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-lg tracking-[0.32em] outline-none focus:border-stone-900" required /></label>
              <button type="submit" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">
                Verify and continue
              </button>
            </form>
          </section>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">New customer</p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-900">Create your account</h2>
              <form action={beginUserSignup} className="mt-6 space-y-4">
                <input type="hidden" name="next" value={next} />
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Full name<input name="name" autoComplete="name" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Email<input type="email" name="email" autoComplete="email" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Password<input type="password" name="password" autoComplete="new-password" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <button type="submit" className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">
                  Send verification code
                </button>
              </form>
            </section>

            <section className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(87,60,14,0.08)] lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Returning customer</p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-900">Sign in securely</h2>
              <form action={beginUserLogin} className="mt-6 space-y-4">
                <input type="hidden" name="next" value={next} />
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Email<input type="email" name="email" autoComplete="email" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">Password<input type="password" name="password" autoComplete="current-password" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-900" required /></label>
                <button type="submit" className="inline-flex items-center justify-center rounded-full border border-stone-900 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-50">
                  Send sign-in code
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
