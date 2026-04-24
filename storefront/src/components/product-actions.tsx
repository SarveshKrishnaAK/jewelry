'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCart } from '@/components/cart-provider';

type ProductActionsProps = {
  productId: string;
};

export function ProductActions({ productId }: ProductActionsProps) {
  const router = useRouter();
  const { addItem, openCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  function updateQuantity(nextQuantity: number) {
    setQuantity(Math.max(1, Math.min(5, nextQuantity)));
  }

  function handleAddToCart() {
    addItem(productId, quantity);
    openCart();
    setMessage(`${quantity} item${quantity > 1 ? 's' : ''} added to cart`);
  }

  function handleBuyNow() {
    addItem(productId, quantity);
    router.push('/checkout');
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(74,46,14,0.12)] backdrop-blur">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Choose quantity</p>
        <div className="mt-3 inline-flex items-center rounded-full border border-stone-200 bg-stone-50 p-1">
          <button
            type="button"
            onClick={() => updateQuantity(quantity - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-stone-700 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="min-w-12 text-center text-base font-semibold text-stone-900">{quantity}</span>
          <button
            type="button"
            onClick={() => updateQuantity(quantity + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-stone-700 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAddToCart}
          className="inline-flex items-center justify-center rounded-full border border-stone-900 bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
        >
          Add to cart
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition duration-300 hover:-translate-y-0.5 hover:border-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
        >
          Buy now
        </button>
      </div>
      <p className="text-sm text-stone-600">Online payment only. Address and payment details are collected securely during checkout.</p>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </div>
  );
}
