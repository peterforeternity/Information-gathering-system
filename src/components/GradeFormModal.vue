<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import type { Student } from '@/types'

export interface GradeInput {
  studentId: string
  subject: string
  score: number
}

const props = defineProps<{
  open: boolean
  students: Student[]
  subjects: string[]
  onSubmit: (data: GradeInput) => Promise<void>
}>()

const emit = defineEmits<{ close: [] }>()

const studentId = ref('')
const subject = ref('')
const score = ref('')
const error = ref('')
const loading = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      studentId.value = props.students[0]?.id ?? ''
      subject.value = ''
      score.value = ''
      error.value = ''
    }
  },
)

async function handleSubmit() {
  const trimmedSubject = subject.value.trim()
  const numScore = Number(score.value)
  if (!studentId.value) {
    error.value = '请选择学生'
    return
  }
  if (!trimmedSubject) {
    error.value = '请填写科目名称'
    return
  }
  if (!Number.isFinite(numScore) || numScore < 0 || numScore > 100) {
    error.value = '分数必须在 0-100 之间'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await props.onSubmit({ studentId: studentId.value, subject: trimmedSubject, score: numScore })
    emit('close')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal :open="open" title="录入成绩" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="label">学生</label>
        <select v-model="studentId" class="field">
          <option v-if="students.length === 0" value="">暂无学生</option>
          <option v-for="s in students" :key="s.id" :value="s.id">
            {{ s.studentNo }} - {{ s.name }}（{{ s.className }}）
          </option>
        </select>
      </div>
      <div>
        <label class="label">科目</label>
        <input
          v-model="subject"
          class="field"
          placeholder="如 语文 / 数学 / 英语"
          list="subject-options"
        />
        <datalist id="subject-options">
          <option v-for="s in subjects" :key="s" :value="s" />
        </datalist>
        <p class="mt-1 text-xs text-navy/50">
          可从已有科目中选择，或输入新科目。相同学生同一科目会覆盖更新。
        </p>
      </div>
      <div>
        <label class="label">分数（0-100）</label>
        <input
          v-model="score"
          class="field"
          type="number"
          min="0"
          max="100"
          step="0.5"
          placeholder="请输入分数"
        />
      </div>

      <p v-if="error" class="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-3 pt-2">
        <button type="button" class="btn-ghost" @click="$emit('close')">取消</button>
        <button type="submit" class="btn-primary" :disabled="loading || students.length === 0">
          {{ loading ? '保存中...' : '保存' }}
        </button>
      </div>
    </form>
  </Modal>
</template>
