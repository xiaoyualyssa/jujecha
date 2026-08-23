import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActions, getEntries, hasEntryOn, todayStr } from '../lib/storage'
import { ENCOURAGE_QUOTES, MOOD_COLORS } from '../lib/types'
import { Card, SectionTitle } from '../components/ui'

export default function Dashboard() {
  const entries = useMemo(() => getEntries(), [])
  const actions = useMemo(() => getActions(), [])
  const today = todayStr()
  const todayDone = hasEntryOn(today)

  // 随机金句（每次刷新随机，也提供手动换一条）
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * ENCOURAGE_QUOTES.length))
  const quote = ENCOURAGE_QUOTES[quoteIdx]

  // 本月累计：记录天数（去重）与记录条数
  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  const monthEntries = entries.filter((e) => e.date.startsWith(monthPrefix))
  const monthDays = new Set(monthEntries.map((e) => e.date)).size
  const monthCount = monthEntries.length

  // 本周最常见情绪 TOP3
  const { topMoods } = useMemo(() => {
    const start = new Date(now)
    const day = now.getDay() || 7
    start.setDate(now.getDate() - (day - 1))
    const startKey = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}-${start.getDate().toString().padStart(2, '0')}`
    const count = new Map<string, number>()
    entries
      .filter((e) => e.date >= startKey)
      .forEach((e) => e.emotions.forEach((fe) => count.set(fe.display, (count.get(fe.display) ?? 0) + 1)))
    const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    return { topMoods: top }
  }, [entries, now.getDay()])

  // 最近一次微小感动
  const latestJoy = useMemo(() => {
    const withJoy = entries.filter((e) => e.tinyJoy.trim())
    if (!withJoy.length) return null
    const latest = withJoy.sort((a, b) => b.date.localeCompare(a.date))[0]
    return { date: latest.date, text: latest.tinyJoy.trim() }
  }, [entries])

  // 进行中的行动计划
  const activeActions = actions.filter((a) => a.status !== 'done').slice(0, 4)
  const doneActions = actions.filter((a) => a.status === 'done').length

  const longestStreak = useMemo(() => {
    const dates = new Set(entries.map((e) => e.date))
    let streak = 0
    const d = new Date()
    const tk = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
    if (!dates.has(tk)) d.setDate(d.getDate() - 1)
    while (true) {
      const k = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
      if (dates.has(k)) { streak++; d.setDate(d.getDate() - 1) } else break
    }
    return streak
  }, [entries])

  return (
    <div className="space-y-6 fade-up">
      {/* 问候 + 随机金句 */}
      <section>
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full bg-blush/50 blur-2xl" />
          <div className="absolute right-10 bottom-2 text-5xl opacity-80">🌤️</div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {todayDone ? '今天也来照顾自己了，真好' : '今天，看见自己一点点'}
          </h1>
          <p className="text-warmgray mt-2 text-sm max-w-md">
            {todayDone
              ? '你已经写下今天的觉察了。忙碌的日子里，别忘了停下来听一听身体和心里的声音。'
              : '花 5-10 分钟，不加评判地记下此刻的情绪、身体与想法。'}
          </p>
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <Link to="/record" className="btn-primary">
              去记录 ✍️
            </Link>
          </div>
        </div>
      </section>

      {/* 随机鼓励语 */}
      <button
        type="button"
        onClick={() => setQuoteIdx((q) => (q + 1) % ENCOURAGE_QUOTES.length)}
        className="w-full text-left rounded-xl3 bg-sage/5 border border-sage/15 p-5 text-sm text-ink leading-relaxed hover:bg-sage/10 transition group"
        title="点一下换一句"
      >
        <span className="font-display font-medium">💭 今天的一句话：</span>
        「{quote}」
        <span className="text-xs text-warmgray ml-2 opacity-0 group-hover:opacity-100 transition">换一句 ↻</span>
      </button>

      {/* 统计卡片 */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '本月记录', value: `${monthDays}`, unit: '天', emoji: '📅' },
          { label: '本月觉察', value: `${monthCount}`, unit: '次', emoji: '✍️' },
          { label: '连续记录', value: `${longestStreak}`, unit: '天', emoji: '🔥' },
          { label: '已完成行动', value: `${doneActions}`, unit: '项', emoji: '✅' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-2xl font-display font-semibold text-ink">
              {s.value}
              <span className="text-xs text-warmgray ml-1">{s.unit}</span>
            </div>
            <div className="text-xs text-warmgray mt-1">{s.label}</div>
          </Card>
        ))}
      </section>

      {/* 本周情绪 TOP3 */}
      <section>
        <SectionTitle title="本周最常见情绪 TOP3" emoji="🎨" sub="这一周，你的心里住着什么样的天气" />
        <Card>
          {topMoods.length === 0 ? (
            <p className="text-sm text-warmgray">这一周还没有记录，写下第一条，情绪地图就会慢慢亮起来。</p>
          ) : (
            <div className="space-y-3">
              {topMoods.map(([mood, count], i) => {
                const max = topMoods[0][1]
                const pct = Math.round((count / max) * 100)
                return (
                  <div key={mood} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-display shrink-0" style={{ backgroundColor: MOOD_COLORS[mood] ?? '#5A7D7C' }}>
                      {i + 1}
                    </span>
                    <span className="w-14 text-sm text-ink shrink-0">{mood}</span>
                    <div className="flex-1 h-3 bg-sage-light/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: MOOD_COLORS[mood] ?? '#5A7D7C' }}
                      />
                    </div>
                    <span className="w-8 text-xs text-warmgray text-right">{count}次</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </section>

      {/* 最近一次微小感动 */}
      <section>
        <Card className="!bg-blush/30 !border-blush-deep/20">
          <div className="flex items-center gap-2 mb-2">
            <span>✨</span>
            <h3 className="font-display font-medium text-ink">最近一次微小感动</h3>
          </div>
          {latestJoy ? (
            <>
              <p className="text-ink leading-relaxed">{latestJoy.text}</p>
              <p className="text-xs text-blush-deep mt-2">{latestJoy.date} 记下</p>
            </>
          ) : (
            <p className="text-sm text-warmgray">还没有收集到微小感动，今天留意一下身边的小事吧。</p>
          )}
        </Card>
      </section>

      {/* 进行中的行动计划 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle title="进行中的行动计划" emoji="🌿" sub="一步步来，不用急" />
        </div>
        <Card>
          {activeActions.length === 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-warmgray">还没有进行中的计划，给自己安排一件温柔的小事吧。</p>
              <Link to="/actions" className="btn-ghost shrink-0 ml-4">去添加</Link>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {activeActions.map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full ${a.status === 'doing' ? 'bg-sage' : 'bg-blush-deep'}`} />
                  <span className="flex-1 text-ink truncate">{a.title}</span>
                  {a.dueDate && <span className="text-xs text-warmgray shrink-0">{a.dueDate.slice(5)}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  )
}
