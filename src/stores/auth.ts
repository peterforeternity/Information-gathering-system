/**
 * 认证状态管理（Pinia）。
 * 负责登录、注册、登出、恢复会话，并保存当前用户信息。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest, setToken, clearToken, getToken } from '@/utils/api'
import type { AuthUser, Role } from '@/types'

interface AuthResponse {
  token: string
  user: AuthUser
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const initializing = ref(true)

  async function login(username: string, password: string) {
    const res = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    setToken(res.token)
    user.value = res.user
  }

  async function register(username: string, password: string, role: Role) {
    const res = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { username, password, role },
    })
    setToken(res.token)
    user.value = res.user
  }

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
      // 即使请求失败也清除本地会话
    }
    clearToken()
    user.value = null
  }

  async function restore() {
    if (!getToken()) {
      initializing.value = false
      return
    }
    try {
      const res = await apiRequest<{ user: AuthUser }>('/auth/me')
      user.value = res.user
    } catch {
      clearToken()
      user.value = null
    } finally {
      initializing.value = false
    }
  }

  return { user, initializing, login, register, logout, restore }
})
