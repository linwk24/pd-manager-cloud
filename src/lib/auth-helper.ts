import { NextResponse } from 'next/server';
import { getStorage } from '@/storage';
import { StorageBackend, UserData } from '@/storage/types';

interface AuthResult {
  storage: StorageBackend;
  user: UserData;
  token?: string;
}

async function getAuthed(token?: string): Promise<AuthResult | { error: NextResponse }> {
  const storage = await getStorage();

  if (!token) {
    return { error: NextResponse.json({ error: '请先登录' }, { status: 401 }) };
  }
  const user = await storage.getUser(token);
  if (!user) {
    return { error: NextResponse.json({ error: '认证失败' }, { status: 401 }) };
  }
  return { storage, user, token };
}

export async function getAuthedStorage(req: Request): Promise<AuthResult | { error: NextResponse }> {
  const token = req.headers.get('x-session') || undefined;
  return getAuthed(token);
}
