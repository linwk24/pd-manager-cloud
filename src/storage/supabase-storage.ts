import { getSupabaseClient } from './database/supabase-client';
import { StorageBackend, VaultEntryData, NoteData, UserData } from './types';

function toVaultEntry(row: any): VaultEntryData {
  return { 
    ...row,
    username: row.username || null,
    url: row.url || null,
    notes: row.notes || null,
    category: row.category || null
  };
}

function toNote(row: any): NoteData {
  return { 
    ...row, 
    pinned: row.pinned ? 1 : 0,
    category: row.category || null
  };
}

function getClient(token?: string) {
  return getSupabaseClient(token);
}

export const supabaseStorage: StorageBackend = {
  name: 'supabase',

  async signUp(email: string, password: string) {
    const client = getClient();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { user: null, error: error.message };

    // 检查是否实际创建了用户（已注册邮箱不会创建新身份）
    const identities = data.user?.identities;
    if (!identities || identities.length === 0) {
      return { user: null, error: '该邮箱已被注册' };
    }

    const sessionToken = data.session?.access_token;
    return {
      user: data.user ? { id: data.user.id, email: data.user.email ?? '' } : null,
      token: sessionToken,
    };
  },

  async signIn(email: string, password: string) {
    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    return {
      user: data.user ? { id: data.user.id, email: data.user.email ?? '' } : null,
      token: data.session?.access_token,
    };
  },

  async signOut() {
    const client = getClient();
    await client.auth.signOut();
  },

  async getUser(token?: string) {
    if (!token) {
      const client = getClient();
      const { data: { user } } = await client.auth.getUser();
      return user ? { id: user.id, email: user.email ?? '' } : null;
    }
    const client = getClient(token);
    const { data: { user } } = await client.auth.getUser();
    return user ? { id: user.id, email: user.email ?? '' } : null;
  },

  // ---- Vault Entries ----

  async listEntries(params?: { q?: string; category?: string }) {
    const token = params?.q; // 传入 token 作为认证
    const client = getClient(token);
    let query = client
      .from('vault_entries')
      .select('*')
      .order('updated_at', { ascending: false });
    if (params?.category && params.category !== '全部') {
      query = query.eq('category', params.category);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(toVaultEntry);
  },

  async getEntry(id: string) {
    const client = getClient();
    const { data } = await client.from('vault_entries').select('*').eq('id', id).maybeSingle();
    return data ? toVaultEntry(data) : null;
  },

  async createEntry(data) {
    const client = getClient();
    const { data: entry, error } = await client.from('vault_entries').insert(data).select().maybeSingle();
    if (error) throw new Error(error.message);
    return toVaultEntry(entry);
  },

  async updateEntry(id, data) {
    const client = getClient();
    const { data: entry, error } = await client.from('vault_entries').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return entry ? toVaultEntry(entry) : null;
  },

  async deleteEntry(id: string) {
    const client = getClient();
    const { error } = await client.from('vault_entries').delete().eq('id', id);
    return !error;
  },

  // ---- Notes ----

  async listNotes(params?: { q?: string; category?: string }) {
    const token = params?.q;
    const client = getClient(token);
    let query = client.from('notes').select('*').is('deleted_at', null).order('pinned', { ascending: false }).order('updated_at', { ascending: false });
    if (params?.category && params.category !== '全部') {
      query = query.eq('category', params.category);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(toNote);
  },

  async listDeletedNotes(params?: { q?: string }) {
    const token = params?.q;
    const client = getClient(token);
    const { data, error } = await client.from('notes').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toNote);
  },

  async getNote(id: string) {
    const client = getClient();
    const { data } = await client.from('notes').select('*').eq('id', id).maybeSingle();
    return data ? toNote(data) : null;
  },

  async createNote(data) {
    const client = getClient();
    const { data: note, error } = await client.from('notes').insert(data).select().maybeSingle();
    if (error) throw new Error(error.message);
    return toNote(note);
  },

  async updateNote(id, data) {
    const client = getClient();
    const { data: note, error } = await client.from('notes').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return note ? toNote(note) : null;
  },

  async deleteNote(id: string) {
    const client = getClient();
    const { error } = await client.from('notes').delete().eq('id', id);
    return !error;
  },

  async softDeleteNote(id: string) {
    const client = getClient();
    const { error } = await client.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null);
    return !error;
  },

  async restoreNote(id: string) {
    const client = getClient();
    const { error } = await client.from('notes').update({ deleted_at: null }).eq('id', id).not('deleted_at', 'is', null);
    return !error;
  },

  async permanentlyDeleteNote(id: string) {
    const client = getClient();
    const { error } = await client.from('notes').delete().eq('id', id).not('deleted_at', 'is', null);
    return !error;
  },

  async emptyTrash(params?) {
    const token = params?.q;
    const client = getClient(token);
    const { error } = await client.from('notes').delete().not('deleted_at', 'is', null);
    return !error;
  },
};
