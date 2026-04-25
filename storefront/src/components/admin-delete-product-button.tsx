'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type AdminDeleteProductButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  confirmMessage: string;
};

export function AdminDeleteProductButton({
  action,
  children,
  className,
  confirmMessage,
}: AdminDeleteProductButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button type="button" className={className} onClick={() => setIsOpen(true)}>
        {children}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,236,219,0.96))] p-6 shadow-[0_24px_80px_rgba(41,37,36,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Confirm removal</p>
            <h3 className="mt-3 text-2xl font-semibold text-stone-900">Remove this product from the live catalog?</h3>
            <p className="mt-3 text-sm leading-7 text-stone-600">{confirmMessage}</p>
            <p className="mt-3 text-sm leading-7 text-stone-500">Existing orders will keep their stored item snapshot, but this piece will disappear from the storefront.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-900"
              >
                Keep product
              </button>
              <button
                type="submit"
                formAction={action}
                formNoValidate
                className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Remove product
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
