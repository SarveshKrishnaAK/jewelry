'use client';

import { useEffect, useRef } from 'react';

import { logoutAdminAction } from '@/app/actions/admin';

const ADMIN_HIDDEN_TAB_TIMEOUT_MS = 20 * 60 * 1000;

export function AdminSessionTimeout({ portalPath }: { portalPath: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearHiddenTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const submitLogout = () => {
      clearHiddenTimer();
      formRef.current?.requestSubmit();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        clearHiddenTimer();
        timeoutRef.current = window.setTimeout(submitLogout, ADMIN_HIDDEN_TAB_TIMEOUT_MS);
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;

      if (hiddenAt && Date.now() - hiddenAt >= ADMIN_HIDDEN_TAB_TIMEOUT_MS) {
        submitLogout();
        return;
      }

      clearHiddenTimer();
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearHiddenTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <form ref={formRef} action={logoutAdminAction} className="hidden">
      <input type="hidden" name="portalPath" value={portalPath} />
    </form>
  );
}
