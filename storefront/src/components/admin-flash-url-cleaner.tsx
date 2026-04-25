'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function AdminFlashUrlCleaner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const hasFlashParam = searchParams.has('notice') || searchParams.has('error');

  useEffect(() => {
    if (!hasFlashParam) {
      return;
    }

    const nextParams = new URLSearchParams(search);
    nextParams.delete('notice');
    nextParams.delete('error');

    const nextSearch = nextParams.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [hasFlashParam, pathname, search]);

  return null;
}
