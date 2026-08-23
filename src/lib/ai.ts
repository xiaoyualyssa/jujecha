// ===== AI 情绪分析 —— 前端调用封装 =====
// 说明：分析请求优先走本地后端代理（后端再调用阿里云/百度 AI）。
// 若后端不可用，则使用「本地词典兜底分析」，全程不上传任何数据，隐私最安全。

import type { AnalyzePayload, AnalysisResult, JournalEntry } from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

/** 本地词典兜底（离线可用，不联网） */
const SENTIMENT_DICT: Record<string, { tag: AnalysisResult['sentiment']; w: number }> = {
  // 正向
  开心: { tag: 'positive', w: 1 }, 平静: { tag: 'positive', w: 0.6 }, 期待: { tag: 'positive', w: 1 },
  满足: { tag: 'positive', w: 1 }, 放松: { tag: 'positive', w: 0.7 }, 感激: { tag: 'positive', w: 1 },
  温暖: { tag: 'positive', w: 1 }, 开心的事: { tag: 'positive', w: 1 }, 顺利: { tag: 'positive', w: 0.8 },
  被看见: { tag: 'positive', w: 1 }, 被理解: { tag: 'positive', w: 1 }, 喜欢: { tag: 'positive', w: 0.7 },
  舒服: { tag: 'positive', w: 0.8 }, 美好: { tag: 'positive', w: 1 }, 进步: { tag: 'positive', w: 0.8 },
  // 负向
  低落: { tag: 'negative', w: 1 }, 焦虑: { tag: 'negative', w: 1 }, 疲惫: { tag: 'negative', w: 0.8 },
  烦躁: { tag: 'negative', w: 1 }, 委屈: { tag: 'negative', w: 1 }, 孤独: { tag: 'negative', w: 1 },
  紧绷: { tag: 'negative', w: 0.6 }, 失眠: { tag: 'negative', w: 0.9 }, 头痛: { tag: 'negative', w: 0.6 },
  压力: { tag: 'negative', w: 1 }, 难过: { tag: 'negative', w: 1 }, 累: { tag: 'negative', w: 0.7 },
  害怕: { tag: 'negative', w: 1 }, 担心: { tag: 'negative', w: 0.9 }, 生气: { tag: 'negative', w: 1 },
  崩溃: { tag: 'negative', w: 1 }, 内耗: { tag: 'negative', w: 1 }, 自责: { tag: 'negative', w: 1 },
  疲惫感: { tag: 'negative', w: 0.8 }, 不舒服: { tag: 'negative', w: 0.6 }, 纠结: { tag: 'negative', w: 0.8 },
}

function localAnalyze(payload: AnalyzePayload): AnalysisResult {
  let pos = 0
  let neg = 0
  const keywords: string[] = []
  const text = `${payload.mood} ${payload.text}`

  for (const [word, meta] of Object.entries(SENTIMENT_DICT)) {
    if (text.includes(word)) {
      if (meta.tag === 'positive') pos += meta.w
      else neg += meta.w
      if (keywords.length < 6) keywords.push(word)
    }
  }

  // 情绪强度影响倾向判断：强度高的负向情绪更显著
  if (payload.intensity >= 4 && neg > 0) neg += 0.5

  let sentiment: AnalysisResult['sentiment'] = 'neutral'
  if (pos > neg) sentiment = 'positive'
  else if (neg > pos) sentiment = 'negative'

  const total = pos + neg
  const confidence = total === 0 ? 0.55 : Math.min(0.95, 0.55 + (Math.abs(pos - neg) / (total + 1)) * 0.4)

  const summary = buildLocalSummary(sentiment, payload.mood, keywords)
  const suggestion = buildLocalSuggestion(sentiment)

  return {
    sentiment,
    confidence: Number(confidence.toFixed(2)),
    keywords: keywords.length ? keywords : ['还在酝酿中'],
    summary,
    suggestion,
    source: 'local',
    analyzedAt: Date.now(),
  }
}

function buildLocalSummary(s: AnalysisResult['sentiment'], mood: string, kw: string[]): string {
  if (s === 'positive') {
    return `从今天的记录里，能感受到一些${mood}带来的暖意${kw.length ? `，比如「${kw.slice(0, 3).join('」「')}」` : ''}。你在忙碌里为自己留出的那一点点关照，正在悄悄起作用。`
  }
  if (s === 'negative') {
    return `今天的记录透着一丝${mood}${kw.length ? `，「${kw.slice(0, 3).join('」「')}」这些词反复出现` : ''}。这不是「想太多」，而是你真实地感受到了一些东西。允许它存在，也是一种照顾自己。`
  }
  return `今天的心情像一杯温水平平淡淡的，没有大起大落。这种「没什么特别」本身，也值得被认真记下。`
}

function buildLocalSuggestion(s: AnalysisResult['sentiment']): string {
  if (s === 'positive') {
    return '不妨把今天让自己舒服的小事圈出来，它们是你在疲惫时可以随时取用的「补给」。'
  }
  if (s === 'negative') {
    return '先不急着「解决问题」。给自己 10 分钟，喝点温水、做几次深呼吸。如果这些感受持续影响生活，考虑和专业的人聊一聊。'
  }
  return '可以试着问自己一句：此刻我最需要被听见的是什么？'
}

/** 主入口：优先走真实后端 AI，失败则本地兜底 */
export async function analyzeEmotion(payload: AnalyzePayload): Promise<AnalysisResult> {
  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as AnalysisResult
    return data
  } catch (e) {
    // 后端不可用 → 本地兜底（不联网、不上传）
    console.info('[AI] 后端不可用，使用本地兜底分析', e)
    return localAnalyze(payload)
  }
}

/** 生成一条脱敏文本（用于上传给 AI，仅情绪/想法/事件，不含身份信息） */
export function buildSanitizedText(payload: AnalyzePayload): string {
  return `我的情绪是「${payload.mood}」，强度 ${payload.intensity}/5。${payload.text}`.trim()
}

// ===== AI 字段抽取（混合模式记录） =====

export interface ExtractedFields {
  emotions: { label: string; score: number }[]
  body: { label: string; score: number }[]
  thoughts: string
  impulse: string
  rational: string
  source: 'remote' | 'local'
}

/** 本地兜底抽取（后端不可用时，前端本地正则/关键词） */
function localExtract(text: string): ExtractedFields {
  const t = text || ''
  const emotions: { label: string; score: number }[] = []
  const body: { label: string; score: number }[] = []
  const EMOTION_WORDS = ['平静', '开心', '低落', '焦虑', '疲惫', '烦躁', '委屈', '愤怒', '孤独', '心寒', '温暖', '满足', '期待', '难过', '害怕', '担心', '生气', '自责', '纠结', '内耗']
  const BODY_WORDS = ['喉咙紧', '喉咙发紧', '胸口闷', '胃沉', '胃', '肩硬', '肩膀', '手冷', '头痛', '头疼', '失眠', '乏力', '呼吸', '紧绷', '心跳']

  for (const w of EMOTION_WORDS) if (t.includes(w) && emotions.length < 4) emotions.push({ label: w, score: 6 })
  for (const w of BODY_WORDS) if (t.includes(w) && body.length < 4) body.push({ label: w, score: 6 })

  const thinkMatch = t.match(/(?:想|觉得|认为|担心|害怕|肯定|以为)[^。！？]{1,30}/)
  const thoughts = thinkMatch ? thinkMatch[0] : ''
  const doMatch = t.match(/(?:我|然后|就)[^。！？]{0,20}(?:了|过)(?:[。！？]|$)/)
  const impulse = doMatch ? doMatch[0].replace(/^[我然后就]+/, '') : ''

  return {
    emotions: emotions.length ? emotions : [],
    body,
    thoughts,
    impulse,
    rational: '',
    source: 'local',
  }
}

/** 主入口：优先走真实后端通义千问，失败则本地兜底 */
export async function extractFields(text: string): Promise<ExtractedFields> {
  try {
    const res = await fetch(`${API_BASE}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as ExtractedFields
  } catch (e) {
    console.info('[AI] 后端抽取不可用，使用本地兜底', e)
    return localExtract(text)
  }
}

// ===== 周期情绪复盘（24小时 / 本周 / 本月） =====

export type PeriodKey = '24h' | 'week' | 'month'

export interface PeriodAnalysis {
  label: string
  count: number
  result: {
    summary: string
    highlights: string[]
    scienceTips: string[]
    personalSuggestions: string[]
    closing: string
    source: 'remote' | 'local'
  } | null
}

/** 本地兜底周期复盘（离线可用，基于统计规则） */
export function localPeriodAnalysis(label: string, entries: JournalEntry[]): PeriodAnalysis['result'] {
  const total = entries.length
  const emotions: string[] = []
  const tinyJoys: string[] = []
  const selfCares: string[] = []
  const rationals: string[] = []
  const body: string[] = []
  entries.forEach((e) => {
    e.emotions.forEach((fe) => fe.display && fe.display !== '未识别' && emotions.push(fe.display))
    e.bodyFeelings.forEach((fe) => fe.display && fe.display !== '未识别' && body.push(fe.display))
    if (e.tinyJoy.trim()) tinyJoys.push(e.tinyJoy.trim())
    if (e.selfCare.trim()) selfCares.push(e.selfCare.trim())
    e.actions.forEach((a) => a.kind === 'rational' && a.text.trim() && rationals.push(a.text.trim()))
  })

  const topOf = (arr: string[]) => {
    const m = new Map<string, number>()
    arr.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1))
    let best = ''; let n = 0
    for (const [k, v] of m) if (v > n) { best = k; n = v }
    return best
  }
  const topEmotion = topOf(emotions)
  const topBody = topOf(body)
  const joyWord = tinyJoys[0] || '那些被你记下来的小事'
  const careWord = selfCares[0] || '为自己做的小事'
  const calmWord = rationals[0] || '让自己慢下来'

  const summary =
    total === 0
      ? '这段时间还没有留下记录，没关系，等你准备好了，随时可以回来。'
      : `${label}里，你写下了 ${total} 次觉察。` +
        (topEmotion ? `最常出现的情绪是「${topEmotion}」，` : '情绪变化比较多，') +
        (topBody ? `身体上「${topBody}」的出现值得你留意，它可能是情绪在通过身体和你说话。` : '') +
        '每一次愿意停下来记录，都是在认真地对待自己。'

  const highlights: string[] = []
  if (tinyJoys.length) highlights.push(`你收集到了「${joyWord}」这样的微光，它们是你真实感受到的好。`)
  if (selfCares.length) highlights.push(`你有在照顾自己，比如「${careWord}」，这份自我关怀很珍贵。`)

  const scienceTips = [
    '情绪被准确命名后，大脑杏仁核的活跃度会下降（情绪标注效应），所以记录本身就是一种调节。',
    '身体的不适常常先于情绪被察觉。下次感到不适时，先做几次深呼吸，再问问自己发生了什么。',
    '规律记录几天，你就能更早发现情绪的触发点，而不是在情绪已经很强烈时才被它带走。',
  ]

  const personalSuggestions = [
    `下次情绪上来时，可以试试你之前用过的「${calmWord}」，它曾经帮到过你。`,
    tinyJoys.length ? `疲惫时回头看看你记下的「${joyWord}」，这些微光随时可以给你充电。` : '试着每天记下一件很小很小的好事，攒成你自己的「能量快充包」。',
  ]

  const closing = '你不需要每天都做得好，只要还在照顾自己，就已经很了不起了。我会一直在这里，听你说。'

  return { summary, highlights, scienceTips, personalSuggestions, closing, source: 'local' }
}

/**
 * 生成周期复盘：优先走云端 AI（登录后可跨设备一致），
 * 未登录或后端不可用时用本地统计兜底。
 */
export async function analyzePeriodEntries(
  period: PeriodKey,
  entries: JournalEntry[],
  label: string,
  offset = 0,
): Promise<PeriodAnalysis> {
  if (entries.length === 0) {
    return { label, count: 0, result: null }
  }
  // 尝试云端
  try {
    const { isLoggedIn, apiAnalyzePeriod } = await import('./api')
    if (isLoggedIn()) {
      const data = await apiAnalyzePeriod(period, offset)
      if (data?.result) {
        return { label: data.label, count: data.count, result: data.result }
      }
    }
  } catch (e) {
    console.info('[AI] 云端周期分析不可用，使用本地兜底', e)
  }
  // 本地兜底
  return { label, count: entries.length, result: localPeriodAnalysis(label, entries) }
}
