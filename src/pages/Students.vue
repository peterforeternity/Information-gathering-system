<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { Plus } from 'lucide-vue-next'
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import Navbar from '@/components/Navbar.vue'
import StudentFormModal, { type StudentInput } from '@/components/StudentFormModal.vue'
import { apiRequest } from '@/utils/api'
import type { Student } from '@/types'

const students = ref<Student[]>([])
const loading = ref(true)
const error = ref('')
const modalOpen = ref(false)
const editing = ref<Student | null>(null)
const keyword = ref('')

const columns = [
  { title: '学号', dataIndex: 'studentNo', key: 'studentNo', sorter: (a: Student, b: Student) => a.studentNo.localeCompare(b.studentNo, 'zh-CN') },
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '性别', dataIndex: 'gender', key: 'gender', filters: [{ text: '男', value: '男' }, { text: '女', value: '女' }], onFilter: (v: string | number | boolean, r: Student) => r.gender === v },
  { title: '班级', dataIndex: 'className', key: 'className' },
  { title: '操作', key: 'action', align: 'right' as const, width: 180 },
]

const filteredStudents = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return students.value
  return students.value.filter(
    (s) =>
      s.studentNo.toLowerCase().includes(k) ||
      s.name.toLowerCase().includes(k) ||
      s.className.toLowerCase().includes(k),
  )
})

async function load() {
  loading.value = true
  try {
    const res = await apiRequest<{ data: Student[] }>('/students')
    students.value = res.data
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function handleSubmit(data: StudentInput) {
  if (editing.value) {
    await apiRequest(`/students/${editing.value.id}`, { method: 'PUT', body: data })
    message.success('学生信息已更新')
  } else {
    await apiRequest('/students', { method: 'POST', body: data })
    message.success('学生已新增')
  }
  await load()
}

function handleDelete(student: Student) {
  Modal.confirm({
    title: `确定删除学生「${student.name}」吗？`,
    icon: h(ExclamationCircleOutlined),
    content: '该学生的成绩也将一并删除，此操作不可撤销。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await apiRequest(`/students/${student.id}`, { method: 'DELETE' })
        message.success('删除成功')
        await load()
      } catch (err) {
        message.error(err instanceof Error ? err.message : '删除失败')
      }
    },
  })
}

function openCreate() {
  editing.value = null
  modalOpen.value = true
}

function openEdit(student: Student) {
  editing.value = student
  modalOpen.value = true
}
</script>

<template>
  <div class="min-h-screen">
    <Navbar />
    <main class="mx-auto max-w-6xl px-6 py-8">
      <div class="mb-6 flex items-end justify-between">
        <div>
          <h2 class="font-display text-2xl font-semibold text-navy">学生管理</h2>
          <p class="mt-1 text-sm text-navy/60">共 {{ students.length }} 名学生</p>
        </div>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="16" class="inline" /></template>
          新增学生
        </a-button>
      </div>

      <a-alert v-if="error" :message="error" type="error" show-icon class="mb-4" />

      <div class="mb-4">
        <a-input-search
          v-model:value="keyword"
          placeholder="搜索学号、姓名或班级"
          allow-clear
          style="max-width: 320px"
        />
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredStudents"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openEdit(record as Student)">
                <template #icon><EditOutlined /></template>
                编辑
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record as Student)">
                <template #icon><DeleteOutlined /></template>
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </main>

    <StudentFormModal
      :open="modalOpen"
      :editing="editing"
      :on-submit="handleSubmit"
      @close="modalOpen = false"
    />
  </div>
</template>
