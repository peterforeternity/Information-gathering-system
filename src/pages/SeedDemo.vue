<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sparkles, Upload, Eye, Table, CheckCircle, AlertCircle, Users, Hash } from 'lucide-vue-next'
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
const genError = ref('')

const pushing = ref(false)
const pushResult = ref<PushResult | null>(null)
const pushError = ref('')

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

/** ── 生成预览 ── */
async function handleGenerate() {
  genError.value = ''
  pushResult.value = null
  pushError.value = ''
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
  } catch (err) {
    genError.value = err instanceof Error ? err.message : '生成失败'
    generated.value = null
  } finally {
    generating.value = false
  }
}

/** ── 推送到数据库 ── */
async function handlePush() {
  if (!generated.value) return
  pushError.value = ''
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
  } catch (err) {
    pushError.value = err instanceof Error ? err.message : '推送失败'
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
          <div class="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
            <h3 class="mb-4 flex items-center gap-2 font-display text-base font-semibold text-navy">
              <Sparkles :size="18" class="text-amber" /> 生成参数
            </h3>

            <div class="space-y-4">
              <div>
                <label class="label">学生数量</label>
                <div class="flex items-center gap-2">
                  <input v-model.number="studentCount" class="field" type="number" min="1" max="50" />
                  <span class="text-xs text-navy/50">1–50</span>
                </div>
              </div>

              <div>
                <label class="label">年级前缀</label>
                <input v-model="classPrefix" class="field" placeholder="如：三年级、2024级" />
              </div>

              <div>
                <label class="label">班级（逗号分隔）</label>
                <input v-model="classInput" class="field" placeholder="一班,二班,三班" />
              </div>

              <div>
                <label class="label">科目（逗号分隔）</label>
                <input v-model="subjectInput" class="field" placeholder="语文,数学,英语,科学" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">最低分</label>
                  <input v-model.number="scoreMin" class="field" type="number" min="0" max="99" />
                </div>
                <div>
                  <label class="label">最高分</label>
                  <input v-model.number="scoreMax" class="field" type="number" min="1" max="100" />
                </div>
              </div>

              <p v-if="genError" class="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{{ genError }}</p>

              <button class="btn-primary w-full" :disabled="generating" @click="handleGenerate">
                <Eye :size="16" /> {{ generating ? '生成中...' : '生成预览' }}
              </button>

              <button
                v-if="generated"
                class="btn-accent w-full"
                :disabled="pushing"
                @click="handleGenerateAndPush"
              >
                <Upload :size="16" /> {{ pushing ? '推送中...' : '一键生成并推送' }}
              </button>
            </div>
          </div>

          <!-- 推送结果反馈 -->
          <div v-if="pushResult" class="mt-4 rounded-lg border p-4 shadow-card"
               :class="pushResult.errors.length > 0 ? 'border-amber/50 bg-amber/5' : 'border-green-300 bg-green-50'">
            <div class="mb-2 flex items-center gap-2">
              <CheckCircle v-if="pushResult.errors.length === 0" :size="18" class="text-green-600" />
              <AlertCircle v-else :size="18" class="text-amber" />
              <span class="text-sm font-semibold text-navy">推送结果</span>
            </div>
            <ul class="space-y-1 text-sm text-navy/80">
              <li class="flex items-center gap-2">
                <Users :size="14" /> 学生：新增 {{ pushResult.students.inserted }}，跳过 {{ pushResult.students.skipped }}
              </li>
              <li class="flex items-center gap-2">
                <Hash :size="14" /> 成绩：新增 {{ pushResult.grades.inserted }}，跳过 {{ pushResult.grades.skipped }}
              </li>
              <li v-for="(e, i) in pushResult.errors" :key="i" class="text-red-600 text-xs">⚠ {{ e }}</li>
            </ul>
          </div>
          <p v-if="pushError" class="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{{ pushError }}</p>
        </div>

        <!-- 右：预览区域 -->
        <div class="lg:col-span-3">
          <div
            v-if="!generated && !generating"
            class="flex h-64 items-center justify-center rounded-lg border border-dashed border-navy/20 bg-white/50 text-navy/40"
          >
            <div class="text-center">
              <Table class="mx-auto mb-2" :size="28" />
              <p class="text-sm">配置参数后点击「生成预览」查看数据</p>
            </div>
          </div>

          <div v-if="generating" class="flex h-64 items-center justify-center text-navy/50">
            <Sparkles class="mr-2 animate-pulse" :size="20" /> 正在生成测试数据...
          </div>

          <template v-if="generated">
            <!-- 概览 -->
            <div class="mb-4 grid grid-cols-4 gap-3">
              <div class="rounded-lg border border-navy/10 bg-white px-3 py-2 shadow-card">
                <p class="text-xs text-navy/60">学生</p>
                <p class="text-lg font-bold text-navy">{{ generated.summary.studentCount }}</p>
              </div>
              <div class="rounded-lg border border-navy/10 bg-white px-3 py-2 shadow-card">
                <p class="text-xs text-navy/60">成绩数</p>
                <p class="text-lg font-bold text-navy">{{ generated.summary.gradeCount }}</p>
              </div>
              <div class="rounded-lg border border-navy/10 bg-white px-3 py-2 shadow-card">
                <p class="text-xs text-navy/60">班级</p>
                <p class="text-lg font-bold text-navy">{{ generated.summary.classes.length }}</p>
              </div>
              <div class="rounded-lg border border-navy/10 bg-white px-3 py-2 shadow-card">
                <p class="text-xs text-navy/60">科目</p>
                <p class="text-lg font-bold text-navy">{{ generated.summary.subjects.length }}</p>
              </div>
            </div>

            <!-- 预览表格 -->
            <div class="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-navy text-left text-cream">
                      <th class="px-3 py-2 font-medium">学号</th>
                      <th class="px-3 py-2 font-medium">姓名</th>
                      <th class="px-3 py-2 font-medium">性别</th>
                      <th class="px-3 py-2 font-medium">班级</th>
                      <th v-for="s in generated.summary.subjects" :key="s" class="px-3 py-2 font-medium">{{ s }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(stu, i) in generated.students"
                      :key="stu.studentNo"
                      :class="i % 2 === 0 ? 'bg-white' : 'bg-cream/60'"
                    >
                      <td class="px-3 py-2 font-medium text-navy">{{ stu.studentNo }}</td>
                      <td class="px-3 py-2">{{ stu.name }}</td>
                      <td class="px-3 py-2">{{ stu.gender }}</td>
                      <td class="px-3 py-2">{{ stu.className }}</td>
                      <td v-for="s in generated.summary.subjects" :key="s" class="px-3 py-2 font-mono">
                        {{ studentGrades[stu.studentNo]?.find((g) => g.subject === s)?.score ?? '—' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 底部推送按钮 -->
            <div class="mt-4 flex justify-end">
              <button class="btn-primary" :disabled="pushing" @click="handlePush">
                <Upload :size="16" /> {{ pushing ? '推送中...' : '推送到数据库' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>
