<script setup lang="ts">
import { GraduationCap, Users, ClipboardList, BarChart3, Sparkles, LogOut, LayoutDashboard } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.replace('/login')
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-white/10 bg-navy">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
      <div class="flex items-center gap-3">
        <GraduationCap class="text-amber" :size="26" />
        <span class="font-display text-xl font-semibold text-cream">成绩管理系统</span>
      </div>

      <nav class="flex items-center gap-1">
        <router-link
          v-if="auth.user?.role === 'student'"
          to="/dashboard"
          class="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-cream/80 transition hover:bg-white/10 hover:text-cream"
          active-class="!bg-amber !text-navy-dark"
        >
          <LayoutDashboard :size="16" /> 我的看板
        </router-link>
        <router-link
          v-if="auth.user?.role === 'admin'"
          to="/students"
          class="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-cream/80 transition hover:bg-white/10 hover:text-cream"
          active-class="!bg-amber !text-navy-dark"
        >
          <Users :size="16" /> 学生管理
        </router-link>
        <router-link
          to="/grades"
          class="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-cream/80 transition hover:bg-white/10 hover:text-cream"
          active-class="!bg-amber !text-navy-dark"
        >
          <ClipboardList :size="16" /> 成绩管理
        </router-link>
        <router-link
          to="/analytics"
          class="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-cream/80 transition hover:bg-white/10 hover:text-cream"
          active-class="!bg-amber !text-navy-dark"
        >
          <BarChart3 :size="16" /> 数据可视化
        </router-link>
        <router-link
          v-if="auth.user?.role === 'admin'"
          to="/seed"
          class="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-cream/80 transition hover:bg-white/10 hover:text-cream"
          active-class="!bg-amber !text-navy-dark"
        >
          <Sparkles :size="16" /> 测试数据
        </router-link>
      </nav>

      <div class="flex items-center gap-3">
        <div class="text-right">
          <p class="text-sm font-medium text-cream">{{ auth.user?.username }}</p>
          <p class="text-xs text-amber-light">
            {{ auth.user?.role === 'admin' ? '管理员' : '学生' }}
          </p>
        </div>
        <a-button
          ghost
          size="small"
          class="!border-white/20 !text-cream/90"
          @click="handleLogout"
        >
          <template #icon><LogOut :size="15" class="inline" /></template>
          登出
        </a-button>
      </div>
    </div>
  </header>
</template>
