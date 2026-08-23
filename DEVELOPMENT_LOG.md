# 开发过程记录 · 看见自己 · 每日觉察手账

> 本文档记录产品的完整开发迭代过程，作为比赛「代码与开发过程」提交材料。
> 所有密钥、密码、API Key 均已脱敏，真实凭证仅存在于本地 `.env`（已被 `.gitignore` 排除），不会进入仓库。

---

## 一、产品定位与初始设计（2026-08-22）

**定位**：不是计划表，而是「情绪 + 身体 + 想法」的结构化记录分析仪，服务高敏感 / 易内耗人群。

**技术栈选型**：React 18 + TypeScript + Tailwind CSS + Vite（前端）；Node.js + Express（后端）；SQLite（开发）/ PostgreSQL（生产）；AI 情绪分析（通义千问 / AI Ping / 本地词典兜底）。

**六大模块**：每日记录（8 字段）、仪表盘、AI 分析、自动复盘、行动计划、工具库。

**关键设计约束**：
- 同一日期一条记录（V1.3 起放宽为一天可记多条）；
- 「微小感动」留空时温和提醒，不制造焦虑；
- AI 仅作辅助参考，不替代专业心理咨询；
- 数据默认存浏览器 localStorage，可选云端同步。

**视觉语言**：米白 `#FAF8F5` / 暖灰 `#8B8680` / 浅粉 `#F5E6E8` / 淡蓝 `#E8EEF2` / 墨绿 `#5A7D7C`。

---

## 二、核心迭代轮次

### 第 1 轮 · 精细化重构
- 情绪 / 身体改为「预设 + 自定义 + 1–10 打分」(FeelingScore)；
- 新增自我满意度 (1–5)、冲动 vs 理性行动区分、今日自我关怀；
- 复盘升级：情绪词云（与上週对比 ▲▼）、身体症状频率、微小感动合集、成长趋势曲线 (SVG)；
- 行动计划支持优先级 / 截止日期 / 与记录关联 / 从记录一键创建行动。

### 第 2 轮 · 路演材料（滚动 HTML）
- 制作滚动式路演页（`docs/pitch.html`），突出价值主张；
- 核心叙事：被情绪劫持 → 看见 / 理解 / 管理情绪；三大能力「识别 / 理解 / 改变」；
- 映射 8 个心理学理论：正念、CBT、情绪标注效应、情绪颗粒度、躯体标记、自我关怀、拓展建构、执行意图。

### 第 3 轮 · UI 优化 + 数据备份
- 保存成功后不再自动跳转，明确成功状态 + 返回按钮，消除「存没存上」焦虑；
- 新增「设置与数据」页：导出备份 JSON、导入恢复（按日期 / id 合并去重）、清空数据（二次确认）。

### 第 4 轮 · V1.2：AI 追问 + 混合记录
- 混合模式：自由写 → AI 抽取回填 → 用户确认；
- 后端新增 `server/ai/extract.mjs` + `routes/extract.mjs`：通义千问 (DashScope OpenAI 兼容) 做字段抽取，本地正则兜底；
- 导航从 6 个收敛为 4 个 tab（首页 / 记录 / 复盘 / 我的）。

### 第 5 轮 · 账号体系 + 云端存储
- 方案：Supabase 数据库 + 自建「用户名 + 密码」认证 + 本地→云端自动同步；
- 后端：新增 `auth.mjs`（PBKDF2 + JWT，零依赖）、`db/index.mjs`（Node 内置 sqlite，回退 better-sqlite3）、`middleware/auth.mjs`、`routes/auth.mjs` + `journal.mjs` + `actions.mjs`；
- `schema.sql` 重写为新增 users 表，`journal/actions` 加 `user_id` 外键；
- 前端：新增 `api.ts`（登录态 + 云端 CRUD + 同步）、`Auth.tsx`、`Me.tsx`；`storage.ts` 改造为双写（本地 + 云端异步）；
- 端到端测试通过：注册 / 登录 / 保存 / 读取 / 未登录 401。

### 第 6 轮 · 接入 AI Ping + 验证
- 改用 AI Ping（OpenAI 兼容聚合平台）作为主力 LLM；
- `extract.mjs` 改为三级兜底：AI Ping → DashScope 直连 → 本地；
- 验证 AI Ping key 有效，字段抽取准确。

### 第 7 轮 · Railway 部署准备 + Postgres 双驱动
- 选定 Railway 部署；
- `db/index.mjs` 改为双驱动：`DATABASE_URL` 存在走 pg（Supabase），否则 SQLite；`?` 占位符自动转 `$n`；
- 路由全部异步化；新增 `Dockerfile`、`railway.json`、`DEPLOY.md`；`package.json` 加 `pg` 依赖。

### 第 8 轮 · Supabase 真库全链路打通（关键踩坑）
- **关键纠正**：用户给的 URL 是 REST 端点，非数据库连接串；DB 主机为 `db.<项目ID>.supabase.co`；
- **连接踩坑**：直连域名只解析 IPv6，本地不通 → 改用 Pooler 域名 `aws-0-ap-southeast-1.pooler.supabase.com`（IPv4）秒连成功；
- **上线才暴露的两个 bug**：
  1. `db/index.mjs` 建表按分号分割，整行 `--` 注释连累 `CREATE TABLE` 被丢弃 → 改为「先剔行注释、再分号分割」；
  2. schema 时间戳字段用 `INTEGER`（PG 32 位）装不下毫秒时间戳 → 全部改 `BIGINT`；
- 端到端实测通过：注册 / 登录 / PUT 记录 (V1.2 全字段) / 读回 / 行动计划 / 未登录 401。

### 第 9 轮 · Railway 全链路部署上线 ✅
- 部署方式：本机无 git / gh（当时 Xcode 命令行工具未装）→ 改用 Railway CLI 免 git 上传；
- 认证要点：`RAILWAY_API_TOKEN` 用账户级 token（`RAILWAY_TOKEN` 是项目级，会互相干扰导致 Unauthorized）；
- CORS 踩坑：`CLIENT_ORIGIN="*"` 被 split 成数组后 cors 包精确匹配不把 `*` 当通配符 → 改成具体前端域名修复；
- 上线地址：前端 CloudStudio 静态站 + 后端 Railway（`/api/health` 正常）；
- 全链路公网验证通过：注册 / 登录 / 记录 / 行动 / CORS。

### 第 10 轮 · V1.3：一天多条记录 + 周期 AI 复盘 ✅
- 需求：①保存后引导未注册用户注册云同步；②UI 美化；③一天可记无限次、每条可改；④复盘页 24h / 周 / 月 AI 情绪分析一键生成；
- 后端：`schema.sql` 删除 `UNIQUE(user_id, date)`（启动时 `ALTER TABLE ... DROP CONSTRAINT IF EXISTS` 自动迁移）；路由从按 date 改为按 id（POST 新建 / PUT /:id 更新 / DELETE /:id 删除）；新增 `server/ai/period.mjs` + `server/routes/period.mjs`（`POST /api/analyze-period`）；
- 前端：`storage.ts` 按 id 去重 + `getEntriesByDate` / `deleteEntry`；`api.ts` 拆 `apiCreateEntry` / `apiUpdateEntry` / `apiDeleteEntry` + `apiAnalyzePeriod`；`Record.tsx` 重写为一天多条可编辑；`Review.tsx` 新增「AI 温柔复盘」卡片；
- 验证：tsc -b 通过、vite build 通过、本地 SQLite 端到端冒烟测试全过。

### 第 11 轮 · 记录页 / 首页 / AI 复盘细节修正 ✅
- 首页按钮「查看 / 修改今天的记录」→「去记录 ✍️」；
- 记录页胶囊按钮文案改为「提交时间 + 觉察 + 第几条」；
- AI 帮我整理从「覆盖」改为「追加」，旧内容保留；
- 修复「未识别」情绪：前后端兜底不再硬塞标签，统计过滤 `未识别`，兼容历史数据；
- 情绪词从 13 个扩充到 31 个，补全 `MOOD_COLORS` / `MOOD_EMOJI`。

### 第 12 轮 · 记录页信息架构优化 ✅
- AI 卡片紧凑折叠，默认一行引导文案；
- 必填项（发生了什么 / 身体感受 / 情绪）提交时才提醒；
- 微小感动与自我关怀顺序调换；
- 情绪预设标签折叠只展示 3 行（展开 / 收起），自定义输入默认隐藏、点击后出现并聚焦。

---

## 三、路演 PPT 开发（2026-08-23）

- 需求：面向比赛评委的 2 分钟路演，讲清命题 / 核心玩法 / AI 作用 / Token 优化，价值明确；
- 用 tencent-pptx（slidep 引擎）制作 6 页：封面 → 命题 → 核心功能 → AI 作用 → Token 优化 → 收尾；
- 关键技术点：
  - 图标库坑：`sparkles` 不存在 → `wand-magic-sparkles`；`hands-holding-heart` → `heart`；
  - WPS 预览旧 pptx 会锁死文件 → 改用新文件名避开文件锁；
  - **演讲者备注**：`.slide` 的 `notes` 属性被引擎解构丢弃、不落盘 → 用 python-pptx 后处理注入；发现引擎导出的 notesMaster 缺 body 占位符，需手动构造标准 `<p:sp>` 再注入文本；
- 最终交付：`docs/路演-看见自己-最终版.pptx`（6 页 + 6 条逐字演讲者备注）。

---

## 四、关键技术与安全备忘

1. **PostgreSQL 的 INTEGER 是 32 位**，装不下毫秒时间戳 → 所有时间戳字段用 `BIGINT`（SQLite 是 64 位，本地不报错、上线才暴露）。
2. **建表 SQL 按分号分割**，整行 `--` 注释不能连累后续 `CREATE TABLE` → 改为「先剔行注释、再分号分割」。
3. **Supabase 连接**：务必用 Pooler（IPv4）域名，直连域名部分网络只解析 IPv6。
4. **CORS**：`cors` 包数组模式是精确匹配，`CLIENT_ORIGIN` 不能写 `*`。
5. **密钥管理**：所有密钥只在 `.env`（已 gitignore）；`.env.example` 提供模板；仓库内任何文档均使用占位符。
6. **隐私**：这是心理健康产品，用户记录属敏感个人信息，验收只展示脱敏统计（人数 / 活跃度 / 情绪占比），不暴露具体日记内容。

---

## 五、线上环境（验收可见）

- 前端（静态站）：https://8e4c452f0f454790b5066ec6d6c279fa.app.workbuddy.link
- 后端（Railway）：https://api-production-77af.up.railway.app（健康检查 `/api/health`）
- 数据库：Supabase PostgreSQL（Pooler 连接）
- 路演单页：`docs/pitch.html`
- 路演 PPT：`docs/路演-看见自己-最终版.pptx`
