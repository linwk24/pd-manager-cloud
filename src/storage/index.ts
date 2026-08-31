import { StorageBackend } from './types';

// 懒加载 supabase backend
let supabaseBackend: StorageBackend | null = null;

async function getSupabaseBackend(): Promise<StorageBackend> {
  if (supabaseBackend) return supabaseBackend;
  const mod = await import('./supabase-storage');
  supabaseBackend = mod.supabaseStorage;
  return supabaseBackend;
}

export async function getStorage(): Promise<StorageBackend> {
  return getSupabaseBackend();
}
