<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Users } from 'lucide-vue-next'
import Navbar from '@/components/Navbar.vue'
import StudentFormModal, { type StudentInput } from '@/components/StudentFormModal.vue'
import { apiRequest } from '@/utils/api'
import type { Student } from '@/types'

const students = ref<Student[]>([])
const loading = ref(true)
const error = ref('')
const modalOpen = ref(false)
const editing = ref<Student | null>(null)

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
  } else {
    await apiRequest('/students', { method: 'POST', body: data })
  }
  await load()
}

async function handleDelete(student: Student) {
  if (!window.confirm(`确定删除学生「${student.name}」吗？其成绩也将一并删除。`)) return
  try {
    await apiRequest(`/students/${student.id}`, { method: 'DELETE' })
    await load()
  } catch (err) {
    window.alert(err instanceof Error ? err.message : '删除失败')
  }
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
        <button class="btn-accent" @click="openCreate">
          <Plus :size="16" /> 新增学生
        </button>
      </div>

      <p v-if="error" class="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-600">{{ error }}</p>

      <div class="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-navy text-left text-cream">
                <th class="px-4 py-3 font-medium">学号</th>
                <th class="px-4 py-3 font-medium">姓名</th>
                <th class="px-4 py-3 font-medium">性别</th>
                <th class="px-4 py-3 font-medium">班级</th>
                <th class="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="px-4 py-10 text-center text-navy/50">加载中...</td>
              </tr>
              <tr v-else-if="students.length === 0">
                <td colspan="5" class="px-4 py-12 text-center text-navy/50">
                  <Users class="mx-auto mb-2 opacity-40" :size="32" />
                  暂无学生，点击右上角「新增学生」开始录入
                </td>
              </tr>
              <tr
                v-for="(s, i) in students"
                v-else
                :key="s.id"
                :class="i % 2 === 0 ? 'bg-white' : 'bg-cream/60'"
              >
                <td class="px-4 py-3 font-medium text-navy">{{ s.studentNo }}</td>
                <td class="px-4 py-3">{{ s.name }}</td>
                <td class="px-4 py-3">{{ s.gender }}</td>
                <td class="px-4 py-3">{{ s.className }}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <button
                      class="inline-flex items-center gap-1 rounded px-2 py-1 text-navy transition hover:bg-navy/10"
                      @click="openEdit(s)"
                    >
                      <Pencil :size="14" /> 编辑
                    </button>
                    <button
                      class="inline-flex items-center gap-1 rounded px-2 py-1 text-red-600 transition hover:bg-red-50"
                      @click="handleDelete(s)"
                    >
                      <Trash2 :size="14" /> 删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <StudentFormModal
      :open="modalOpen"
      :editing="editing"
      :on-submit="handleSubmit"
      @close="modalOpen = false"
    />
  </div>
</template>
