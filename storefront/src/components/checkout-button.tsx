'use client';

import { useState } from 'react';

import type { CartEntry } from '@/lib/types';

type CheckoutButtonProps = {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  hasSavedAddress: boolean;
  items: CartEntry[];
};

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailureEvent = {
  error?: {
    description?: string;
  };
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpayCheckoutResponse) => void | Promise<void>;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayFailureEvent) => void) => void;
};

type RazorpayCheckoutConstructor = new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;

type CheckoutSessionResponse = {
  amount?: number;
  currency?: string;
  description?: string;
  error?: string;
  keyId?: string;
  orderId?: string;
  storeName?: string;
};

declare global {
  interface Window {
    Razorpay?: RazorpayCheckoutConstructor;
  }
}

async function loadRazorpayCheckoutScript() {
  if (window.Razorpay) {
    return window.Razorpay;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout="true"]');

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Razorpay Checkout.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
    document.body.appendChild(script);
  });

  if (!window.Razorpay) {
    throw new Error('Razorpay Checkout is unavailable.');
  }

  return window.Razorpay;
}

export function CheckoutButton({
  customerEmail,
  customerName,
  customerPhone,
  hasSavedAddress,
  items,
}: CheckoutButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (!hasSavedAddress) {
      setError('Add your delivery address in your account before starting payment.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      const data = (await response.json()) as CheckoutSessionResponse;

      if (!response.ok || !data.orderId || !data.keyId || !data.amount || !data.currency || !data.storeName || !data.description) {
        throw new Error(data.error ?? 'Unable to start secure checkout right now.');
      }

      const Razorpay = await loadRazorpayCheckoutScript();
      const checkout = new Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: data.storeName,
        description: data.description,
        order_id: data.orderId,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#1c1917',
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
          },
        },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(paymentResponse),
            });

            const verifyData = (await verifyResponse.json()) as {
              error?: string;
              redirectUrl?: string;
            };

            if (!verifyResponse.ok || !verifyData.redirectUrl) {
              throw new Error(verifyData.error ?? 'Unable to verify payment right now.');
            }

            window.location.assign(verifyData.redirectUrl);
          } catch (verificationError) {
            setError(
              verificationError instanceof Error ? verificationError.message : 'Unable to verify payment right now.',
            );
            setIsSubmitting(false);
          }
        },
      });

      checkout.on('payment.failed', (failureResponse) => {
        setError(failureResponse.error?.description ?? 'Payment failed. Please try again.');
        setIsSubmitting(false);
      });

      checkout.open();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Unable to start secure checkout right now.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isSubmitting || items.length === 0 || !hasSavedAddress}
        className="inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
      >
        {isSubmitting ? 'Opening Razorpay...' : 'Pay securely with Razorpay'}
      </button>
      {!hasSavedAddress ? <p className="text-sm text-amber-700">Save your delivery address before continuing to payment.</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
