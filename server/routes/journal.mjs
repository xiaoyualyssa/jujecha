// ===== 每日记录路由（云端存储，按用户隔离） =====
// V1.3：一天可记录多条，每条按 id 唯一；创建用 POST，更新/删除用 PUT/DELETE /:id
import { Router } from 'express'
import { getDb, run, get, all, randomUUID } from '../db/index.mjs'
import { requireAuth } from '../middleware/auth.mjs'

const router = Router()

// 解析 JSON 字段（容错）
function parseField(v, fallback) {
  try {
    return JSON.parse(v)
  } catch {
    return fallback
  }
}

function rowToEntry(row) {
  return {
    id: row.id,
    date: row.date,
    event: row.event,
    bodyFeelings: parseField(row.body, []),
    emotions: parseField(row.emotions, []),
    thoughts: row.thoughts,
    actions: parseField(row.actions, []),
    tinyJoy: row.tiny_joy,
    selfCare: row.self_care,
    satisfaction: row.satisfaction,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function serializeBody(b) {
  return {
    event: b.event || '',
    body: JSON.stringify(Array.isArray(b.bodyFeelings) ? b.bodyFeelings : []),
    emotions: JSON.stringify(Array.isArray(b.emotions) ? b.emotions : []),
    thoughts: b.thoughts || '',
    actions: JSON.stringify(Array.isArray(b.actions) ? b.actions : []),
    tinyJoy: b.tinyJoy || '',
    selfCare: b.selfCare || '',
    satisfaction: typeof b.satisfaction === 'number' ? b.satisfaction : 3,
  }
}

/** GET /api/journal —— 拉取当前用户全部记录（按日期、更新时间排序） */
router.get('/', requireAuth, async (req, res) => {
  try {
    await getDb()
    const rows = await all('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date ASC, created_at ASC', [req.user.id])
    res.json({ entries: rows.map(rowToEntry) })
  } catch (e) {
    console.error('[journal:list] 出错', e)
    res.status(500).json({ error: '读取记录失败' })
  }
})

/** POST /api/journal —— 新建一条记录 */
router.post('/', requireAuth, async (req, res) => {
  try {
    await getDb()
    const b = req.body || {}
    const date = b.date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: '日期格式不正确' })
    }
    const s = serializeBody(b)
    const id = randomUUID()
    const now = Date.now()
    await run(
      `INSERT INTO journal_entries (id, user_id, date, event, body, emotions, thoughts, actions, tiny_joy, self_care, satisfaction, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, req.user.id, date, s.event, s.body, s.emotions, s.thoughts, s.actions, s.tinyJoy, s.selfCare, s.satisfaction, now, now],
    )
    const created = await get('SELECT * FROM journal_entries WHERE id=?', [id])
    res.status(201).json({ entry: rowToEntry(created) })
  } catch (e) {
    console.error('[journal:create] 出错', e)
    res.status(500).json({ error: '保存失败' })
  }
})

/** PUT /api/journal/:id —— 更新某一条记录 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    await getDb()
    const { id } = req.params
    const existing = await get('SELECT * FROM journal_entries WHERE id = ? AND user_id = ?', [id, req.user.id])
    if (!existing) {
      return res.status(404).json({ error: '这条记录不存在' })
    }
    const b = req.body || {}
    const s = serializeBody(b)
    const now = Date.now()
    await run(
      `UPDATE journal_entries SET event=?, body=?, emotions=?, thoughts=?, actions=?, tiny_joy=?, self_care=?, satisfaction=?, updated_at=? WHERE id=?`,
      [s.event, s.body, s.emotions, s.thoughts, s.actions, s.tinyJoy, s.selfCare, s.satisfaction, now, id],
    )
    const updated = await get('SELECT * FROM journal_entries WHERE id=?', [id])
    res.json({ entry: rowToEntry(updated) })
  } catch (e) {
    console.error('[journal:update] 出错', e)
    res.status(500).json({ error: '保存失败' })
  }
})

/** DELETE /api/journal/:id —— 删除某一条记录 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await getDb()
    await run('DELETE FROM journal_entries WHERE user_id = ? AND id = ?', [req.user.id, req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error('[journal:delete] 出错', e)
    res.status(500).json({ error: '删除失败' })
  }
})

export default router
