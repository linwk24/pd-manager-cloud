import { NextRequest, NextResponse } from 'next/server';
import { getAuthedStorage } from '@/lib/auth-helper';
import { sqliteStorage } from '@/storage/sqlite-storage';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres.ndtfyfbvudzqexojweqw:YXaS3cvYwWepbMgz@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  max: 3,
});

export async function POST(req: NextRequest) {
  const result = await getAuthedStorage(req);
  if ('error' in result) return result.error;
  const { user } = result;

  const client = await pool.connect();
  try {
    const localEntries = await sqliteStorage.listEntries({ q: user.id });
    const localNotes = await sqliteStorage.listNotes({ q: user.id });

    // 按邮箱查找云端用户ID
    const userRes = await client.query(
      'SELECT id FROM auth.users WHERE email = $1 LIMIT 1', [user.email]
    );
    if (userRes.rows.length === 0) {
      return NextResponse.json({
        needCloudRegister: true,
        error: '该邮箱尚未在云端注册，请先切换到云端模式注册后再同步',
      }, { status: 400 });
    }
    const cloudUserId = userRes.rows[0].id;

    let syncedEntries = 0;
    let syncedNotes = 0;

    for (const entry of localEntries) {
      const { rows } = await client.query(
        'SELECT id FROM vault_entries WHERE user_id = $1 AND title = $2 LIMIT 1',
        [cloudUserId, entry.title]
      );
      if (rows.length > 0) {
        await client.query(
          'UPDATE vault_entries SET username=$1, password=$2, url=$3, notes=$4, category=$5, updated_at=NOW() WHERE id=$6',
          [entry.username, entry.password, entry.url, entry.notes, entry.category || '默认', rows[0].id]
        );
      } else {
        await client.query(
          'INSERT INTO vault_entries(id,user_id,title,username,password,url,notes,category,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())',
          [entry.id, cloudUserId, entry.title, entry.username, entry.password, entry.url, entry.notes, entry.category || '默认', entry.created_at]
        );
      }
      syncedEntries++;
    }

    for (const note of localNotes) {
      const { rows } = await client.query(
        'SELECT id FROM notes WHERE user_id = $1 AND title = $2 LIMIT 1',
        [cloudUserId, note.title]
      );
      if (rows.length > 0) {
        await client.query(
          'UPDATE notes SET content=$1, category=$2, pinned=$3, updated_at=NOW() WHERE id=$4',
          [note.content, note.category || '默认', note.pinned, rows[0].id]
        );
      } else {
        await client.query(
          'INSERT INTO notes(id,user_id,title,content,category,pinned,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,NOW())',
          [note.id, cloudUserId, note.title, note.content, note.category || '默认', note.pinned, note.created_at]
        );
      }
      syncedNotes++;
    }

    return NextResponse.json({
      success: true,
      message: `同步完成：${syncedEntries} 条密码、${syncedNotes} 条笔记已同步到云端`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: '\u540c\u6b65\u5931\u8d25: ' + err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
