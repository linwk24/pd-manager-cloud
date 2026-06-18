'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      theme="dark"
      toastOptions={{
        style: {
          background: 'oklch(0.23 0.025 65)',
          border: '1px solid oklch(0.32 0.02 65)',
          color: 'oklch(0.92 0.02 80)',
          fontFamily: 'var(--font-sans)',
        },
        className: 'font-serif-display',
      }}
    />
  );
}
