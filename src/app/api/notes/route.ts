import { NextRequest, NextResponse } from 'next/server';
import { getAuthedStorage } from '@/lib/auth-helper';

export async function GET(req: NextRequest) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage, token } = result;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const notes = await storage.listNotes({ q: token, category });

  const total = notes.length;
  const paginatedNotes = notes.slice(offset, offset + limit);

  return NextResponse.json({ notes: paginatedNotes, total, limit, offset });
}

export async function POST(req: NextRequest) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage, user } = result;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content : '';
  if (!title && !content) {
    return NextResponse.json({ error: '标题或内容不能为空' }, { status: 400 });
  }

  try {
    const note = await storage.createNote({
      user_id: user.id,
      title,
      content,
      category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : '默认',
      pinned: body.pinned === true ? 1 : 0,
    });
    return NextResponse.json({ note });
  } catch (err: any) {
    return NextResponse.json({ error: `创建失败: ${err.message}` }, { status: 500 });
  }
}
