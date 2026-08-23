import { useMemo, useState } from 'react'
import { deleteAction, getActions, getEntries, saveActions, uid } from '../lib/storage'
import { PRIORITY_COLORS, PRIORITY_LABELS, type ActionItem, type Priority } from '../lib/types'
import { Card, EmptyState, SectionTitle } from '../components/ui'

const STATUS_TABS: { key: ActionItem['status'] | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待开始' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
]

export default function ActionsPage() {
  const [actions, setActions] = useState<ActionItem[]>(() => getActions())
  const entries = useMemo(() => getEntries(), [])
  const [filter, setFilter] = useState<ActionItem['status'] | 'all'>('all')
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  const visible = useMemo(
    () => actions.filter((a) => (filter === 'all' ? true : a.status === filter)),
    [actions, filter],
  )

  function entryDate(id: string | null): string {
    if (!id) return ''
    const e = entries.find((x) => x.id === id)
    return e ? e.date : ''
  }

  function addAction(linkedEntryId: string | null = null) {
    if (!title.trim()) return
    const item: ActionItem = {
      id: uid(),
      title: title.trim(),
      reason: reason.trim(),
      dueDate: dueDate || null,
      priority,
      status: 'todo',
      linkedEntryId,
      createdAt: Date.now(),
    }
    const next = [...actions, item]
    setActions(next)
    saveActions(next)
    setTitle('')
    setReason('')
    setDueDate('')
    setPriority('medium')
  }

  function cycleStatus(id: string) {
    const next = actions.map((a) => {
      if (a.id !== id) return a
      const order: ActionItem['status'][] = ['todo', 'doing', 'done']
      const idx = order.indexOf(a.status)
      return { ...a, status: order[(idx + 1) % order.length] }
    })
    setActions(next)
    saveActions(next)
  }

  function remove(id: string) {
    const next = deleteAction(id)
    setActions(next)
  }

  function sortActions(list: ActionItem[]): ActionItem[] {
    const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
    return [...list].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1
      if (b.status === 'done' && a.status !== 'done') return -1
      return rank[a.priority] - rank[b.priority]
    })
  }

  const sorted = sortActions(visible)

  return (
    <div className="space-y-6 fade-up">
      <SectionTitle
        title="行动计划"
        emoji="🌱"
        sub="从觉察到改变：把反复困扰你的事，变成一步步的行动"
      />

      {/* 新增计划 */}
      <Card>
        <h3 className="font-display font-medium text-ink mb-3">添加一件想为自己做的事</h3>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="比如：下次方案有分歧时，先暂停 30 秒再回应"
            className="input-soft"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="为什么想为这件事？（可选）"
            className="input-soft"
          />
          <div className="flex items-center gap-3 flex-wrap">
            {/* 优先级 */}
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3.5 py-1.5 rounded-full text-xs border transition ${
                    priority === p
                      ? 'text-white border-transparent shadow-soft'
                      : 'bg-white/60 text-warmgray border-warmgray/15'
                  }`}
                  style={priority === p ? { backgroundColor: PRIORITY_COLORS[p] } : undefined}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-soft max-w-[180px]" />
            <button type="button" onClick={() => addAction(null)} disabled={!title.trim()} className="btn-primary">
              添加到计划 🌱
            </button>
          </div>
        </div>
      </Card>

      {/* 筛选 */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${
              filter === t.key ? 'bg-sage text-white border-sage' : 'bg-white/70 text-ink border-warmgray/15'
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs opacity-70">
              {t.key === 'all' ? actions.length : actions.filter((a) => a.status === t.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* 列表 */}
      {sorted.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="这里还空空的"
          sub="给自己安排一件小小的、温柔的事，从这里开始照顾自己。"
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((a) => {
            const linkedDate = entryDate(a.linkedEntryId)
            return (
              <li key={a.id}>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => cycleStatus(a.id)}
                      className={`mt-0.5 w-6 h-6 rounded-full border-2 shrink-0 transition flex items-center justify-center ${
                        a.status === 'done'
                          ? 'bg-sage border-sage text-white'
                          : a.status === 'doing'
                          ? 'border-sage text-sage'
                          : 'border-warmgray/40 text-transparent'
                      }`}
                      title="点击切换状态"
                    >
                      {a.status === 'done' ? '✓' : a.status === 'doing' ? '·' : ''}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-ink font-medium ${a.status === 'done' ? 'line-through text-warmgray' : ''}`}>
                        {a.title}
                      </div>
                      {a.reason && <div className="text-xs text-warmgray mt-1">{a.reason}</div>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-warmgray">
                        <span
                          className="px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: PRIORITY_COLORS[a.priority] }}
                        >
                          {PRIORITY_LABELS[a.priority]}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            a.status === 'done' ? 'bg-sage-light/70 text-sage' :
                            a.status === 'doing' ? 'bg-blush/60 text-blush-deep' : 'bg-mist/60 text-warmgray'
                          }`}
                        >
                          {a.status === 'todo' ? '待开始' : a.status === 'doing' ? '进行中' : '已完成'}
                        </span>
                        {a.dueDate && <span>截止 {a.dueDate}</span>}
                        {linkedDate && <span className="text-sage">关联觉察 {linkedDate}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      className="text-warmgray/60 hover:text-blush-deep transition shrink-0"
                      title="删除"
                    >
                      ✕
                    </button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {/* 从觉察记录一键创建（问题→行动→解决闭环） */}
      {entries.length > 0 && (
        <Card className="!bg-mist/40 !border-sage/20">
          <h3 className="font-display font-medium text-ink mb-1">从觉察记录里，创建行动计划</h3>
          <p className="text-xs text-warmgray mb-4">
            如果你发现最近反复被某类事件困扰，可以从对应的觉察记录里一键创建行动，形成「问题 → 行动 → 解决」的闭环。
          </p>
          <div className="space-y-2.5">
            {[...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((e) => {
              const linked = actions.some((a) => a.linkedEntryId === e.id)
              const topEmotion = e.emotions[0]?.display ?? '未记录'
              const snippet = e.event || e.thoughts || '（这条记录没有填写事件/想法）'
              return (
                <div key={e.id} className="flex items-center gap-3 bg-white/60 rounded-2xl px-3 py-2.5 border border-white/60">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-warmgray">{e.date} · 情绪「{topEmotion}」</div>
                    <div className="text-sm text-ink truncate">{snippet}</div>
                  </div>
                  <button
                    type="button"
                    disabled={linked}
                    onClick={() => {
                      setTitle(`针对 ${e.date} 的事件：`)
                      // 直接以记录为关联创建
                      const item: ActionItem = {
                        id: uid(),
                        title: `针对「${topEmotion}」情绪的行动`,
                        reason: snippet,
                        dueDate: null,
                        priority: 'medium',
                        status: 'todo',
                        linkedEntryId: e.id,
                        createdAt: Date.now(),
                      }
                      const next = [...actions, item]
                      setActions(next)
                      saveActions(next)
                    }}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
                      linked
                        ? 'text-warmgray/50 border-warmgray/15 cursor-not-allowed'
                        : 'text-sage border-sage/40 hover:bg-sage-light'
                    }`}
                  >
                    {linked ? '已创建' : '＋ 创建行动'}
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
