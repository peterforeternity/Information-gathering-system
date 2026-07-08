<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

onMounted(() => {
  auth.restore()
})
</script>

<template>
  <div v-if="auth.initializing" class="flex min-h-screen items-center justify-center text-navy/60">
    加载中...
  </div>
  <router-view v-else />
</template>
