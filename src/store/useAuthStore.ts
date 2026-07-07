/**
 * 认证状态管理（zustand）。
 * 负责登录、注册、登出、恢复会话，并保存当前用户信息。
 */
import { create } from 'zustand'
import { apiRequest, setToken, clearToken, getToken } from '@/utils/api'
import type { AuthUser, Role } from '@/types'

interface AuthState {
  user: AuthUser | null
  initializing: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, role: Role) => Promise<void>
  logout: () => Promise<void>
  restore: () => Promise<void>
}

interface AuthResponse {
  token: string
  user: AuthUser
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: true,

  login: async (username, password) => {
    const res = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    setToken(res.token)
    set({ user: res.user })
  },

  register: async (username, password, role) => {
    const res = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { username, password, role },
    })
    setToken(res.token)
    set({ user: res.user })
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
      // 即使请求失败也清除本地会话
    }
    clearToken()
    set({ user: null })
  },

  restore: async () => {
    if (!getToken()) {
      set({ initializing: false })
      return
    }
    try {
      const res = await apiRequest<{ user: AuthUser }>('/auth/me')
      set({ user: res.user, initializing: false })
    } catch {
      clearToken()
      set({ user: null, initializing: false })
    }
  },
}))
