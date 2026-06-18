import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/storage';

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
  }

  try {
    const storage = await getStorage();
    const result = await storage.signIn(email, password);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || '登录失败' }, { status: 401 });
    }

    return NextResponse.json({
      user: result.user,
      token: result.token || result.user.id,
      mode: storage.name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '登录失败' }, { status: 500 });
  }
}
