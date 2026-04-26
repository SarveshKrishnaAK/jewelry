'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type CheckoutFlashUrlCleanerProps = {
  preservedParams: Record<string, string>;
  shouldClean: boolean;
};

export function CheckoutFlashUrlCleaner({ preservedParams, shouldClean }: CheckoutFlashUrlCleanerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldClean) {
      return;
    }

    const nextParams = new URLSearchParams();

    for (const [key, value] of Object.entries(preservedParams)) {
      if (value) {
        nextParams.set(key, value);
      }
    }

    const nextSearch = nextParams.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [pathname, preservedParams, shouldClean]);

  return null;
}
