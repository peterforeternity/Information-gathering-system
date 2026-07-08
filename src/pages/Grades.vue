<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, ArrowUp, ArrowDown, ChevronsUpDown, ClipboardList, Download } from 'lucide-vue-next'
import * as XLSX from 'xlsx'
import Navbar from '@/components/Navbar.vue'
import GradeFormModal, { type GradeInput } from '@/components/GradeFormModal.vue'
import { apiRequest } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'
import type { GradeRow, GradeTable, Student } from '@/types'

type SortDir = 'asc' | 'desc'
// 排序键：固定列名或某个科目名或 average
type SortKey = 'studentNo' | 'name' | 'className' | 'average' | string

const auth = useAuthStore()
const isAdmin = computed(() => auth.user?.role === 'admin')

const table = ref<GradeTable>({ subjects: [], rows: [] })
const students = ref<Student[]>([])
const loading = ref(true)
const error = ref('')
const modalOpen = ref(false)
const sortKey = ref<SortKey>('studentNo')
const sortDir = ref<SortDir>('asc')

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

function handleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function getValue(row: GradeRow, key: SortKey): string | number | null {
  if (key === 'studentNo') return row.studentNo
  if (key === 'name') return row.name
  if (key === 'className') return row.className
  if (key === 'average') return row.average
  return row.scores[key] ?? null // 科目分数
}

const sortedRows = computed(() => {
  const rows = [...table.value.rows]
  rows.sort((a, b) => {
    const av = getValue(a, sortKey.value)
    const bv = getValue(b, sortKey.value)
    // null 值始终排在末尾
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    let cmp: number
    if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv
    } else {
      cmp = String(av).localeCompare(String(bv), 'zh-CN')
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
  return rows
})

async function handleSubmit(data: GradeInput) {
  await apiRequest('/grades', { method: 'POST', body: data })
  await load()
}

/** 将当前表格（按当前排序）导出为 Excel 文件。 */
function handleExport() {
  const data = sortedRows.value.map((row) => {
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
        <div class="flex items-center gap-3">
          <button class="btn-primary" :disabled="table.rows.length === 0" @click="handleExport">
            <Download :size="16" /> 导出成绩
          </button>
          <button v-if="isAdmin" class="btn-accent" @click="modalOpen = true">
            <Plus :size="16" /> 录入成绩
          </button>
        </div>
      </div>

      <p v-if="error" class="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-600">{{ error }}</p>

      <div class="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-navy text-left text-cream">
                <th
                  v-for="col in [
                    { key: 'studentNo', label: '学号' },
                    { key: 'name', label: '姓名' },
                    { key: 'className', label: '班级' },
                  ]"
                  :key="col.key"
                  class="px-4 py-3 font-medium"
                >
                  <button class="inline-flex items-center gap-1 transition hover:text-amber" @click="handleSort(col.key)">
                    {{ col.label }}
                    <ChevronsUpDown v-if="sortKey !== col.key" :size="13" class="opacity-40" />
                    <ArrowUp v-else-if="sortDir === 'asc'" :size="13" />
                    <ArrowDown v-else :size="13" />
                  </button>
                </th>
                <th v-for="subject in table.subjects" :key="subject" class="px-4 py-3 font-medium">
                  <button class="inline-flex items-center gap-1 transition hover:text-amber" @click="handleSort(subject)">
                    {{ subject }}
                    <ChevronsUpDown v-if="sortKey !== subject" :size="13" class="opacity-40" />
                    <ArrowUp v-else-if="sortDir === 'asc'" :size="13" />
                    <ArrowDown v-else :size="13" />
                  </button>
                </th>
                <th class="bg-amber/20 px-4 py-3 font-medium">
                  <button class="inline-flex items-center gap-1 transition hover:text-amber" @click="handleSort('average')">
                    平均分
                    <ChevronsUpDown v-if="sortKey !== 'average'" :size="13" class="opacity-40" />
                    <ArrowUp v-else-if="sortDir === 'asc'" :size="13" />
                    <ArrowDown v-else :size="13" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="4 + table.subjects.length" class="px-4 py-10 text-center text-navy/50">
                  加载中...
                </td>
              </tr>
              <tr v-else-if="sortedRows.length === 0">
                <td :colspan="4 + table.subjects.length" class="px-4 py-12 text-center text-navy/50">
                  <ClipboardList class="mx-auto mb-2 opacity-40" :size="32" />
                  暂无成绩数据
                </td>
              </tr>
              <tr
                v-for="(row, i) in sortedRows"
                v-else
                :key="row.id"
                :class="i % 2 === 0 ? 'bg-white' : 'bg-cream/60'"
              >
                <td class="px-4 py-3 font-medium text-navy">{{ row.studentNo }}</td>
                <td class="px-4 py-3">{{ row.name }}</td>
                <td class="px-4 py-3">{{ row.className }}</td>
                <td v-for="subject in table.subjects" :key="subject" class="px-4 py-3">
                  <span v-if="row.scores[subject] === undefined" class="text-navy/30">—</span>
                  <span v-else :class="row.scores[subject] < 60 ? 'font-medium text-red-600' : ''">
                    {{ row.scores[subject] }}
                  </span>
                </td>
                <td class="bg-amber/10 px-4 py-3 font-semibold text-navy">
                  <template v-if="row.average !== null">{{ row.average }}</template>
                  <span v-else class="text-navy/30">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
