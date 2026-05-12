'use client';

import { useState } from 'react';

import { useCart } from '@/components/cart-provider';
import type { CartProductSnapshot } from '@/lib/types';

type AddToCartButtonProps = {
  product: CartProductSnapshot;
  className?: string;
};

export function AddToCartButton({ product, className = '' }: AddToCartButtonProps) {
  const { addItem, openCart } = useCart();
  const [message, setMessage] = useState('');

  function handleAddToCart() {
    addItem(product, 1);
    openCart();
    setMessage('Added to cart');
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAddToCart}
        className={`inline-flex items-center justify-center rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${className}`}
      >
        Add to cart
      </button>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </>
  );
}
