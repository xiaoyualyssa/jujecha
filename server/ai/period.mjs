// ===== 周期情绪复盘（后端 AI） =====
// 输入：一段时间内的多条觉察记录（已脱敏聚合）+ 用户历史喜好与平复方法
// 输出：安抚性的复盘内容 + 科学 tips + 结合用户历史喜好的个性化建议
// 方案（按优先级）：AI Ping → DashScope 通义千问 → 本地模板兜底

const AIPING_BASE = 'https://www.aiping.cn/api/v1'
const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

/**
 * 从一批记录里提取：情绪、身体、微小感动、自我关怀、理性行动（平复方法）
 * 用作文本特征，供 prompt 使用
 */
function summarizeEntries(entries) {
  const emotions = []
  const body = []
  const tinyJoys = []
  const selfCares = []
  const rationals = []
  const impulses = []
  const events = []
  const thoughts = []

  for (const e of entries || []) {
    ;(e.emotions || []).forEach((fe) => { if (fe?.display && fe.display !== '未识别') emotions.push(`${fe.display}(${fe.score}/10)`) })
    ;(e.bodyFeelings || []).forEach((fe) => { if (fe?.display && fe.display !== '未识别') body.push(`${fe.display}(${fe.score}/10)`) })
    if (e.tinyJoy && e.tinyJoy.trim()) tinyJoys.push(e.tinyJoy.trim())
    if (e.selfCare && e.selfCare.trim()) selfCares.push(e.selfCare.trim())
    ;(e.actions || []).forEach((a) => {
      if (a?.text) {
        if (a.kind === 'rational') rationals.push(a.text.trim())
        else if (a.kind === 'impulse') impulses.push(a.text.trim())
      }
    })
    if (e.event && e.event.trim()) events.push(e.event.trim())
    if (e.thoughts && e.thoughts.trim()) thoughts.push(e.thoughts.trim())
  }

  return { emotions, body, tinyJoys, selfCares, rationals, impulses, events, thoughts }
}

function buildPrompt(periodLabel, list) {
  const s = summarizeEntries(list)
  const total = list.length

  return {
    periodLabel,
    total,
    emotionText: s.emotions.slice(0, 40).join('、') || '（未记录情绪）',
    bodyText: s.body.slice(0, 30).join('、') || '（未记录身体感受）',
    tinyJoyText: s.tinyJoys.slice(0, 15).join('；') || '（暂无微小感动）',
    selfCareText: s.selfCares.slice(0, 15).join('；') || '（暂无自我关怀记录）',
    rationalText: s.rationals.slice(0, 15).join('；') || '（暂无平复方法记录）',
    impulseText: s.impulses.slice(0, 15).join('；') || '（暂无冲动反应记录）',
    eventText: s.events.slice(0, 12).join('。') || '（未记录具体事件）',
    thoughtText: s.thoughts.slice(0, 12).join('。') || '（未记录想法）',
  }
}

/** 本地模板兜底（无密钥/调用失败时，基于统计规则生成安抚内容） */
export function localPeriod(periodLabel, list) {
  const s = summarizeEntries(list)
  const total = list.length

  const joyWord = s.tinyJoys[0] || '那些被你记下来的小事'
  const careWord = s.selfCares[0] || '为自己做的小事'
  const calmWord = s.rationals[0] || '让自己慢下来'

  const topEmotion = pickTop(s.emotions)
  const topBody = pickTop(s.body)

  const summary =
    total === 0
      ? '这段时间还没有留下记录，没关系，等你准备好了，随时可以回来。'
      : `${periodLabel}里，你一共写下了 ${total} 次觉察。` +
        (topEmotion ? `最常出现的情绪是「${topEmotion}」，` : '情绪变化比较多，') +
        (topBody ? `身体上，「${topBody}」的出现值得你留意——它可能是情绪在通过身体和你说话。` : '') +
        '每一次愿意停下来记录，都是在认真地对待自己。'

  const highlights = []
  if (s.tinyJoys.length) highlights.push(`你收集到了「${joyWord}」这样的微光，它们是你真实感受到的好。`)
  if (s.selfCares.length) highlights.push(`你有在照顾自己，比如「${careWord}」，这份自我关怀很珍贵。`)

  const scienceTips = [
    '情绪被准确命名后，大脑杏仁核的活跃度会下降（情绪标注效应），所以记录本身就是一种调节。',
    '身体的不适常常先于情绪被察觉。下次感到「胸口闷」或「肩硬」时，试着先做几次深呼吸，再问问自己发生了什么。',
    '规律地记录几天，你就能更早发现情绪的触发点，而不是在情绪已经很强烈时才被它带走。',
  ]

  const personalSuggestions = [
    `下次情绪上来时，可以试试你之前用过的「${calmWord}」，它曾经帮到过你。`,
    s.tinyJoys.length
      ? `感到疲惫时，回头看看你记下的「${joyWord}」，这些微光随时可以给你充电。`
      : '试着每天记下一件很小很小的好事，攒成你自己的「能量快充包」。',
  ]

  const closing = '你不需要每天都做得好，只要还在照顾自己，就已经很了不起了。我会一直在这里，听你说。'

  return { summary, highlights, scienceTips, personalSuggestions, closing, source: 'local' }
}

function pickTop(items) {
  const map = new Map()
  for (const raw of items) {
    const label = String(raw).replace(/\(\d+\/10\)$/, '')
    map.set(label, (map.get(label) ?? 0) + 1)
  }
  let best = null
  let bestN = 0
  for (const [k, n] of map) if (n > bestN) { best = k; bestN = n }
  return best
}

/** 调用大模型生成周期复盘（OpenAI 兼容） */
async function llmPeriod(periodLabel, list, baseUrl, apiKey, model) {
  const p = buildPrompt(periodLabel, list)

  const system = `你是一位温柔、专业、极其有共情力的心理觉察陪伴者。用户在向你倾诉这段时间（${p.periodLabel}）的情绪与状态。请写一段「周期复盘」，要求：

1. 语气真诚、温暖、有人味，绝不套用 AI 腔、绝不说教、绝不列空泛的鸡汤；要让用户感到「被听懂、被接住、他的记录一直有人认真在听」。
2. 开头先安抚、先肯定用户「愿意记录」这件事本身。
3. 结合用户写下的情绪、身体感受、事件与想法，做温和而有洞察的总结（不要逐条复述，而是读出背后的状态）。
4. 给出 2-4 条「科学的、可操作的小建议」，可自然融入心理学常识（如情绪标注效应、躯体信号、认知行为疗法的温和版本），但要用口语讲、不堆术语。
5. 重点：结合用户「历史提到喜欢的东西」（微小感动、自我关怀）和「可接受的平复心情方法」（理性行动），给出个性化、具体到 ta 本人喜好的行动建议。
6. 结尾温柔收束，让用户感到被陪伴。

严格只输出 JSON（不要任何解释、不要 markdown 代码块），字段为：
{
  "summary": "总览段落（安抚+洞察，200-350字）",
  "highlights": ["这段时期值得被看见的亮点，1-3条，每条一句话"],
  "scienceTips": ["科学小建议，2-4条，口语化，每条一句话"],
  "personalSuggestions": ["结合用户历史喜好/平复方法的个性化建议，2-4条，每条一句话"],
  "closing": "结尾温柔的话，1-2句"
}`

  const user = `【时间范围】${p.periodLabel}，共 ${p.total} 次记录。

【情绪】${p.emotionText}
【身体感受】${p.bodyText}
【发生了什么】${p.eventText}
【当时怎么想】${p.thoughtText}
【冲动反应】${p.impulseText}
【微小感动（ta 喜欢/在意的东西）】${p.tinyJoyText}
【自我关怀（ta 为自己做的小事）】${p.selfCareText}
【ta 提到可接受的平复方法】${p.rationalText}

请温柔地为 ta 写一段周期复盘。`

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
        { role: 'user', content: user.slice(0, 4000) },
      ],
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`大模型调用失败: HTTP ${res.status} ${errText.slice(0, 200)}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || ''
  const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  return {
    summary: parsed.summary || '',
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    scienceTips: Array.isArray(parsed.scienceTips) ? parsed.scienceTips : [],
    personalSuggestions: Array.isArray(parsed.personalSuggestions) ? parsed.personalSuggestions : [],
    closing: parsed.closing || '',
    source: 'remote',
  }
}

/** 统一入口：AI Ping → DashScope → 本地兜底 */
export async function analyzePeriod(periodLabel, list) {
  if (process.env.AIPING_API_KEY) {
    try {
      return await llmPeriod(periodLabel, list, AIPING_BASE, process.env.AIPING_API_KEY, process.env.AIPING_MODEL || 'Qwen3-30B-A3B-Instruct-2507')
    } catch (e) {
      console.warn('[AI] AI Ping 周期分析失败，尝试下一个方案', e.message)
    }
  }
  if (process.env.ALIYUN_DASHSCOPE_API_KEY) {
    try {
      return await llmPeriod(periodLabel, list, DASHSCOPE_BASE, process.env.ALIYUN_DASHSCOPE_API_KEY, process.env.QWEN_MODEL || 'qwen-plus')
    } catch (e) {
      console.warn('[AI] 通义千问周期分析失败，回退本地', e.message)
    }
  }
  return localPeriod(periodLabel, list)
}
