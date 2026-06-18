import { NextRequest, NextResponse } from 'next/server';
import { getAuthedStorage } from '@/lib/auth-helper';

export async function GET(req: NextRequest) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { storage, token } = result;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q')?.trim();
  const category = searchParams.get('category')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  let entries = await storage.listEntries({ q: token, category });

  if (search) {
    const s = search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.title?.toLowerCase().includes(s) ||
        e.username?.toLowerCase().includes(s) ||
        e.url?.toLowerCase().includes(s) ||
        e.notes?.toLowerCase().includes(s),
    );
  }

  const total = entries.length;
  const paginatedEntries = entries.slice(offset, offset + limit);

  return NextResponse.json({ entries: paginatedEntries, total, limit, offset });
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
  const password = typeof body.password === 'string' ? body.password : '';
  if (!title) return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
  if (!password) return NextResponse.json({ error: '密码不能为空' }, { status: 400 });

  try {
    const entry = await storage.createEntry({
      user_id: user.id,
      title,
      username: typeof body.username === 'string' ? body.username.trim() || null : null,
      password,
      url: typeof body.url === 'string' ? body.url.trim() || null : null,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : '默认',
    });
    return NextResponse.json({ entry });
  } catch (err: any) {
    return NextResponse.json({ error: `创建失败: ${err.message}` }, { status: 500 });
  }
}
