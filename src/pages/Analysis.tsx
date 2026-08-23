import { useMemo, useState } from 'react'
import { getEntries } from '../lib/storage'
import { analyzeEmotion, buildSanitizedText } from '../lib/ai'
import type { AnalysisResult, JournalEntry } from '../lib/types'
import { MOOD_COLORS } from '../lib/types'
import { Card, Disclaimer, EmptyState, SectionTitle } from '../components/ui'

const SENTIMENT_META: Record<AnalysisResult['sentiment'], { label: string; emoji: string; bg: string }> = {
  positive: { label: '轻盈温暖', emoji: '🌤️', bg: 'bg-blush/50' },
  neutral: { label: '平静如水', emoji: '🌿', bg: 'bg-sage-light/50' },
  negative: { label: '需要抱抱', emoji: '🌧️', bg: 'bg-mist/60' },
}

export default function AnalysisPage() {
  const entries = useMemo(() => getEntries(), [])
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.id ?? null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selected = entries.find((e) => e.id === selectedId) ?? null

  async function runAnalysis(entry: JournalEntry) {
    setLoading(true)
    setError(null)
    setResult(null)

    const topEmotion = entry.emotions[0]?.display ?? '未记录'
    const intensity = entry.emotions[0]?.score ?? 5

    const payload = {
      mood: topEmotion,
      intensity,
      text: buildSanitizedText({
        mood: topEmotion,
        intensity,
        text: [entry.event, entry.thoughts, ...entry.actions.map((a) => a.text)].filter(Boolean).join('。'),
      }),
    }
    try {
      const r = await analyzeEmotion(payload)
      setResult(r)
    } catch (e) {
      setError('分析暂时没有成功，可能是网络或服务在休息。你的记录都好好待在本地，随时可以再试。')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (entries.length === 0) {
    return (
      <div className="fade-up">
        <SectionTitle title="AI 情绪分析" emoji="🫧" sub="让 AI 帮你读一读今天的情绪，看见藏在文字背后的自己" />
        <EmptyState
          emoji="🫧"
          title="还没有可以分析的记录"
          sub="先写下一条每日觉察，再回来看看 AI 是怎么理解你的。"
        />
      </div>
    )
  }

  const meta = result ? SENTIMENT_META[result.sentiment] : null

  return (
    <div className="space-y-6 fade-up">
      <SectionTitle title="AI 情绪分析" emoji="🫧" sub="选一条记录，让 AI 温柔地读一读此刻的你" />

      {/* 记录选择 */}
      <Card className="p-4">
        <label className="label-soft !mb-2">选择要分析的记录</label>
        <div className="flex flex-wrap gap-2">
          {[...entries].sort((a, b) => b.date.localeCompare(a.date) || ((b.createdAt ?? 0) - (a.createdAt ?? 0))).map((e) => {
            const t = new Date(e.createdAt ?? e.timestamp ?? 0)
            const timeLabel = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => { setSelectedId(e.id); setResult(null); setError(null) }}
                className={`px-4 py-2 rounded-full text-sm border transition ${
                  selectedId === e.id
                    ? 'bg-sage text-white border-sage'
                    : 'bg-white/60 text-ink border-warmgray/15 hover:border-sage/40'
                }`}
              >
                {e.date.slice(5)} {timeLabel} · {e.emotions[0]?.display ?? '未记录'}
              </button>
            )
          })}
        </div>
      </Card>

      {selected && (
        <>
          <Card className="p-4 bg-white/50">
            <div className="flex items-center gap-3 text-sm text-ink flex-wrap">
              {selected.emotions.map((fe) => (
                <span
                  key={fe.display}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs"
                  style={{ backgroundColor: MOOD_COLORS[fe.display] ?? '#5A7D7C' }}
                >
                  {fe.display} · {fe.score}/10
                </span>
              ))}
            </div>
            {(selected.event || selected.thoughts) && (
              <p className="text-sm text-warmgray mt-2 line-clamp-2">{selected.event || selected.thoughts}</p>
            )}
          </Card>

          <button type="button" onClick={() => runAnalysis(selected)} disabled={loading} className="btn-primary w-full">
            {loading ? '正在温柔地分析中…' : '开始分析 🌟'}
          </button>

          {error && <p className="text-sm text-blush-deep text-center">{error}</p>}

          {result && meta && (
            <Card className="fade-up">
              <div className={`rounded-2xl p-5 ${meta.bg}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{meta.emoji}</span>
                  <div>
                    <div className="font-display font-semibold text-ink text-lg">{meta.label}</div>
                    <div className="text-xs text-warmgray">
                      来自 {result.source === 'remote' ? 'AI 云端分析' : '本地隐私分析'} · 置信度 {Math.round(result.confidence * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink">
                <div>
                  <div className="text-xs text-warmgray mb-1">🗝️ 关键词</div>
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.map((k) => (
                      <span key={k} className="px-3 py-1 rounded-full bg-sage-light/60 text-sage text-xs">{k}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-warmgray mb-1">💬 AI 读到了什么</div>
                  <p>{result.summary}</p>
                </div>
                <div>
                  <div className="text-xs text-warmgray mb-1">🌷 给你的小小建议</div>
                  <p>{result.suggestion}</p>
                </div>
              </div>

              <Disclaimer>
                AI 分析结果仅作为辅助参考，帮助你更了解自己，不替代专业心理咨询。若情绪持续影响生活，请考虑寻求专业帮助。
              </Disclaimer>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
