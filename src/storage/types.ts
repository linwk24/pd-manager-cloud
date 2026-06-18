// 存储抽象层 — 统一接口

export interface VaultEntryData {
  id: string;
  title: string;
  username: string | null;
  password: string;
  url: string | null;
  notes: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteData {
  id: string;
  title: string;
  content: string;
  category: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserData {
  id: string;
  email: string;
}

export interface StorageBackend {
  name: 'sqlite' | 'supabase';

  // 认证
  signUp(email: string, password: string): Promise<{ user: UserData | null; error?: string; token?: string }>;
  signIn(email: string, password: string): Promise<{ user: UserData | null; error?: string; token?: string }>;
  signOut(): Promise<void>;
  getUser(token?: string): Promise<UserData | null>;

  // 密码条目
  listEntries(params?: { q?: string; category?: string }): Promise<VaultEntryData[]>;
  getEntry(id: string): Promise<VaultEntryData | null>;
  createEntry(data: Omit<VaultEntryData, 'id' | 'created_at' | 'updated_at'> & { user_id: string }): Promise<VaultEntryData>;
  updateEntry(id: string, data: Partial<Omit<VaultEntryData, 'id' | 'created_at' | 'updated_at'>>): Promise<VaultEntryData | null>;
  deleteEntry(id: string): Promise<boolean>;

  // 笔记
  listNotes(params?: { q?: string; category?: string }): Promise<NoteData[]>;
  getNote(id: string): Promise<NoteData | null>;
  createNote(data: Omit<NoteData, 'id' | 'created_at' | 'updated_at'> & { user_id: string }): Promise<NoteData>;
  updateNote(id: string, data: Partial<Omit<NoteData, 'id' | 'created_at' | 'updated_at'>>): Promise<NoteData | null>;
  deleteNote(id: string): Promise<boolean>;
}
