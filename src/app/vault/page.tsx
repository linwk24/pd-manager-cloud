'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Search,
  Plus,
  Folder,
  KeyRound,
  Copy,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  Inbox,
  NotebookText,
  Upload,
  Download,
  FileJson,
  FileText,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';

import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EntryForm, EntryFormValues } from '@/components/vault/entry-form';
import { authedFetch, VaultEntry, listEntries, createEntry, updateEntry, deleteEntry, exportData, importData } from '@/lib/api';
import { Pagination } from '@/components/pagination';

const CATEGORY_KEY = 'vault.customCategories.v1';

const DEFAULT_CATEGORIES = ['默认', '社交', '工作', '金融', '其他'];

function VaultShell() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VaultEntry | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [mobileMenuOpenFor, setMobileMenuOpenFor] = useState<string | null>(null);
  const PAGE_SIZE = 50;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load: user + categories + entries
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('local_token');
        if (token) {
          const res = await authedFetch('/api/auth/me');
          const data = await res.json();
          if (!mounted) return;
          // 401 已被 authedFetch 拦截处理（跳 /login），这里只处理正常响应
          if (res.ok) {
            setUserEmail(data.user?.email ?? null);
          } else {
            setUserEmail(null);
          }
        } else {
          // 降级到旧版 Supabase auth
          const supabase = await getSupabaseBrowserClientWithRetry();
          const { data: { user } } = await supabase.auth.getUser();
          if (!mounted) return;
          setUserEmail(user?.email ?? null);
        }

        const stored = localStorage.getItem(CATEGORY_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setCustomCategories(parsed.filter((c) => typeof c === 'string'));
            }
          } catch {
            /* ignore */
          }
        }

        await refreshEntries();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function refreshEntries() {
    const data = await listEntries({ limit: PAGE_SIZE, offset: currentOffset });
    setEntries(data.data);
    setTotalEntries(data.total);
  }

  function goToPage(offset: number) {
    setCurrentOffset(offset);
    setEntries([]); // Clear while loading
    listEntries({ limit: PAGE_SIZE, offset }).then((data) => {
      setEntries(data.data);
      setTotalEntries(data.total);
    });
  }

  const allCategories = useMemo(() => {
    const fromEntries = entries.map((e) => e.category).filter((c): c is string => !!c);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories, ...fromEntries]));
  }, [entries, customCategories]);

  const filteredEntries = useMemo(() => {
    const s = search.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (activeCategory === '全部') return true;
        return e.category === activeCategory;
      })
      .filter((e) => {
        if (!s) return true;
        return (
          e.title.toLowerCase().includes(s) ||
          (e.username?.toLowerCase().includes(s) ?? false) ||
          (e.url?.toLowerCase().includes(s) ?? false) ||
          (e.notes?.toLowerCase().includes(s) ?? false)
        );
      });
  }, [entries, search, activeCategory]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    map.set('全部', entries.length);
    for (const e of entries) {
      const c = e.category ?? '默认';
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(entry: VaultEntry) {
    setEditing(entry);
    setFormOpen(true);
  }

  async function handleSubmit(values: EntryFormValues) {
    try {
      if (editing) {
        await updateEntry(editing.id, values);
        toast.success('已更新');
      } else {
        await createEntry(values);
        toast.success('已保存');
      }
      await refreshEntries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteEntry(confirmDelete.id);
      toast.success('已删除');
      setConfirmDelete(null);
      await refreshEntries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label}已复制`);
      return;
    } catch {
      // Clipboard API 失败，用 fallback
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success(`${label}已复制`);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  }

  async function handleLogout() {
    try {
      const localToken = localStorage.getItem('local_token');
      if (localToken) {
        localStorage.removeItem('local_token');
      } else {
        const supabase = await getSupabaseBrowserClientWithRetry();
        await supabase.auth.signOut();
      }
    } finally {
      window.location.href = '/login';
    }
  }

  function addCustomCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    if (allCategories.includes(name)) {
      toast.error('分类已存在');
      return;
    }
    const next = [...customCategories, name];
    setCustomCategories(next);
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(next));
    setActiveCategory(name);
    setNewCategoryName('');
    setShowNewCategory(false);
  }

  function deleteCustomCategory(name: string) {
    if (!customCategories.includes(name)) return;
    const next = customCategories.filter(c => c !== name);
    setCustomCategories(next);
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(next));
    if (activeCategory === name) {
      setActiveCategory('全部');
    }
    toast.success(`分类「${name}」已删除`);
  }

  function isDefaultCategory(name: string) {
    return DEFAULT_CATEGORIES.includes(name);
  }

  async function handleExport(format: 'json' | 'csv') {
    setExportMenuOpen(false);
    try {
      await exportData(format, 'all');
      toast.success('导出成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导出失败');
    }
  }

  function handleImportClick() {
    setExportMenuOpen(false);
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importData(file);
      if (result.success) {
        toast.success(result.message);
        await refreshEntries();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar - mobile: 2 rows (logo+actions / search); desktop: 1 row */}
      <header className="border-b border-border bg-card/40 backdrop-blur-sm sticky top-0 z-30 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <Image src="/logo.svg" alt="logo" width={28} height={28} className="rounded" unoptimized />
            <span className="font-serif-display text-base sm:text-lg tracking-wide">密码管家</span>
          </div>

          {/* Search: desktop inline, mobile below */}
          <div className="hidden sm:block flex-1 max-w-md relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索标题、用户名、网址、备注..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 bg-input/40"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Notes link - desktop only, mobile goes in user menu */}
            <a
              href="/notes"
              className="hidden sm:flex text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider items-center gap-1"
            >
              <NotebookText size={14} />
              笔记
            </a>

            {/* Mobile: search moved to second row below the top bar (visible) */}

            {/* New entry button - mobile compact icon only */}
            <Button
              onClick={openCreate}
              size="sm"
              className="sm:hidden h-9 w-9 p-0"
              aria-label="新增条目"
            >
              <Plus size={16} />
            </Button>

            {/* Export/Import dropdown - desktop only, mobile in user menu */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider flex items-center gap-1 h-9 px-3 rounded-md border border-border bg-card/60 hover:bg-accent/40"
              >
                <Download size={14} />
                备份
                <ChevronDown size={12} />
              </button>
              {exportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setExportMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-xl z-20">
                    <button
                      onClick={() => handleExport('json')}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-t-md"
                    >
                      <FileJson size={14} />
                      <span>导出 JSON</span>
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-b-md"
                    >
                      <FileText size={14} />
                      <span>导出 CSV</span>
                    </button>
                    <div className="border-t border-border" />
                    <button
                      onClick={handleImportClick}
                      disabled={importing}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-b-md disabled:opacity-50"
                    >
                      <Upload size={14} />
                      <span>{importing ? '导入中...' : '导入数据'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              className="hidden"
              onChange={handleImportFile}
            />

            <div className="text-xs text-muted-foreground hidden lg:flex items-center">
              <ShieldCheck size={12} className="inline-block mr-1.5 -mt-0.5" />
              仅本机登录可见
            </div>
            <div className="relative group">
              <button
                aria-label="用户菜单"
                className="h-9 px-2 sm:px-3 flex items-center gap-2 rounded-md border border-border bg-card/60 hover:bg-accent/40 transition-colors"
              >
                <span className="h-6 w-6 rounded-full bg-primary/30 text-primary-foreground flex items-center justify-center text-xs font-serif-display">
                  {(userEmail ?? '?').charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline text-xs text-muted-foreground max-w-[160px] truncate">
                  {userEmail ?? '加载中...'}
                </span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
                {/* Mobile-only: links that are too cramped for the top bar */}
                <a
                  href="/notes"
                  className="sm:hidden w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-t-md"
                >
                  <NotebookText size={14} />
                  <span>笔记</span>
                </a>
                <div className="sm:hidden border-t border-border" />
                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors"
                >
                  <FileJson size={14} />
                  <span>导出 JSON</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors"
                >
                  <FileText size={14} />
                  <span>导出 CSV</span>
                </button>
                <button
                  onClick={handleImportClick}
                  disabled={importing}
                  className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors disabled:opacity-50"
                >
                  <Upload size={14} />
                  <span>{importing ? '导入中...' : '导入数据'}</span>
                </button>
                <div className="border-t border-border" />
                <button
                  onClick={() => setConfirmLogout(true)}
                  className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-b-md"
                >
                  <LogOut size={14} />
                  <span>登出</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile search bar (full width, second row) */}
        <div className="sm:hidden border-t border-border/50 px-4 py-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索标题、用户名、网址、备注..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 bg-input/40 w-full"
            />
          </div>
        </div>
      </header>

      {/* Mobile categories chip strip (md-) */}
      <div className="md:hidden border-b border-border/50 bg-card/20">
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <ChipButton
            label="全部"
            count={categoryCounts.get('全部') ?? 0}
            active={activeCategory === '全部'}
            onClick={() => setActiveCategory('全部')}
          />
          {allCategories.map((c) => (
            <ChipButton
              key={c}
              label={c}
              count={categoryCounts.get(c) ?? 0}
              active={activeCategory === c}
              onClick={() => setActiveCategory(c)}
            />
          ))}
          {showNewCategory ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCustomCategory();
                  if (e.key === 'Escape') setShowNewCategory(false);
                }}
                placeholder="新分类"
                className="h-7 w-24 bg-input/40 text-xs"
                autoFocus
              />
              <button
                type="button"
                onClick={addCustomCategory}
                className="h-7 w-7 rounded-md bg-accent/60 text-sm flex items-center justify-center"
                aria-label="确认"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCategory(true)}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-dashed border-border transition-colors"
            >
              <Plus size={12} /> 新建
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-8 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 sm:gap-8">
        {/* Sidebar - desktop only, mobile uses chip strip above */}
        <aside className="hidden md:block">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-serif-display">
            分类
          </div>
          <div className="flex flex-col gap-1">
            <CategoryButton
              label="全部"
              count={categoryCounts.get('全部') ?? 0}
              active={activeCategory === '全部'}
              onClick={() => setActiveCategory('全部')}
            />
            {allCategories.map((c) => (
              <CategoryButton
                key={c}
                label={c}
                count={categoryCounts.get(c) ?? 0}
                active={activeCategory === c}
                onClick={() => setActiveCategory(c)}
                onDelete={() => deleteCustomCategory(c)}
                showDelete={!isDefaultCategory(c)}
              />
            ))}
            {showNewCategory ? (
              <div className="mt-1 flex gap-1.5">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomCategory();
                    if (e.key === 'Escape') setShowNewCategory(false);
                  }}
                  placeholder="新分类"
                  className="h-8 bg-input/40"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={addCustomCategory}
                  className="h-8 px-2"
                >
                  +
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewCategory(true)}
                className="mt-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1.5 transition-colors"
              >
                <Plus size={12} /> 新建分类
              </button>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0">
          <div className="flex items-end justify-between mb-4 sm:mb-6 gap-2">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-serif-display tracking-wide truncate">
                {activeCategory === '全部' ? '全部条目' : activeCategory}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 tracking-wider truncate">
                {loading
                  ? '正在取出您的密码...'
                  : filteredEntries.length > 0
                    ? `共 ${filteredEntries.length} 条`
                    : '这里还很安静'}
              </p>
            </div>
            <Button onClick={openCreate} className="hidden sm:inline-flex font-serif-display tracking-wider shrink-0">
              <Plus size={14} className="mr-1.5" />
              新增条目
            </Button>
          </div>

          {loading ? (
            <SkeletonList />
          ) : filteredEntries.length === 0 ? (
            <EmptyState hasAnyEntry={entries.length > 0} onCreate={openCreate} />
          ) : (
            <div>
              <ul className="flex flex-col gap-2">
                {filteredEntries.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    revealed={!!revealed[e.id]}
                    onToggleReveal={() => setRevealed((r) => ({ ...r, [e.id]: !r[e.id] }))}
                    onCopyUsername={() => e.username && copyText(e.username, '用户名')}
                    onCopyPassword={() => e.password && copyText(e.password, '密码')}
                    onEdit={() => openEdit(e)}
                    onDelete={() => setConfirmDelete(e)}
                    mobileMenuOpen={mobileMenuOpenFor === e.id}
                    onMobileMenuToggle={() => setMobileMenuOpenFor(mobileMenuOpenFor === e.id ? null : e.id)}
                  />
                ))}
              </ul>

              <Pagination
                total={totalEntries}
                pageSize={PAGE_SIZE}
                currentOffset={currentOffset}
                onPageChange={goToPage}
              />
            </div>
          )}
        </main>
      </div>

      {/* Form modal */}
      <EntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        categories={allCategories}
        onSubmit={handleSubmit}
      />

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmDialog
          title="删除这条密码？"
          description={
            <span>
              将永久删除 <span className="font-serif-display text-foreground">「{confirmDelete.title}」</span>，
              此操作不可撤销。
            </span>
          }
          confirmText="删除"
          confirmVariant="destructive"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Logout confirm */}
      {confirmLogout && (
        <ConfirmDialog
          title="确定登出？"
          description="登出后需要重新输入邮箱和密码。"
          confirmText="登出"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={handleLogout}
        />
      )}
    </div>
  );
}

function ChipButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border ${
        active
          ? 'bg-primary/15 border-primary/40 text-foreground'
          : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/30'
      }`}
    >
      <Folder size={11} className={active ? 'text-primary' : ''} />
      <span>{label}</span>
      <span className="text-[10px] opacity-60 font-mono-pretty">{count}</span>
    </button>
  );
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
  onDelete,
  showDelete,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all border group ${
        active
          ? 'bg-accent/60 border-border text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30'
      }`}
    >
      <span className="flex items-center gap-2">
        <Folder size={12} />
        {label}
      </span>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground font-mono-pretty">{count}</span>
        {showDelete && onDelete && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onDelete();
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded transition-all cursor-pointer"
            title="删除分类"
          >
            <Trash2 size={12} className="text-destructive" />
          </div>
        )}
      </div>
    </button>
  );
}

function EntryRow({
  entry,
  revealed,
  onToggleReveal,
  onCopyUsername,
  onCopyPassword,
  onEdit,
  onDelete,
  mobileMenuOpen,
  onMobileMenuToggle,
}: {
  entry: VaultEntry;
  revealed: boolean;
  onToggleReveal: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onEdit: () => void;
  onDelete: () => void;
  mobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
}) {
  return (
    <li className="group border border-border rounded-md bg-card/50 hover:bg-card/80 transition-colors px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-serif-display text-base tracking-wide truncate">{entry.title}</h3>
          {entry.category && (
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">
              {entry.category}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 min-w-0">
          {entry.username && <span className="truncate min-w-0">{entry.username}</span>}
          {entry.url && (
            <>
              <span className="opacity-40 shrink-0">·</span>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover-underline-reveal truncate min-w-0 hidden sm:inline-block"
              >
                {entry.url}
              </a>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Mobile: only show reveal button + overflow menu */}
        <IconButton
          title={revealed ? '隐藏密码' : '显示密码'}
          onClick={onToggleReveal}
          icon={revealed ? <EyeOff size={14} /> : <Eye size={14} />}
        />
        {/* Desktop: all actions visible */}
        <div className="hidden sm:flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          {entry.username && (
            <IconButton title="复制用户名" onClick={onCopyUsername} icon={<Copy size={14} />} />
          )}
          <IconButton
            title="复制密码（请在弹窗中确认）"
            onClick={onCopyPassword}
            icon={<KeyRound size={14} />}
          />
          <IconButton title="编辑" onClick={onEdit} icon={<Pencil size={14} />} />
          <IconButton title="删除" onClick={onDelete} icon={<Trash2 size={14} />} danger />
        </div>
        {/* Mobile: overflow menu */}
        <div className="sm:hidden relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMobileMenuToggle();
            }}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
            aria-label="更多操作"
          >
            <MoreVertical size={14} />
          </button>
          {mobileMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onMobileMenuToggle} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-md shadow-xl z-20">
                {entry.username && (
                  <button
                    onClick={() => { onCopyUsername(); onMobileMenuToggle(); }}
                    className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-t-md"
                  >
                    <Copy size={14} />
                    <span>复制用户名</span>
                  </button>
                )}
                <button
                  onClick={() => { onCopyPassword(); onMobileMenuToggle(); }}
                  className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors"
                >
                  <KeyRound size={14} />
                  <span>复制密码</span>
                </button>
                <div className="border-t border-border" />
                <button
                  onClick={() => { onEdit(); onMobileMenuToggle(); }}
                  className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors"
                >
                  <Pencil size={14} />
                  <span>编辑</span>
                </button>
                <button
                  onClick={() => { onDelete(); onMobileMenuToggle(); }}
                  className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 text-destructive transition-colors rounded-b-md"
                >
                  <Trash2 size={14} />
                  <span>删除</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function IconButton({
  title,
  onClick,
  icon,
  danger,
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${
        danger
          ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
      }`}
    >
      {icon}
    </button>
  );
}

function EmptyState({ hasAnyEntry, onCreate }: { hasAnyEntry: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-border rounded-lg bg-card/30">
      <Inbox size={32} className="text-muted-foreground/60 mb-4" />
      <h3 className="font-serif-display text-lg tracking-wide">
        {hasAnyEntry ? '该分类下还没有条目' : '这里还很安静'}
      </h3>
      <p className="text-xs text-muted-foreground mt-2 max-w-xs">
        {hasAnyEntry
          ? '试试切换到其他分类，或新增一条属于这里的密码。'
          : '把第一个账号交给管家吧——从此不必再为忘记密码而翻遍便签。'}
      </p>
      <Button onClick={onCreate} className="mt-6 font-serif-display tracking-wider">
        <Plus size={14} className="mr-1.5" />
        新增第一条
      </Button>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="border border-border rounded-md bg-card/40 px-4 py-3 h-[68px] animate-pulse"
        />
      ))}
    </ul>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmText,
  confirmVariant,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: React.ReactNode;
  confirmText: string;
  confirmVariant?: 'destructive';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-card border border-border rounded-lg shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif-display text-lg tracking-wide">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onCancel} className="font-serif-display tracking-wider">
            取消
          </Button>
          <Button
            onClick={onConfirm}
            variant={confirmVariant === 'destructive' ? 'destructive' : 'default'}
            className="font-serif-display tracking-wider"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VaultPage() {
  return (
    <AuthGuard requireAuth>
      <VaultShell />
    </AuthGuard>
  );
}
