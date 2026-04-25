'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { useCart } from '@/components/cart-provider';
import { formatCurrency } from '@/lib/currency';

export function CartDrawer() {
  const { closeCart, detailedItems, isCartOpen, removeItem, subtotal, updateQuantity } = useCart();

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeCart();
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeCart, isCartOpen]);

  return (
    <>
      <button
        type="button"
        tabIndex={isCartOpen ? 0 : -1}
        aria-hidden={!isCartOpen}
        onClick={closeCart}
        className={`fixed inset-0 z-40 bg-stone-950/45 backdrop-blur-sm transition ${isCartOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <span className="sr-only">Close cart overlay</span>
      </button>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-heading"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/30 bg-[rgba(254,250,245,0.96)] p-6 shadow-[0_24px_80px_rgba(24,16,8,0.28)] backdrop-blur-xl transition-transform duration-500 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Your bag</p>
            <h2 id="cart-heading" className="mt-2 text-2xl font-semibold text-stone-900">
              Ready when you are
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:border-stone-900 hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {detailedItems.length === 0 ? (
          <div className="mt-10 flex flex-1 flex-col items-center justify-center rounded-[28px] border border-dashed border-stone-300 bg-white/70 p-8 text-center">
            <p className="text-lg font-semibold text-stone-900">Your cart is empty.</p>
            <p className="mt-2 text-sm text-stone-600">Add a few pieces you love and return here when you are ready to check out.</p>
            <Link
              href="/products"
              onClick={closeCart}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            >
              Explore catalog
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 flex-1 space-y-4 overflow-y-auto pr-1">
              {detailedItems.map(({ product, quantity, lineTotal }) => (
                <article key={product.id} className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_10px_35px_rgba(92,61,18,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{product.category}</p>
                      <h3 className="mt-1 text-base font-semibold text-stone-900">{product.name}</h3>
                      <p className="mt-2 text-sm text-stone-600">{formatCurrency(product.price)} each</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(product.id)}
                      className="text-sm font-medium text-stone-500 transition hover:text-stone-900"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-stone-700 transition hover:bg-white"
                        aria-label={`Decrease quantity of ${product.name}`}
                      >
                        -
                      </button>
                      <span className="min-w-10 text-center text-sm font-semibold text-stone-900">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-stone-700 transition hover:bg-white"
                        aria-label={`Increase quantity of ${product.name}`}
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-stone-900">{formatCurrency(lineTotal)}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(75,48,15,0.08)]">
              <div className="flex items-center justify-between text-sm text-stone-600">
                <span>Subtotal</span>
                <span className="text-base font-semibold text-stone-900">{formatCurrency(subtotal)}</span>
              </div>
              <p className="mt-3 text-xs leading-6 text-stone-500">Taxes and shipping are confirmed during checkout.</p>
              <div className="mt-5 grid gap-3">
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
                >
                  Proceed to checkout
                </Link>
                <button
                  type="button"
                  onClick={closeCart}
                  className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
                >
                  Keep shopping
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
