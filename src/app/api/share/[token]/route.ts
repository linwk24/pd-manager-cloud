import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: '缺少分享令牌' }, { status: 400 });
    }

    const storage = await getStorage();
    if (!storage) {
      return NextResponse.json({ error: '存储服务不可用' }, { status: 500 });
    }

    const note = await storage.getSharedNote({ shareToken: token });
    
    if (!note) {
      return NextResponse.json({ error: '分享不存在或已失效' }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Get shared note error:', error);
    return NextResponse.json({ error: '获取分享内容失败' }, { status: 500 });
  }
}
