-- ============================================================
-- 看见自己 · 每日觉察手账 —— 数据库 Schema（V1.2 + 账号体系）
-- 开发阶段用 SQLite，生产用 Supabase(PostgreSQL) 或阿里云 RDS
-- ============================================================

-- ---------- 用户 ----------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,              -- UUID
  username      TEXT NOT NULL UNIQUE,          -- 用户名（不可重复）
  password_hash TEXT NOT NULL,                 -- PBKDF2 哈希
  salt          TEXT NOT NULL,                 -- 盐
  created_at    BIGINT NOT NULL                -- 毫秒时间戳，需 BIGINT（PG 的 INTEGER 是 32 位装不下）
);

-- ---------- 每日觉察记录（V1.3 数据模型：一天可多条） ----------
CREATE TABLE IF NOT EXISTS journal_entries (
  id            TEXT PRIMARY KEY,              -- UUID
  user_id       TEXT NOT NULL,                 -- 归属用户
  date          TEXT NOT NULL,                 -- YYYY-MM-DD
  event         TEXT NOT NULL DEFAULT '',      -- 发生了什么
  body          TEXT NOT NULL DEFAULT '[]',    -- 身体感受 JSON: [{label,custom,score,display}]
  emotions      TEXT NOT NULL DEFAULT '[]',    -- 情绪 JSON: 同上
  thoughts      TEXT NOT NULL DEFAULT '',      -- 自动思维
  actions       TEXT NOT NULL DEFAULT '[]',    -- 行动 JSON: [{kind,text}]
  tiny_joy      TEXT NOT NULL DEFAULT '',      -- 微小感动
  self_care     TEXT NOT NULL DEFAULT '',      -- 今日自我关怀
  satisfaction  INTEGER NOT NULL DEFAULT 3,    -- 自我满意度 1-5
  created_at    BIGINT NOT NULL,
  updated_at    BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date);

-- ---------- 行动计划 ----------
CREATE TABLE IF NOT EXISTS action_items (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  due_date    TEXT,                            -- YYYY-MM-DD，可空
  priority    TEXT NOT NULL DEFAULT 'medium',  -- high | medium | low
  status      TEXT NOT NULL DEFAULT 'todo',    -- todo | doing | done
  linked_entry_id TEXT,                        -- 关联觉察记录 id
  created_at  BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_action_user ON action_items(user_id);

-- ---------- AI 分析结果（可选缓存） ----------
CREATE TABLE IF NOT EXISTS analysis_results (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  entry_id    TEXT NOT NULL,
  sentiment   TEXT NOT NULL,
  confidence  REAL NOT NULL,
  keywords    TEXT NOT NULL DEFAULT '[]',
  summary     TEXT NOT NULL DEFAULT '',
  suggestion  TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'local',
  analyzed_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
);
