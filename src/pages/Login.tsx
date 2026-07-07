import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, ShieldCheck, User } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { ApiError } from '@/utils/api'
import type { Role } from '@/types'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

/** 登录 / 注册页。 */
export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<Role>('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setPassword('')
    setConfirm('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (username.trim().length < 3) {
      setError('用户名至少 3 个字符')
      return
    }
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    if (mode === 'register' && password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(username.trim(), password)
      } else {
        await register(username.trim(), password, role)
      }
      navigate(role === 'admin' ? '/students' : '/grades', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-navy shadow-card">
            <GraduationCap className="text-amber" size={30} />
          </div>
          <h1 className="font-display text-3xl font-semibold text-navy">成绩管理系统</h1>
          <p className="mt-1 text-sm text-navy/60">高效管理学生信息与成绩数据</p>
        </div>

        <div className="rounded-lg border border-navy/10 bg-white/80 p-6 shadow-card backdrop-blur">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded bg-cream p-1">
            <button
              onClick={() => switchMode('login')}
              className={cn(
                'rounded py-2 text-sm font-medium transition',
                mode === 'login' ? 'bg-navy text-cream shadow' : 'text-navy/70',
              )}
            >
              登录
            </button>
            <button
              onClick={() => switchMode('register')}
              className={cn(
                'rounded py-2 text-sm font-medium transition',
                mode === 'register' ? 'bg-navy text-cream shadow' : 'text-navy/70',
              )}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">用户名</label>
              <input
                className="field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">密码</label>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="label">确认密码</label>
                  <input
                    className="field"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="请再次输入密码"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="label">角色</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={cn(
                        'flex items-center gap-2 rounded border px-3 py-2 text-sm transition',
                        role === 'admin'
                          ? 'border-amber bg-amber/15 text-navy'
                          : 'border-navy/20 text-navy/70 hover:bg-navy/5',
                      )}
                    >
                      <ShieldCheck size={16} /> 管理员
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={cn(
                        'flex items-center gap-2 rounded border px-3 py-2 text-sm transition',
                        role === 'student'
                          ? 'border-amber bg-amber/15 text-navy'
                          : 'border-navy/20 text-navy/70 hover:bg-navy/5',
                      )}
                    >
                      <User size={16} /> 学生
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册并登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
