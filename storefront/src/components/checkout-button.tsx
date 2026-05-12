'use client';

import { useEffect, useState } from 'react';

import type { CartEntry } from '@/lib/types';

type CheckoutButtonProps = {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  hasSavedAddress: boolean;
  items: CartEntry[];
};

type RazorpayFailureEvent = {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
    source?: string;
    step?: string;
  };
};

type RazorpayCheckoutReadonlyOptions = {
  contact?: boolean;
  email?: boolean;
  name?: boolean;
};

type RazorpayCheckoutRetryOptions = {
  enabled?: boolean;
};

type RazorpayCheckoutModalOptions = {
  backdropclose?: boolean;
  confirm_close?: boolean;
  escape?: boolean;
  handleback?: boolean;
  ondismiss?: () => void;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  callback_url: string;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  readonly?: RazorpayCheckoutReadonlyOptions;
  retry?: RazorpayCheckoutRetryOptions;
  timeout?: number;
  theme?: {
    backdrop_color?: string;
    color?: string;
  };
  modal?: RazorpayCheckoutModalOptions;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayFailureEvent) => void) => void;
};

type RazorpayCheckoutConstructor = new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;

type CheckoutSessionResponse = {
  amount?: number;
  callbackUrl?: string;
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

let razorpayCheckoutPromise: Promise<RazorpayCheckoutConstructor> | null = null;

async function loadRazorpayCheckoutScript() {
  if (window.Razorpay) {
    return window.Razorpay;
  }

  if (!razorpayCheckoutPromise) {
    razorpayCheckoutPromise = new Promise<void>((resolve, reject) => {
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
    })
      .then(() => {
        if (!window.Razorpay) {
          throw new Error('Razorpay Checkout is unavailable.');
        }

        return window.Razorpay;
      })
      .catch((error) => {
        razorpayCheckoutPromise = null;
        throw error;
      });
  }

  return razorpayCheckoutPromise;
}

function preloadRazorpayCheckoutScript() {
  void loadRazorpayCheckoutScript().catch(() => undefined);
}

function normalizePhoneForRazorpay(value: string) {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return undefined;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  const trimmedValue = value.trim();
  return trimmedValue.startsWith('+') ? trimmedValue : trimmedValue || undefined;
}

function formatPaymentFailureMessage(failureResponse: RazorpayFailureEvent) {
  const description = failureResponse.error?.description?.trim();

  if (description) {
    return description;
  }

  const reason = failureResponse.error?.reason?.trim();

  if (reason) {
    return reason;
  }

  return 'Payment failed. Please try again.';
}

function redirectToFailurePage(message: string) {
  const url = new URL('/checkout/cancel', window.location.origin);
  url.searchParams.set('reason', message);
  window.location.assign(url.toString());
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

  useEffect(() => {
    if (!hasSavedAddress || items.length === 0) {
      return;
    }

    const preloadTimer = window.setTimeout(() => {
      preloadRazorpayCheckoutScript();
    }, 350);

    return () => {
      window.clearTimeout(preloadTimer);
    };
  }, [hasSavedAddress, items.length]);

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

      if (
        !response.ok ||
        !data.orderId ||
        !data.keyId ||
        !data.amount ||
        !data.currency ||
        !data.storeName ||
        !data.description ||
        !data.callbackUrl
      ) {
        throw new Error(data.error ?? 'Unable to start secure checkout right now.');
      }

      const Razorpay = await loadRazorpayCheckoutScript();
      const normalizedPhone = normalizePhoneForRazorpay(customerPhone);
      const checkout = new Razorpay({
        key: data.keyId,
        amount: data.amount,
        callback_url: data.callbackUrl,
        currency: data.currency,
        name: data.storeName,
        description: data.description,
        order_id: data.orderId,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: normalizedPhone,
        },
        readonly: {
          email: true,
          contact: Boolean(normalizedPhone),
        },
        retry: {
          enabled: true,
        },
        timeout: 15 * 60,
        theme: {
          color: '#1c1917',
          backdrop_color: '#f5ead7',
        },
        modal: {
          backdropclose: false,
          confirm_close: true,
          escape: true,
          handleback: true,
          ondismiss: () => {
            setError('Checkout was closed before the payment was completed.');
            setIsSubmitting(false);
          },
        },
      });

      checkout.on('payment.failed', (failureResponse) => {
        redirectToFailurePage(formatPaymentFailureMessage(failureResponse));
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
        onPointerEnter={preloadRazorpayCheckoutScript}
        onFocus={preloadRazorpayCheckoutScript}
        disabled={isSubmitting || items.length === 0 || !hasSavedAddress}
        className="inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
      >
        {isSubmitting ? 'Opening secure checkout...' : 'Pay securely with Razorpay'}
      </button>
      {!hasSavedAddress ? <p className="text-sm text-amber-700">Save your delivery address before continuing to payment.</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
