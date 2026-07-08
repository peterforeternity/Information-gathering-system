<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { GraduationCap, ShieldCheck, User } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'
import type { Role } from '@/types'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

const auth = useAuthStore()
const router = useRouter()

const mode = ref<Mode>('login')
const username = ref('')
const password = ref('')
const confirm = ref('')
const role = ref<Role>('admin')
const error = ref('')
const loading = ref(false)

function switchMode(next: Mode) {
  mode.value = next
  error.value = ''
  password.value = ''
  confirm.value = ''
}

async function handleSubmit() {
  error.value = ''

  if (username.value.trim().length < 3) {
    error.value = '用户名至少 3 个字符'
    return
  }
  if (password.value.length < 6) {
    error.value = '密码至少 6 位'
    return
  }
  if (mode.value === 'register' && password.value !== confirm.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(username.value.trim(), password.value)
    } else {
      await auth.register(username.value.trim(), password.value, role.value)
    }
    router.replace(auth.user?.role === 'admin' ? '/students' : '/grades')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '操作失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="mb-6 flex flex-col items-center text-center">
        <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-navy shadow-card">
          <GraduationCap class="text-amber" :size="30" />
        </div>
        <h1 class="font-display text-3xl font-semibold text-navy">成绩管理系统</h1>
        <p class="mt-1 text-sm text-navy/60">高效管理学生信息与成绩数据</p>
      </div>

      <div class="rounded-lg border border-navy/10 bg-white/80 p-6 shadow-card backdrop-blur">
        <div class="mb-5 grid grid-cols-2 gap-1 rounded bg-cream p-1">
          <button
            :class="cn('rounded py-2 text-sm font-medium transition', mode === 'login' ? 'bg-navy text-cream shadow' : 'text-navy/70')"
            @click="switchMode('login')"
          >
            登录
          </button>
          <button
            :class="cn('rounded py-2 text-sm font-medium transition', mode === 'register' ? 'bg-navy text-cream shadow' : 'text-navy/70')"
            @click="switchMode('register')"
          >
            注册
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="label">用户名</label>
            <input
              v-model="username"
              class="field"
              placeholder="请输入用户名"
              autocomplete="username"
            />
          </div>
          <div>
            <label class="label">密码</label>
            <input
              v-model="password"
              class="field"
              type="password"
              placeholder="至少 6 位"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            />
          </div>

          <template v-if="mode === 'register'">
            <div>
              <label class="label">确认密码</label>
              <input
                v-model="confirm"
                class="field"
                type="password"
                placeholder="请再次输入密码"
                autocomplete="new-password"
              />
            </div>
            <div>
              <label class="label">角色</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  :class="cn('flex items-center gap-2 rounded border px-3 py-2 text-sm transition', role === 'admin' ? 'border-amber bg-amber/15 text-navy' : 'border-navy/20 text-navy/70 hover:bg-navy/5')"
                  @click="role = 'admin'"
                >
                  <ShieldCheck :size="16" /> 管理员
                </button>
                <button
                  type="button"
                  :class="cn('flex items-center gap-2 rounded border px-3 py-2 text-sm transition', role === 'student' ? 'border-amber bg-amber/15 text-navy' : 'border-navy/20 text-navy/70 hover:bg-navy/5')"
                  @click="role = 'student'"
                >
                  <User :size="16" /> 学生
                </button>
              </div>
            </div>
          </template>

          <p v-if="error" class="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

          <button type="submit" class="btn-primary w-full" :disabled="loading">
            {{ loading ? '处理中...' : mode === 'login' ? '登录' : '注册并登录' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
