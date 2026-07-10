<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
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

const studentId = ref<string>('')
const subject = ref('')
const score = ref<number | null>(null)
const loading = ref(false)

// 学生下拉选项
const studentOptions = computed(() =>
  props.students.map((s) => ({
    value: s.id,
    label: `${s.studentNo} - ${s.name}（${s.className}）`,
  })),
)

// 科目自动补全选项
const subjectOptions = computed(() => props.subjects.map((s) => ({ value: s })))

watch(
  () => props.open,
  (open) => {
    if (open) {
      studentId.value = props.students[0]?.id ?? ''
      subject.value = ''
      score.value = null
    }
  },
)

async function handleOk() {
  const trimmedSubject = subject.value.trim()
  if (!studentId.value) {
    message.warning('请选择学生')
    return
  }
  if (!trimmedSubject) {
    message.warning('请填写科目名称')
    return
  }
  if (score.value === null || !Number.isFinite(score.value) || score.value < 0 || score.value > 100) {
    message.warning('分数必须在 0-100 之间')
    return
  }
  loading.value = true
  try {
    await props.onSubmit({ studentId: studentId.value, subject: trimmedSubject, score: score.value })
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
    title="录入成绩"
    :confirm-loading="loading"
    :ok-button-props="{ disabled: students.length === 0 }"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="$emit('close')"
  >
    <a-form layout="vertical" class="pt-2">
      <a-form-item label="学生" required>
        <a-select
          v-model:value="studentId"
          :options="studentOptions"
          placeholder="请选择学生"
          show-search
          option-filter-prop="label"
          :not-found-content="students.length === 0 ? '暂无学生' : undefined"
        />
      </a-form-item>
      <a-form-item label="科目" required>
        <a-auto-complete
          v-model:value="subject"
          :options="subjectOptions"
          placeholder="如 语文 / 数学 / 英语"
          :filter-option="(input: string, option: any) => option.value.toLowerCase().includes(input.toLowerCase())"
        />
        <p class="mt-1 text-xs text-navy/50">
          可从已有科目中选择，或输入新科目。相同学生同一科目会覆盖更新。
        </p>
      </a-form-item>
      <a-form-item label="分数（0-100）" required>
        <a-input-number
          v-model:value="score"
          :min="0"
          :max="100"
          :step="0.5"
          placeholder="请输入分数"
          class="w-full"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
