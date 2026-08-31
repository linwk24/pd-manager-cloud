#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Building the Next.js project..."
pnpm next build

# ============================================
# ⚠️ 关键步骤：生成 Cloudflare Worker 入口文件
# ============================================
echo "Building OpenNext for Cloudflare..."
# 检查 opennext 命令是否存在
if pnpm list @opennextjs/cloudflare --depth=0 >/dev/null 2>&1; then
    pnpm opennextjs-cloudflare build
else
    echo "⚠️  @opennextjs/cloudflare not found, installing..."
    pnpm add -D @opennextjs/cloudflare
    pnpm opennextjs-cloudflare build
fi

echo "Bundling server with tsup..."
pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

# ============================================
# 验证构建产物
# ============================================
echo "Verifying build artifacts..."
if [ -f ".open-next/worker.js" ]; then
    echo "✅ .open-next/worker.js generated successfully!"
else
    echo "❌ ERROR: .open-next/worker.js not found!"
    echo "   Check OpenNext build output:"
    ls -la .open-next/ || echo "   .open-next directory does not exist"
    exit 1
fi

echo "Build completed successfully!"
