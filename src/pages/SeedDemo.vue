<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sparkles, Upload, Eye, Table as TableIcon } from 'lucide-vue-next'
import { message } from 'ant-design-vue'
import Navbar from '@/components/Navbar.vue'
import { apiRequest } from '@/utils/api'

interface GenStudent { studentNo: string; name: string; gender: '男' | '女'; className: string }
interface GenGrade { studentNo: string; subject: string; score: number }
interface GenSummary { studentCount: number; gradeCount: number; classes: string[]; subjects: string[] }
interface GenResult { students: GenStudent[]; grades: GenGrade[]; summary: GenSummary }

interface PushResult {
  students: { inserted: number; skipped: number }
  grades: { inserted: number; skipped: number }
  errors: string[]
}

/** ── 配置参数 ── */
const studentCount = ref(8)
const classPrefix = ref('三年级')
const classInput = ref('一班,二班,三班')
const subjectInput = ref('语文,数学,英语,科学')
const scoreMin = ref(30)
const scoreMax = ref(100)

const generated = ref<GenResult | null>(null)
const generating = ref(false)

const pushing = ref(false)
const pushResult = ref<PushResult | null>(null)

/** 学生→成绩映射（按 studentNo 索引） */
const studentGrades = computed(() => {
  if (!generated.value) return {}
  const map: Record<string, GenGrade[]> = {}
  for (const g of generated.value.grades) {
    if (!map[g.studentNo]) map[g.studentNo] = []
    map[g.studentNo].push(g)
  }
  return map
})

/** 预览表格列 */
const previewColumns = computed(() => {
  if (!generated.value) return []
  const base = [
    { title: '学号', dataIndex: 'studentNo', key: 'studentNo' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '性别', dataIndex: 'gender', key: 'gender', width: 70 },
    { title: '班级', dataIndex: 'className', key: 'className' },
  ]
  const subjectCols = generated.value.summary.subjects.map((s) => ({
    title: s,
    key: s,
    align: 'center' as const,
  }))
  return [...base, ...subjectCols]
})

/** ── 生成预览 ── */
async function handleGenerate() {
  pushResult.value = null
  generating.value = true

  const classes = classInput.value.split(',').map((s) => s.trim()).filter(Boolean)
  const subjects = subjectInput.value.split(',').map((s) => s.trim()).filter(Boolean)

  try {
    const res = await apiRequest<{ data: GenResult }>('/seed/generate', {
      method: 'POST',
      body: {
        studentCount: studentCount.value,
        classPrefix: classPrefix.value,
        classes,
        subjects,
        scoreRange: { min: scoreMin.value, max: scoreMax.value },
      },
    })
    generated.value = res.data
    message.success(`已生成 ${res.data.summary.studentCount} 名学生的预览数据`)
  } catch (err) {
    message.error(err instanceof Error ? err.message : '生成失败')
    generated.value = null
  } finally {
    generating.value = false
  }
}

/** ── 推送到数据库 ── */
async function handlePush() {
  if (!generated.value) return
  pushing.value = true

  try {
    const res = await apiRequest<{ data: PushResult }>('/seed/push', {
      method: 'POST',
      body: {
        students: generated.value.students,
        grades: generated.value.grades,
      },
    })
    pushResult.value = res.data
    if (res.data.errors.length === 0) {
      message.success('测试数据已全部推送入库')
    } else {
      message.warning(`推送完成，但有 ${res.data.errors.length} 条错误`)
    }
  } catch (err) {
    message.error(err instanceof Error ? err.message : '推送失败')
    pushResult.value = null
  } finally {
    pushing.value = false
  }
}

/** 一键生成并推送 */
async function handleGenerateAndPush() {
  if (!generated.value) {
    await handleGenerate()
  }
  if (generated.value) {
    await handlePush()
  }
}
</script>

<template>
  <div class="min-h-screen">
    <Navbar />
    <main class="mx-auto max-w-6xl px-6 py-8">
      <div class="mb-6">
        <h2 class="font-display text-2xl font-semibold text-navy">测试数据生成</h2>
        <p class="mt-1 text-sm text-navy/60">快速生成演示用学生与成绩数据，预览确认后一键入库</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-5">
        <!-- 左：配置面板 -->
        <div class="lg:col-span-2">
          <a-card>
            <template #title>
              <span class="flex items-center gap-2">
                <Sparkles :size="18" class="text-amber" /> 生成参数
              </span>
            </template>

            <a-form layout="vertical">
              <a-form-item label="学生数量">
                <a-input-number v-model:value="studentCount" :min="1" :max="50" class="w-full" />
              </a-form-item>
              <a-form-item label="年级前缀">
                <a-input v-model:value="classPrefix" placeholder="如：三年级、2024级" />
              </a-form-item>
              <a-form-item label="班级（逗号分隔）">
                <a-input v-model:value="classInput" placeholder="一班,二班,三班" />
              </a-form-item>
              <a-form-item label="科目（逗号分隔）">
                <a-input v-model:value="subjectInput" placeholder="语文,数学,英语,科学" />
              </a-form-item>
              <div class="grid grid-cols-2 gap-3">
                <a-form-item label="最低分">
                  <a-input-number v-model:value="scoreMin" :min="0" :max="99" class="w-full" />
                </a-form-item>
                <a-form-item label="最高分">
                  <a-input-number v-model:value="scoreMax" :min="1" :max="100" class="w-full" />
                </a-form-item>
              </div>

              <a-space direction="vertical" class="w-full">
                <a-button type="primary" block :loading="generating" @click="handleGenerate">
                  <template #icon><Eye :size="16" class="inline" /></template>
                  生成预览
                </a-button>
                <a-button v-if="generated" block :loading="pushing" @click="handleGenerateAndPush">
                  <template #icon><Upload :size="16" class="inline" /></template>
                  一键生成并推送
                </a-button>
              </a-space>
            </a-form>
          </a-card>

          <!-- 推送结果反馈 -->
          <a-alert
            v-if="pushResult"
            class="mt-4"
            :type="pushResult.errors.length > 0 ? 'warning' : 'success'"
            show-icon
          >
            <template #message>推送结果</template>
            <template #description>
              <ul class="space-y-1 text-sm">
                <li>学生：新增 {{ pushResult.students.inserted }}，跳过 {{ pushResult.students.skipped }}</li>
                <li>成绩：新增 {{ pushResult.grades.inserted }}，跳过 {{ pushResult.grades.skipped }}</li>
                <li v-for="(e, i) in pushResult.errors" :key="i" class="text-red-600 text-xs">⚠ {{ e }}</li>
              </ul>
            </template>
          </a-alert>
        </div>

        <!-- 右：预览区域 -->
        <div class="lg:col-span-3">
          <a-empty
            v-if="!generated && !generating"
            class="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-navy/20 bg-white/50"
          >
            <template #image><TableIcon :size="40" class="mx-auto text-navy/30" /></template>
            <template #description>配置参数后点击「生成预览」查看数据</template>
          </a-empty>

          <template v-if="generated">
            <!-- 概览 -->
            <a-row :gutter="12" class="mb-4">
              <a-col :span="6">
                <a-card size="small"><a-statistic title="学生" :value="generated.summary.studentCount" /></a-card>
              </a-col>
              <a-col :span="6">
                <a-card size="small"><a-statistic title="成绩数" :value="generated.summary.gradeCount" /></a-card>
              </a-col>
              <a-col :span="6">
                <a-card size="small"><a-statistic title="班级" :value="generated.summary.classes.length" /></a-card>
              </a-col>
              <a-col :span="6">
                <a-card size="small"><a-statistic title="科目" :value="generated.summary.subjects.length" /></a-card>
              </a-col>
            </a-row>

            <!-- 预览表格 -->
            <a-table
              :columns="previewColumns"
              :data-source="generated.students"
              :loading="generating"
              row-key="studentNo"
              size="small"
              :scroll="{ x: 'max-content' }"
              :pagination="{ pageSize: 8, showTotal: (t: number) => `共 ${t} 条` }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="generated!.summary.subjects.includes(column.key as string)">
                  {{ studentGrades[(record as GenStudent).studentNo]?.find((g) => g.subject === column.key)?.score ?? '—' }}
                </template>
              </template>
            </a-table>

            <!-- 底部推送按钮 -->
            <div class="mt-4 flex justify-end">
              <a-button type="primary" :loading="pushing" @click="handlePush">
                <template #icon><Upload :size="16" class="inline" /></template>
                推送到数据库
              </a-button>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>
