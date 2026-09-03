import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/storage';

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-session');
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const storage = await getStorage();
  const user = await storage.getUser(token);
  if (!user) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
  return NextResponse.json({ user, mode: storage.name });
}
