-- ============================================================
-- 数据库初始化脚本（Node.js）
-- 用法：node server/db/init.mjs
-- 依赖：better-sqlite3（开发）或 pg（生产）
-- ============================================================
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')

const DB_TYPE = process.env.DB_TYPE || 'sqlite'

async function initSqlite() {
  let Database
  try {
    const mod = await import('better-sqlite3')
    Database = mod.default
  } catch {
    console.error('请先安装 better-sqlite3：npm i better-sqlite3')
    process.exit(1)
  }
  const dataDir = join(__dirname, '..', 'data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  const db = new Database(join(dataDir, 'juecha.db'))
  db.exec(schema)
  console.log('✅ SQLite 数据库已初始化：server/data/juecha.db')
  db.close()
}

async function initPostgres() {
  let pg
  try {
    pg = await import('pg')
  } catch {
    console.error('请先安装 pg：npm i pg')
    process.exit(1)
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  await client.query(schema)
  console.log('✅ PostgreSQL 数据库已初始化')
  await client.end()
}

if (DB_TYPE === 'postgres') {
  initPostgres()
} else {
  initSqlite()
}
