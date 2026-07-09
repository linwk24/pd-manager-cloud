-- ============================================
-- Secure Vault 云端数据库初始化脚本 (PostgreSQL)
-- ============================================
-- 使用方法：
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 粘贴并执行此脚本
-- ============================================

-- 创建 notes 表
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '默认',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 启用行级安全
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 创建 vault_entries 表
CREATE TABLE IF NOT EXISTS vault_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '默认',
  favorite INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 启用行级安全
ALTER TABLE vault_entries ENABLE ROW LEVEL SECURITY;

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Allow anonymous reads" ON notes;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON notes;
DROP POLICY IF EXISTS "Allow anonymous updates" ON notes;
DROP POLICY IF EXISTS "Allow anonymous deletes" ON notes;

DROP POLICY IF EXISTS "Allow anonymous reads" ON vault_entries;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON vault_entries;
DROP POLICY IF EXISTS "Allow anonymous updates" ON vault_entries;
DROP POLICY IF EXISTS "Allow anonymous deletes" ON vault_entries;

-- 创建新策略（允许所有操作，在 API 层验证用户）
CREATE POLICY "notes_all" ON notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vault_all" ON vault_entries FOR ALL USING (true) WITH CHECK (true);

-- 输出成功消息
SELECT 'Cloud database initialized successfully!' AS status;
