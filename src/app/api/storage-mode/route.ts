import { NextResponse } from 'next/server';
import { getStorageMode, setStorageMode } from '@/storage';

export async function GET() {
  const mode = getStorageMode();
  return NextResponse.json({ mode });
}

export async function POST(req: Request) {
  let body: { mode?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: '格式错误' }, { status: 400 });
  }

  if (body.mode !== 'sqlite' && body.mode !== 'supabase') {
    return NextResponse.json({ error: '无效模式，可选: sqlite, supabase' }, { status: 400 });
  }

  await setStorageMode(body.mode);
  return NextResponse.json({ mode: body.mode, message: `已切换为 ${body.mode === 'sqlite' ? '本地 SQLite' : '云端 Supabase'} 模式` });
}
