import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/storage';

export async function POST(req: NextRequest) {
  try {
    const storage = await getStorage();
    await storage.signOut();
  } catch { /* ignore */ }
  return NextResponse.json({ success: true });
}
