import { NextRequest, NextResponse } from 'next/server';
import { getAuthedStorage } from '@/lib/auth-helper';

interface ImportPayload {
  version?: string;
  exported_at?: string;
  entries?: Record<string, unknown>[];
  notes?: Record<string, unknown>[];
}

export async function POST(req: NextRequest) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage, user } = result;

  let payload: ImportPayload;
  try {
    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload - detect format by file extension
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: '未提供文件' }, { status: 400 });
      }
      const text = await file.text();
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.json')) {
        payload = JSON.parse(text);
      } else {
        payload = parseCSV(text);
      }
    } else if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('text/csv')) {
      const text = await req.text();
      payload = parseCSV(text);
    } else {
      // Try to parse as JSON anyway
      payload = await req.json();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: `解析文件失败: ${message}` }, { status: 400 });
  }

  const entries = payload.entries ?? [];
  const notes = payload.notes ?? [];

  if (entries.length === 0 && notes.length === 0) {
    return NextResponse.json({ error: '文件中没有可导入的数据' }, { status: 400 });
  }

  const results = {
    imported_entries: 0,
    imported_notes: 0,
    skipped_entries: 0,
    skipped_notes: 0,
    errors: [] as string[],
  };

  // Import entries
  for (const entry of entries) {
    try {
      const title = typeof entry.title === 'string' ? entry.title.trim() : '';
      const password = typeof entry.password === 'string' ? entry.password : '';
      if (!title || !password) {
        results.skipped_entries++;
        continue;
      }

      await storage.createEntry({
        user_id: user.id,
        title,
        username: typeof entry.username === 'string' ? entry.username.trim() || null : null,
        password,
        url: typeof entry.url === 'string' ? entry.url.trim() || null : null,
        notes: typeof entry.notes === 'string' ? entry.notes.trim() || null : null,
        category: typeof entry.category === 'string' && entry.category.trim() ? entry.category.trim() : '默认',
      });
      results.imported_entries++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      results.skipped_entries++;
      results.errors.push(`条目 "${entry.title}": ${msg}`);
    }
  }

  // Import notes
  for (const note of notes) {
    try {
      const title = typeof note.title === 'string' ? note.title.trim() : '';
      const content = typeof note.content === 'string' ? note.content : '';
      if (!title && !content) {
        results.skipped_notes++;
        continue;
      }

      await storage.createNote({
        user_id: user.id,
        title,
        content,
        category: typeof note.category === 'string' && note.category.trim() ? note.category.trim() : '默认',
        pinned: note.pinned ? 1 : 0,
      });
      results.imported_notes++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      results.skipped_notes++;
      results.errors.push(`笔记 "${note.title}": ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    message: `导入完成：${results.imported_entries} 条密码条目，${results.imported_notes} 条笔记`,
    details: results,
  });
}

function parseCSV(text: string): ImportPayload {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const entries: Record<string, unknown>[] = [];
  const notes: Record<string, unknown>[] = [];

  let section: 'entries' | 'notes' | null = null;
  let headers: string[] = [];

  for (const line of lines) {
    // Section markers
    if (line.startsWith('# ===')) {
      if (line.includes('密码条目') || line.includes('Vault Entries')) {
        section = 'entries';
        headers = [];
      } else if (line.includes('笔记') || line.includes('Notes')) {
        section = 'notes';
        headers = [];
      } else {
        section = null;
      }
      continue;
    }

    if (!section) continue;

    // Header row (no commas escaped, simple detection)
    if (headers.length === 0) {
      headers = parseCSVRow(line);
      continue;
    }

    const values = parseCSVRow(line);
    const record: Record<string, unknown> = {};
    for (let i = 0; i < headers.length && i < values.length; i++) {
      record[headers[i]] = values[i];
    }

    if (section === 'entries') {
      entries.push(record);
    } else {
      notes.push(record);
    }
  }

  return { entries, notes };
}

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const next = row[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
