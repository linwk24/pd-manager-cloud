'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Eye, EyeOff, Globe, StickyNote, Folder, KeyRound, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VaultEntry } from '@/lib/api';

export interface EntryFormValues {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  category: string;
}

export const EMPTY_ENTRY: EntryFormValues = {
  title: '',
  username: '',
  password: '',
  url: '',
  notes: '',
  category: '默认',
};

interface EntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: VaultEntry | null;
  categories: string[];
  onSubmit: (values: EntryFormValues) => Promise<void>;
}

export function EntryForm({
  open,
  onOpenChange,
  initial,
  categories,
  onSubmit,
}: EntryFormProps) {
  const [values, setValues] = useState<EntryFormValues>(EMPTY_ENTRY);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? {
              title: initial.title,
              username: initial.username ?? '',
              password: initial.password ?? '',
              url: initial.url ?? '',
              notes: initial.notes ?? '',
              category: initial.category ?? '默认',
            }
          : EMPTY_ENTRY,
      );
      setShowPassword(false);
      setNewCategory('');
    }
  }, [open, initial]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!values.title.trim()) return;
    if (!values.password) return;
    setSubmitting(true);
    try {
      const finalCategory = newCategory.trim() || values.category.trim() || '默认';
      await onSubmit({ ...values, category: finalCategory });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 animate-fade-in-up"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-lg sm:rounded-lg shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border shrink-0">
          <h2 className="text-lg font-serif-display tracking-wide">
            {initial ? '编辑条目' : '新增条目'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 tracking-wider">
            {initial ? 'Refine the details' : 'Add a new secret to your vault'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 overflow-y-auto flex-1 safe-bottom">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title" className="text-xs font-serif-display tracking-widest uppercase text-muted-foreground">
                标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={values.title}
                onChange={(e) => setValues({ ...values, title: e.target.value })}
                placeholder="例如：GitHub 账号"
                className="h-10 bg-input/40"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username" className="text-xs font-serif-display tracking-widest uppercase text-muted-foreground">
                  用户名 / 邮箱
                </Label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    value={values.username}
                    onChange={(e) => setValues({ ...values, username: e.target.value })}
                    placeholder="me@example.com"
                    className="h-10 pl-9 bg-input/40"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-xs font-serif-display tracking-widest uppercase text-muted-foreground">
                  密码 <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                    onChange={(e) => setValues({ ...values, password: e.target.value })}
                    placeholder="••••••••"
                    className="h-10 pl-9 pr-10 bg-input/40 font-mono-pretty"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="url" className="text-xs font-serif-display tracking-widest uppercase text-muted-foreground">
                  网站
                </Label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="url"
                    value={values.url}
                    onChange={(e) => setValues({ ...values, url: e.target.value })}
                    placeholder="https://..."
                    className="h-10 pl-9 bg-input/40"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category" className="text-xs font-serif-display tracking-widest uppercase text-muted-foreground">
                  分类
                </Label>
                <div className="relative">
                  <Folder size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
                  <select
                    id="category"
                    value={values.category}
                    onChange={(e) => setValues({ ...values, category: e.target.value })}
                    className="h-10 w-full pl-9 pr-3 rounded-md bg-input/40 border border-input text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from(new Set([...categories, values.category])).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newCategory" className="text-xs font-serif-display tracking-widest uppercase text-muted-foreground">
                或新建分类（覆盖上面所选）
              </Label>
              <Input
                id="newCategory"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="例如：娱乐"
                className="h-10 bg-input/40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes" className="text-xs font-serif-display tracking-widest uppercase text-muted-foreground">
                备注
              </Label>
              <div className="relative">
                <StickyNote size={14} className="absolute left-3 top-3 text-muted-foreground" />
                <Textarea
                  id="notes"
                  value={values.notes}
                  onChange={(e) => setValues({ ...values, notes: e.target.value })}
                  placeholder="任何你希望记下的信息..."
                  className="min-h-[80px] pl-9 bg-input/40 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-serif-display tracking-wider"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="font-serif-display tracking-wider"
            >
              {submitting ? '保存中' : initial ? '更新' : '保存'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
