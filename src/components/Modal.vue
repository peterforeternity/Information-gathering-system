<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{ open: boolean; title: string }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/40 p-4 backdrop-blur-sm"
  >
    <div class="w-full max-w-md rounded-lg border border-navy/10 bg-cream shadow-card">
      <div class="flex items-center justify-between border-b border-navy/10 px-5 py-4">
        <h3 class="font-display text-lg font-semibold text-navy">{{ title }}</h3>
        <button
          class="rounded p-1 text-navy/60 transition hover:bg-navy/10 hover:text-navy"
          aria-label="关闭"
          @click="$emit('close')"
        >
          <X :size="18" />
        </button>
      </div>
      <div class="px-5 py-4">
        <slot />
      </div>
    </div>
  </div>
</template>
