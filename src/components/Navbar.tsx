import { NavLink, useNavigate } from 'react-router-dom'
import { GraduationCap, Users, ClipboardList, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'

/** 顶部导航栏：模块切换、当前用户信息、登出。 */
export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition',
      isActive ? 'bg-amber text-navy-dark' : 'text-cream/80 hover:bg-white/10 hover:text-cream',
    )

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-amber" size={26} />
          <span className="font-display text-xl font-semibold text-cream">成绩管理系统</span>
        </div>

        <nav className="flex items-center gap-1">
          {user?.role === 'admin' && (
            <NavLink to="/students" className={linkClass}>
              <Users size={16} /> 学生管理
            </NavLink>
          )}
          <NavLink to="/grades" className={linkClass}>
            <ClipboardList size={16} /> 成绩管理
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-cream">{user?.username}</p>
            <p className="text-xs text-amber-light">
              {user?.role === 'admin' ? '管理员' : '学生'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded border border-white/20 px-3 py-2 text-sm text-cream/90 transition hover:bg-white/10"
          >
            <LogOut size={16} /> 登出
          </button>
        </div>
      </div>
    </header>
  )
}
