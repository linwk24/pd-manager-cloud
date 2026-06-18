'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, Database, Cloud } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthGuard } from '@/components/auth-guard';

const APP_NAME = '密码管家';

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'supabase' | 'sqlite'>('supabase');

  useEffect(() => {
    fetch('/api/storage-mode')
      .then((r) => r.json())
      .then((d) => d.mode && setMode(d.mode))
      .catch(() => {});
  }, []);

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

      router.replace('/vault');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  async function toggleMode() {
    const newMode = mode === 'supabase' ? 'sqlite' : 'supabase';
    try {
      const res = await fetch('/api/storage-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();
      if (res.ok) {
        setMode(newMode);
        toast.success(data.message);
      }
    } catch { /* ignore */ }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Mode switch */}
      <div className="flex justify-center mb-2">
        <button
          type="button"
          onClick={toggleMode}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          {mode === 'supabase' ? <Cloud size={12} /> : <Database size={12} />}
          <span>{mode === 'supabase' ? '☁️ 云端模式' : '💻 本地模式'}</span>
          <span className="text-[10px] opacity-50">点击切换</span>
        </button>
      </div>

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

      <div className="text-center text-sm text-muted-foreground mt-2">
        还没有账号？
        <Link
          href="/register"
          className="ml-1 font-serif-display tracking-wide text-foreground hover-underline-reveal"
        >
          去注册
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] card-texture border border-border rounded-lg bg-card p-10 shadow-2xl animate-fade-in-up">
          <div className="flex flex-col items-center gap-3 mb-8">
            <Image
              src="/logo.svg"
              alt={APP_NAME}
              width={56}
              height={56}
              className="rounded-md"
              unoptimized
              priority
            />
            <h1 className="text-2xl font-serif-display tracking-wide text-foreground">
              {APP_NAME}
            </h1>
            <p className="text-xs text-muted-foreground tracking-widest uppercase">
              Welcome back
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </AuthGuard>
  );
}
