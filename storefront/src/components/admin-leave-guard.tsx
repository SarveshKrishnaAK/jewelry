'use client';

import { useEffect, useState } from 'react';

function isAdminPath(pathname: string) {
  return pathname.startsWith('/gateway/');
}

export function AdminLeaveGuard() {
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href]');

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== '_self') {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);

      if (nextUrl.origin !== window.location.origin || isAdminPath(nextUrl.pathname)) {
        return;
      }

      event.preventDefault();
      setPendingHref(nextUrl.toString());
    }

    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, []);

  async function confirmLeave() {
    const href = pendingHref;

    if (!href) {
      return;
    }

    try {
      await fetch('/api/admin/session/close', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{}',
        keepalive: true,
      });
    } finally {
      window.location.assign(href);
    }
  }

  return pendingHref ? (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,236,219,0.97))] p-7 shadow-[0_24px_80px_rgba(41,37,36,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Leave admin dashboard</p>
        <h2 className="mt-3 text-3xl font-semibold text-stone-900">You are about to leave the control room.</h2>
        <p className="mt-4 text-sm leading-7 text-stone-600">
          For safety, leaving the admin dashboard signs this admin session out before you continue to the storefront.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setPendingHref(null)}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-900"
          >
            Stay here
          </button>
          <button
            type="button"
            onClick={confirmLeave}
            className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            Leave and sign out
          </button>
        </div>
      </div>
    </div>
  ) : null;
}
