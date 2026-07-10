<script setup lang="ts">
import { onMounted } from 'vue'
import { theme } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// 品牌主题 token：与 Tailwind 的 navy/amber 配色保持一致
const themeConfig = {
  token: {
    colorPrimary: '#1b2a4a',
    colorLink: '#1b2a4a',
    colorInfo: '#1b2a4a',
    borderRadius: 6,
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
  },
  algorithm: theme.defaultAlgorithm,
}

onMounted(() => {
  auth.restore()
})
</script>

<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <div v-if="auth.initializing" class="flex min-h-screen items-center justify-center text-navy/60">
      加载中...
    </div>
    <router-view v-else />
  </a-config-provider>
</template>
