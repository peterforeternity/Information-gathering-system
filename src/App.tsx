import { useEffect, type ReactNode } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import Login from '@/pages/Login'
import Students from '@/pages/Students'
import Grades from '@/pages/Grades'
import { useAuthStore } from '@/store/useAuthStore'

/** 需要登录才能访问；可选限制仅管理员。 */
function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: ReactNode
  adminOnly?: boolean
}) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/grades" replace />
  return <>{children}</>
}

export default function App() {
  const restore = useAuthStore((s) => s.restore)
  const initializing = useAuthStore((s) => s.initializing)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    restore()
  }, [restore])

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-navy/60">
        加载中...
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/grades" replace /> : <Login />}
        />
        <Route
          path="/students"
          element={
            <ProtectedRoute adminOnly>
              <Students />
            </ProtectedRoute>
          }
        />
        <Route
          path="/grades"
          element={
            <ProtectedRoute>
              <Grades />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={user ? '/grades' : '/login'} replace />} />
      </Routes>
    </Router>
  )
}
