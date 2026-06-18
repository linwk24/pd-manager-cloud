'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: ReactNode;
  /** true = 需要登录才能访问；false = 已登录则跳走 */
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 检查是否 SQLite 模式（通过 localStorage token）
        const localToken = localStorage.getItem('local_token');
        let isAuthed = !!localToken;

        if (!localToken) {
          // Supabase 模式
          try {
            const mod = await import('@/lib/supabase-browser');
            const supabase = await mod.getSupabaseBrowserClientWithRetry();
            const { data: { session } } = await supabase.auth.getSession();
            isAuthed = !!session;
          } catch {
            isAuthed = false;
          }
        }

        if (!mounted) return;

        if (requireAuth && !isAuthed) {
          router.replace('/login');
          return;
        }
        if (!requireAuth && isAuthed) {
          router.replace('/vault');
          return;
        }
        setAllowed(true);
      } catch {
        if (!mounted) return;
        if (requireAuth) {
          router.replace('/login');
        } else {
          setAllowed(true);
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [requireAuth, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground font-serif-display tracking-widest">
          请稍候
        </div>
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
