# ===== 看见自己·每日觉察手账 后端 Dockerfile（Railway 部署） =====
# 只部署后端（server/），前端静态站走 CloudStudio 预览

FROM node:22-alpine

WORKDIR /app

# 仅复制后端所需文件
COPY package.json package-lock.json* ./
COPY server ./server

# 安装依赖（含 pg）
RUN npm install --omit=dev

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

CMD ["node", "server/index.mjs"]
