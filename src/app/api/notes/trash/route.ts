import { NextRequest, NextResponse } from 'next/server';
import { getAuthedStorage } from '@/lib/auth-helper';

// GET /api/notes/trash - 获取回收站中的笔记
export async function GET(req: NextRequest) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage } = result;

  try {
    const notes = await storage.listDeletedNotes();
    return NextResponse.json({ notes });
  } catch (err: any) {
    return NextResponse.json({ error: `获取回收站失败: ${err.message}` }, { status: 500 });
  }
}

// DELETE /api/notes/trash - 清空回收站
export async function DELETE(req: NextRequest) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage } = result;

  try {
    await storage.emptyTrash();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: `清空回收站失败: ${err.message}` }, { status: 500 });
  }
}
