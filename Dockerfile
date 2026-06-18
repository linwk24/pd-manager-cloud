# ========== 用法 ==========
# 构建镜像：  docker build -t pd-manager .
# 运行容器：  docker run -d -p 5000:5000 -v ./data:/app/data pd-manager
# ==========================

FROM node:22-alpine

RUN apk add --no-cache tzdata

WORKDIR /app

# 先构建（需要完整源码）
# 如果已有 .next 和 dist，直接复制
COPY .next .next
COPY dist dist
COPY public public
COPY package.json ./
COPY data ./data

# 首次运行自动安装生产依赖
RUN npm install --production --no-audit --no-fund 2>/dev/null || true

EXPOSE 5000

VOLUME ["/app/data"]

ENV COZE_PROJECT_ENV=PROD
ENV PORT=5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ || exit 1

CMD ["node", "dist/server.js"]
