// 通用 UI 小组件
import { useRef, useState } from 'react'
import { addUserBodyWord, addUserMoodWord } from '../lib/types'

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>
}

export function SectionTitle({ title, sub, emoji }: { title: string; sub?: string; emoji?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2">
        {emoji && <span>{emoji}</span>}
        {title}
      </h2>
      {sub && <p className="text-sm text-warmgray mt-1">{sub}</p>}
    </div>
  )
}

export function Pill({
  children,
  active = false,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm transition-all duration-150 border ${
        active
          ? 'bg-sage text-white border-sage shadow-soft'
          : 'bg-white/70 text-ink border-warmgray/20 hover:border-sage/40'
      }`}
    >
      {children}
    </button>
  )
}

export function EmptyState({ emoji, title, sub, action }: { emoji: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center gap-3 fade-up">
      <span className="text-4xl">{emoji}</span>
      <p className="font-display text-ink font-medium">{title}</p>
      {sub && <p className="text-sm text-warmgray max-w-sm">{sub}</p>}
      {action}
    </div>
  )
}

export function Disclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <p className="text-[11px] leading-relaxed text-warmgray/80 mt-3 flex items-start gap-1.5">
      <span>🕊️</span>
      <span>
        {children ?? 'AI 分析结果仅作为辅助参考，帮助你更了解自己，不能替代专业心理咨询或医疗建议。'}
      </span>
    </p>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'gentle'; children: React.ReactNode }) {
  const bg = tone === 'gentle' ? 'bg-blush/60 border-blush-deep/30 text-ink' : 'bg-mist/60 border-sage/20 text-ink'
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${bg}`}>{children}</div>
  )
}

/**
 * 情绪/身体感受选择器：预设标签（点击添加）+ 自定义 + 1-10 打分
 * - 预设标签折叠展示（默认只显示 3 行，可展开）
 * - 自定义输入框默认隐藏，点击「＋ 添加情绪词」后出现
 */
export function FeelingPicker({
  title,
  options,
  values,
  onChange,
  accent = 'blush',
  placeholder = '也可以写下自己的感受……',
  addLabel = '添加情绪词',
}: {
  title: string
  options: string[]
  values: { label: string; custom?: string; score: number; display: string }[]
  onChange: (next: { label: string; custom?: string; score: number; display: string }[]) => void
  accent?: 'blush' | 'mist'
  placeholder?: string
  addLabel?: string
}) {
  const [customText, setCustomText] = useState('')
  // 是否展开全部预设标签（默认折叠）
  const [expanded, setExpanded] = useState(false)
  // 是否显示自定义输入框
  const [showCustom, setShowCustom] = useState(false)
  const customRef = useRef<HTMLInputElement>(null)

  const selectedLabels = values.map((v) => v.display)

  function toggle(label: string) {
    if (selectedLabels.includes(label)) {
      onChange(values.filter((v) => v.display !== label))
    } else {
      onChange([...values, { label, score: 5, display: label }])
    }
  }

  function addCustom() {
    const t = customText.trim()
    if (!t) return
    if (selectedLabels.includes(t)) {
      setCustomText('')
      return
    }
    onChange([...values, { label: '', custom: t, score: 5, display: t }])
    // 把自定义词持久化，后续记录中仍保留在选项列表里
    try {
      if (accent === 'blush') addUserMoodWord(t)
      else addUserBodyWord(t)
    } catch {
      /* 忽略 */
    }
    setCustomText('')
  }

  function updateScore(display: string, score: number) {
    onChange(values.map((v) => (v.display === display ? { ...v, score } : v)))
  }

  function remove(display: string) {
    onChange(values.filter((v) => v.display !== display))
  }

  const chipBg = accent === 'blush' ? 'bg-blush/60 border-blush-deep/30' : 'bg-mist/70 border-sage/30'

  return (
    <div>
      <label className="label-soft !text-sm">{title}</label>

      {/* 预设选项：折叠展示 */}
      <div className={`flex flex-wrap gap-2 overflow-hidden transition-all ${expanded ? '' : 'max-h-[4.6rem]'}`}>
        {options.map((opt) => {
          const active = selectedLabels.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-3.5 py-1.5 rounded-full text-sm border transition-all ${
                active
                  ? `${chipBg} text-ink border-sage/40 shadow-soft`
                  : 'bg-white/60 text-warmgray border-warmgray/15 hover:border-sage/30'
              }`}
            >
              {active ? '✓ ' : ''}{opt}
            </button>
          )
        })}
      </div>

      {/* 展开/收起 + 添加自定义词入口 */}
      <div className="flex items-center gap-3 mt-2">
        {options.length > 14 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-sage hover:underline"
          >
            {expanded ? '收起 ▲' : '展开全部 ▼'}
          </button>
        )}
        <button
          type="button"
          onClick={() => { setShowCustom((v) => !v); if (!showCustom) setTimeout(() => customRef.current?.focus(), 60) }}
          className="text-xs text-sage hover:underline"
        >
          {showCustom ? '收起' : `＋ ${addLabel}`}
        </button>
      </div>

      {/* 自定义输入（点击后出现） */}
      {showCustom && (
        <div className="flex gap-2 mt-2">
          <input
            ref={customRef}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
            placeholder={placeholder}
            className="input-soft !py-2"
          />
          <button type="button" onClick={addCustom} disabled={!customText.trim()} className="btn-ghost !px-4 !py-2 shrink-0">
            添加
          </button>
        </div>
      )}

      {/* 已选条目 + 打分 */}
      {values.length > 0 && (
        <div className="space-y-2.5 mt-3">
          {values.map((v) => (
            <div key={v.display} className="flex items-center gap-3 bg-white/50 rounded-2xl px-3 py-2.5 border border-white/60">
              <span className="text-sm text-ink font-medium min-w-[4.5rem] max-w-[7rem] truncate">{v.display}</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] text-warmgray shrink-0">1</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={v.score}
                  onChange={(e) => updateScore(v.display, Number(e.target.value))}
                  className="flex-1 accent-sage"
                />
                <span className="text-[10px] text-warmgray shrink-0">10</span>
              </div>
              <span className="w-8 text-center text-sm font-display font-semibold text-sage">{v.score}</span>
              <button type="button" onClick={() => remove(v.display)} className="text-warmgray/60 hover:text-blush-deep transition shrink-0" title="移除">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
