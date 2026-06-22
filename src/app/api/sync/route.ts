import { NextRequest, NextResponse } from 'next/server';
import { getAuthedStorage } from '@/lib/auth-helper';
import { getStorageMode } from '@/storage';
import { supabaseStorage } from '@/storage/supabase-storage';

export async function POST(req: NextRequest) {
  // 同步功能仅在本地模式可用
  const mode = getStorageMode();
  if (mode !== 'sqlite') {
    return NextResponse.json({ 
      error: '同步功能仅在本地模式下可用，请先切换到本地模式' 
    }, { status: 400 });
  }

  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { user, token } = result;

  try {
    // 从本地存储获取数据
    const localEntries = await result.storage.listEntries({ q: user.id });
    const localNotes = await result.storage.listNotes({ q: user.id });

    // 获取云端存储
    const cloudStorage = supabaseStorage;

    // 获取云端用户
    const cloudUser = await cloudStorage.getUser(token);
    if (!cloudUser) {
      return NextResponse.json({
        needCloudRegister: true,
        error: '该邮箱尚未在云端注册，请先切换到云端模式注册后再同步',
      }, { status: 400 });
    }

    let syncedEntries = 0;
    let syncedNotes = 0;

    // 同步密码条目
    for (const entry of localEntries) {
      try {
        const cloudEntry = {
          id: entry.id,
          user_id: cloudUser.id,
          title: entry.title,
          username: entry.username,
          password: entry.password,
          url: entry.url,
          notes: entry.notes,
          category: entry.category || '默认',
          favorite: (entry as any).favorite ? 1 : 0,
          created_at: entry.created_at,
          updated_at: new Date().toISOString(),
        };
        await cloudStorage.createEntry(cloudEntry);
        syncedEntries++;
      } catch (e) {
        console.error('Sync entry error:', e);
      }
    }

    // 同步笔记
    for (const note of localNotes) {
      try {
        const pinned = note.pinned === 1 ? 1 : 0;
        const cloudNote = {
          id: note.id,
          user_id: cloudUser.id,
          title: note.title,
          content: note.content,
          category: note.category || '默认',
          pinned: pinned,
          created_at: note.created_at,
          updated_at: new Date().toISOString(),
        };
        await cloudStorage.createNote(cloudNote);
        syncedNotes++;
      } catch (e) {
        console.error('Sync note error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `同步完成：${syncedEntries} 条密码、${syncedNotes} 条笔记已同步到云端`,
    });
  } catch (err: any) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: '同步失败: ' + err.message }, { status: 500 });
  }
}
