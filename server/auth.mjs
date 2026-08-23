// ===== 认证工具：PBKDF2 密码哈希 + JWT（HS256） =====
// 零外部依赖，用 Node 内置 crypto 实现

import { randomBytes, pbkdf2Sync, timingSafeEqual, createHmac } from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'juecha-dev-secret-change-me'

// ---------- 密码哈希 ----------

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex')
  return { salt, hash }
}

export function verifyPassword(password, salt, hash) {
  const computed = pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex')
  const a = Buffer.from(computed)
  const b = Buffer.from(hash)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// ---------- JWT ----------

function b64url(input) {
  return Buffer.from(input).toString('base64url')
}

export function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }))
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

export function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.')
    const expected = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(body, 'base64url').toString())
  } catch {
    return null
  }
}
