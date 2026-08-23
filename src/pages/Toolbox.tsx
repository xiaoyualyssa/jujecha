import { useEffect, useRef, useState } from 'react'
import { Card, Disclaimer, SectionTitle } from '../components/ui'

interface Tool {
  id: string
  emoji: string
  title: string
  desc: string
  kind: 'breath' | 'grounding' | 'affirm' | 'write'
}

const TOOLS: Tool[] = [
  { id: 'breath', emoji: '🌬️', title: '4-7-8 呼吸法', desc: '吸气 4 秒、屏息 7 秒、呼气 8 秒，帮助身体慢慢放松下来。', kind: 'breath' },
  { id: 'grounding', emoji: '🌳', title: '5-4-3-2-1 着陆练习', desc: '回到当下：说出 5 个你看见、4 个你听见、3 个你摸到、2 个你闻到、1 个你尝到的东西。', kind: 'grounding' },
  { id: 'affirm', emoji: '💗', title: '自我关怀短句', desc: '需要的时候，挑一句对自己轻声说。', kind: 'affirm' },
  { id: 'write', emoji: '🖊️', title: '情绪日记引导', desc: '不知道从哪下笔？跟着这几个温和的问题，慢慢写。', kind: 'write' },
]

const AFFIRMATIONS = [
  '我的感受是真实的，不需要向任何人证明。',
  '此刻的我已经足够好。',
  '我可以先照顾自己，这并不自私。',
  '慢一点也没关系，我按自己的节奏来。',
  '那些让我不安的事，不会永远持续下去。',
]

const WRITE_PROMPTS = [
  '此刻我的身体哪个部位最紧张？如果把这种感受比作天气，它像什么？',
  '今天有哪个瞬间，我对自己特别苛刻？如果换成对好朋友，我会怎么安慰她？',
  '此刻我最想被听见的一句话是什么？试着把它写给自己。',
  '今天我为自己做过的最小的一件好事是什么？',
]

export default function ToolboxPage() {
  const [active, setActive] = useState<string | null>(null)
  const [affirm, setAffirm] = useState(AFFIRMATIONS[0])

  const tool = TOOLS.find((t) => t.id === active)

  return (
    <div className="space-y-6 fade-up">
      <SectionTitle
        title="附加工具库"
        emoji="🧰"
        sub="当你需要一点帮助安静下来时，这里有几件温柔的小工具"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id === active ? null : t.id)}
            className={`card p-5 text-left transition-all hover:shadow-soft-lg ${
              active === t.id ? 'ring-2 ring-sage/40' : ''
            }`}
          >
            <div className="text-3xl mb-2">{t.emoji}</div>
            <div className="font-display font-medium text-ink">{t.title}</div>
            <div className="text-sm text-warmgray mt-1">{t.desc}</div>
          </button>
        ))}
      </div>

      {tool && (
        <Card className="fade-up">
          <h3 className="font-display font-medium text-ink mb-4 flex items-center gap-2">
            {tool.emoji} {tool.title}
          </h3>

          {tool.kind === 'breath' && <BreathGuide />}
          {tool.kind === 'grounding' && <GroundingGuide />}
          {tool.kind === 'affirm' && (
            <div className="text-center">
              <p className="text-lg font-display text-ink leading-relaxed py-6">{affirm}</p>
              <button
                type="button"
                onClick={() => setAffirm(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)])}
                className="btn-ghost"
              >
                换一句
              </button>
            </div>
          )}
          {tool.kind === 'write' && (
            <div className="space-y-3">
              {WRITE_PROMPTS.map((p, i) => (
                <div key={i} className="rounded-2xl bg-mist/40 p-4 text-sm text-ink leading-relaxed">
                  <span className="text-warmgray mr-2">{i + 1}.</span>
                  {p}
                </div>
              ))}
              <p className="text-xs text-warmgray">不用写得很长，哪怕只有一句话，也是和自己的一次对话。</p>
            </div>
          )}
        </Card>
      )}

      <Disclaimer>
        这些工具是温和的自我调节练习，适合日常放松。如果你正处于持续的强烈情绪困扰中，请优先寻求专业支持。
      </Disclaimer>
    </div>
  )
}

function BreathGuide() {
  type Phase = 'idle' | 'in' | 'hold' | 'out'
  const PHASES: { key: Phase; label: string; seconds: number }[] = [
    { key: 'in', label: '吸气', seconds: 4 },
    { key: 'hold', label: '屏息', seconds: 7 },
    { key: 'out', label: '呼气', seconds: 8 },
  ]

  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [count, setCount] = useState(0)
  const [round, setRound] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function stop() {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setRunning(false)
    setPhase('idle')
    setCount(0)
    setRound(0)
  }

  function start() {
    if (running) return
    setRunning(true)
    setRound(0)
    let r = 0
    const runRound = () => {
      let acc = 0
      PHASES.forEach((p) => {
        timers.current.push(
          setTimeout(() => {
            setPhase(p.key)
            setCount(p.seconds)
          }, acc * 1000),
        )
        for (let i = 1; i <= p.seconds; i++) {
          timers.current.push(
            setTimeout(() => setCount(p.seconds - i), (acc + i) * 1000),
          )
        }
        acc += p.seconds
      })
      timers.current.push(
        setTimeout(() => {
          r += 1
          setRound(r)
          if (r < 4) runRound()
          else {
            setPhase('idle')
            setCount(0)
            setRunning(false)
          }
        }, acc * 1000),
      )
    }
    runRound()
  }

  const phaseText = { in: '吸气', hold: '屏息', out: '呼气', idle: '准备好了吗' }[phase]
  const scaleClass =
    phase === 'in' ? 'scale-125 bg-blush/70' :
    phase === 'hold' ? 'scale-125 bg-sage-light' :
    phase === 'out' ? 'scale-100 bg-mist/70' : 'scale-100 bg-sage-light/50'

  return (
    <div className="text-center py-4">
      <div className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center transition-all duration-1000 ${scaleClass}`}>
        <span className="font-display text-ink text-lg">{phase === 'idle' ? '🌬️' : count}</span>
      </div>
      <p className="text-sm text-warmgray mt-3">
        {phase === 'idle' ? (round === 4 ? '完成啦，感觉好一点了吗' : '准备好了吗') : `${phaseText} · 第 ${round + 1} 轮`}
      </p>
      <button type="button" onClick={running ? stop : start} className="btn-primary mt-4">
        {running ? '停下来' : round === 4 ? '再来一轮' : '开始呼吸'}
      </button>
    </div>
  )
}

function GroundingGuide() {
  const [step, setStep] = useState(0)
  const steps = [
    { n: 5, text: '5 个你此刻看见的东西' },
    { n: 4, text: '4 个你此刻听见的声音' },
    { n: 3, text: '3 个你此刻能摸到的触感' },
    { n: 2, text: '2 个你此刻闻到的气味' },
    { n: 1, text: '1 个你此刻能尝到的味道' },
  ]
  const s = steps[step]
  return (
    <div className="text-center py-4">
      <div className="text-5xl mb-3">{'🖐️'}</div>
      <p className="font-display text-ink text-xl">{s.n}</p>
      <p className="text-sm text-warmgray mt-1">{s.text}</p>
      <div className="flex justify-center gap-3 mt-5">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="btn-ghost">上一步</button>
        )}
        {step < steps.length - 1 ? (
          <button type="button" onClick={() => setStep(step + 1)} className="btn-primary">下一步</button>
        ) : (
          <button type="button" onClick={() => setStep(0)} className="btn-primary">重新来一遍</button>
        )}
      </div>
    </div>
  )
}
