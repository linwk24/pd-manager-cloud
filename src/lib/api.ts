'use client';

import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';

export interface VaultEntry {
  id: string;
  title: string;
  username: string | null;
  password?: string;
  url: string | null;
  notes: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

async function getToken(): Promise<string> {
  // SQLite 模式：用 localStorage 的 token
  const localToken = localStorage.getItem('local_token');
  if (localToken) return localToken;

  // Supabase 模式：用 session token
  const supabase = await getSupabaseBrowserClientWithRetry();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('未登录');
  }
  return session.access_token;
}

async function authedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set('x-session', token);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, { ...init, headers });
  return res;
}

export interface PaginatedResponse<T> {
  total: number;
  limit: number;
  offset: number;
  data: T[];
}

export async function listEntries(
  params: { q?: string; category?: string; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<VaultEntry>> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.category) search.set('category', params.category);
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const qs = search.toString();
  const res = await authedFetch(`/api/entries${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error ?? '请求失败');
  }
  const result = (await res.json()) as { entries: VaultEntry[]; total: number; limit: number; offset: number };
  return { data: result.entries, total: result.total, limit: result.limit, offset: result.offset };
}

export async function createEntry(
  payload: Omit<VaultEntry, 'id' | 'created_at' | 'updated_at'>,
): Promise<VaultEntry> {
  const res = await authedFetch('/api/entries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '创建失败' }));
    throw new Error(err.error ?? '创建失败');
  }
  const { entry } = (await res.json()) as { entry: VaultEntry };
  return entry;
}

export async function getEntry(id: string): Promise<VaultEntry> {
  const res = await authedFetch(`/api/entries/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '查询失败' }));
    throw new Error(err.error ?? '查询失败');
  }
  const { entry } = (await res.json()) as { entry: VaultEntry };
  return entry;
}

export async function updateEntry(
  id: string,
  payload: Partial<Omit<VaultEntry, 'id' | 'created_at' | 'updated_at'>>,
): Promise<VaultEntry> {
  const res = await authedFetch(`/api/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '更新失败' }));
    throw new Error(err.error ?? '更新失败');
  }
  const { entry } = (await res.json()) as { entry: VaultEntry };
  return entry;
}

export async function deleteEntry(id: string): Promise<void> {
  const res = await authedFetch(`/api/entries/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '删除失败' }));
    throw new Error(err.error ?? '删除失败');
  }
}

// ===== Notes =====

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string | null;
  pinned: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export async function listNotes(params: { category?: string; limit?: number; offset?: number } = {}): Promise<PaginatedResponse<Note>> {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const qs = search.toString();
  const res = await authedFetch(`/api/notes${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error ?? '请求失败');
  }
  const result = (await res.json()) as { notes: Note[]; total: number; limit: number; offset: number };
  return { data: result.notes, total: result.total, limit: result.limit, offset: result.offset };
}

export async function createNote(
  payload: Omit<Note, 'id' | 'created_at' | 'updated_at'>,
): Promise<Note> {
  const res = await authedFetch('/api/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '创建失败' }));
    throw new Error(err.error ?? '创建失败');
  }
  const { note } = (await res.json()) as { note: Note };
  return note;
}

export async function updateNote(
  id: string,
  payload: Partial<Omit<Note, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Note> {
  const res = await authedFetch(`/api/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '更新失败' }));
    throw new Error(err.error ?? '更新失败');
  }
  const { note } = (await res.json()) as { note: Note };
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  const res = await authedFetch(`/api/notes/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '删除失败' }));
    throw new Error(err.error ?? '删除失败');
  }
}

// ===== Trash (回收站) =====

export async function softDeleteNote(id: string): Promise<void> {
  const res = await authedFetch(`/api/notes/${id}?action=soft`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '删除失败' }));
    throw new Error(err.error ?? '删除失败');
  }
}

export async function restoreNote(id: string): Promise<void> {
  const res = await authedFetch(`/api/notes/${id}?action=restore`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '恢复失败' }));
    throw new Error(err.error ?? '恢复失败');
  }
}

export async function permanentlyDeleteNote(id: string): Promise<void> {
  const res = await authedFetch(`/api/notes/${id}?action=permanent`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '永久删除失败' }));
    throw new Error(err.error ?? '永久删除失败');
  }
}

export async function listDeletedNotes(): Promise<Note[]> {
  const res = await authedFetch('/api/notes/trash');
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '获取回收站失败' }));
    throw new Error(err.error ?? '获取回收站失败');
  }
  const { notes } = (await res.json()) as { notes: Note[] };
  return notes;
}

export async function emptyTrash(): Promise<void> {
  const res = await authedFetch('/api/notes/trash', { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '清空回收站失败' }));
    throw new Error(err.error ?? '清空回收站失败');
  }
}

// ===== Export/Import =====

export type ExportFormat = 'json' | 'csv' | 'markdown' | 'pdf';
export type ExportType = 'all' | 'entries' | 'notes';
export type ExportScope = 'all' | 'single';

export interface ImportResult {
  success: boolean;
  message: string;
  details: {
    imported_entries: number;
    imported_notes: number;
    skipped_entries: number;
    skipped_notes: number;
    errors: string[];
  };
}

export async function exportData(
  format: ExportFormat = 'json',
  type: ExportType = 'all',
  options?: { scope?: ExportScope; id?: string },
): Promise<void> {
  const params = new URLSearchParams({ format, type });
  if (options?.scope === 'single' && options?.id) {
    params.set('scope', 'single');
    params.set('id', options.id);
  }
  const res = await authedFetch(`/api/export?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '导出失败' }));
    throw new Error(err.error ?? '导出失败');
  }

  // Get filename from Content-Disposition header
  const contentDisposition = res.headers.get('Content-Disposition') ?? '';
  const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
  const filename = filenameMatch?.[1] ?? `vault-backup.${format}`;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export single note to markdown or pdf
export async function exportNote(
  noteId: string,
  format: 'markdown' | 'pdf',
): Promise<void> {
  if (format === 'pdf') {
    // For PDF, we need to render HTML and convert to PDF
    const params = new URLSearchParams({
      format: 'pdf',
      type: 'notes',
      scope: 'single',
      id: noteId,
    });
    const res = await authedFetch(`/api/export?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '导出失败' }));
      throw new Error(err.error ?? '导出失败');
    }

    // Get HTML content
    const htmlContent = await res.text();

    // Create a hidden iframe to render the HTML
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:210mm;height:297mm;left:-9999px;top:0;border:none;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      throw new Error('无法创建 PDF');
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Wait for fonts to load
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Convert canvas to PDF using jsPDF
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = pageWidth / canvasWidth;
      const imgHeight = (canvasHeight * ratio);

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Get filename
      const contentDisposition = res.headers.get('Content-Disposition') ?? '';
      const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
      const baseFilename = filenameMatch?.[1]?.replace('.html', '') ?? 'note-export';

      pdf.save(`${baseFilename}.pdf`);
    } finally {
      document.body.removeChild(iframe);
    }
  } else {
    return exportData(format, 'notes', { scope: 'single', id: noteId });
  }
}

export async function importData(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  // Use fetch directly to avoid Content-Type header mangling
  const token = await getToken();
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: { 'x-session': token },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '导入失败' }));
    throw new Error(err.error ?? '导入失败');
  }

  return res.json() as Promise<ImportResult>;
}
