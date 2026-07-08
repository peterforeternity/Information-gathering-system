<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import type { Student } from '@/types'

export interface StudentInput {
  studentNo: string
  name: string
  gender: '男' | '女'
  className: string
}

const props = defineProps<{
  open: boolean
  editing: Student | null
  onSubmit: (data: StudentInput) => Promise<void>
}>()

const emit = defineEmits<{ close: [] }>()

const empty = (): StudentInput => ({ studentNo: '', name: '', gender: '男', className: '' })

const form = ref<StudentInput>(empty())
const error = ref('')
const loading = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.value = props.editing
        ? {
            studentNo: props.editing.studentNo,
            name: props.editing.name,
            gender: props.editing.gender,
            className: props.editing.className,
          }
        : empty()
      error.value = ''
    }
  },
)

async function handleSubmit() {
  if (!form.value.studentNo.trim() || !form.value.name.trim() || !form.value.className.trim()) {
    error.value = '请填写所有字段'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await props.onSubmit({
      studentNo: form.value.studentNo.trim(),
      name: form.value.name.trim(),
      gender: form.value.gender,
      className: form.value.className.trim(),
    })
    emit('close')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal :open="open" :title="editing ? '编辑学生' : '新增学生'" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="label">学号</label>
        <input v-model="form.studentNo" class="field" placeholder="如 2024001" />
      </div>
      <div>
        <label class="label">姓名</label>
        <input v-model="form.name" class="field" placeholder="请输入姓名" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">性别</label>
          <select v-model="form.gender" class="field">
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
        <div>
          <label class="label">班级</label>
          <input v-model="form.className" class="field" placeholder="如 三年级二班" />
        </div>
      </div>

      <p v-if="error" class="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-3 pt-2">
        <button type="button" class="btn-ghost" @click="$emit('close')">取消</button>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? '保存中...' : '保存' }}
        </button>
      </div>
    </form>
  </Modal>
</template>
