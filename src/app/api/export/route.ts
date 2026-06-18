import { NextRequest, NextResponse } from 'next/server';
import { getAuthedStorage } from '@/lib/auth-helper';
import { VaultEntryData, NoteData } from '@/storage/types';
import { jsPDF } from 'jspdf';

export async function GET(req: NextRequest) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage, token } = result;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format')?.toLowerCase() ?? 'json';
  const type = searchParams.get('type') ?? 'all'; // 'entries' | 'notes' | 'all'
  const scope = searchParams.get('scope') ?? 'all'; // 'all' | 'single'
  const id = searchParams.get('id');

  try {
    let rawEntries: VaultEntryData[] = [];
    let rawNotes: NoteData[] = [];

    if (type !== 'notes') {
      rawEntries = await storage.listEntries({ q: token });
    }
    if (type !== 'entries') {
      if (scope === 'single' && id) {
        const note = await storage.getNote(id);
        rawNotes = note ? [note] : [];
      } else {
        rawNotes = await storage.listNotes({ q: token });
      }
    }

    // Convert to plain objects for JSON/CSV serialization
    const entries = rawEntries.map(e => ({ ...e }) as Record<string, unknown>);
    const notes = rawNotes.map(n => ({ ...n }) as Record<string, unknown>);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `vault-backup-${timestamp}`;

    if (format === 'csv') {
      return exportCSV(entries, notes, filename);
    }

    if (format === 'markdown') {
      // Markdown export for notes only
      return exportMarkdown(notes, filename, id ?? undefined);
    }

    if (format === 'pdf') {
      // PDF export for notes only
      return exportPDF(notes, filename, id ?? undefined);
    }

    // Default JSON format
    return exportJSON(entries, notes, filename);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: `导出失败: ${message}` }, { status: 500 });
  }
}

function exportJSON(
  entries: Record<string, unknown>[],
  notes: Record<string, unknown>[],
  filename: string,
) {
  const payload = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    entries,
    notes,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}.json"`,
    },
  });
}

function exportCSV(
  entries: Record<string, unknown>[],
  notes: Record<string, unknown>[],
  filename: string,
) {
  const lines: string[] = [];

  // Entries CSV
  if (entries.length > 0) {
    lines.push('# === 密码条目 (Vault Entries) ===');
    const entryHeaders = ['id', 'title', 'username', 'password', 'url', 'notes', 'category', 'created_at', 'updated_at'];
    lines.push(entryHeaders.join(','));
    for (const e of entries) {
      lines.push(entryHeaders.map(h => escapeCSV(String(e[h] ?? ''))).join(','));
    }
    lines.push('');
  }

  // Notes CSV
  if (notes.length > 0) {
    lines.push('# === 笔记 (Notes) ===');
    const noteHeaders = ['id', 'title', 'content', 'category', 'pinned', 'created_at', 'updated_at'];
    lines.push(noteHeaders.join(','));
    for (const n of notes) {
      lines.push(noteHeaders.map(h => escapeCSV(String(n[h] ?? ''))).join(','));
    }
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  });
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportMarkdown(
  notes: Record<string, unknown>[],
  filename: string,
  singleId?: string,
) {
  const lines: string[] = [];

  // Title
  lines.push('# 笔记导出\n');
  lines.push(`> 导出时间: ${new Date().toLocaleString('zh-CN')}\n`);
  lines.push('---\n');

  // Filter single note if specified
  const targetNotes = singleId
    ? notes.filter(n => n.id === singleId)
    : notes;

  if (targetNotes.length === 0) {
    lines.push('\n*没有找到笔记*\n');
  } else {
    for (const note of targetNotes) {
      const title = String(note.title ?? '无标题');
      const category = String(note.category ?? '未分类');
      const pinned = note.pinned ? '📌 ' : '';
      const content = String(note.content ?? '');
      const createdAt = String(note.created_at ?? '');
      const updatedAt = String(note.updated_at ?? '');

      lines.push(`## ${pinned}${title}`);
      lines.push(`\n**分类**: ${category}  |  **创建**: ${createdAt}  |  **更新**: ${updatedAt}\n`);
      lines.push('---\n');
      lines.push(content);
      lines.push('\n---\n');
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'text/markdown;charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.md"`,
    },
  });
}

function exportPDF(
  notes: Record<string, unknown>[],
  filename: string,
  singleId?: string,
) {
  // Filter single note if specified
  const targetNotes = singleId
    ? notes.filter(n => n.id === singleId)
    : notes;

  // Create HTML content for PDF
  const exportTime = new Date().toLocaleString('zh-CN');
  const notesHtml = targetNotes.length === 0
    ? '<p style="color:#666;font-style:italic;">没有找到笔记</p>'
    : targetNotes.map((note, index) => {
        const title = String(note.title ?? '无标题');
        const category = String(note.category ?? '未分类');
        const content = String(note.content ?? '').replace(/\n/g, '<br/>');
        const createdAt = String(note.created_at ?? '');
        const updatedAt = String(note.updated_at ?? '');
        return `
          <div style="margin-bottom:30px;${index > 0 ? 'border-top:1px solid #ddd;padding-top:20px;' : ''}">
            <h2 style="margin:0 0 10px 0;color:#333;">${title}</h2>
            <p style="margin:0 0 15px 0;font-size:12px;color:#888;">
              分类: ${category} | 创建: ${createdAt} | 更新: ${updatedAt}
            </p>
            <div style="line-height:1.8;">${content}</div>
          </div>
        `;
      }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
          font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif;
          font-size: 14px;
          line-height: 1.8;
          color: #333;
          padding: 40px;
        }
        h1 {
          text-align: center;
          font-size: 24px;
          margin-bottom: 10px;
          color: #333;
        }
        .export-time {
          text-align: center;
          font-size: 12px;
          color: #888;
          margin-bottom: 30px;
        }
      </style>
    </head>
    <body>
      <h1>笔记导出</h1>
      <p class="export-time">导出时间: ${exportTime}</p>
      ${notesHtml}
    </body>
    </html>
  `;

  // Return HTML as blob - client will render and convert to PDF
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.html"`,
    },
  });
}
