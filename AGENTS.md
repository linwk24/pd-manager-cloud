# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── api/            # API 路由
│   │   │   ├── auth/       # 认证相关
│   │   │   ├── entries/    # 密码条目 CRUD
│   │   │   ├── notes/      # 笔记 CRUD
│   │   │   ├── export/     # 数据导出 (CSV/JSON)
│   │   │   └── import/     # 数据导入 (CSV/JSON)
│   │   ├── vault/          # 密码保险箱页面
│   │   └── notes/          # 笔记页面
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   ├── api.ts          # API 客户端 (含导入导出)
│   │   └── utils.ts        # 通用工具函数 (cn)
│   ├── storage/            # 存储抽象层
│   │   ├── types.ts        # 数据类型定义
│   │   └── ...             # SQLite/Supabase 实现
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**

## 预览与部署配置

### 端口规范
- **预览端口**: 5000（固定）
- **部署端口**: 5000（固定）
- 服务必须绑定 `0.0.0.0`（IPv4 全接口），禁止绑定 `127.0.0.1` 或 `localhost`

### 预览链路
- **判断依据**: Next.js Web 应用，核心结果需要通过常驻预览进程让用户直接看到并交互验证
- **dev.build**: `bash ./scripts/prepare.sh` - 安装依赖
- **dev.run**: `bash ./scripts/dev.sh` - 启动开发服务器（`src/server.ts`）
- **关键修改**: `dev.sh` 中显式设置 `HOSTNAME=0.0.0.0 PORT=5000`

### 部署配置
- **repo_type**: web
- **deploy_kind**: service
- **deploy_flavor**: web
- **deploy_backend_enabled**: true
- **entrypoint**: `dist/server.js`
- **deploy.build**: `bash ./scripts/build.sh` - 安装依赖 + `pnpm next build` + `pnpm tsup`
- **deploy.run**: `bash ./scripts/start.sh` - 启动 `node dist/server.js`
- **运行时**: nodejs-24

### 服务端入口
- 自定义服务端入口: `src/server.ts`
- 构建产物: `dist/server.js`（通过 tsup 打包）
- 启动时通过 `PORT` 和 `HOSTNAME` 环境变量控制监听地址

## 核心功能

### 批量导出/导入
支持 CSV、JSON、Markdown 和 PDF 格式的数据备份与恢复，可从 vault 和 notes 页面的"备份"下拉菜单访问。

**API 接口:**
- `GET /api/export?format=json|csv|markdown|pdf&type=all|entries|notes&scope=all|single&id=<id>` - 导出数据
- `POST /api/import` - 导入数据（支持 JSON body 或 multipart/form-data 上传 CSV/JSON 文件）

**前端 API 函数 (`src/lib/api.ts`):**
- `exportData(format, type, options?)` - 触发文件下载（支持 markdown/pdf）
- `exportNote(noteId, format)` - 导出单条笔记（markdown/pdf）
- `importData(file)` - 上传并导入文件

**导出格式说明:**
- JSON: 包含 version、exported_at、entries、notes 字段
- CSV: 分 section（`# === 密码条目 ===` 和 `# === 笔记 ===`），支持含逗号/引号的内容正确转义
- Markdown: 纯文本格式，适合纯笔记导出，包含标题、内容、分类和时间信息
- PDF: 使用 html2canvas 将渲染后的 HTML 转换为 PDF，支持中文显示，A4 格式自动分页

**重要提示:**
- 笔记 Markdown/PDF 导出支持单条笔记导出（通过笔记卡片的导出按钮）
- 全量导出（JSON/CSV）通过页面顶部的"备份"菜单访问

### 分页功能
数据列表支持分页展示，每页默认显示 50 条记录。

**API 接口:**
- `GET /api/entries?limit=<n>&offset=<n>` - 获取密码条目（支持分页）
- `GET /api/notes?limit=<n>&offset=<n>` - 获取笔记（支持分页）

**返回格式:**
```json
{
  "entries": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

**前端组件:**
- `Pagination` - 通用分页组件，支持首页/上一页/下一页/末页导航

### 笔记分享功能
支持通过链接分享笔记给其他人查看，无需登录即可访问。

**API 接口:**
- `POST /api/notes/share` - 创建分享链接（需要登录）
  - Body: `{ "noteId": "xxx", "expiresAt": "2024-12-31T23:59:59Z" }`（可选）
  - 返回: `{ "share_token": "xxx", "share_url": "http://..." }`
- `GET /api/share/[token]` - 获取分享的笔记内容（无需登录）
  - 返回: 笔记数据或 404

**分享页面:**
- `GET /share/[token]` - 公开分享页面 UI

**数据库表:**
- `note_shares` 表（SQLite 和 Supabase）
  - id: 分享记录 ID
  - note_id: 关联的笔记 ID
  - share_token: 唯一分享令牌
  - created_at: 创建时间
  - expires_at: 过期时间（可选）

**前端使用:**
- 笔记卡片工具栏有分享按钮
- 点击后生成分享链接并复制到剪贴板
- 分享页面支持富文本内容展示

## 飞牛 NAS FPK 打包

项目支持使用官方 `fnpack` 工具打包为飞牛 NAS 的 fpk 格式进行安装。

### 目录结构

```
fnas-fpk/
├── secure-vault/           # fnpack 生成的项目结构
│   ├── manifest             # 应用配置文件 (TOML 格式)
│   ├── app/                # 应用源码
│   │   └── docker/         # Docker 配置
│   │       ├── Dockerfile
│   │       └── docker-compose.yaml
│   ├── cmd/                # 应用生命周期脚本
│   ├── config/             # 应用配置
│   │   ├── privilege       # 权限配置
│   │   └── resource        # 资源配置
│   ├── wizard/             # 安装向导
│   ├── ICON.PNG           # 应用图标 (64x64)
│   └── ICON_256.PNG       # 应用图标 (256x256)
├── fnpack                 # fnpack 打包工具
├── build-fpk.sh          # 打包脚本
└── README.md             # 应用说明文档
```

### 打包命令

```bash
cd fnas-fpk
bash build-fpk.sh
```

输出文件: `secure-vault.fpk`

### 安装方式

1. 将 `secure-vault.fpk` 上传到飞牛 NAS
2. 进入 **应用中心** → **手动安装**
3. 上传 fpk 文件完成安装

### 访问地址

安装后访问: `http://<NAS_IP>:5000/vault/`

### 数据存储

应用数据存储在 Docker 卷中: `/app/data`
