// ===== localStorage 数据层 =====
// 所有用户数据仅保存在浏览器本地，不上传云端。

import type { JournalEntry, ActionItem } from './types'

const JOURNAL_KEY = 'juecha:journal:v2'
const ACTIONS_KEY = 'juecha:actions:v2'

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('本地存储写入失败', e)
  }
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function todayStr(): string {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ---------- 每日记录 ----------

export function getEntries(): JournalEntry[] {
  return safeRead<JournalEntry[]>(JOURNAL_KEY, [])
}

export function getEntryByDate(date: string): JournalEntry | undefined {
  return getEntries().find((e) => e.date === date)
}

export function getEntriesByDate(date: string): JournalEntry[] {
  return getEntries()
    .filter((e) => e.date === date)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
}

export function getEntryById(id: string): JournalEntry | undefined {
  return getEntries().find((e) => e.id === id)
}

export function saveEntry(entry: JournalEntry): JournalEntry {
  const entries = getEntries()
  const idx = entries.findIndex((e) => e.id === entry.id)
  if (idx >= 0) {
    entry.updatedAt = Date.now()
    entries[idx] = entry
  } else {
    entries.push(entry)
  }
  safeWrite(JOURNAL_KEY, entries)
  // 若已登录，异步同步到云端（不阻塞本地保存）
  syncEntryToCloud(entry)
  return entry
}

export function deleteEntry(id: string): JournalEntry[] {
  const entries = getEntries().filter((e) => e.id !== id)
  safeWrite(JOURNAL_KEY, entries)
  deleteEntryFromCloud(id)
  return entries
}

export function saveActions(actions: ActionItem[]) {
  safeWrite(ACTIONS_KEY, actions)
  syncActionsToCloud(actions)
}

// ---------- 云端同步（已登录时） ----------

async function syncEntryToCloud(entry: JournalEntry) {
  try {
    const { isLoggedIn } = await import('./api')
    if (!isLoggedIn()) return
    const { apiCreateEntry, apiUpdateEntry } = await import('./api')
    const payload = {
      date: entry.date,
      event: entry.event,
      bodyFeelings: entry.bodyFeelings,
      emotions: entry.emotions,
      thoughts: entry.thoughts,
      actions: entry.actions,
      tinyJoy: entry.tinyJoy,
      selfCare: entry.selfCare,
      satisfaction: entry.satisfaction,
    }
    // 判断新建还是更新：本地记录若携带云端 id（cloudSynced）则更新，否则新建
    if (entry.cloudSynced) {
      await apiUpdateEntry(entry.id, payload)
    } else {
      const remote = await apiCreateEntry(payload)
      // 若云端返回了新的 id，回写本地，避免后续重复新建
      if (remote?.id) {
        const entries = getEntries()
        const idx = entries.findIndex((e) => e.id === entry.id)
        if (idx >= 0) {
          entries[idx] = { ...entries[idx], id: remote.id, cloudSynced: true }
          safeWrite(JOURNAL_KEY, entries)
        }
      }
    }
  } catch (e) {
    console.warn('云端同步失败（本地已保存）', e)
  }
}

async function deleteEntryFromCloud(id: string) {
  try {
    const { isLoggedIn } = await import('./api')
    if (!isLoggedIn()) return
    const { apiDeleteEntry } = await import('./api')
    await apiDeleteEntry(id)
  } catch (e) {
    console.warn('云端删除失败（本地已删除）', e)
  }
}

async function syncActionsToCloud(actions: ActionItem[]) {
  try {
    const { isLoggedIn } = await import('./api')
    if (!isLoggedIn()) return
    const { apiSaveActions } = await import('./api')
    await apiSaveActions(actions)
  } catch (e) {
    console.warn('云端同步行动失败（本地已保存）', e)
  }
}

/** 登录后：从云端拉取数据并覆盖本地（合并，云端为准） */
export async function pullFromCloud() {
  const { isLoggedIn, apiFetchJournal, apiFetchActions } = await import('./api')
  if (!isLoggedIn()) return { journal: 0, actions: 0 }

  const remoteEntries = await apiFetchJournal()
  const remoteActions = await apiFetchActions()

  // 云端记录覆盖本地（按 id 合并，云端为准）
  const local = getEntries()
  const map = new Map(local.map((e) => [e.id, e]))
  remoteEntries.forEach((r: any) => {
    map.set(r.id, {
      id: r.id,
      date: r.date,
      timestamp: r.updatedAt || r.createdAt,
      event: r.event || '',
      bodyFeelings: r.bodyFeelings || [],
      emotions: r.emotions || [],
      thoughts: r.thoughts || '',
      actions: r.actions || [],
      tinyJoy: r.tinyJoy || '',
      selfCare: r.selfCare || '',
      satisfaction: r.satisfaction ?? 3,
      createdAt: r.createdAt || Date.now(),
      updatedAt: r.updatedAt || Date.now(),
      cloudSynced: true,
    } as JournalEntry)
  })
  safeWrite(JOURNAL_KEY, [...map.values()])

  // 云端行动覆盖本地
  safeWrite(ACTIONS_KEY, remoteActions.map((a: any) => ({
    id: a.id,
    title: a.title,
    reason: a.reason,
    dueDate: a.dueDate,
    priority: a.priority,
    status: a.status,
    linkedEntryId: a.linkedEntryId,
    createdAt: a.createdAt,
  })) as ActionItem[])

  return { journal: remoteEntries.length, actions: remoteActions.length }
}

export function hasEntryOn(date: string): boolean {
  return getEntries().some((e) => e.date === date)
}

// ---------- 行动计划 ----------

export function getActions(): ActionItem[] {
  return safeRead<ActionItem[]>(ACTIONS_KEY, [])
}

export function upsertAction(item: ActionItem): ActionItem[] {
  const actions = getActions()
  const idx = actions.findIndex((a) => a.id === item.id)
  if (idx >= 0) actions[idx] = item
  else actions.push(item)
  saveActions(actions)
  return actions
}

export function deleteAction(id: string): ActionItem[] {
  const actions = getActions().filter((a) => a.id !== id)
  saveActions(actions)
  return actions
}

// ---------- 数据备份（导出 / 导入 / 清空） ----------

export interface BackupData {
  app: string
  version: number
  exportedAt: number
  journal: JournalEntry[]
  actions: ActionItem[]
}

/** 导出全部数据为 JSON 字符串 */
export function exportBackup(): string {
  const data: BackupData = {
    app: '看见自己·每日觉察手账',
    version: 2,
    exportedAt: Date.now(),
    journal: getEntries(),
    actions: getActions(),
  }
  return JSON.stringify(data, null, 2)
}

/** 导入备份（会与现有数据合并，同一日期的记录以后导入的为准） */
export function importBackup(json: string): { ok: boolean; journalCount: number; actionCount: number } {
  const data = JSON.parse(json) as Partial<BackupData>
  if (!data || !Array.isArray(data.journal) || !Array.isArray(data.actions)) {
    throw new Error('文件格式不正确')
  }

  // 合并记录：按 id 去重（同一天可有多条，均保留）
  const existing = getEntries()
  const existingMap = new Map(existing.map((e) => [e.id, e]))
  const imported = data.journal as JournalEntry[]
  imported.forEach((e) => {
    if (e.id) existingMap.set(e.id, e)
  })
  const mergedJournal = [...existingMap.values()].sort((a, b) => a.date.localeCompare(b.date) || ((a.createdAt ?? 0) - (b.createdAt ?? 0)))
  safeWrite(JOURNAL_KEY, mergedJournal)

  // 合并行动：按 id 去重
  const existingActions = getActions()
  const actionMap = new Map(existingActions.map((a) => [a.id, a]))
  ;(data.actions as ActionItem[]).forEach((a) => {
    if (a.id) actionMap.set(a.id, a)
  })
  safeWrite(ACTIONS_KEY, [...actionMap.values()])

  return { ok: true, journalCount: mergedJournal.length, actionCount: actionMap.size }
}

/** 清空全部数据 */
export function clearAllData() {
  localStorage.removeItem(JOURNAL_KEY)
  localStorage.removeItem(ACTIONS_KEY)
}

/** 获取当前数据量统计 */
export function getDataStats(): { journal: number; actions: number } {
  return { journal: getEntries().length, actions: getActions().length }
}
