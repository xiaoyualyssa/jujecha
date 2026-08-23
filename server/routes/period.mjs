// ===== 周期情绪复盘路由 =====
// POST /api/analyze-period  body: { period: '24h'|'week'|'month', offset?: number }
// 从数据库拉取当前用户该时间范围内的记录，交给 AI 生成安抚性周期复盘
import { Router } from 'express'
import { getDb, all } from '../db/index.mjs'
import { requireAuth } from '../middleware/auth.mjs'
import { analyzePeriod } from '../ai/period.mjs'

const router = Router()

function fmt(d) {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

function rangeFor(period, offset = 0) {
  const now = new Date()
  if (period === '24h') {
    return { type: 'ts', startTs: Date.now() - 24 * 60 * 60 * 1000, label: '过去 24 小时' }
  }
  if (period === 'month') {
    const y = now.getFullYear()
    const m = now.getMonth() + offset
    const first = new Date(y, m, 1)
    const last = new Date(y, m + 1, 0)
    return { type: 'date', start: fmt(first), end: fmt(last), label: `${first.getFullYear()}年${first.getMonth() + 1}月` }
  }
  // week（周一起点）
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1) + offset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    type: 'date',
    start: fmt(monday),
    end: fmt(sunday),
    label: `${monday.getMonth() + 1}月${monday.getDate()}日 - ${sunday.getMonth() + 1}月${sunday.getDate()}日`,
  }
}

function parseField(v, fb) {
  try { return JSON.parse(v) } catch { return fb }
}

router.post('/analyze-period', requireAuth, async (req, res) => {
  try {
    await getDb()
    const { period, offset } = req.body || {}
    if (!['24h', 'week', 'month'].includes(period)) {
      return res.status(400).json({ error: 'period 需为 24h / week / month' })
    }
    const r = rangeFor(period, Number(offset) || 0)

    let rows
    if (r.type === 'ts') {
      rows = await all(
        'SELECT * FROM journal_entries WHERE user_id = ? AND created_at >= ? ORDER BY created_at ASC',
        [req.user.id, r.startTs],
      )
    } else {
      rows = await all(
        'SELECT * FROM journal_entries WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC, created_at ASC',
        [req.user.id, r.start, r.end],
      )
    }

    const entries = rows.map((row) => ({
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
    }))

    if (entries.length === 0) {
      return res.json({ label: r.label, count: 0, result: null })
    }

    const result = await analyzePeriod(r.label, entries)
    res.json({ label: r.label, count: entries.length, result })
  } catch (e) {
    console.error('[analyze-period] 出错', e)
    res.status(500).json({ error: '复盘生成失败，请稍后再试' })
  }
})

export default router
