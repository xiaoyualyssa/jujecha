import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiLogin, apiRegister, syncLocalToCloud } from '../lib/api'
import { pullFromCloud } from '../lib/storage'
import { Card, SectionTitle } from '../components/ui'

// 登录/注册后：先把本地可能已存在的记录同步到云端（避免登录前写的记录丢失），再拉取云端数据覆盖本地
async function syncThenPull() {
  try {
    const n = await syncLocalToCloud()
    if (n > 0) console.info(`已同步 ${n} 条本地记录到云端`)
  } catch (e) {
    console.warn('本地记录同步失败', e)
  }
  try {
    await pullFromCloud()
  } catch (e) {
    console.warn('拉取云端数据失败', e)
  }
}

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLogin = mode === 'login'

  async function handleSubmit() {
    if (!username.trim() || !password) {
      setError('请填写用户名和密码')
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (isLogin) {
        await apiLogin(username.trim(), password)
        // 登录成功：先把本地记录同步到云端，再拉取云端覆盖本地（云端为准）
        await syncThenPull()
      } else {
        await apiRegister(username.trim(), password)
        // 注册成功后：把本地已有数据同步到云端
        await syncThenPull()
      }
      navigate('/me')
    } catch (e: any) {
      setError(e.message || '操作失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6 fade-up pt-8">
      <SectionTitle
        title={isLogin ? '欢迎回来' : '创建你的账号'}
        emoji={isLogin ? '🌿' : '🌱'}
        sub={isLogin ? '登录后，你的记录会安全同步到云端' : '账号用于同步你的觉察记录，跨设备不丢失'}
      />

      <Card>
        <div className="space-y-4">
          <div>
            <label className="label-soft !text-sm">用户名</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="2-20 位，中文/字母/数字/下划线"
              className="input-soft"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label-soft !text-sm">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? '输入密码' : '至少 6 位'}
              className="input-soft"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            />
          </div>

          {error && <p className="text-sm text-blush-deep">{error}</p>}

          <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
            {loading ? '请稍候…' : isLogin ? '登录' : '注册并同步数据'}
          </button>

          <button
            type="button"
            onClick={() => navigate(isLogin ? '/auth/register' : '/auth/login')}
            className="w-full text-center text-sm text-sage hover:underline"
          >
            {isLogin ? '还没有账号？去注册 →' : '已有账号？去登录 →'}
          </button>
        </div>
      </Card>

      <p className="text-[11px] text-warmgray text-center leading-relaxed">
        🕊️ 你的情绪记录会加密存储在你的账号下，仅自己可见。密码经过哈希处理，我们无法看到你的原始密码。
      </p>
    </div>
  )
}
