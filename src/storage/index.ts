import fs from 'fs';
import path from 'path';
import { StorageBackend } from './types';
import { sqliteStorage } from './sqlite-storage';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'storage-mode.json');

type StorageMode = 'sqlite' | 'supabase';

function getSettingsPath(): string {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return SETTINGS_PATH;
}

function loadMode(): StorageMode {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8');
    const { mode } = JSON.parse(raw);
    // 支持 'local'/'sqlite' 和 'supabase'
    if (mode === 'local' || mode === 'sqlite') return 'sqlite';
    if (mode === 'supabase') return mode;
  } catch { /* 默认 supabase */ }
  return 'supabase';
}

function saveMode(mode: StorageMode) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify({ mode }, null, 2));
}

// 懒加载 supabase backend（避免在 sqlite 模式时报错）
let supabaseBackend: StorageBackend | null = null;

async function getSupabaseBackend(): Promise<StorageBackend> {
  if (supabaseBackend) return supabaseBackend;
  // 动态导入，避免在 sqlite-only 环境出错
  const mod = await import('./supabase-storage');
  supabaseBackend = mod.supabaseStorage;
  return supabaseBackend;
}

let currentMode: StorageMode = loadMode();

export function getStorageMode(): StorageMode {
  return loadMode(); // Always read from file to avoid stale state after hot reload
}

export async function setStorageMode(mode: StorageMode): Promise<void> {
  saveMode(mode);
}

export async function getStorage(): Promise<StorageBackend> {
  const mode = loadMode(); // Always read fresh mode from file
  if (mode === 'sqlite') {
    return sqliteStorage;
  }
  return getSupabaseBackend();
}
