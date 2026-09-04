'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Folder,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  LogOut,
  Book,
  NotebookText,
  Download,
  Upload,
  FileJson,
  FileText,
  ChevronDown,
  FileCode,
  Table,
  X,
  Trash2Icon,
  RotateCcw,
  Check,
  Square,
  CheckSquare,
  XCircle,
  LayoutGrid,
  LayoutList,
  MoreVertical,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TipTapEditor } from '@/components/tiptap-editor';
import { Note, listNotes, createNote, updateNote, deleteNote, softDeleteNote, restoreNote, permanentlyDeleteNote, listDeletedNotes, emptyTrash, exportData, exportNote, importData } from '@/lib/api';
import { Pagination } from '@/components/pagination';

const CATEGORY_KEY = 'notes.customCategories.v1';
const DEFAULT_CATEGORIES = ['默认', '工作', '个人', '灵感', '其他'];

function NotesShell() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Editor state
  const [editing, setEditing] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('默认');
  const [editorOpen, setEditorOpen] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<Note | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // New category
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Export/Import
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [totalNotes, setTotalNotes] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const PAGE_SIZE = 50;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch selection
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Trash
  const [showTrash, setShowTrash] = useState(false);
  const [trashNotes, setTrashNotes] = useState<Note[]>([]);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('local_token');
        if (token) {
          const res = await fetch('/api/auth/me', {
            headers: { 'x-session': token }
          });
          const data = await res.json();
          if (!mounted) return;
          setUserEmail(data.user?.email ?? null);
        } else {
          const supabase = await getSupabaseBrowserClientWithRetry();
          const { data: { user } } = await supabase.auth.getUser();
          if (!mounted) return;
          setUserEmail(user?.email ?? null);
        }

        const stored = localStorage.getItem(CATEGORY_KEY);
        if (stored) {
          try { setCustomCategories(JSON.parse(stored).filter((c: unknown) => typeof c === 'string')); }
          catch { /* ignore */ }
        }

        await refreshNotes();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function refreshNotes() {
    const data = await listNotes({ limit: PAGE_SIZE, offset: currentOffset });
    setNotes(data.data);
    setTotalNotes(data.total);
  }

  function goToPage(offset: number) {
    setCurrentOffset(offset);
    setNotes([]); // Clear while loading
    listNotes({ limit: PAGE_SIZE, offset }).then((data) => {
      setNotes(data.data);
      setTotalNotes(data.total);
    });
  }

  const allCategories = useMemo(() => {
    const fromNotes = notes.map((n) => n.category).filter((c): c is string => !!c);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories, ...fromNotes]));
  }, [notes, customCategories]);

  const filteredNotes = useMemo(() => {
    const s = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (activeCategory !== '全部' && n.category !== activeCategory) return false;
      if (!s) return true;
      const plainContent = n.content.replace(/<[^>]*>/g, '');
      return (
        n.title.toLowerCase().includes(s) ||
        plainContent.toLowerCase().includes(s)
      );
    });
  }, [notes, search, activeCategory]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    map.set('全部', notes.length);
    for (const n of notes) {
      map.set(n.category ?? '默认', (map.get(n.category ?? '默认') ?? 0) + 1);
    }
    return map;
  }, [notes]);

  function openCreate() {
    setEditing(null);
    setEditTitle('');
    setEditContent('');
    setEditCategory('默认');
    setEditorOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category ?? '默认');
    setEditorOpen(true);
  }

  async function handleSave() {
    if (!editTitle.trim() && !editContent.trim()) {
      toast.error('标题或内容不能为空');
      return;
    }
    try {
      if (editing) {
        await updateNote(editing.id, { title: editTitle, content: editContent, category: editCategory });
        toast.success('已更新');
      } else {
        await createNote({ title: editTitle, content: editContent, category: editCategory, pinned: false });
        toast.success('已保存');
      }
      setEditorOpen(false);
      await refreshNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await softDeleteNote(confirmDelete.id);
      toast.success('已移入回收站');
      setConfirmDelete(null);
      await refreshNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  }

  // Batch selection functions
  function toggleSelectNote(id: string) {
    const next = new Set(selectedNotes);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedNotes(next);
  }

  function toggleSelectAll() {
    if (selectedNotes.size === filteredNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(filteredNotes.map((n) => n.id)));
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedNotes(new Set());
  }

  async function batchDelete() {
    if (selectedNotes.size === 0) return;
    try {
      for (const id of selectedNotes) {
        await softDeleteNote(id);
      }
      toast.success(`已移入回收站 (${selectedNotes.size} 条)`);
      setSelectedNotes(new Set());
      setSelectMode(false);
      await refreshNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '批量删除失败');
    }
  }

  // Trash functions
  async function loadTrash() {
    try {
      const notes = await listDeletedNotes();
      setTrashNotes(notes);
      setShowTrash(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取回收站失败');
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreNote(id);
      toast.success('已恢复');
      await loadTrash();
      await refreshNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '恢复失败');
    }
  }

  async function handlePermanentDelete(id: string) {
    try {
      await permanentlyDeleteNote(id);
      toast.success('已永久删除');
      await loadTrash();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '永久删除失败');
    }
  }

  async function handleEmptyTrash() {
    try {
      await emptyTrash();
      toast.success('回收站已清空');
      setConfirmEmptyTrash(false);
      setShowTrash(false);
      await refreshNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '清空失败');
    }
  }

  async function togglePin(note: Note) {
    try {
      await updateNote(note.id, { pinned: !note.pinned });
      await refreshNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
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
    if (allCategories.includes(name)) { toast.error('分类已存在'); return; }
    const next = [...customCategories, name];
    setCustomCategories(next);
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(next));
    setActiveCategory(name);
    setNewCategoryName('');
    setShowNewCategory(false);
  }

  function deleteCustomCategory(category: string) {
    if (DEFAULT_CATEGORIES.includes(category)) return;
    const next = customCategories.filter((c) => c !== category);
    setCustomCategories(next);
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(next));
    if (activeCategory === category) {
      setActiveCategory('默认');
    }
    toast.success(`已删除分类「${category}」`);
  }

  function isCustomCategory(category: string): boolean {
    return !DEFAULT_CATEGORIES.includes(category);
  }

  async function handleExport(format: 'json' | 'csv' | 'pdf') {
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
        await refreshNotes();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  // ---- Render ----
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card/40 backdrop-blur-sm sticky top-0 z-30 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <NotebookText size={20} className="text-primary shrink-0" />
            <h1 className="font-serif-display text-base sm:text-lg tracking-wide truncate">笔记</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Trash button - desktop full, mobile icon only */}
            <button
              onClick={loadTrash}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider h-9 w-9 sm:w-auto sm:px-3 rounded-md border border-border bg-card/60 hover:bg-accent/40 flex items-center justify-center sm:gap-1"
              title="回收站"
              aria-label="回收站"
            >
              <Trash2Icon size={14} />
              <span className="hidden sm:inline">回收站</span>
            </button>

            {/* Select mode button */}
            <button
              onClick={() => {
                if (selectMode) {
                  exitSelectMode();
                } else {
                  setSelectMode(true);
                }
              }}
              className={`text-xs tracking-wider h-9 w-9 sm:w-auto sm:px-3 rounded-md border flex items-center justify-center sm:gap-1 transition-colors ${
                selectMode
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground border-border bg-card/60 hover:bg-accent/40'
              }`}
              title={selectMode ? '取消' : '选择'}
              aria-label={selectMode ? '取消' : '选择'}
            >
              {selectMode ? <X size={14} /> : <CheckSquare size={14} />}
              <span className="hidden sm:inline">{selectMode ? '取消' : '选择'}</span>
            </button>

            {/* Batch delete button */}
            {selectMode && selectedNotes.size > 0 && (
              <button
                onClick={batchDelete}
                className="text-xs text-red-500 hover:text-red-600 transition-colors tracking-wider h-9 w-9 sm:w-auto sm:px-3 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-center sm:gap-1"
                title={`删除选中 (${selectedNotes.size})`}
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">删除 ({selectedNotes.size})</span>
              </button>
            )}

            {/* Mobile: More menu (returns + backup + user info + logout) */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-card/60 hover:bg-accent/40 text-muted-foreground"
                aria-label="更多"
              >
                <MoreVertical size={14} />
              </button>
              {mobileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMobileMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-popover border border-border rounded-md shadow-xl z-20">
                    <a
                      href="/vault"
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-t-md"
                    >
                      <Shield size={14} />
                      <span>返回保险箱</span>
                    </a>
                    <div className="border-t border-border" />
                    <button
                      onClick={() => { handleExport('pdf'); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors"
                    >
                      <FileCode size={14} />
                      <span>导出 HTML</span>
                    </button>
                    <button
                      onClick={() => { handleExport('json'); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors"
                    >
                      <FileJson size={14} />
                      <span>导出 JSON</span>
                    </button>
                    <button
                      onClick={() => { handleExport('csv'); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors"
                    >
                      <Table size={14} />
                      <span>导出 CSV</span>
                    </button>
                    <button
                      onClick={() => { handleImportClick(); setMobileMenuOpen(false); }}
                      disabled={importing}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors disabled:opacity-50"
                    >
                      <Upload size={14} />
                      <span>{importing ? '导入中...' : '导入数据'}</span>
                    </button>
                    <div className="border-t border-border" />
                    <div className="px-3 py-2 text-xs text-muted-foreground truncate">
                      {userEmail ?? '加载中...'}
                    </div>
                    <button
                      onClick={() => { setConfirmLogout(true); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-b-md text-destructive"
                    >
                      <LogOut size={14} />
                      <span>登出</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Export/Import dropdown - desktop only */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider h-9 px-3 rounded-md border border-border bg-card/60 hover:bg-accent/40 flex items-center gap-1"
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
                  <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-md shadow-xl z-20">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-t-md"
                    >
                      <FileCode size={14} />
                      <span>导出 HTML 文本</span>
                    </button>
                    <div className="border-t border-border my-1" />
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      全量备份
                    </div>
                    <button
                      onClick={() => handleExport('json')}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors"
                    >
                      <FileJson size={14} />
                      <span>导出 JSON</span>
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-b-md"
                    >
                      <Table size={14} />
                      <span>导出 CSV</span>
                    </button>
                    <div className="border-t border-border my-1" />
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              className="hidden"
              onChange={handleImportFile}
            />

            <a
              href="/vault"
              className="hidden sm:inline-block text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider"
            >
              ← 返回保险箱
            </a>
            <span className="hidden lg:inline text-xs text-muted-foreground max-w-[160px] truncate">{userEmail}</span>
            <button
              onClick={() => setConfirmLogout(true)}
              className="hidden sm:flex h-9 w-9 text-muted-foreground hover:text-foreground transition-colors items-center justify-center"
              title="退出登录"
              aria-label="退出登录"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile categories chip strip (sm-) */}
      <div className="sm:hidden border-b border-border/50 bg-card/20">
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border ${
                activeCategory === cat
                  ? 'bg-primary/15 border-primary/40 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/30'
              }`}
            >
              <Folder size={11} className={activeCategory === cat ? 'text-primary' : ''} />
              <span>{cat}</span>
              <span className="text-[10px] opacity-60 font-mono-pretty">{categoryCounts.get(cat) ?? 0}</span>
            </button>
          ))}
          {!showNewCategory ? (
            <button
              onClick={() => setShowNewCategory(true)}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-dashed border-border transition-colors"
            >
              <Plus size={12} /> 新建
            </button>
          ) : (
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
          )}
        </div>
      </div>

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 gap-4 sm:gap-6">
        {/* Sidebar - desktop only */}
        <aside className="hidden sm:flex w-48 shrink-0 flex-col gap-1">
          <Button
            variant="default"
            size="sm"
            className="w-full justify-start gap-2 mb-2"
            onClick={openCreate}
          >
            <Plus size={14} /> 新笔记
          </Button>

          {allCategories.map((cat) => (
            <CategoryButton
              key={cat}
              label={cat}
              count={categoryCounts.get(cat) ?? 0}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              canDelete={isCustomCategory(cat)}
              onDelete={() => deleteCustomCategory(cat)}
            />
          ))}

          {!showNewCategory ? (
            <button
              onClick={() => setShowNewCategory(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              + 新建分类
            </button>
          ) : (
            <div className="flex gap-1 px-1">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="分类名"
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
              />
              <Button size="sm" className="h-7 text-xs" onClick={addCustomCategory}>确定</Button>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Search bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索笔记..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}
                title="网格视图"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}
                title="列表视图"
              >
                <LayoutList size={16} />
              </button>
            </div>
          </div>

          {/* Note list */}
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-24 bg-card/30 animate-pulse rounded-md border border-border" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Book size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">还没有笔记</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                写第一条笔记
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Select all checkbox */}
              {selectMode && filteredNotes.length > 0 && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {selectedNotes.size === filteredNotes.length ? (
                      <CheckSquare size={18} className="text-primary" />
                    ) : (
                      <Square size={18} />
                    )}
                    <span>全选</span>
                  </button>
                  <span className="text-xs text-muted-foreground">
                    已选择 {selectedNotes.size} 项
                  </span>
                </div>
              )}

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredNotes.map((note) => (
                    <div key={note.id} className="relative group">
                      {/* Selection checkbox */}
                      {selectMode && (
                        <button
                          onClick={() => toggleSelectNote(note.id)}
                          className="absolute top-3 left-3 z-10 p-1 bg-background/80 rounded"
                        >
                          {selectedNotes.has(note.id) ? (
                            <CheckSquare size={20} className="text-primary" />
                          ) : (
                            <Square size={20} className="text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <NoteCard
                        note={note}
                        onEdit={() => openEdit(note)}
                        onDelete={() => setConfirmDelete(note)}
                        onTogglePin={() => togglePin(note)}
                        selectMode={selectMode}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center gap-3 p-3 border border-border rounded-md bg-card hover:bg-accent/30 transition-colors group"
                    >
                      {selectMode && (
                        <button
                          onClick={() => toggleSelectNote(note.id)}
                          className="shrink-0"
                        >
                          {selectedNotes.has(note.id) ? (
                            <CheckSquare size={20} className="text-primary" />
                          ) : (
                            <Square size={20} className="text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(note)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-serif-display text-sm truncate ${note.pinned ? 'font-semibold' : ''}`}>
                            {note.title || <span className="text-muted-foreground/50 italic">无标题</span>}
                          </span>
                          {note.pinned ? <Pin size={12} className="shrink-0 text-amber-500" /> : null}
                        </div>
                        <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                          {note.content.replace(/<[^>]*>/g, '').slice(0, 80) || '无内容'}
                        </p>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        {note.category && (
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border rounded px-1.5 py-0.5">
                            {note.category}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => togglePin(note)}
                          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={note.pinned ? '取消置顶' : '置顶'}
                        >
                          {note.pinned ? (
                            <Pin size={14} className="text-amber-500" />
                          ) : (
                            <PinOff size={14} className="text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(note)}
                          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Pagination
                total={totalNotes}
                pageSize={PAGE_SIZE}
                currentOffset={currentOffset}
                onPageChange={goToPage}
              />
            </div>
          )}
        </main>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4"
          onClick={() => setEditorOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between gap-2">
              <h2 className="font-serif-display text-base tracking-wide">
                {editing ? '编辑笔记' : '新笔记'}
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="bg-transparent border border-border rounded px-2 py-1 text-xs text-muted-foreground"
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-3 p-6 overflow-y-auto">
              <Input
                placeholder="标题（可选）"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-base font-serif-display border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40"
              />
              <TipTapEditor
                content={editContent}
                onChange={setEditContent}
                placeholder="写下你的想法..."
              />
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditorOpen(false)}>取消</Button>
              <Button size="sm" onClick={handleSave}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-card border border-border rounded-lg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif-display text-base mb-2">确认删除</h3>
            <p className="text-sm text-muted-foreground mb-4">
              笔记「{confirmDelete.title || '无标题'}」将被永久删除，不可恢复。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>取消</Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>删除</Button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirm */}
      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmLogout(false)}
        >
          <div
            className="w-full max-w-sm bg-card border border-border rounded-lg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif-display text-base mb-2">退出登录</h3>
            <p className="text-sm text-muted-foreground mb-4">确定要退出登录吗？</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmLogout(false)}>取消</Button>
              <Button variant="destructive" size="sm" onClick={handleLogout}>退出</Button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Modal */}
      {showTrash && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4"
          onClick={() => setShowTrash(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] bg-card border border-border rounded-lg shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border gap-2">
              <div className="flex items-center gap-2">
                <Trash2Icon size={20} className="text-muted-foreground" />
                <h2 className="font-serif-display text-lg">回收站</h2>
                <span className="text-sm text-muted-foreground">({trashNotes.length} 条)</span>
              </div>
              <div className="flex items-center gap-2">
                {trashNotes.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmEmptyTrash(true)}
                    className="text-xs"
                  >
                    <XCircle size={14} className="mr-1" />
                    清空回收站
                  </Button>
                )}
                <button
                  onClick={() => setShowTrash(false)}
                  className="p-1 rounded-md hover:bg-accent/40 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {trashNotes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trash2Icon size={48} className="mx-auto mb-4 opacity-30" />
                  <p>回收站为空</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {trashNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center gap-3 p-4 border border-border rounded-md bg-card/50 hover:bg-card/80 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif-display text-sm truncate">
                            {note.title || <span className="text-muted-foreground/50 italic">无标题</span>}
                          </h3>
                          {note.category && (
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">
                              {note.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          删除于 {new Date(note.deleted_at || note.updated_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(note.id)}
                          className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <RotateCcw size={14} className="mr-1" />
                          恢复
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePermanentDelete(note.id)}
                          className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <XCircle size={14} className="mr-1" />
                          永久删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                回收站中的笔记将在 30 天后自动永久删除
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty Trash Confirm Modal */}
      {confirmEmptyTrash && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmEmptyTrash(false)}
        >
          <div
            className="w-full max-w-sm bg-card border border-border rounded-lg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif-display text-base mb-2">清空回收站</h3>
            <p className="text-sm text-muted-foreground mb-4">
              确定要清空回收站吗？这将永久删除 {trashNotes.length} 条笔记，此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmEmptyTrash(false)}>取消</Button>
              <Button variant="destructive" size="sm" onClick={handleEmptyTrash}>确认清空</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  selectMode = false,
}: {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  selectMode?: boolean;
}) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  async function handleExport(format: 'markdown' | 'pdf') {
    setExportMenuOpen(false);
    try {
      await exportNote(note.id, format);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导出失败');
    }
  }

  return (
    <div className={`group border border-border rounded-md bg-card/50 hover:bg-card/80 transition-colors px-5 py-4 ${selectMode ? 'pl-12' : 'px-5'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {note.pinned && <Pin size={12} className="text-primary shrink-0" />}
            <h3 className="font-serif-display text-base tracking-wide truncate">
              {note.title || <span className="text-muted-foreground/50 italic">无标题</span>}
            </h3>
            {note.category && (
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">
                {note.category}
              </span>
            )}
          </div>
          <p
            className="text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed [&_h1]:text-base [&_h1]:font-serif-display [&_h2]:text-sm [&_h2]:font-serif-display [&_p]:inline [&_br]:hidden"
            dangerouslySetInnerHTML={{ __html: note.content || '<span class="italic opacity-40">空白</span>' }}
          />
          <p className="text-[10px] text-muted-foreground/40 mt-2 tracking-wider">
            {new Date(note.updated_at).toLocaleString()}
          </p>
        </div>
        {!selectMode && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <div className="relative">
            <IconButton
              title="导出"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              icon={<Download size={14} />}
            />
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-md shadow-xl z-20">
                  <button
                    onClick={() => handleExport('markdown')}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-t-md"
                  >
                    <FileText size={14} />
                    导出 Markdown
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent/40 transition-colors rounded-b-md"
                  >
                    <FileCode size={14} />
                    导出 PDF
                  </button>
                </div>
              </>
            )}
          </div>
          <IconButton title={note.pinned ? '取消置顶' : '置顶'} onClick={onTogglePin} icon={note.pinned ? <PinOff size={14} /> : <Pin size={14} />} />
          <IconButton title="编辑" onClick={onEdit} icon={<Pencil size={14} />} />
          <IconButton title="删除" onClick={onDelete} icon={<Trash2 size={14} />} danger />
        </div>
        )}
      </div>
    </div>
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
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        danger
          ? 'hover:bg-destructive/20 hover:text-destructive'
          : 'hover:bg-accent/50 hover:text-foreground'
      } text-muted-foreground`}
    >
      {icon}
    </button>
  );
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
  onDelete,
  canDelete,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
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
        <span className="truncate max-w-[100px]">{label}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground font-mono-pretty">{count}</span>
        {canDelete && onDelete && (
          <span
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-opacity"
          >
            <X size={12} />
          </span>
        )}
      </span>
    </button>
  );
}

export default function NotesPage() {
  return (
    <AuthGuard>
      <NotesShell />
    </AuthGuard>
  );
}
