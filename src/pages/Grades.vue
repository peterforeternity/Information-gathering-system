<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Download } from 'lucide-vue-next'
import { message } from 'ant-design-vue'
import * as XLSX from 'xlsx'
import Navbar from '@/components/Navbar.vue'
import GradeFormModal, { type GradeInput } from '@/components/GradeFormModal.vue'
import { apiRequest } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'
import type { GradeRow, GradeTable, Student } from '@/types'

const auth = useAuthStore()
const isAdmin = computed(() => auth.user?.role === 'admin')

const table = ref<GradeTable>({ subjects: [], rows: [] })
const students = ref<Student[]>([])
const loading = ref(true)
const error = ref('')
const modalOpen = ref(false)
const keyword = ref('')

// 动态列：固定列 + 各科目列 + 平均分列，均启用 a-table 内置排序
const columns = computed(() => {
  const base: any[] = [
    {
      title: '学号',
      dataIndex: 'studentNo',
      key: 'studentNo',
      fixed: 'left',
      sorter: (a: GradeRow, b: GradeRow) => a.studentNo.localeCompare(b.studentNo, 'zh-CN'),
    },
    { title: '姓名', dataIndex: 'name', key: 'name', fixed: 'left' },
    {
      title: '班级',
      dataIndex: 'className',
      key: 'className',
      sorter: (a: GradeRow, b: GradeRow) => a.className.localeCompare(b.className, 'zh-CN'),
    },
  ]
  const subjectCols = table.value.subjects.map((subject) => ({
    title: subject,
    key: subject,
    align: 'center' as const,
    sorter: (a: GradeRow, b: GradeRow) => (a.scores[subject] ?? -1) - (b.scores[subject] ?? -1),
  }))
  const avgCol = {
    title: '平均分',
    dataIndex: 'average',
    key: 'average',
    align: 'center' as const,
    sorter: (a: GradeRow, b: GradeRow) => (a.average ?? -1) - (b.average ?? -1),
  }
  return [...base, ...subjectCols, avgCol]
})

const filteredRows = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return table.value.rows
  return table.value.rows.filter(
    (r) =>
      r.studentNo.toLowerCase().includes(k) ||
      r.name.toLowerCase().includes(k) ||
      r.className.toLowerCase().includes(k),
  )
})

async function load() {
  loading.value = true
  try {
    const gradeRes = await apiRequest<{ data: GradeTable }>('/grades')
    table.value = gradeRes.data
    if (isAdmin.value) {
      const stuRes = await apiRequest<{ data: Student[] }>('/students')
      students.value = stuRes.data
    }
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function handleSubmit(data: GradeInput) {
  await apiRequest('/grades', { method: 'POST', body: data })
  message.success('成绩已保存')
  await load()
}

/** 将当前表格导出为 Excel 文件。 */
function handleExport() {
  const data = filteredRows.value.map((row) => {
    const record: Record<string, string | number> = {
      学号: row.studentNo,
      姓名: row.name,
      性别: row.gender,
      班级: row.className,
    }
    table.value.subjects.forEach((subject) => {
      record[subject] = row.scores[subject] ?? ''
    })
    record['平均分'] = row.average ?? ''
    return record
  })

  const header = ['学号', '姓名', '性别', '班级', ...table.value.subjects, '平均分']
  const worksheet = XLSX.utils.json_to_sheet(data, { header })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '成绩表')
  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `成绩表_${today}.xlsx`)
  message.success('成绩表已导出')
}
</script>

<template>
  <div class="min-h-screen">
    <Navbar />
    <main class="mx-auto max-w-6xl px-6 py-8">
      <div class="mb-6 flex items-end justify-between">
        <div>
          <h2 class="font-display text-2xl font-semibold text-navy">成绩管理</h2>
          <p class="mt-1 text-sm text-navy/60">
            点击表头可对任意列排序 · 共 {{ table.rows.length }} 名学生 · {{ table.subjects.length }} 门科目
          </p>
        </div>
        <a-space>
          <a-button :disabled="table.rows.length === 0" @click="handleExport">
            <template #icon><Download :size="16" class="inline" /></template>
            导出成绩
          </a-button>
          <a-button v-if="isAdmin" type="primary" @click="modalOpen = true">
            <template #icon><Plus :size="16" class="inline" /></template>
            录入成绩
          </a-button>
        </a-space>
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
        :data-source="filteredRows"
        :loading="loading"
        row-key="id"
        :scroll="{ x: 'max-content' }"
        :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="table.subjects.includes(column.key as string)">
            <span v-if="(record as GradeRow).scores[column.key as string] === undefined" class="text-navy/30">—</span>
            <span
              v-else
              :class="(record as GradeRow).scores[column.key as string] < 60 ? 'font-medium text-red-600' : ''"
            >
              {{ (record as GradeRow).scores[column.key as string] }}
            </span>
          </template>
          <template v-else-if="column.key === 'average'">
            <span v-if="(record as GradeRow).average !== null" class="font-semibold text-navy">
              {{ (record as GradeRow).average }}
            </span>
            <span v-else class="text-navy/30">—</span>
          </template>
        </template>
      </a-table>
    </main>

    <GradeFormModal
      v-if="isAdmin"
      :open="modalOpen"
      :students="students"
      :subjects="table.subjects"
      :on-submit="handleSubmit"
      @close="modalOpen = false"
    />
  </div>
</template>
