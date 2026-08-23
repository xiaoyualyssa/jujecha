// ===== 认证路由：注册 / 登录 / 当前用户 =====
import { Router } from 'express'
import { getDb, run, get, randomUUID } from '../db/index.mjs'
import { hashPassword, verifyPassword, signToken } from '../auth.mjs'
import { requireAuth } from '../middleware/auth.mjs'

const router = Router()

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/

/**
 * POST /api/auth/register
 * { username, password }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: '请填写用户名和密码' })
    }
    const name = String(username).trim()
    if (!USERNAME_RE.test(name)) {
      return res.status(400).json({ error: '用户名需为 2-20 位（中文/字母/数字/下划线）' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' })
    }

    await getDb()
    const existing = await get('SELECT id FROM users WHERE username = ?', [name])
    if (existing) {
      return res.status(409).json({ error: '这个用户名已经被使用了，换一个试试吧' })
    }

    const { salt, hash } = hashPassword(String(password))
    const id = randomUUID()
    await run('INSERT INTO users (id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)', [
      id, name, hash, salt, Date.now(),
    ])

    const token = signToken({ uid: id, username: name })
    res.json({ token, user: { id, username: name } })
  } catch (e) {
    console.error('[register] 出错', e)
    res.status(500).json({ error: '注册失败，请稍后再试' })
  }
})

/**
 * POST /api/auth/login
 * { username, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: '请填写用户名和密码' })
    }
    await getDb()
    const user = await get('SELECT * FROM users WHERE username = ?', [String(username).trim()])
    if (!user || !verifyPassword(String(password), user.salt, user.password_hash)) {
      return res.status(401).json({ error: '用户名或密码不对，再试试' })
    }
    const token = signToken({ uid: user.id, username: user.username })
    res.json({ token, user: { id: user.id, username: user.username } })
  } catch (e) {
    console.error('[login] 出错', e)
    res.status(500).json({ error: '登录失败，请稍后再试' })
  }
})

/** GET /api/auth/me */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
