import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/record', label: '记录', icon: '✍️' },
  { to: '/review', label: '复盘', icon: '📖' },
  { to: '/me', label: '我的', icon: '🧡' },
]
export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶栏 */}
      <header className="sticky top-0 z-20 bg-cream/85 backdrop-blur border-b border-sage/10">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-2xl bg-sage flex items-center justify-center text-lg shadow-soft group-hover:scale-105 transition">
              🪴
            </span>
            <div className="leading-tight">
              <div className="font-display font-semibold text-ink">看见自己</div>
              <div className="text-[11px] text-warmgray -mt-0.5">每日觉察手账</div>
            </div>
          </Link>
          <div className="text-xs text-warmgray hidden sm:block">
            不是计划表，是情绪的记录分析仪 🌿
          </div>
          <Link
            to="/settings"
            className={`flex items-center gap-1 text-xs rounded-full px-3 py-1.5 border transition ${
              pathname === '/settings' || pathname === '/me'
                ? 'text-sage border-sage/40 bg-sage-light'
                : 'text-warmgray border-warmgray/15 hover:border-sage/40'
            }`}
          >
            ⚙️ 设置
          </Link>
        </div>
      </header>

      {/* 内容 */}
      <main className="flex-1 w-full mx-auto max-w-5xl px-4 py-6 pb-28">
        {children}
      </main>

      {/* 底部导航（移动端） */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur border-t border-sage/10">
        <div className="mx-auto max-w-5xl grid grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                  active ? 'text-sage font-medium' : 'text-warmgray'
                }`}
              >
                <span className={`text-lg leading-none transition ${active ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
