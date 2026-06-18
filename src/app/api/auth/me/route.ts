import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/storage';

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-session');
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const storage = await getStorage();
  const user = await storage.getUser(token);
  return NextResponse.json({ user, mode: storage.name });
}
