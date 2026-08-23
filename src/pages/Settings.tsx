import { useRef, useState } from 'react'
import { clearAllData, exportBackup, getDataStats, importBackup } from '../lib/storage'
import { Card, Notice, SectionTitle } from '../components/ui'

export default function SettingsPage() {
  const [stats, setStats] = useState(() => getDataStats())
  const [msg, setMsg] = useState<{ tone: 'info' | 'gentle'; text: string } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function refreshStats() {
    setStats(getDataStats())
  }

  function handleExport() {
    try {
      const json = exportBackup()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const d = new Date()
      const ts = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
      a.download = `看见自己-觉察记录备份-${ts}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMsg({ tone: 'info', text: '已导出备份文件，请妥善保存到网盘或电脑里 🌿' })
    } catch (e) {
      setMsg({ tone: 'gentle', text: '导出失败了，请稍后再试。' })
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = importBackup(String(reader.result))
        setMsg({ tone: 'info', text: `导入成功：${result.journalCount} 条记录、${result.actionCount} 项行动已合并进来 🌿` })
        refreshStats()
      } catch (err) {
        setMsg({ tone: 'gentle', text: '导入失败，请确认选择的是正确的备份文件。' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    clearAllData()
    setConfirmClear(false)
    refreshStats()
    setMsg({ tone: 'gentle', text: '数据已清空。如果之前没有备份，将无法恢复。' })
  }

  return (
    <div className="space-y-6 fade-up">
      <SectionTitle
        title="设置与数据"
        emoji="⚙️"
        sub="你的数据，你说了算。这里可以看到数据保存在哪、存多久、怎么备份。"
      />

      {/* 数据保存说明 */}
      <Card>
        <h3 className="font-display font-medium text-ink mb-3">🔒 数据保存在哪里？能存多久？</h3>
        <div className="space-y-2.5 text-sm text-ink leading-relaxed">
          <p>
            <span className="font-medium">保存位置：</span>
            你的记录优先保存在<strong>本机浏览器本地</strong>（localStorage），随写随存，不依赖网络。
          </p>
          <p>
            <span className="font-medium">云端同步：</span>
            注册并登录账号后，记录会<strong>自动同步到云端</strong>，换设备、换浏览器、清缓存都不怕丢。
          </p>
          <p>
            <span className="font-medium">保存时长：</span>
            只要你不主动清除浏览器数据、不卸载浏览器，本地记录会<strong>一直保留</strong>；登录后云端也会为你长期保存。
          </p>
          <p>
            <span className="font-medium text-blush-deep">需要注意：</span>
            未登录时，换设备、清除浏览器缓存、使用无痕模式，本地数据<strong>不会跟随</strong>。所以建议<strong>注册账号开启云同步</strong>，或定期导出备份。
          </p>
          <p>
            <span className="font-medium">当前数据量：</span>
            已有 <strong>{stats.journal}</strong> 条觉察记录、<strong>{stats.actions}</strong> 项行动计划。
          </p>
        </div>
      </Card>

      {/* 隐私说明 */}
      <Card className="!bg-sage/5 !border-sage/15">
        <h3 className="font-display font-medium text-ink mb-2">🕊️ 关于隐私</h3>
        <p className="text-sm text-ink leading-relaxed">
          采用「本地优先 + 可选云同步」设计：未登录时，你的情绪记录天然私密，不会出现在任何服务器上；登录后记录加密存储在你的账号下，仅自己可见。AI 情绪分析仅在需要时上传<strong>脱敏后的文本</strong>（不含任何身份信息）。
        </p>
      </Card>

      {/* 备份操作 */}
      <Card>
        <h3 className="font-display font-medium text-ink mb-4">💾 备份与恢复</h3>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleExport} className="btn-primary">
            ⬇️ 导出备份文件
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost">
            ⬆️ 导入备份
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
        </div>
        <p className="text-xs text-warmgray mt-3">
          建议每周导出一次，把 JSON 文件存到网盘、微信文件传输助手或电脑里，换设备时可一键导入恢复。
        </p>
      </Card>

      {/* 清空数据 */}
      <Card className="!border-blush-deep/25">
        <h3 className="font-display font-medium text-ink mb-2">⚠️ 清空所有数据</h3>
        <p className="text-sm text-warmgray mb-4">此操作会删除本机上的全部记录与行动计划，且无法撤销。</p>
        <button
          type="button"
          onClick={handleClear}
          className={`px-5 py-2.5 rounded-full text-sm border transition ${
            confirmClear
              ? 'bg-blush-deep text-white border-blush-deep'
              : 'border-blush-deep/40 text-blush-deep hover:bg-blush/40'
          }`}
        >
          {confirmClear ? '再点一次确认清空' : '清空所有数据'}
        </button>
      </Card>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  )
}
