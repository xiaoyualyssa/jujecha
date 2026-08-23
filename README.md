# 看见自己 · 每日觉察手账 🌿

一个帮助高敏感、易内耗人群通过结构化记录提升自我觉察能力的网页应用。

**产品定位：不是计划表，是「情绪 + 身体 + 想法」的结构化记录分析仪。**

---

## ✨ 核心功能

| 模块 | 说明 |
|------|------|
| 📝 每日结构化记录 | 8 个字段（情绪、强度、身体、想法、事件、自我关怀、微小感动、一句话），同一日期仅一条 |
| 🏠 个人仪表盘 | 首页总览：累计/连续记录、本周情绪小地图、进行中的计划 |
| 🫧 AI 情绪分析 | 新增核心功能，接入阿里云/百度情感分析，附本地隐私兜底 |
| 📖 自动复盘 | 周报/月报，情绪分布、趋势描述、身体信号 |
| 🌱 行动计划 | 待开始/进行中/已完成，温和的自我关怀清单 |
| 🧰 工具库 | 4-7-8 呼吸、5-4-3-2-1 着陆、自我关怀短句、情绪日记引导 |

## 🎨 设计语言

- **配色**：米白 `#FAF8F5`、暖灰 `#8B8680`、浅粉 `#F5E6E8`、淡蓝 `#E8EEF2`、墨绿 `#5A7D7C`
- **字体**：标题思源柔黑，正文系统默认
- **文案**：全程温和、不制造焦虑
- **隐私**：所有数据仅存本地（localStorage），AI 分析仅上传脱敏文本

## 🚀 快速开始

### 环境要求
- Node.js ≥ 18（推荐 20+）

### 1. 安装依赖
```bash
npm install
```

### 2. 启动前端（纯前端原型，数据走 localStorage）
```bash
npm run dev
```
打开 http://localhost:5173

> **无需后端也能完整体验**：AI 分析在无后端时会自动使用「本地隐私兜底分析」，全程不联网。

### 3. 启动后端（账号 + 云端存储 + AI）
```bash
cp .env.example .env   # 填入 JWT_SECRET、阿里云密钥等
npm run dev:server     # 启动 Express 后端（端口 8787）
```

同时启动前后端：
```bash
npm run dev:all
```

### 4. 构建生产包
```bash
npm run build   # 产出到 dist/
```

## 🔐 账号体系与云端存储

V1.2 起支持「用户名 + 密码」账号体系，数据云端同步：

- **认证方式**：用户名（唯一）+ 密码，PBKDF2 哈希存储 + JWT 令牌
- **存储**：开发用 SQLite（`server/data/juecha.db`），生产切 Supabase/PostgreSQL（设 `DATABASE_URL`）
- **同步策略**：未登录走 localStorage；登录后保存时自动同步云端；登录时云端覆盖本地；注册时自动把本地记录上传云端
- **API 端点**：
  - `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me`
  - `GET/PUT/DELETE /api/journal[/:date]` · `GET/PUT /api/actions`

> 前端未登录也能完整使用（数据存本地），登录后享受跨设备同步。

## 🤖 AI 能力配置

后端按优先级尝试，失败自动降级到本地兜底：

1. **通义千问字段抽取**（AI 混合模式记录，识别情绪/身体/思维/行动）
   - 申请：https://dashscope.aliyun.com/
   - 配置：`.env` 填 `ALIYUN_DASHSCOPE_API_KEY`（`QWEN_MODEL` 可选，默认 qwen-plus）
2. **阿里云 NLP 情感倾向分析**（AI 情绪分析）
   - 申请：https://www.aliyun.com/product/nlp
   - 配置：`.env` 填 `ALIYUN_AK_ID` / `ALIYUN_AK_SECRET`
   - 需安装依赖：`npm i @alicloud/pop-core`
3. **百度 AI 对话情绪识别**（备选）
   - 申请：https://ai.baidu.com/
   - 配置：`.env` 填 `BAIDU_API_KEY` / `BAIDU_SECRET_KEY`
4. **本地词典兜底**（默认，离线可用，隐私最安全）

> ⚠️ AI 分析结果仅作为辅助参考，不替代专业心理咨询。

## 🗄️ 数据库

开发阶段使用 SQLite，生产就绪 PostgreSQL（Schema 见 `server/db/schema.sql`，已含 users 表与 user_id 隔离）。

```bash
# SQLite（默认，后端启动时自动建表）
npm run dev:server

# PostgreSQL / Supabase
npm i pg
DATABASE_URL=postgres://... npm run dev:server
```

## 📁 项目结构

```
juecha-shouzhang/
├── index.html                 # 入口 HTML
├── package.json               # 依赖清单
├── vite.config.ts             # Vite 配置（含 /api 代理）
├── tailwind.config.js         # Tailwind 主题（温暖配色）
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx               # 应用入口
│   ├── App.tsx                # 路由
│   ├── index.css              # 全局样式
│   ├── lib/
│   │   ├── types.ts           # 类型定义 + 情绪常量
│   │   ├── storage.ts         # localStorage 数据层
│   │   ├── ai.ts              # AI 分析前端封装
│   │   └── review.ts          # 周报/月报统计
│   ├── components/
│   │   ├── Layout.tsx         # 导航布局
│   │   └── ui.tsx             # 通用 UI 组件
│   └── pages/
│       ├── Dashboard.tsx      # 仪表盘
│       ├── Record.tsx         # 每日记录（8字段）
│       ├── Analysis.tsx       # AI 情绪分析
│       ├── Review.tsx         # 自动复盘
│       ├── Actions.tsx        # 行动计划
│       └── Toolbox.tsx        # 工具库
└── server/
    ├── index.mjs              # Express 入口
    ├── routes/analyze.mjs     # 分析路由
    ├── ai/analyze.mjs         # AI 封装（阿里云/百度/本地）
    └── db/
        ├── schema.sql         # 表结构定义
        └── init.mjs           # 初始化脚本
```

## 📦 技术栈

- **前端**：React 18 + TypeScript + Tailwind CSS + React Router
- **后端**：Node.js + Express
- **数据库**：SQLite（开发）/ PostgreSQL（生产）
- **AI**：阿里云 NLP / 百度 AI（可配置，默认本地兜底）

## 📂 仓库内容与比赛提交

本仓库包含「看见自己 · 每日觉察手账」的完整源码与开发过程：

| 路径 | 内容 |
|------|------|
| `src/` | 前端源码（React + TS + Tailwind） |
| `server/` | 后端源码（Express + 账号 / 云端存储 / AI） |
| `public/` `index.html` `vite.config.ts` `tailwind.config.js` | 前端工程配置 |
| `package.json` `package-lock.json` `Dockerfile` `railway.json` | 依赖与部署配置 |
| `README.md` `DEPLOY.md` | 产品说明与后端部署指南 |
| `DEVELOPMENT_LOG.md` | **开发过程记录**（14 轮迭代 + 路演 PPT 开发 + 技术踩坑） |
| `docs/pitch.html` | 路演单页（产品介绍） |
| `docs/路演-看见自己-最终版.pptx` | 2 分钟路演 PPT（含逐字演讲者备注） |

> ⚠️ 密钥与本地数据库已被 `.gitignore` 排除，仓库不含任何真实凭证；部署所需的环境变量模板见 `.env.example`。

## ⚠️ 隐私与免责声明

- 所有用户数据仅存储在浏览器本地（localStorage），不上传云端。
- AI 情绪分析仅上传脱敏后的文本内容（情绪词 + 想法 + 事件），不包含任何身份信息。
- 本产品不构成专业心理咨询或医疗建议。若情绪持续困扰，请寻求专业帮助。
