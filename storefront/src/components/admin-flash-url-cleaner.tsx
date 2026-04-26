'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type AdminFlashUrlCleanerProps = {
  email?: string;
  mode?: string;
  shouldClean: boolean;
  tab?: string;
};

export function AdminFlashUrlCleaner({ email, mode, shouldClean, tab }: AdminFlashUrlCleanerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldClean) {
      return;
    }

    const nextParams = new URLSearchParams();

    if (tab) {
      nextParams.set('tab', tab);
    }

    if (mode) {
      nextParams.set('mode', mode);
    }

    if (email) {
      nextParams.set('email', email);
    }

    const nextSearch = nextParams.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [email, mode, pathname, shouldClean, tab]);

  return null;
}
