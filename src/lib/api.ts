// ===== 云端 API 客户端 =====
// 登录后读写云端；未登录时各页面走 localStorage 兜底

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

const TOKEN_KEY = 'juecha:token:v1'
const USER_KEY = 'juecha:user:v1'

export interface AuthUser {
  id: string
  username: string
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  // 通知各组件登录态已变化（用于跨组件刷新登录态显示）
  notifyAuthChange()
}

export function isLoggedIn(): boolean {
  return Boolean(getToken())
}

// ---------- 全局登录态订阅（让组件/页面在登录、登出、刷新后实时感知） ----------

export type AuthListener = () => void
const authListeners = new Set<AuthListener>()

function notifyAuthChange() {
  authListeners.forEach((fn) => {
    try {
      fn()
    } catch {
      /* 忽略单个监听失败 */
    }
  })
}

/** 订阅登录态变化，返回取消订阅函数 */
export function onAuthChange(fn: AuthListener): () => void {
  authListeners.add(fn)
  return () => authListeners.delete(fn)
}

// 监听其它标签页/窗口的登录态变化（同源下 localStorage 共享）
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', (e) => {
    if (e.key === TOKEN_KEY || e.key === USER_KEY) notifyAuthChange()
  })
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`)
  }
  return data
}

// ---------- 认证 ----------

export async function apiRegister(username: string, password: string): Promise<AuthUser> {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setAuth(data.token, data.user)
  return data.user
}

export async function apiLogin(username: string, password: string): Promise<AuthUser> {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setAuth(data.token, data.user)
  return data.user
}

// ---------- 每日记录 ----------

export async function apiFetchJournal(): Promise<any[]> {
  const data = await request('/journal')
  return data.entries || []
}

export async function apiCreateEntry(entry: any): Promise<any> {
  const data = await request('/journal', {
    method: 'POST',
    body: JSON.stringify(entry),
  })
  return data.entry
}

export async function apiUpdateEntry(id: string, entry: any): Promise<any> {
  const data = await request(`/journal/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entry),
  })
  return data.entry
}

export async function apiDeleteEntry(id: string): Promise<any> {
  return await request(`/journal/${id}`, { method: 'DELETE' })
}

/** 周期情绪复盘（24h / week / month） */
export async function apiAnalyzePeriod(period: '24h' | 'week' | 'month', offset = 0): Promise<any> {
  return await request('/analyze-period', {
    method: 'POST',
    body: JSON.stringify({ period, offset }),
  })
}

// ---------- 行动计划 ----------

export async function apiFetchActions(): Promise<any[]> {
  const data = await request('/actions')
  return data.actions || []
}

export async function apiSaveActions(actions: any[]): Promise<any[]> {
  const data = await request('/actions', {
    method: 'PUT',
    body: JSON.stringify({ actions }),
  })
  return data.actions || []
}

/** 首次登录后：把本地 localStorage 的数据同步到云端 */
export async function syncLocalToCloud() {
  const { getEntries, getActions } = await import('./storage')
  const entries = getEntries()
  const actions = getActions()

  let synced = 0
  for (const e of entries) {
    try {
      const remote = await apiCreateEntry({
        date: e.date,
        event: e.event,
        bodyFeelings: e.bodyFeelings,
        emotions: e.emotions,
        thoughts: e.thoughts,
        actions: e.actions,
        tinyJoy: e.tinyJoy,
        selfCare: e.selfCare,
        satisfaction: e.satisfaction,
      })
      // 回写云端 id 到本地，避免再次登录时重复同步
      if (remote?.id && remote.id !== e.id) {
        const { getEntries, saveEntry } = await import('./storage')
        const list = getEntries()
        const idx = list.findIndex((x) => x.id === e.id)
        if (idx >= 0) saveEntry({ ...list[idx], id: remote.id, cloudSynced: true })
      }
      synced++
    } catch (err) {
      console.warn('同步单条记录失败', e.date, err)
    }
  }
  if (actions.length) {
    try {
      await apiSaveActions(actions)
    } catch (err) {
      console.warn('同步行动失败', err)
    }
  }
  return synced
}
