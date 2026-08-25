import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteEntry, getEntriesByDate, saveEntry, todayStr, uid } from '../lib/storage'
import { isLoggedIn } from '../lib/api'
import {
  getAllBodyOptions, getAllMoodOptions,
  type ActionKind, type FeelingScore, type JournalEntry, type MyAction,
} from '../lib/types'
import { extractFields } from '../lib/ai'
import { Card, FeelingPicker, Notice, SectionTitle } from '../components/ui'

function fmtTime(ts: number | undefined | null) {
  if (!ts || Number.isNaN(ts)) return '——'
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

/** 合并情绪/身体条目：按 display 去重，保留原有、追加新的 */
function mergeFeelings(prev: FeelingScore[], next: FeelingScore[]): FeelingScore[] {
  const seen = new Set(prev.map((v) => v.display))
  const appended = next.filter((v) => !seen.has(v.display))
  return [...prev, ...appended]
}

/** 文本追加：已有内容 + 新内容用换行分隔，忽略空串 */
function appendText(base: string, add: string): string {
  const a = (base || '').trim()
  const b = (add || '').trim()
  if (!b) return a
  return a ? `${a}\n${b}` : b
}

export default function RecordPage() {
  const navigate = useNavigate()
  const today = todayStr()

  const [date, setDate] = useState(today)
  // 版本号：保存/删除后自增，强制当天记录列表重新计算（localStorage 变化不会触发 memo）
  const [version, setVersion] = useState(0)
  const dayEntries = useMemo(() => getEntriesByDate(date), [date, version])
  // 当前编辑的记录 id：null 表示新建一条
  const [editingId, setEditingId] = useState<string | null>(null)

  // 表单字段
  const [event, setEvent] = useState('')
  const [bodyFeelings, setBodyFeelings] = useState<FeelingScore[]>([])
  const [emotions, setEmotions] = useState<FeelingScore[]>([])
  const [thoughts, setThoughts] = useState('')
  const [impulseText, setImpulseText] = useState('')
  const [rationalText, setRationalText] = useState('')
  const [tinyJoy, setTinyJoy] = useState('')
  const [selfCare, setSelfCare] = useState('')
  const [satisfaction, setSatisfaction] = useState<number>(3)

  const [gentleNotice, setGentleNotice] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // AI 混合模式
  const [freeText, setFreeText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHint, setAiHint] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)

  const loggedIn = isLoggedIn()
  const isEdit = editingId !== null

  // 预设 + 用户自定义词（曾添加过的词会一直留在选项里）
  const moodOptions = useMemo(() => getAllMoodOptions(), [version])
  const bodyOptions = useMemo(() => getAllBodyOptions(), [version])

  // 表单区域引用，用于「再记一条」后平滑滚动到顶部开始填写
  const formRef = useRef<HTMLDivElement>(null)

  // 把某条记录载入表单
  function loadEntry(e: JournalEntry) {
    setEditingId(e.id)
    setEvent(e.event ?? '')
    setBodyFeelings(e.bodyFeelings ?? [])
    setEmotions(e.emotions ?? [])
    setThoughts(e.thoughts ?? '')
    setImpulseText(e.actions.find((a) => a.kind === 'impulse')?.text ?? '')
    setRationalText(e.actions.find((a) => a.kind === 'rational')?.text ?? '')
    setTinyJoy(e.tinyJoy ?? '')
    setSelfCare(e.selfCare ?? '')
    setSatisfaction(e.satisfaction ?? 3)
    setGentleNotice(null)
    setSaved(false)
  }

  // 新建一条（清空表单）
  function startNew() {
    setEditingId(null)
    setEvent('')
    setBodyFeelings([])
    setEmotions([])
    setThoughts('')
    setImpulseText('')
    setRationalText('')
    setTinyJoy('')
    setSelfCare('')
    setSatisfaction(3)
    setFreeText('')
    setAiHint(null)
    setGentleNotice(null)
    setSaved(false)
  }

  // 顶部「再记一条」：清空并滚动到表单
  function handleNewEntry() {
    startNew()
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  // 切换日期：载入该日期第一条记录（或进入新建态）
  function switchDate(d: string) {
    setDate(d)
    const list = getEntriesByDate(d)
    if (list.length > 0) loadEntry(list[0])
    else startNew()
  }

  // 删除当前编辑中的记录
  function handleDelete() {
    if (!editingId) return
    deleteEntry(editingId)
    setVersion((v) => v + 1)
    const remaining = getEntriesByDate(date)
    if (remaining.length > 0) loadEntry(remaining[0])
    else startNew()
  }

  async function handleAIExtract() {
    if (!freeText.trim()) {
      setAiHint('先写点什么吧，一句话也行，剩下的交给 AI。')
      return
    }
    setAiLoading(true)
    setAiHint(null)
    try {
      const r = await extractFields(freeText.trim())
      const newEmotions: FeelingScore[] = r.emotions.map((e) => ({ label: e.label, score: e.score, display: e.label }))
      const newBody: FeelingScore[] = r.body.map((b) => ({ label: b.label, score: b.score, display: b.label }))
      // 追加而非覆盖：旧记录里已有的内容保留，新的接在后面
      setEmotions((prev) => mergeFeelings(prev, newEmotions))
      setBodyFeelings((prev) => mergeFeelings(prev, newBody))
      setThoughts((prev) => appendText(prev, r.thoughts))
      setImpulseText((prev) => appendText(prev, r.impulse))
      setRationalText((prev) => appendText(prev, r.rational))
      if (r.thoughts || r.impulse) setEvent((prev) => appendText(prev, freeText.trim()))
      setAiHint(
        r.source === 'remote'
          ? 'AI 已帮你识别好下面的字段，接在了原来的内容后面，请你确认或微调一下～'
          : '已用本地方式识别，结果接在原来的内容后面，你可以再手动调整～',
      )
    } catch (e) {
      setAiHint('识别暂时失败了，你可以直接手动填写下面的字段。')
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  function handleSubmit() {
    // 必填校验（无标记，提交时才提醒）
    if (!event.trim()) {
      setGentleNotice('「发生了什么」还空着呢～ 先写下一件具体的事，哪怕一句也好。')
      return
    }
    if (bodyFeelings.length === 0) {
      setGentleNotice('身体常常先替你说出情绪。选一个此刻的身体感受吧，比如「胸口闷」「肩硬」。')
      return
    }
    if (emotions.length === 0) {
      setGentleNotice('先选一个此刻最贴近你的情绪吧，哪怕只有一点点，也值得被看见。')
      return
    }

    const actions: MyAction[] = []
    if (impulseText.trim()) actions.push({ kind: 'impulse', text: impulseText.trim() })
    if (rationalText.trim()) actions.push({ kind: 'rational', text: rationalText.trim() })

    const existing = isEdit ? getEntriesByDate(date).find((e) => e.id === editingId) : undefined

    const entry: JournalEntry = {
      id: existing?.id ?? uid(),
      date,
      timestamp: existing?.timestamp ?? Date.now(),
      event: event.trim(),
      bodyFeelings,
      emotions,
      thoughts: thoughts.trim(),
      actions,
      tinyJoy: tinyJoy.trim(),
      selfCare: selfCare.trim(),
      satisfaction,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      cloudSynced: existing?.cloudSynced,
    }
    saveEntry(entry)
    setEditingId(entry.id)
    setVersion((v) => v + 1)
    setSaved(true)
    setGentleNotice(null)
  }

  return (
    <div className="space-y-6 fade-up">
      <SectionTitle
        title={isEdit ? '修改这条觉察' : '每日觉察记录'}
        emoji="✍️"
        sub="一天可以记很多次，每一次都是对自己的认真倾听。"
      />

      {/* 顶部：日期 + 当天记录列表 + 再记一条入口 */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <label className="label-soft !mb-0 shrink-0">记录日期</label>
            <input type="date" value={date} max={today} onChange={(e) => switchDate(e.target.value)} className="input-soft max-w-[190px] !py-2" />
          </div>
          <span className="text-xs text-warmgray">
            {dayEntries.length > 0 ? `今天已写下 ${dayEntries.length} 次觉察` : '今天还没有记录'}
          </span>
        </div>

        {/* 当天记录胶囊列表 + 再记一条（提交过至少一条后出现） */}
        {dayEntries.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {dayEntries.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => loadEntry(e)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
                  editingId === e.id
                    ? 'bg-sage text-white border-sage shadow-soft'
                    : 'bg-white/70 text-ink border-warmgray/15 hover:border-sage/40 hover:bg-white'
                }`}
              >
                <span className="text-xs opacity-80">{fmtTime(e.timestamp ?? e.createdAt)}</span>
                <span>{e.emotions[0]?.display ?? '未记录情绪'}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={handleNewEntry}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition ${
                editingId === null
                  ? 'bg-sage text-white border-sage shadow-soft'
                  : 'border-dashed border-sage/50 text-sage bg-sage-light/40 hover:bg-sage-light'
              }`}
            >
              {editingId === null ? '✍️ 正在写新的一条' : '＋ 再记一条'}
            </button>
          </div>
        )}
      </Card>

      {/* 表单区域 */}
      <div ref={formRef} className="space-y-6 scroll-mt-20">
        {/* AI 混合模式：自由写 + 自动回填（紧凑，默认收起） */}
        <Card className="!bg-sage-light/40 !border-sage/25 !p-4">
          <button
            type="button"
            onClick={() => setAiOpen((v) => !v)}
            className="w-full flex items-center gap-2 text-left"
          >
            <span className="text-base">🪄</span>
            <span className="text-sm text-sage flex-1">想省事？让 AI 帮你整理一段话</span>
            <span className={`text-sage/70 text-xs transition-transform ${aiOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {aiOpen && (
            <div className="mt-3 space-y-3">
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={3}
                placeholder="比如：今天下午和同事讨论方案没谈拢，我胸口有点闷，当时觉得「他肯定觉得我没用」，我直接怼了回去……"
                className="input-soft resize-none !bg-white/80"
              />
              <div className="flex items-center justify-end">
                <button type="button" onClick={handleAIExtract} disabled={aiLoading} className="btn-primary !px-5 !py-2 text-xs">
                  {aiLoading ? '正在识别…' : '🪄 AI 帮我整理'}
                </button>
              </div>
              {aiHint && <p className="text-xs text-sage">{aiHint}</p>}
              <p className="text-[10px] text-warmgray/70">AI 仅处理你写下的这段文字，结果供你确认，不替代你自己的觉察。</p>
            </div>
          )}
        </Card>

        {/* 1. 发生了什么 */}
        <Card>
          <label className="label-soft !text-sm">1 · 发生了什么</label>
          <textarea value={event} onChange={(e) => setEvent(e.target.value)} rows={3} placeholder="客观地记下一件事，不加评判（比如：下午和同事讨论方案，最后没达成一致）" className="input-soft resize-none" />
          <p className="text-[11px] text-warmgray mt-1.5">🌿 试试只描述事实，不急着评价自己。</p>
        </Card>

        {/* 2. 身体感受 */}
        <Card>
          <FeelingPicker title="2 · 我的身体感受（躯体信号 + 强度打分）" options={bodyOptions} values={bodyFeelings} onChange={setBodyFeelings} accent="mist" addLabel="添加身体感受" placeholder="比如「喉咙发紧」「后颈发烫」……" />
        </Card>

        {/* 3. 情绪 */}
        <Card>
          <FeelingPicker title="3 · 我的情绪（精准命名 + 强度打分）" options={moodOptions} values={emotions} onChange={setEmotions} accent="blush" addLabel="添加情绪词" placeholder="如果选项里没有，写下你自己的词……" />
        </Card>

        {/* 4. 自动思维 */}
        <Card>
          <label className="label-soft !text-sm">4 · 我当时怎么想的（自动思维）</label>
          <textarea value={thoughts} onChange={(e) => setThoughts(e.target.value)} rows={3} placeholder="那一刻脑海里闪过的念头，比如「他肯定觉得我没用」「我又搞砸了」" className="input-soft resize-none" />
        </Card>

        {/* 5. 行动：冲动 vs 理性 */}
        <Card className="space-y-4">
          <div>
            <label className="label-soft !text-sm">5 · 我当时做了什么（冲动反应）</label>
            <textarea value={impulseText} onChange={(e) => setImpulseText(e.target.value)} rows={2} placeholder="那个当下立刻做出的反应，比如「我直接怼了回去」" className="input-soft resize-none" />
          </div>
          <div>
            <label className="label-soft !text-sm">5 · 我打算/可以怎么做（理性选择）</label>
            <textarea value={rationalText} onChange={(e) => setRationalText(e.target.value)} rows={2} placeholder="冷静下来后，更想选择的方式，比如「先停一下，明天再聊」" className="input-soft resize-none" />
          </div>
          <p className="text-[11px] text-warmgray">🌿 冲动反应和理性选择都是你的一部分，看见它们就好。</p>
        </Card>

        {/* 6. 今日自我关怀 */}
        <Card>
          <label className="label-soft !text-sm">6 · 今日自我关怀</label>
          <input value={selfCare} onChange={(e) => setSelfCare(e.target.value)} placeholder="比如「午饭喝了热汤」「摸了摸猫」——记录为自己做的小事" className="input-soft" />
        </Card>

        {/* 7. 微小感动 */}
        <Card className="!bg-blush/40 !border-blush-deep/20">
          <label className="label-soft !text-sm !text-blush-deep">7 · ✨ 微小感动</label>
          <textarea value={tinyJoy} onChange={(e) => setTinyJoy(e.target.value)} rows={2} placeholder="今天有什么好事？哪怕很小很小……" className="input-soft !bg-white/70" />
          <p className="text-[11px] text-blush-deep mt-1.5">✨ 这些微小的光，会攒成你的「能量快充包」。</p>
        </Card>

        {/* 8. 满意度 */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <label className="label-soft !text-sm !mb-0">8 · 今天我对自己满意度</label>
            <span className="text-sm font-display font-semibold text-sage">{satisfaction} / 5</span>
          </div>
          <input type="range" min={1} max={5} step={1} value={satisfaction} onChange={(e) => setSatisfaction(Number(e.target.value))} className="w-full accent-sage" />
          <div className="flex justify-between text-[10px] text-warmgray mt-1">
            <span>很不满意</span>
            <span>非常满意</span>
          </div>
        </Card>

        {/* 温和提醒 */}
        {gentleNotice && <Notice tone="gentle">{gentleNotice}</Notice>}

        {/* 保存成功提示：未登录引导注册云同步 */}
        {saved && (
          <Notice tone="info">
            <div className="space-y-3">
              <span>已保存好这次的觉察 🌿</span>
              {loggedIn ? (
                <p className="text-sm text-sage">☁️ 这条记录已同步到你的云端账号，换设备也不怕丢。</p>
              ) : (
                <div className="rounded-xl bg-blush/40 border border-blush-deep/20 p-3">
                  <p className="text-sm leading-relaxed">
                    此次记录暂存，注册账号，记录可同步到云端不丢失。
                  </p>
                  <div className="flex gap-2 mt-2.5">
                    <Link to="/auth/register" className="btn-primary !px-4 !py-1.5 text-xs">☁️ 注册账号，云端同步</Link>
                    <Link to="/auth/login" className="btn-ghost !px-4 !py-1.5 text-xs">已有账号，去登录</Link>
                  </div>
                </div>
              )}
            </div>
          </Notice>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button type="button" onClick={handleSubmit} className="btn-primary flex-1">
            {isEdit ? '保存修改' : '温柔地记下这一天'} 🌙
          </button>
        </div>

        {/* 删除当前记录（仅编辑态） */}
        {isEdit && (
          <button type="button" onClick={handleDelete} className="w-full text-center text-xs text-blush-deep/70 hover:text-blush-deep transition">
            删除这条记录
          </button>
        )}

        {saved && (
          <button type="button" onClick={() => navigate('/')} className="w-full text-center text-sm text-sage hover:underline">
            返回首页 →
          </button>
        )}
      </div>
    </div>
  )
}

export type { ActionKind }
