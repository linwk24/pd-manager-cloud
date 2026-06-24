#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only
if command -v coze > /dev/null 2>&1 && coze check-bins --help > /dev/null 2>&1; then
  coze check-bins --fix
fi

# 检查存储模式
STORAGE_CONFIG="${COZE_WORKSPACE_PATH}/data/storage-mode.json"
if [ -f "${STORAGE_CONFIG}" ]; then
  STORAGE_MODE=$(cat "${STORAGE_CONFIG}" | grep -o '"mode":"[^"]*"' | cut -d'"' -f4)
else
  STORAGE_MODE="sqlite"
fi

echo "Storage mode: ${STORAGE_MODE}"

# ============ 云端模式数据库初始化 ============
if [ "${STORAGE_MODE}" = "supabase" ]; then
  echo "Checking cloud database tables..."
  
  # 检查 Supabase 环境变量
  if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    echo "Warning: Supabase environment variables not set. Skipping cloud initialization."
    echo "Please ensure the following environment variables are set:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
  else
    echo "Cloud database tables will be auto-initialized on first API call."
  fi
fi

# ============ 本地模式数据库迁移 ============
echo "Running local database migrations..."
DATA_DIR="${COZE_WORKSPACE_PATH}/data"
DB_FILE="${DATA_DIR}/secure-vault.db"

if [ -f "${DB_FILE}" ]; then
  echo "Checking notes table for deleted_at column..."
  HAS_DELETED_AT=$(sqlite3 "${DB_FILE}" "PRAGMA table_info(notes);" | grep -c "deleted_at" || true)
  if [ "${HAS_DELETED_AT}" -eq "0" ]; then
    echo "Adding deleted_at column to notes table..."
    sqlite3 "${DB_FILE}" "ALTER TABLE notes ADD COLUMN deleted_at TEXT;"
    echo "Migration completed."
  else
    echo "deleted_at column already exists, skipping."
  fi
else
  echo "Database file not found, will be created on first run."
fi

echo "Preparation completed successfully."
