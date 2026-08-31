# Cloudflare 部署指南

## 前置条件

1. Cloudflare 账号
2. Supabase 项目（已初始化数据库）
3. Node.js 24+ 和 pnpm

## 部署步骤

### 1. 配置环境变量

在 Cloudflare Dashboard 或 `wrangler.toml` 中配置：

```toml
[vars]
COZE_SUPABASE_URL = "https://your-project.supabase.co"
COZE_SUPABASE_ANON_KEY = "your-anon-key"
COZE_SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
COZE_PROJECT_ENV = "PROD"
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 构建项目

```bash
pnpm opennextjs-cloudflare build
```

### 4. 部署到 Cloudflare

```bash
pnpm opennextjs-cloudflare deploy
```

或使用 Wrangler：

```bash
npx wrangler deploy
```

## 本地开发

```bash
# 复制环境变量文件
cp .env.example .env

# 编辑 .env 填入实际的 Supabase 配置

# 启动开发服务器
pnpm dev
```

## 注意事项

1. **不要提交 .env 文件** - 已添加到 .gitignore
2. **Supabase 数据库** - 需要先执行 `scripts/init-supabase.sql` 初始化
3. **Node.js 兼容性** - 使用 `nodejs_compat` 标志

## 故障排除

### 构建错误：Could not resolve "pg-cloudflare"

确保已移除所有 `pg` 直接依赖，只使用 Supabase JS 客户端。

### 运行时错误：COZE_SUPABASE_URL is not set

检查环境变量是否正确配置。
