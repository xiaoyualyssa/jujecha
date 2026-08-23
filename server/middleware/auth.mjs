// ===== 认证中间件：从 Authorization: Bearer <token> 解析用户 =====
import { verifyToken } from '../auth.mjs'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    return res.status(401).json({ error: '未登录' })
  }
  const payload = verifyToken(token)
  if (!payload || !payload.uid) {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
  req.user = { id: payload.uid, username: payload.username }
  next()
}
