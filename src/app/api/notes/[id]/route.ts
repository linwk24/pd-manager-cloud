import { NextRequest, NextResponse } from 'next/server';
import { getAuthedStorage } from '@/lib/auth-helper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage } = result;
  const { id } = await params;
  const note = await storage.getNote(id);
  if (!note) return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
  return NextResponse.json({ note });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage } = result;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === 'string') update.title = body.title.trim();
  if (typeof body.content === 'string') update.content = body.content;
  if (typeof body.category === 'string') update.category = body.category.trim() || '默认';
  if (typeof body.pinned === 'boolean') update.pinned = body.pinned;

  const note = await storage.updateNote(id, update);
  if (!note) return NextResponse.json({ error: '笔记不存在或无权限' }, { status: 404 });
  return NextResponse.json({ note });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage } = result;
  const { id } = await params;
  await storage.deleteNote(id);
  return NextResponse.json({ success: true, message: '已删除' });
}
