import { NextRequest, NextResponse } from 'next/server';
import { getAuthedStorage } from '@/lib/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { noteId, expiresAt } = body;

    if (!noteId) {
      return NextResponse.json({ error: '缺少笔记ID' }, { status: 400 });
    }

    const authResult = await getAuthedStorage(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { storage } = authResult;

    const result = await storage.createNoteShare({ noteId, expiresAt });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Create share error:', error);
    return NextResponse.json({ error: '创建分享失败' }, { status: 500 });
  }
}
