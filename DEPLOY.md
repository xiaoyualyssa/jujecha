# 看见自己 · 每日觉察手账 —— 后端部署到 Railway 分步指南

> 前端是纯静态站（已部署到 CloudStudio 预览），后端负责账号 + 云端存储 + AI。
> 本指南带你 10 分钟把后端部署到 Railway，并连上 Supabase 数据库。

## ✅ 已上线（2026-08-22 实际部署记录）

- **前端（静态站）**：https://8e4c452f0f454790b5066ec6d6c279fa.app.workbuddy.link
- **后端（Railway）**：https://api-production-77af.up.railway.app
  - 健康检查：`/api/health` → `{"ok":true,...}`
- **数据库（Supabase）**：PostgreSQL 17.6，Pooler 连接串（见下）
- **Railway 项目 ID**：`fc8e2b04-9d34-4e6b-b5ce-7396e7071523`
- **Railway 服务 ID**：`e137f95f-a799-49f7-88b6-079e45cdbc22`（名字 `api`）
- **环境变量已配置**：DATABASE_URL / AIPING_API_KEY / AIPING_MODEL / JWT_SECRET / CLIENT_ORIGIN / PORT
- **全链路已验证**：注册 / 登录 / 保存记录 / 读回 / 行动计划 / CORS 跨域 全部通过

> ⚠️ 注意：Railway CLI 认证要用 **账户级 token + `RAILWAY_API_TOKEN`** 环境变量（不是 `RAILWAY_TOKEN`，那是项目级 token 专用）。

## 前置准备（你需要备齐 3 样东西）

1. **AI Ping key**（`QC-` 开头）
   - 在 https://www.aiping.cn 个人中心生成
2. **Supabase 数据库密码**（你建项目时自己设的那个密码）
   - 从你的项目地址 `https://<项目ID>.supabase.co` 可确认项目 ID
3. **一个 Railway 账号**（https://railway.app，可用 GitHub 登录）

## 第一步：本地把代码推到一个 GitHub 仓库（或用 Railway 直接上传）

Railway 支持两种方式，选其一：

- **方式 A（推荐）**：把本项目推到 GitHub，然后在 Railway 里「Deploy from GitHub repo」
- **方式 B**：在 Railway 里选「Deploy from Dockerfile」直接上传

## 第二步：在 Railway 创建项目

1. 登录 https://railway.app → New Project → Deploy from GitHub（或 Dockerfile）
2. 选择本仓库/上传本项目
3. Railway 会自动读取 `Dockerfile` 构建

## 第三步：配置环境变量（关键！）

在 Railway 项目 → Variables 里添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | 见下方「已验证连接串」 | Supabase 连接串 |
| `AIPING_API_KEY` | 你的 `QC-` key | AI 字段抽取 |
| `AIPING_MODEL` | `Qwen3-30B-A3B-Instruct-2507` | 模型名 |
| `JWT_SECRET` | 一串随机长字符串 | 登录令牌签名密钥 |
| `CLIENT_ORIGIN` | `https://<你的前端域名>`（可逗号分隔多个） | 允许跨域的前端来源 |

### ✅ 已验证可用的连接串（重要）

**务必用 Pooler（连接池）域名，不要用直连域名 `db.xxx.supabase.co`。**
直连域名在部分网络只解析到 IPv6，会连不上；Pooler 走 IPv4，全环境通吃。

```
postgresql://postgres.qybjqlkjeqtxlpdozcfn:<你的数据库密码>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

- 用户名是 `postgres.qybjqlkjeqtxlpdozcfn`（**带项目 ID 后缀**，不是裸 `postgres`）
- 端口 `5432`（会话模式）；也可用 `6543`（事务模式）
- `<你的数据库密码>` 换成建项目时自设的 Database Password

> Supabase 连接串获取（新版控制台）：进到项目内部 → 右上角绿色 **Connect** 按钮 → 弹窗切 **Database** 标签 → 复制 **URI** 那一行。
> 复制出来的 URI 可能带 `[YOUR-PASSWORD]` 占位符，替换成真实密码即可。

## 第四步：部署并验证

1. Railway 会自动构建部署，完成后会给你一个域名（如 `xxx.up.railway.app`）
2. 验证后端是否起来：浏览器打开 `https://xxx.up.railway.app/api/health`，看到 `{"ok":true,...}` 即成功
3. 验证数据库：注册一个测试账号，能成功即代表 Supabase 已连通

## 第五步：把前端指到后端

前端构建时设置 `VITE_API_BASE=https://xxx.up.railway.app/api`，重新构建前端并部署，登录/同步即可在公网生效。

## 常见问题

- **`/api/health` 打不开**：看 Railway 的部署日志，通常是 DATABASE_URL 格式不对或密码错误
- **注册报 500**：多半是连接串用了直连域名（`db.xxx.supabase.co` 只解析 IPv6）——改回 Pooler 域名即可；或密码没替换
- **AI 抽取返回 local**：检查 AIPING_API_KEY 是否配好、是否有余额

## 关键实现备注（踩坑记录）

1. **PostgreSQL 的 INTEGER 是 32 位**，装不下毫秒时间戳（`Date.now()` ≈ 1.7×10¹²）。schema 里所有时间戳字段已用 `BIGINT`。SQLite 的 INTEGER 是 64 位，所以本地开发时看不出问题、上线才暴露。
2. **建表时按分号分割 SQL**，注意整行注释 `--` 不能连累到后面的 `CREATE TABLE` 语句——`db/index.mjs` 已改为「先剔行注释、再分号分割」。
3. 数据表已在 Supabase 用正确 schema 建好并实测通过（注册/登录/记录/行动 全链路 OK）。

## V1.3 迭代（一天多条记录 + 周期 AI 复盘）

本次迭代改了后端 schema 和路由，**重新部署后端后会自动迁移**：

1. **一天可记录多条**：`journal_entries` 移除了旧的 `UNIQUE(user_id, date)` 约束（`db/index.mjs` 在启动时用 `ALTER TABLE ... DROP CONSTRAINT IF EXISTS journal_entries_user_id_date_key` 自动迁移）。保留索引 `idx_journal_user_date` 用于按用户+日期查询。
2. **路由从「按日期」改为「按 id」**：
   - `POST /api/journal`（新建，body 含 `date`）
   - `PUT /api/journal/:id`（更新）
   - `DELETE /api/journal/:id`（删除）
   - `GET /api/journal`（拉全部，不变）
3. **新增周期情绪复盘**：`POST /api/analyze-period`，body `{ period: '24h'|'week'|'month', offset?: number }`，需登录。AI 优先走 AI Ping / DashScope，兜底用本地模板。返回 `{ label, count, result: { summary, highlights, scienceTips, personalSuggestions, closing, source } }`。
4. 前端 `storage.ts` 的 `saveEntry` 从「按 date 去重」改为「按 id 去重」，新增 `getEntriesByDate` / `deleteEntry`；`api.ts` 的 `apiSaveEntry` 拆为 `apiCreateEntry` / `apiUpdateEntry` / `apiDeleteEntry`。

> ⚠️ 重新部署后首次启动会执行迁移 SQL，日志里会打印 `[db] 已确保 journal_entries 允许一天多条记录`。

