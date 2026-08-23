// ===== 行动计划路由（云端存储，按用户隔离） =====
import { Router } from 'express'
import { getDb, run, get, all, randomUUID } from '../db/index.mjs'
import { requireAuth } from '../middleware/auth.mjs'

const router = Router()

function rowToAction(row) {
  return {
    id: row.id,
    title: row.title,
    reason: row.reason,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    linkedEntryId: row.linked_entry_id,
    createdAt: row.created_at,
  }
}

/** GET /api/actions */
router.get('/', requireAuth, async (req, res) => {
  try {
    await getDb()
    const rows = await all('SELECT * FROM action_items WHERE user_id = ? ORDER BY created_at DESC', [req.user.id])
    res.json({ actions: rows.map(rowToAction) })
  } catch (e) {
    console.error('[actions:list] 出错', e)
    res.status(500).json({ error: '读取失败' })
  }
})

/** PUT /api/actions —— 批量保存（前端一次性提交全量） */
router.put('/', requireAuth, async (req, res) => {
  try {
    await getDb()
    const list = Array.isArray(req.body?.actions) ? req.body.actions : []
    await run('DELETE FROM action_items WHERE user_id = ?', [req.user.id])
    for (const a of list) {
      const id = a.id || randomUUID()
      await run(
        `INSERT INTO action_items (id, user_id, title, reason, due_date, priority, status, linked_entry_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        [id, req.user.id, a.title || '', a.reason || '', a.dueDate || null, a.priority || 'medium', a.status || 'todo', a.linkedEntryId || null, a.createdAt || Date.now()],
      )
    }
    const rows = await all('SELECT * FROM action_items WHERE user_id = ? ORDER BY created_at DESC', [req.user.id])
    res.json({ actions: rows.map(rowToAction) })
  } catch (e) {
    console.error('[actions:save] 出错', e)
    res.status(500).json({ error: '保存失败' })
  }
})

export default router
