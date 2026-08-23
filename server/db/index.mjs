// ===== 数据库访问层 =====
// 开发：SQLite（Node 内置 sqlite，回退 better-sqlite3）
// 生产：设置 DATABASE_URL 后走 pg 连 Supabase/PostgreSQL
// 所有操作异步；占位符统一处理（SQLite ? / Postgres $n）

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')

let driver = null // { type: 'sqlite' | 'pg', db, ... }

// ---------- SQLite ----------

async function initSqlite() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

  let DatabaseSync = null
  try {
    const mod = await import('node:sqlite')
    DatabaseSync = mod.DatabaseSync
  } catch {
    DatabaseSync = null
  }

  if (DatabaseSync) {
    const db = new DatabaseSync(join(DATA_DIR, 'juecha.db'))
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
    db.exec(schema)
    return { type: 'sqlite', db }
  }

  // 回退 better-sqlite3
  let Better
  try {
    const mod = await import('better-sqlite3')
    Better = mod.default
  } catch {
    throw new Error('缺少 SQLite 驱动：请安装 better-sqlite3，或使用 Node 22.5+')
  }
  const db = new Better(join(DATA_DIR, 'juecha.db'))
  db.exec(readFileSync(join(__dirname, 'schema.sql'), 'utf-8'))
  return { type: 'sqlite', db }
}

// ---------- PostgreSQL / Supabase ----------

async function initPg() {
  let pg
  try {
    pg = await import('pg')
  } catch {
    throw new Error('缺少 pg 依赖：请 npm i pg')
  }
  const { Client } = pg
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  // 逐条执行建表（pg 不支持多语句 exec）
  // 先逐行剔除整行注释，再按分号分割；行内注释（如 `-- 盐`）交给 PostgreSQL 原生处理
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  const statements = schema
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  for (const stmt of statements) {
    await client.query(stmt)
  }

  // ---- 迁移：V1.3 起允许一天多条记录，移除旧的 UNIQUE(user_id, date) 约束 ----
  // 旧版本建表时内联了 UNIQUE(user_id, date)，PostgreSQL 默认约束名为 <table>_<cols>_key
  try {
    await client.query('ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_user_id_date_key')
    console.log('[db] 已确保 journal_entries 允许一天多条记录')
  } catch (e) {
    // 约束可能命名不同或已不存在，忽略即可（索引 idx_journal_user_date 仍保留，用于按用户+日期查询）
    console.warn('[db] 迁移移除唯一约束时跳过（可能已不存在）:', e.message)
  }

  return { type: 'pg', db: client }
}

// ---------- 统一入口 ----------

async function getDb() {
  if (driver) return driver
  if (process.env.DATABASE_URL) {
    driver = await initPg()
  } else {
    driver = await initSqlite()
  }
  return driver
}

// 把 ? 占位符转为 $1, $2 ...
function toPg(sql) {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

async function run(sql, params = []) {
  const d = await getDb()
  if (d.type === 'pg') {
    await d.db.query(toPg(sql), params)
    return { changes: 1 }
  }
  return d.db.prepare(sql).run(...params)
}

async function all(sql, params = []) {
  const d = await getDb()
  if (d.type === 'pg') {
    const res = await d.db.query(toPg(sql), params)
    return res.rows
  }
  return d.db.prepare(sql).all(...params)
}

async function get(sql, params = []) {
  const d = await getDb()
  if (d.type === 'pg') {
    const res = await d.db.query(toPg(sql), params)
    return res.rows[0]
  }
  return d.db.prepare(sql).get(...params)
}

export { getDb, run, all, get, randomUUID }
