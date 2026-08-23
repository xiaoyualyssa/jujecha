// ===== AI 字段抽取（后端） =====
// 用途：把用户的一段自由文本，抽取成结构化字段：
//   情绪、身体感受、自动思维（当时怎么想）、冲动行为（做了什么）、理性打算（打算怎么做）
// 方案（按优先级）：
//   1. AI Ping（OpenAI 兼容聚合平台，base_url https://www.aiping.cn/api/v1，key 以 QC- 开头）
//   2. 阿里云通义千问 DashScope（OpenAI 兼容直连）
// 兜底：本地正则/关键词抽取（不联网）

const AIPING_BASE = 'https://www.aiping.cn/api/v1'
const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

/** 本地兜底抽取（无密钥时用，基于关键词） */
export function localExtract(text) {
  const t = text || ''
  const emotions = []
  const body = []
  const EMOTION_WORDS = ['平静', '开心', '低落', '焦虑', '疲惫', '烦躁', '委屈', '愤怒', '孤独', '心寒', '温暖', '满足', '期待', '难过', '害怕', '担心', '生气', '自责', '纠结', '内耗']
  const BODY_WORDS = ['喉咙紧', '喉咙发紧', '胸口闷', '胃沉', '胃', '肩硬', '肩膀', '手冷', '头痛', '头疼', '失眠', '乏力', '累', '呼吸', '紧绷', '心跳']

  for (const w of EMOTION_WORDS) if (t.includes(w) && emotions.length < 4) emotions.push({ label: w, score: 6 })
  for (const w of BODY_WORDS) if (t.includes(w) && body.length < 4) body.push({ label: w, score: 6 })

  // 简单的想法/行为切分
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

/** 调用大模型抽取（OpenAI 兼容模式，支持 AI Ping 或 DashScope） */
async function llmExtract(text, baseUrl, apiKey, model) {
  const system = `你是一个温柔的心理觉察助手。请从用户写的一段话里，抽取结构化信息，只输出 JSON（不要任何解释、不要 markdown 代码块）。

要求：
1. emotions: 数组，识别用户此刻/当时的情绪，每项 { label: 情绪词, score: 1-10 强度 }
2. body: 数组，识别身体感受，每项 { label: 感受词, score: 1-10 }（没有则为空数组）
3. thoughts: 字符串，用户「当时怎么想的」自动思维；没有则为空字符串
4. impulse: 字符串，用户「当时做了什么」冲动反应；没有则为空字符串
5. rational: 字符串，用户「打算怎么做/更理性的选择」；没有则为空字符串

情绪词尽量用这些：平静/开心/低落/焦虑/疲惫/烦躁/委屈/愤怒/孤独/心寒/温暖/满足/期待
身体词尽量用这些：喉咙紧/胸口闷/胃沉/肩硬/手冷/头痛/失眠/乏力/呼吸短促/紧绷/放松
语气要客观，不要评判用户。`

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text.slice(0, 1500) },
      ],
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`大模型调用失败: HTTP ${res.status} ${errText.slice(0, 200)}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || ''
  // 解析 JSON（容错：去掉可能的 markdown 代码块）
  const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  // 过滤掉「未识别」等无效标签，避免污染后续复盘统计
  const cleanLabels = (arr) => (Array.isArray(arr) ? arr : []).filter((it) => it && it.label && it.label !== '未识别')
  return {
    emotions: cleanLabels(parsed.emotions),
    body: cleanLabels(parsed.body),
    thoughts: parsed.thoughts || '',
    impulse: parsed.impulse || '',
    rational: parsed.rational || '',
    source: 'remote',
  }
}

/** 统一入口：AI Ping → DashScope → 本地兜底 */
export async function extractFields(text) {
  // 1. AI Ping
  if (process.env.AIPING_API_KEY) {
    try {
      return await llmExtract(text, AIPING_BASE, process.env.AIPING_API_KEY, process.env.AIPING_MODEL || 'Qwen3-30B-A3B-Instruct-2507')
    } catch (e) {
      console.warn('[AI] AI Ping 抽取失败，尝试下一个方案', e.message)
    }
  }
  // 2. 阿里云通义千问 DashScope 直连
  if (process.env.ALIYUN_DASHSCOPE_API_KEY) {
    try {
      return await llmExtract(text, DASHSCOPE_BASE, process.env.ALIYUN_DASHSCOPE_API_KEY, process.env.QWEN_MODEL || 'qwen-plus')
    } catch (e) {
      console.warn('[AI] 通义千问抽取失败，回退本地', e.message)
    }
  }
  // 3. 本地兜底
  return localExtract(text)
}
