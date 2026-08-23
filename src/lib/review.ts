// ===== 自动复盘：周报 / 月报统计 =====

import type { JournalEntry } from './types'

export interface MoodStat {
  label: string
  count: number
  avgScore: number
}

export interface BodyStat {
  label: string
  count: number
  avgScore: number
}

export interface WordCloudItem {
  text: string
  count: number
  weight: number
  /** 与上周相比的增减 */
  delta: number
}

export interface TrendPoint {
  date: string
  satisfaction: number
}

export interface ReviewReport {
  total: number
  /** 情绪词云（含与上周对比的增减） */
  moodCloud: WordCloudItem[]
  /** 身体症状频率 */
  bodyFreq: BodyStat[]
  /** 微小感动合集 */
  tinyJoys: string[]
  /** 成长趋势（自我满意度曲线） */
  trend: TrendPoint[]
  /** 平均满意度 */
  avgSatisfaction: number
  /** 连续记录天数 */
  streak: number
  /** 温柔趋势描述 */
  trendText: string
  /** 与上周的情绪对比文本 */
  moodCompareText: string
}

function inRange(entries: JournalEntry[], start: string, end: string): JournalEntry[] {
  return entries.filter((e) => e.date >= start && e.date <= end)
}

/** 统计某个日期范围内所有情绪标签的计数 */
export function countMoods(entries: JournalEntry[]): Map<string, number> {
  const map = new Map<string, number>()
  entries.forEach((e) => {
    e.emotions.forEach((fe) => {
      const key = fe.display
      map.set(key, (map.get(key) ?? 0) + 1)
    })
  })
  return map
}

export function buildReview(
  entries: JournalEntry[],
  start: string,
  end: string,
  prevStart?: string,
  prevEnd?: string,
): ReviewReport {
  const list = inRange(entries, start, end).sort((a, b) => a.date.localeCompare(b.date))
  const total = list.length

  // 情绪词云
  const moodCount = new Map<string, number>()
  const moodScoreSum = new Map<string, number>()
  list.forEach((e) => {
    e.emotions.forEach((fe) => {
      const k = fe.display
      moodCount.set(k, (moodCount.get(k) ?? 0) + 1)
      moodScoreSum.set(k, (moodScoreSum.get(k) ?? 0) + fe.score)
    })
  })

  // 与上周对比
  const prevList = prevStart && prevEnd ? inRange(entries, prevStart, prevEnd) : []
  const prevCount = countMoods(prevList)

  const maxCount = Math.max(1, ...moodCount.values())
  const moodCloud: WordCloudItem[] = [...moodCount.entries()]
    .map(([text, count]) => {
      const prev = prevCount.get(text) ?? 0
      const delta = count - prev
      return {
        text,
        count,
        weight: Math.max(1, Math.round((count / maxCount) * 5)), // 1-5 权重
        delta,
      }
    })
    .sort((a, b) => b.count - a.count)

  // 身体症状频率
  const bodyCount = new Map<string, number>()
  const bodyScoreSum = new Map<string, number>()
  list.forEach((e) => {
    e.bodyFeelings.forEach((fe) => {
      const k = fe.display
      bodyCount.set(k, (bodyCount.get(k) ?? 0) + 1)
      bodyScoreSum.set(k, (bodyScoreSum.get(k) ?? 0) + fe.score)
    })
  })
  const bodyFreq: BodyStat[] = [...bodyCount.entries()]
    .map(([label, count]) => ({
      label,
      count,
      avgScore: Number(((bodyScoreSum.get(label) ?? 0) / count).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count)

  // 微小感动合集
  const tinyJoys = list
    .map((e) => ({ date: e.date, joy: e.tinyJoy.trim() }))
    .filter((x) => x.joy)
    .map((x) => `${x.date.slice(5)} · ${x.joy}`)

  // 成长趋势（满意度曲线）
  const trend: TrendPoint[] = list
    .filter((e) => e.satisfaction > 0)
    .map((e) => ({ date: e.date, satisfaction: e.satisfaction }))

  const satList = trend.map((t) => t.satisfaction)
  const avgSatisfaction = satList.length ? Number((satList.reduce((a, b) => a + b, 0) / satList.length).toFixed(1)) : 0

  const streak = calcStreak(entries)

  const trendText = buildTrendText(moodCloud, avgSatisfaction, total)
  const moodCompareText = buildCompareText(moodCloud)

  return {
    total,
    moodCloud,
    bodyFreq,
    tinyJoys,
    trend,
    avgSatisfaction,
    streak,
    trendText,
    moodCompareText,
  }
}

function calcStreak(entries: JournalEntry[]): number {
  const dates = new Set(entries.map((e) => e.date))
  let streak = 0
  const d = new Date()
  const todayKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
  if (!dates.has(todayKey)) d.setDate(d.getDate() - 1)

  while (true) {
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
    if (dates.has(key)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else break
  }
  return streak
}

function buildTrendText(cloud: WordCloudItem[], avgSat: number, total: number): string {
  if (total === 0) return '还没有记录，等你写下第一条，我们就能一起看见自己的样子。'
  const top = cloud[0]?.text
  const moodPart = top ? `这段时间最常出现的情绪是「${top}」` : '情绪变化比较多'
  const satPart =
    avgSat >= 4 ? '，你对整体状态的满意度挺高，继续保持' :
    avgSat >= 3 ? '，状态比较平稳' :
    avgSat > 0 ? '，满意度还有上升空间，记得多照顾自己' : ''
  return `${moodPart}${satPart}。`
}

function buildCompareText(cloud: WordCloudItem[]): string {
  const up = cloud.filter((c) => c.delta > 0).slice(0, 3)
  const down = cloud.filter((c) => c.delta < 0).slice(0, 3)
  if (up.length === 0 && down.length === 0) {
    return '和上周相比，情绪起伏不大，整体平稳。'
  }
  const parts: string[] = []
  if (up.length) parts.push(`「${up.map((u) => u.text).join('」「')}」出现得比上周多`)
  if (down.length) parts.push(`「${down.map((d) => d.text).join('」「')}」比上周少了些`)
  return `和上周相比，${parts.join('；')}。`
}

/** 获取某周的日期范围（周一为起点） */
export function weekRange(offsetWeek = 0): { start: string; end: string; label: string } {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1) + offsetWeek * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
  return {
    start: fmt(monday),
    end: fmt(sunday),
    label: `${monday.getMonth() + 1}月${monday.getDate()}日 - ${sunday.getMonth() + 1}月${sunday.getDate()}日`,
  }
}

/** 获取某月的日期范围 */
export function monthRange(offsetMonth = 0): { start: string; end: string; label: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + offsetMonth
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const fmt = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
  return {
    start: fmt(first),
    end: fmt(last),
    label: `${first.getFullYear()}年${first.getMonth() + 1}月`,
  }
}

/** 获取「过去 24 小时」的时间范围（按记录时间戳筛选） */
export function dayRange(): { startTs: number; endTs: number; label: string } {
  const endTs = Date.now()
  const startTs = endTs - 24 * 60 * 60 * 1000
  return { startTs, endTs, label: '过去 24 小时' }
}

/** 筛选某段时间范围内（按时间戳）的记录 */
export function inRangeByTs(entries: JournalEntry[], startTs: number, endTs: number): JournalEntry[] {
  return entries.filter((e) => {
    const ts = e.timestamp ?? e.createdAt ?? 0
    return ts >= startTs && ts <= endTs
  })
}
