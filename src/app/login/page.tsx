'use client';

import { useState, FormEvent } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthGuard } from '@/components/auth-guard';

const APP_NAME = '密码管家';

/** 只接受同源相对路径（防开放重定向到外部站点）*/
function getSafeRedirectPath(raw: string | null): string {
  if (!raw) return '/vault';
  let p: string;
  try {
    p = decodeURIComponent(raw);
  } catch {
    return '/vault';
  }
  // 必须以 / 开头，但不能是 //（协议相对 URL）
  if (!p.startsWith('/') || p.startsWith('//')) return '/vault';
  return p;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('请输入邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || '登录失败');
        return;
      }

      // 保存 token 到 localStorage
      localStorage.setItem('local_token', data.token);

      // 登录后跳回 from 指定的页面（认证失败时记录的来源页）
      const redirectTo = getSafeRedirectPath(searchParams.get('from'));
      router.replace(redirectTo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-sm font-serif-display tracking-wide">
          邮箱
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 bg-input/40 border-border"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-sm font-serif-display tracking-wide">
          密码
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 pr-10 bg-input/40 border-border font-mono-pretty"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-11 mt-2 font-serif-display tracking-wider"
      >
        {loading ? (
          <span className="text-sm">正在进入</span>
        ) : (
          <>
            <LogIn size={16} className="mr-2" />
            <span>登录</span>
          </>
        )}
      </Button>

      <div className="text-center text-xs text-muted-foreground">
        还没有账号？{' '}
        <Link href="/register" className="hover-underline-reveal text-primary">
          立即注册
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen flex items-center justify-center p-4 safe-top safe-bottom">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Image src="/logo.svg" alt="Logo" width={32} height={32} />
            </div>
            <h1 className="text-2xl font-serif-display tracking-wider">{APP_NAME}</h1>
            <p className="text-sm text-muted-foreground mt-2">安全存储您的密码</p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
