'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type AccountFlashUrlCleanerProps = {
  email?: string;
  mode?: string;
  nextPath?: string;
  shouldClean: boolean;
};

export function AccountFlashUrlCleaner({ email, mode, nextPath, shouldClean }: AccountFlashUrlCleanerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldClean) {
      return;
    }

    const nextParams = new URLSearchParams();

    if (mode) {
      nextParams.set('mode', mode);
    }

    if (nextPath) {
      nextParams.set('next', nextPath);
    }

    if (email) {
      nextParams.set('email', email);
    }

    const nextSearch = nextParams.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [email, mode, nextPath, pathname, shouldClean]);

  return null;
}
