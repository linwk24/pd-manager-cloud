import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { StorageBackend, VaultEntryData, NoteData, UserData } from './types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'local.db');

// 简单的本地用户表（密码用 sha256 哈希，仅供本地使用）
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initTables();
  return db;
}

function initTables() {
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS local_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS vault_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      username TEXT,
      password TEXT NOT NULL,
      url TEXT,
      notes TEXT,
      category TEXT DEFAULT '默认',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_vault_user ON vault_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_vault_category ON vault_entries(category);
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      category TEXT DEFAULT '默认',
      pinned INTEGER DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);
    CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted_at);
  `);
}

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export const sqliteStorage: StorageBackend = {
  name: 'sqlite',

  async signUp(email: string, password: string) {
    const d = getDb();
    const id = uuid();
    try {
      d.prepare('INSERT INTO local_users (id, email, password_hash) VALUES (?, ?, ?)').run(id, email, hashPassword(password));
      return { user: { id, email } };
    } catch (err: any) {
      if (err.message?.includes('UNIQUE')) return { user: null, error: '邮箱已注册' };
      return { user: null, error: err.message };
    }
  },

  async signIn(email: string, password: string) {
    const d = getDb();
    const row = d.prepare('SELECT id, email, password_hash FROM local_users WHERE email = ?').get(email) as any;
    if (!row) return { user: null, error: '邮箱或密码错误' };
    if (row.password_hash !== hashPassword(password)) return { user: null, error: '邮箱或密码错误' };
    return { user: { id: row.id, email: row.email } };
  },

  async signOut() {
    // 本地模式无需操作
  },

  async getUser(token?: string) {
    // 本地模式直接用 token 作为 user_id（简化处理）
    if (!token) return null;
    const d = getDb();
    const row = d.prepare('SELECT id, email FROM local_users WHERE id = ?').get(token) as any;
    return row ? { id: row.id, email: row.email } : null;
  },

  // ---- Vault Entries ----

  async listEntries(params) {
    const d = getDb();
    const userId = params?.q; // hack: 传 user_id 进来
    let sql = 'SELECT * FROM vault_entries WHERE user_id = ?';
    const binds: any[] = [userId];
    if (params?.category && params.category !== '全部') {
      sql += ' AND category = ?';
      binds.push(params.category);
    }
    sql += ' ORDER BY updated_at DESC';
    return d.prepare(sql).all(...binds) as VaultEntryData[];
  },

  async getEntry(id: string) {
    const d = getDb();
    return (d.prepare('SELECT * FROM vault_entries WHERE id = ?').get(id) as VaultEntryData) || null;
  },

  async createEntry(data) {
    const d = getDb();
    const id = uuid();
    const ts = now();
    d.prepare(`INSERT INTO vault_entries (id, user_id, title, username, password, url, notes, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, data.user_id, data.title, data.username, data.password, data.url, data.notes, data.category || '默认', ts, ts);
    return this.getEntry(id) as Promise<VaultEntryData>;
  },

  async updateEntry(id, data) {
    const d = getDb();
    const sets: string[] = ['updated_at = ?'];
    const binds: any[] = [now()];
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        sets.push(`${key} = ?`);
        binds.push(val);
      }
    }
    binds.push(id);
    d.prepare(`UPDATE vault_entries SET ${sets.join(', ')} WHERE id = ?`).run(...binds);
    return this.getEntry(id);
  },

  async deleteEntry(id: string) {
    const d = getDb();
    const result = d.prepare('DELETE FROM vault_entries WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // ---- Notes ----

  async listNotes(params) {
    const d = getDb();
    const userId = params?.q; // hack: 传 user_id
    let sql = 'SELECT * FROM notes WHERE user_id = ? AND deleted_at IS NULL';
    const binds: any[] = [userId];
    if (params?.category && params.category !== '全部') {
      sql += ' AND category = ?';
      binds.push(params.category);
    }
    sql += ' ORDER BY pinned DESC, updated_at DESC';
    const rows = d.prepare(sql).all(...binds) as any[];
    return rows.map(r => ({ ...r, pinned: !!r.pinned }));
  },

  async listDeletedNotes(params?) {
    const d = getDb();
    const userId = params?.q;
    const rows = d.prepare('SELECT * FROM notes WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC').all(userId) as any[];
    return rows.map(r => ({ ...r, pinned: !!r.pinned }));
  },

  async getNote(id: string) {
    const d = getDb();
    const row = d.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
    return row ? { ...row, pinned: !!row.pinned } : null;
  },

  async createNote(data) {
    const d = getDb();
    const id = uuid();
    const ts = now();
    d.prepare('INSERT INTO notes (id, user_id, title, content, category, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, data.user_id, data.title, data.content, data.category || '默认', data.pinned ? 1 : 0, ts, ts);
    return this.getNote(id) as Promise<NoteData>;
  },

  async updateNote(id, data) {
    const d = getDb();
    const sets: string[] = ['updated_at = ?'];
    const binds: any[] = [now()];
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        if (key === 'pinned') {
          sets.push('pinned = ?');
          binds.push(val ? 1 : 0);
        } else {
          sets.push(`${key} = ?`);
          binds.push(val);
        }
      }
    }
    binds.push(id);
    d.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...binds);
    return this.getNote(id);
  },

  async deleteNote(id: string) {
    const d = getDb();
    const result = d.prepare('DELETE FROM notes WHERE id = ?').run(id);
    return result.changes > 0;
  },

  async softDeleteNote(id: string) {
    const d = getDb();
    const ts = now();
    const result = d.prepare('UPDATE notes SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL').run(ts, id);
    return result.changes > 0;
  },

  async restoreNote(id: string) {
    const d = getDb();
    const result = d.prepare('UPDATE notes SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL').run(id);
    return result.changes > 0;
  },

  async permanentlyDeleteNote(id: string) {
    const d = getDb();
    const result = d.prepare('DELETE FROM notes WHERE id = ? AND deleted_at IS NOT NULL').run(id);
    return result.changes > 0;
  },

  async emptyTrash(params?) {
    const d = getDb();
    const userId = params?.q;
    const result = d.prepare('DELETE FROM notes WHERE user_id = ? AND deleted_at IS NOT NULL').run(userId);
    return result.changes > 0;
  },

  // 分享功能
  async createNoteShare(params: { noteId: string; expiresAt?: string }): Promise<{ shareToken: string }> {
    const d = getDb();
    const shareToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const id = crypto.randomUUID();
    
    d.prepare(`
      INSERT INTO note_shares (id, note_id, share_token, created_at, expires_at)
      VALUES (?, ?, ?, datetime('now'), ?)
    `).run(id, params.noteId, shareToken, params.expiresAt || null);
    
    return { shareToken };
  },

  async getSharedNote(params: { shareToken: string }): Promise<NoteData | null> {
    const d = getDb();
    const share = d.prepare(`
      SELECT ns.*, n.title, n.content, n.category, n.created_at, n.updated_at
      FROM note_shares ns
      JOIN notes n ON n.id = ns.note_id
      WHERE ns.share_token = ?
        AND (ns.expires_at IS NULL OR ns.expires_at > datetime('now'))
    `).get(params.shareToken) as {
      note_id: string;
      title: string;
      content: string;
      category: string;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!share) return null;

    return {
      id: share.note_id,
      title: share.title,
      content: share.content,
      category: share.category,
      pinned: 0,
      created_at: share.created_at,
      updated_at: share.updated_at,
      deleted_at: null,
    };
  },

  async deleteNoteShare(params: { noteId: string }): Promise<boolean> {
    const d = getDb();
    const result = d.prepare('DELETE FROM note_shares WHERE note_id = ?').run(params.noteId);
    return result.changes > 0;
  },
};
