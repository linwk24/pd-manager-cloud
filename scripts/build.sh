#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Building the Next.js project..."
pnpm next build

echo "Building OpenNext for Cloudflare..."
# 使用本地安装的 CLI（package.json devDependencies 已固定版本）
# --skipNextBuild: 上面已经跑过 next build，避免重复构建（否则会再次触发 build 脚本造成递归）
pnpm exec opennextjs-cloudflare build --skipNextBuild

echo "Bundling server with tsup..."
pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

echo "Build completed successfully!"
