import { Link } from 'react-router-dom'
import { getActions, getEntries } from '../lib/storage'
import { clearAuth, getUser, isLoggedIn } from '../lib/api'
import { Card, SectionTitle } from '../components/ui'

const ITEMS = [
  {
    to: '/actions',
    icon: '🌱',
    title: '行动计划',
    sub: '从觉察到改变，把困扰变成一步步的行动',
    bg: 'bg-sage-light/50',
  },
  {
    to: '/toolbox',
    icon: '🧰',
    title: '工具库',
    sub: '4-7-8 呼吸、着陆练习、自我关怀短句',
    bg: 'bg-mist/60',
  },
  {
    to: '/settings',
    icon: '⚙️',
    title: '设置与数据',
    sub: '数据备份、导入、隐私说明',
    bg: 'bg-blush/40',
  },
]

export default function MePage() {
  const entries = getEntries()
  const actions = getActions()
  const doneActions = actions.filter((a) => a.status === 'done').length
  const user = getUser()
  const loggedIn = isLoggedIn()

  function handleLogout() {
    clearAuth()
    // 简单刷新状态
    setTimeout(() => window.location.reload(), 300)
  }

  return (
    <div className="space-y-6 fade-up">
      <SectionTitle
        title="我的"
        emoji="🧡"
        sub="这里是属于你的小小空间"
      />

      {/* 登录状态 */}
      {loggedIn && user ? (
        <Card className="p-5 !bg-sage-light/40 !border-sage/25">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sage text-white flex items-center justify-center text-xl font-display">
              {user.username.slice(0, 1)}
            </div>
            <div className="flex-1">
              <div className="font-display font-medium text-ink">{user.username}</div>
              <div className="text-xs text-sage mt-0.5">☁️ 已登录 · 记录已同步到云端</div>
            </div>
            <button type="button" onClick={handleLogout} className="btn-ghost !px-4 !py-1.5 text-xs">
              退出登录
            </button>
          </div>
        </Card>
      ) : (
        <Card className="p-5 !bg-blush/40 !border-blush-deep/20">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="font-display font-medium text-ink">还没登录</div>
              <div className="text-xs text-warmgray mt-0.5">
                登录后记录会同步到云端，换设备、清缓存都不怕丢。
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/auth/login" className="btn-ghost !px-5 !py-2 text-sm">登录</Link>
              <Link to="/auth/register" className="btn-primary !px-5 !py-2 text-sm">注册</Link>
            </div>
          </div>
        </Card>
      )}

      {/* 概览 */}
      <Card className="p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-display font-semibold text-ink">{entries.length}</div>
            <div className="text-xs text-warmgray mt-1">累计记录</div>
          </div>
          <div>
            <div className="text-2xl font-display font-semibold text-ink">{actions.length}</div>
            <div className="text-xs text-warmgray mt-1">行动计划</div>
          </div>
          <div>
            <div className="text-2xl font-display font-semibold text-ink">{doneActions}</div>
            <div className="text-xs text-warmgray mt-1">已完成</div>
          </div>
        </div>
      </Card>

      {/* 功能入口 */}
      <div className="space-y-3">
        {ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className="block">
            <Card className={`p-5 !bg-white/70 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${item.bg}`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-medium text-ink">{item.title}</div>
                  <div className="text-xs text-warmgray mt-0.5">{item.sub}</div>
                </div>
                <span className="text-warmgray/50">›</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* 温柔问候 */}
      <Card className="!bg-sage/5 !border-sage/15 p-5 text-sm text-ink leading-relaxed">
        <span className="font-display font-medium">💭 记得：</span>
        你不需要每天都做得很好，只要还在照顾自己，就已经很了不起了。
      </Card>
    </div>
  )
}
