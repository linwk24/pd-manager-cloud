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
        let isAuthed = false;

        if (localToken) {
          // SQLite 模式：直接调 /api/auth/me 验证 token 有效性，过期会拿到 401
          try {
            const res = await fetch('/api/auth/me', {
              headers: { 'x-session': localToken },
            });
            if (res.ok) {
              isAuthed = true;
            } else if (res.status === 401) {
              // token 已失效，清掉避免后续无效请求
              localStorage.removeItem('local_token');
            }
          } catch {
            isAuthed = false;
          }
        } else {
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
          const from = encodeURIComponent(window.location.pathname + window.location.search);
          router.replace(`/login?from=${from}`);
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
