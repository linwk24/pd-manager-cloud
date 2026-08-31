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
  const entry = await storage.getEntry(id);
  if (!entry) return NextResponse.json({ error: '条目不存在' }, { status: 404 });
  return NextResponse.json({ entry });
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
  if (typeof body.title === 'string') {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    update.title = t;
  }
  if (typeof body.username === 'string') update.username = body.username.trim();
  if (typeof body.password === 'string') {
    if (!body.password) return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    update.password = body.password;
  }
  if (typeof body.url === 'string') update.url = body.url.trim();
  if (typeof body.notes === 'string') update.notes = body.notes.trim();
  if (typeof body.category === 'string' && body.category.trim()) update.category = body.category.trim();

  const entry = await storage.updateEntry(id, update);
  if (!entry) return NextResponse.json({ error: '条目不存在或无权限' }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage } = result;
  const { id } = await params;
  await storage.deleteEntry(id);
  return NextResponse.json({ success: true, message: '已删除' });
}
