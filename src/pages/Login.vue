<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { GraduationCap, ShieldCheck, User } from 'lucide-vue-next'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'
import type { Role } from '@/types'

type Mode = 'login' | 'register'

const auth = useAuthStore()
const router = useRouter()

const mode = ref<Mode>('login')
const error = ref('')
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  confirm: '',
  role: 'admin' as Role,
})

function switchMode(key: string | number) {
  mode.value = key as Mode
  error.value = ''
  form.password = ''
  form.confirm = ''
}

async function handleSubmit() {
  error.value = ''

  if (form.username.trim().length < 3) {
    error.value = '用户名至少 3 个字符'
    return
  }
  if (form.password.length < 6) {
    error.value = '密码至少 6 位'
    return
  }
  if (mode.value === 'register' && form.password !== form.confirm) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(form.username.trim(), form.password)
    } else {
      await auth.register(form.username.trim(), form.password, form.role)
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
        <a-tabs :active-key="mode" centered @change="switchMode">
          <a-tab-pane key="login" tab="登录" />
          <a-tab-pane key="register" tab="注册" />
        </a-tabs>

        <a-form layout="vertical" @submit.prevent="handleSubmit">
          <a-form-item label="用户名">
            <a-input
              v-model:value="form.username"
              placeholder="请输入用户名"
              autocomplete="username"
              size="large"
            >
              <template #prefix><UserOutlined class="text-navy/40" /></template>
            </a-input>
          </a-form-item>

          <a-form-item label="密码">
            <a-input-password
              v-model:value="form.password"
              placeholder="至少 6 位"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              size="large"
            >
              <template #prefix><LockOutlined class="text-navy/40" /></template>
            </a-input-password>
          </a-form-item>

          <template v-if="mode === 'register'">
            <a-form-item label="确认密码">
              <a-input-password
                v-model:value="form.confirm"
                placeholder="请再次输入密码"
                autocomplete="new-password"
                size="large"
              >
                <template #prefix><LockOutlined class="text-navy/40" /></template>
              </a-input-password>
            </a-form-item>

            <a-form-item label="角色">
              <a-radio-group v-model:value="form.role" button-style="solid" class="w-full">
                <a-radio-button value="admin" class="w-1/2 text-center">
                  <ShieldCheck :size="14" class="inline" /> 管理员
                </a-radio-button>
                <a-radio-button value="student" class="w-1/2 text-center">
                  <User :size="14" class="inline" /> 学生
                </a-radio-button>
              </a-radio-group>
            </a-form-item>
          </template>

          <a-alert v-if="error" :message="error" type="error" show-icon class="mb-4" />

          <a-button
            type="primary"
            html-type="submit"
            block
            size="large"
            :loading="loading"
          >
            {{ mode === 'login' ? '登录' : '注册并登录' }}
          </a-button>
        </a-form>
      </div>
    </div>
  </div>
</template>
