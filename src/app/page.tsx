'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const localToken = localStorage.getItem('local_token');
    if (localToken) {
      router.replace('/vault');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-sm text-muted-foreground font-serif-display tracking-widest animate-pulse">
        加载中...
      </div>
    </div>
  );
}
