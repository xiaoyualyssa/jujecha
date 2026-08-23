import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEntries } from '../lib/storage'
import { buildReview, monthRange, weekRange, dayRange, inRangeByTs } from '../lib/review'
import { analyzePeriodEntries, type PeriodAnalysis, type PeriodKey } from '../lib/ai'
import { MOOD_COLORS } from '../lib/types'
import { Card, EmptyState, SectionTitle } from '../components/ui'

type Period = 'week' | 'month'

const PERIOD_TABS: { key: PeriodKey; label: string; emoji: string }[] = [
  { key: '24h', label: '过去24小时', emoji: '🌙' },
  { key: 'week', label: '本周', emoji: '📅' },
  { key: 'month', label: '本月', emoji: '🗓️' },
]

export default function ReviewPage() {
  const entries = useMemo(() => getEntries(), [])
  const [period, setPeriod] = useState<Period>('week')
  const [offset, setOffset] = useState(0)

  // ---- AI 周期复盘 ----
  const [aiPeriod, setAiPeriod] = useState<PeriodKey>('week')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<PeriodAnalysis | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // 统计用范围（周/月）
  const range = period === 'week' ? weekRange(offset) : monthRange(offset)
  const prevRange = period === 'week' ? weekRange(offset + 1) : monthRange(offset + 1)
  const report = useMemo(
    () => buildReview(entries, range.start, range.end, prevRange.start, prevRange.end),
    [entries, range.start, range.end, prevRange.start, prevRange.end],
  )
  const maxSat = Math.max(5, ...report.trend.map((t) => t.satisfaction))

  // AI 周期复盘对应的记录集合与标签
  function aiRangeFor(key: PeriodKey) {
    if (key === '24h') {
      const r = dayRange()
      return { list: inRangeByTs(entries, r.startTs, r.endTs), label: r.label }
    }
    if (key === 'week') {
      const r = weekRange(0)
      return { list: entries.filter((e) => e.date >= r.start && e.date <= r.end), label: `本周（${r.label}）` }
    }
    const r = monthRange(0)
    return { list: entries.filter((e) => e.date >= r.start && e.date <= r.end), label: r.label }
  }

  async function runPeriodAnalysis(key: PeriodKey) {
    setAiPeriod(key)
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    const { list, label } = aiRangeFor(key)
    try {
      const r = await analyzePeriodEntries(key, list, label)
      setAiResult(r)
    } catch (e) {
      setAiError('复盘暂时没有生成成功，可能是网络或服务在休息。你的记录都好好在，随时可以再试。')
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-6 fade-up">
      <SectionTitle title="复盘与洞察" emoji="📖" sub="点一下，让 AI 温柔地读一读这段时间的你" />

      {/* AI 周期复盘 */}
      <Card className="!bg-sage-light/40 !border-sage/25 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🫧</span>
          <h3 className="font-display font-medium text-ink">AI 温柔复盘</h3>
        </div>
        <p className="text-xs text-warmgray mb-4">选一个时间范围，一键生成。你的记录，一直有人在认真听。</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {PERIOD_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => runPeriodAnalysis(t.key)}
              disabled={aiLoading}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                aiPeriod === t.key && aiResult
                  ? 'bg-sage text-white border-sage'
                  : 'bg-white/70 text-ink border-warmgray/15 hover:border-sage/40'
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {aiLoading && (
          <p className="text-sm text-sage animate-pulse">正在温柔地读懂这段时间的你…</p>
        )}
        {aiError && <p className="text-sm text-blush-deep">{aiError}</p>}

        {aiResult && !aiLoading && (
          aiResult.result === null ? (
            <p className="text-sm text-warmgray">
              {aiResult.label}里还没有记录。等你写下几条，AI 就能帮你一起回看这段日子了 🌿
            </p>
          ) : (
            <div className="space-y-4 fade-up">
              <div className="flex items-center gap-2 text-xs text-warmgray">
                <span className="px-2 py-0.5 rounded-full bg-white/70 border border-sage/20">
                  {aiResult.label} · {aiResult.count} 次觉察
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/70 border border-sage/20">
                  {aiResult.result.source === 'remote' ? 'AI 云端生成' : '本地生成'}
                </span>
              </div>

              {/* 总览 */}
              <p className="text-sm leading-relaxed text-ink whitespace-pre-line">{aiResult.result.summary}</p>

              {/* 亮点 */}
              {aiResult.result.highlights.length > 0 && (
                <div>
                  <div className="text-xs text-warmgray mb-1.5">✨ 这段时间值得被看见</div>
                  <div className="space-y-1.5">
                    {aiResult.result.highlights.map((h, i) => (
                      <p key={i} className="text-sm text-ink leading-relaxed flex items-start gap-2">
                        <span className="text-blush-deep shrink-0 mt-0.5">·</span>
                        <span>{h}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 科学小建议 */}
              {aiResult.result.scienceTips.length > 0 && (
                <div className="rounded-xl bg-white/60 border border-sage/15 p-3">
                  <div className="text-xs text-warmgray mb-1.5">🌱 一点科学的小建议</div>
                  <div className="space-y-1.5">
                    {aiResult.result.scienceTips.map((t, i) => (
                      <p key={i} className="text-sm text-ink leading-relaxed flex items-start gap-2">
                        <span className="text-sage shrink-0 mt-0.5">·</span>
                        <span>{t}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 个性化建议 */}
              {aiResult.result.personalSuggestions.length > 0 && (
                <div className="rounded-xl bg-blush/30 border border-blush-deep/20 p-3">
                  <div className="text-xs text-blush-deep mb-1.5">💗 属于你的小建议</div>
                  <div className="space-y-1.5">
                    {aiResult.result.personalSuggestions.map((t, i) => (
                      <p key={i} className="text-sm text-ink leading-relaxed flex items-start gap-2">
                        <span className="text-blush-deep shrink-0 mt-0.5">·</span>
                        <span>{t}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 结尾 */}
              {aiResult.result.closing && (
                <p className="text-sm text-sage leading-relaxed font-medium">🕊️ {aiResult.result.closing}</p>
              )}
            </div>
          )
        )}
      </Card>

      {/* 单条记录 AI 分析入口 */}
      <Link to="/analysis" className="block">
        <Card className="p-4 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div className="flex-1">
              <div className="font-display font-medium text-ink">读一读某一条记录</div>
              <div className="text-xs text-warmgray mt-0.5">选一条具体的觉察，让 AI 单独温柔地读一读</div>
            </div>
            <span className="text-warmgray/50">›</span>
          </div>
        </Card>
      </Link>

      {/* 周报/月报统计切换 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {(['week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setPeriod(p); setOffset(0) }}
              className={`px-5 py-2 rounded-full text-sm border transition ${period === p ? 'bg-sage text-white border-sage' : 'bg-white/70 border-warmgray/15 text-ink'}`}
            >
              {p === 'week' ? '周报' : '月报'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOffset((o) => o + 1)} className="btn-ghost !px-4 !py-1.5 text-xs">
            ‹ 上一{period === 'week' ? '周' : '月'}
          </button>
          <span className="text-sm text-ink font-medium">{range.label}</span>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(0, o - 1))}
            disabled={offset <= 0}
            className="btn-ghost !px-4 !py-1.5 text-xs"
          >
            下一{period === 'week' ? '周' : '月'} ›
          </button>
        </div>
      </div>

      {report.total === 0 ? (
        <EmptyState
          emoji="📖"
          title="这个周期还没有记录"
          sub="写下几条觉察，复盘就会自动为你生成。回看的这一刻，本身就是一种温柔。"
        />
      ) : (
        <>
          {/* 概览 */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '记录次数', value: report.total, emoji: '📅' },
              { label: '平均满意度', value: report.avgSatisfaction || '—', emoji: '🌡️' },
              { label: '连续记录', value: `${report.streak}天`, emoji: '🔥' },
              { label: '微小感动', value: `${report.tinyJoys.length}件`, emoji: '✨' },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <div className="text-xl mb-1">{s.emoji}</div>
                <div className="text-xl font-display font-semibold text-ink">{s.value}</div>
                <div className="text-xs text-warmgray mt-1">{s.label}</div>
              </Card>
            ))}
          </section>

          {/* 情绪词云 */}
          <Card>
            <h3 className="font-display font-medium text-ink mb-1">情绪词云</h3>
            <p className="text-xs text-warmgray mb-4">{report.moodCompareText}</p>
            <div className="flex flex-wrap items-center gap-3 py-2">
              {report.moodCloud.map((w) => {
                const size = 0.85 + w.weight * 0.22
                const color = MOOD_COLORS[w.text] ?? '#5A7D7C'
                return (
                  <span
                    key={w.text}
                    className="inline-flex items-center gap-1 leading-none"
                    style={{ fontSize: `${size}rem`, color, fontWeight: w.weight >= 4 ? 600 : 500 }}
                  >
                    {w.text}
                    <span className="text-xs text-warmgray/60 align-top">{w.count}</span>
                    {w.delta !== 0 && (
                      <span className={`text-[10px] ${w.delta > 0 ? 'text-blush-deep' : 'text-sage'}`}>
                        {w.delta > 0 ? '▲' : '▼'}{Math.abs(w.delta)}
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
            <p className="text-[11px] text-warmgray mt-3">字越大出现越频繁；▲▼ 表示与上周相比的增减。</p>
          </Card>

          {/* 身体症状频率 */}
          {report.bodyFreq.length > 0 && (
            <Card>
              <h3 className="font-display font-medium text-ink mb-4">身体在提醒你什么</h3>
              <div className="space-y-3">
                {report.bodyFreq.slice(0, 8).map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-ink shrink-0 truncate">{b.label}</span>
                    <div className="flex-1 h-2.5 bg-mist/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sage/70 transition-all duration-500"
                        style={{ width: `${Math.min(100, (b.count / report.bodyFreq[0].count) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 text-xs text-warmgray text-right">{b.count}次 · {b.avgScore}分</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-warmgray mt-3">反复出现的身体信号，可能是情绪在通过身体和你说话。留意它，照顾它。</p>
            </Card>
          )}

          {/* 微小感动合集 */}
          {report.tinyJoys.length > 0 && (
            <Card className="!bg-blush/30 !border-blush-deep/20">
              <h3 className="font-display font-medium text-ink mb-3">🔋 能量快充包 · 微小感动合集</h3>
              <div className="space-y-2.5">
                {report.tinyJoys.map((joy, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-ink leading-relaxed">
                    <span className="text-blush-deep shrink-0 mt-0.5">✨</span>
                    <span>{joy}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blush-deep mt-3">感觉没电的时候，回来翻一翻，这里存着你收集的光。</p>
            </Card>
          )}

          {/* 成长趋势曲线 */}
          {report.trend.length > 0 && (
            <Card>
              <h3 className="font-display font-medium text-ink mb-4">成长趋势 · 自我满意度</h3>
              <TrendChart points={report.trend} max={maxSat} />
              <p className="text-xs text-warmgray mt-3">曲线有起伏很正常，重要的是你一直在记录、在靠近自己。</p>
            </Card>
          )}

          {/* 趋势描述 */}
          <Card className="bg-sage/5 border-sage/15">
            <p className="text-sm text-ink leading-relaxed">🌿 {report.trendText}</p>
          </Card>
        </>
      )}
    </div>
  )
}

/** 简单的 SVG 折线图 */
function TrendChart({ points, max }: { points: { date: string; satisfaction: number }[]; max: number }) {
  const W = 600
  const H = 160
  const padX = 20
  const padY = 20
  const n = points.length

  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - padX * 2)
  const y = (v: number) => H - padY - (v / max) * (H - padY * 2)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.satisfaction)}`).join(' ')
  const area = `${path} L ${x(n - 1)} ${H - padY} L ${x(0)} ${H - padY} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A7D7C" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#5A7D7C" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[1, 2, 3, 4, 5].map((v) => (
        <line key={v} x1={padX} y1={y(v)} x2={W - padX} y2={y(v)} stroke="#E8EEF2" strokeWidth="1" strokeDasharray="3 3" />
      ))}
      <path d={area} fill="url(#areaGrad)" />
      <path d={path} fill="none" stroke="#5A7D7C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.satisfaction)} r="4" fill="#FAF8F5" stroke="#5A7D7C" strokeWidth="2.5" />
          <text x={x(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#8B8680">
            {p.date.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  )
}
