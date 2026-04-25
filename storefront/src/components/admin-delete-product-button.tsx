'use client';

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
  return (
    <button
      type="submit"
      formAction={action}
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
