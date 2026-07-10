<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
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
    }
  },
)

async function handleOk() {
  if (!form.value.studentNo.trim() || !form.value.name.trim() || !form.value.className.trim()) {
    message.warning('请填写所有字段')
    return
  }
  loading.value = true
  try {
    await props.onSubmit({
      studentNo: form.value.studentNo.trim(),
      name: form.value.name.trim(),
      gender: form.value.gender,
      className: form.value.className.trim(),
    })
    emit('close')
  } catch (err) {
    message.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <a-modal
    :open="open"
    :title="editing ? '编辑学生' : '新增学生'"
    :confirm-loading="loading"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="$emit('close')"
  >
    <a-form layout="vertical" class="pt-2">
      <a-form-item label="学号" required>
        <a-input v-model:value="form.studentNo" placeholder="如 2024001" />
      </a-form-item>
      <a-form-item label="姓名" required>
        <a-input v-model:value="form.name" placeholder="请输入姓名" />
      </a-form-item>
      <div class="grid grid-cols-2 gap-4">
        <a-form-item label="性别">
          <a-select v-model:value="form.gender">
            <a-select-option value="男">男</a-select-option>
            <a-select-option value="女">女</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="班级" required>
          <a-input v-model:value="form.className" placeholder="如 三年级二班" />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>
