#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only
if command -v coze > /dev/null 2>&1 && coze check-bins --help > /dev/null 2>&1; then
  coze check-bins --fix
fi

# 数据库迁移：添加 deleted_at 字段到 notes 表
echo "Running database migrations..."
DATA_DIR="./data"
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
