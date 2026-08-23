// ===== AI 情绪分析封装（后端） =====
// 优先：阿里云 NLP 情感倾向分析（中文效果好）
// 备选：百度 AI 对话情绪识别
// 兜底：本地词典分析（不联网，隐私最安全）

const POSITIVE_WORDS = ['开心', '平静', '期待', '满足', '感激', '温暖', '顺利', '舒服', '美好', '喜欢', '被理解', '被看见', '放松', '进步']
const NEGATIVE_WORDS = ['低落', '焦虑', '疲惫', '烦躁', '委屈', '孤独', '紧绷', '失眠', '压力', '难过', '累', '害怕', '担心', '生气', '崩溃', '内耗', '自责', '纠结', '不舒服']

function localAnalyze(text) {
  const t = text || ''
  let pos = 0
  let neg = 0
  const keywords = []
  for (const w of POSITIVE_WORDS) if (t.includes(w)) { pos += 1; if (keywords.length < 6) keywords.push(w) }
  for (const w of NEGATIVE_WORDS) if (t.includes(w)) { neg += 1; if (keywords.length < 6) keywords.push(w) }

  let sentiment = 'neutral'
  if (pos > neg) sentiment = 'positive'
  else if (neg > pos) sentiment = 'negative'

  const total = pos + neg
  const confidence = total === 0 ? 0.55 : Math.min(0.95, 0.55 + (Math.abs(pos - neg) / (total + 1)) * 0.4)

  const summaryMap = {
    positive: '从这段记录里能感受到一些暖意，你为自己留出的关照正在起作用。',
    negative: '这段文字透着一丝沉重，这些感受是真实的，允许它们存在，也是在照顾自己。',
    neutral: '此刻的心情像一杯温水，平平淡淡，也值得被认真记下。',
  }
  const suggestionMap = {
    positive: '把让自己舒服的小事圈出来，它们是疲惫时随时可取用的补给。',
    negative: '先不急着解决问题，给自己 10 分钟做几次深呼吸。若感受持续影响生活，考虑和专业的人聊聊。',
    neutral: '试着问自己一句：此刻我最需要被听见的是什么？',
  }

  return {
    sentiment,
    confidence: Number(confidence.toFixed(2)),
    keywords: keywords.length ? keywords : ['还在酝酿中'],
    summary: summaryMap[sentiment],
    suggestion: suggestionMap[sentiment],
    source: 'local',
    analyzedAt: Date.now(),
  }
}

/** 阿里云 NLP 情感倾向分析（GetSaChGeneral） */
async function aliyunAnalyze(text, mood) {
  const akId = process.env.ALIYUN_AK_ID
  const akSecret = process.env.ALIYUN_AK_SECRET
  if (!akId || !akSecret) throw new Error('未配置阿里云密钥')

  // 阿里云 NLP 情感分析 API 签名较复杂，这里使用依赖 @alicloud/pop-core
  // 生产环境建议：npm i @alicloud/pop-core
  let Core
  try {
    const mod = await import('@alicloud/pop-core')
    Core = mod.default
  } catch {
    throw new Error('缺少 @alicloud/pop-core 依赖')
  }

  const client = new Core({
    accessKeyId: akId,
    accessKeySecret: akSecret,
    endpoint: 'https://alinlp.cn-hangzhou.aliyuncs.com',
    apiVersion: '2020-06-29',
  })

  const params = {
    ServiceCode: 'alinlp',
    Text: text.slice(0, 800),
    Language: 'zh',
  }
  const res = await client.request('GetSaChGeneral', params, { method: 'POST' })
  // res.Data 结构：{"result":{"sentiment":"positive","confidence":0.9}}
  const data = res?.Data?.result ?? res?.Data ?? null
  if (!data) throw new Error('阿里云返回为空')

  const sentiment = (data.sentiment || data.label || '').toLowerCase()
  const map = { positive: 'positive', negative: 'negative', neutral: 'neutral', 正面: 'positive', 负面: 'negative', 中性: 'neutral' }
  const s = map[sentiment] || 'neutral'

  return {
    sentiment: s,
    confidence: Number(data.confidence || data.positive_prob || 0.7).toFixed(2) * 1,
    keywords: extractKeywords(text),
    summary: buildRemoteSummary(s, mood),
    suggestion: buildRemoteSuggestion(s),
    source: 'remote',
    analyzedAt: Date.now(),
  }
}

/** 百度 AI 对话情绪识别 */
async function baiduAnalyze(text, mood) {
  const apiKey = process.env.BAIDU_API_KEY
  const secretKey = process.env.BAIDU_SECRET_KEY
  if (!apiKey || !secretKey) throw new Error('未配置百度密钥')

  // 1. 获取 access_token
  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  const tokenRes = await fetch(tokenUrl, { method: 'POST' })
  const tokenData = await tokenRes.json()
  const token = tokenData.access_token
  if (!token) throw new Error('获取百度 access_token 失败')

  // 2. 情绪识别（对话情绪识别 emotion）
  const apiUrl = `https://aip.baidubce.com/rpc/2.0/nlp/v1/emotion?charset=UTF-8&access_token=${token}`
  const body = { text: text.slice(0, 800) }
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  // data.items[0].label: optimistic/pessimistic/neutral; prob 为置信度
  const item = data?.items?.[0]
  if (!item) throw new Error('百度返回为空')

  const label = item.label || ''
  const map = { optimistic: 'positive', pessimistic: 'negative', neutral: 'neutral' }
  const s = map[label] || 'neutral'

  return {
    sentiment: s,
    confidence: Number(item.prob || 0.7).toFixed(2) * 1,
    keywords: extractKeywords(text),
    summary: buildRemoteSummary(s, mood),
    suggestion: buildRemoteSuggestion(s),
    source: 'remote',
    analyzedAt: Date.now(),
  }
}

function extractKeywords(text) {
  const kw = []
  for (const w of [...POSITIVE_WORDS, ...NEGATIVE_WORDS]) {
    if ((text || '').includes(w)) kw.push(w)
    if (kw.length >= 6) break
  }
  return kw.length ? kw : ['正在感受中']
}

function buildRemoteSummary(s, mood) {
  const base = mood ? `结合「${mood}」的记录` : '从这段记录'
  if (s === 'positive') return `${base}，AI 读到了一些轻盈与温暖。你对自己的关照，正在悄悄积累。`
  if (s === 'negative') return `${base}，AI 感受到一些沉重。这不是「想太多」，而是真实感受在发出信号，值得被认真对待。`
  return `${base}，整体感受比较平和，像一杯温水的温度。`
}

function buildRemoteSuggestion(s) {
  if (s === 'positive') return '把今天让你舒服的小事记下来，它们是疲惫时的「补给站」。'
  if (s === 'negative') return '先别急着解决，给自己一点缓冲。若这些情绪持续影响生活，请考虑寻求专业支持。'
  return '可以问自己一句：此刻我最需要被听见的是什么？'
}

/** 统一入口：阿里云 → 百度 → 本地兜底 */
export async function analyze(text, mood = '') {
  // 优先阿里云
  if (process.env.ALIYUN_AK_ID && process.env.ALIYUN_AK_SECRET) {
    try {
      return await aliyunAnalyze(text, mood)
    } catch (e) {
      console.warn('[AI] 阿里云分析失败，回退百度', e.message)
    }
  }
  // 其次百度
  if (process.env.BAIDU_API_KEY && process.env.BAIDU_SECRET_KEY) {
    try {
      return await baiduAnalyze(text, mood)
    } catch (e) {
      console.warn('[AI] 百度分析失败，使用本地兜底', e.message)
    }
  }
  // 兜底：本地词典
  return localAnalyze(text)
}
