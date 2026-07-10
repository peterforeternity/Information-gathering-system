<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Trophy, Users, Target, TrendingUp, BookOpen, Award } from 'lucide-vue-next'
import type { EChartsCoreOption } from 'echarts/core'
import Navbar from '@/components/Navbar.vue'
import { useECharts } from '@/composables/useECharts'
import { apiRequest } from '@/utils/api'
import { getCache, setCache } from '@/utils/cache'

/** ── 数据模型 ── */
interface Profile {
  studentNo: string
  name: string
  className: string
  average: number | null
  subjectCount: number
}
interface Ranking {
  classRank: number
  classTotal: number
  gradeRank: number
  gradeTotal: number
  percentile: number
}
interface RadarDim {
  name: string
  value: number
  classAvg?: number
  gradeAvg?: number
  type: 'subject' | 'ability'
}
interface Suggestion {
  subject: string
  score: number
  classAvg: number
  gradeAvg: number
  gapToGrade: number
  level: string
  suggestions: string[]
}
interface DashboardData {
  bound: boolean
  message?: string
  profile?: Profile
  ranking?: Ranking
  radar?: RadarDim[]
  suggestions?: Suggestion[]
}

const CACHE_KEY = 'student_dashboard'
const data = ref<DashboardData | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''

  // 先读缓存（60s TTL），命中则秒开
  const cached = getCache<DashboardData>(CACHE_KEY)
  if (cached) {
    data.value = cached
    loading.value = false
    return
  }

  try {
    const res = await apiRequest<{ data: DashboardData }>('/student/dashboard')
    data.value = res.data
    setCache(CACHE_KEY, res.data, 60_000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const bound = computed(() => data.value?.bound === true)

/** 等级 → 颜色 */
function levelColor(level: string): string {
  return (
    {
      优秀: '#4caf50',
      良好: '#8bc34a',
      中等: '#e0a458',
      及格: '#ff9800',
      待提高: '#ef5350',
    }[level] ?? '#8b8b8b'
  )
}

/** ── 雷达图 ── */
const radarChart = ref<HTMLElement | null>(null)
const radarOptions = computed<EChartsCoreOption>(() => {
  const dims = data.value?.radar ?? []
  const indicator = dims.map((d) => ({ name: d.name, max: 100 }))
  const myValues = dims.map((d) => d.value)
  // 参考基准：科目维度用年段均分，能力维度留空（用 0 占位不参与视觉误导 → 用本人值）
  const gradeValues = dims.map((d) => (d.type === 'subject' ? (d.gradeAvg ?? 0) : d.value))

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1b2a4a',
      borderColor: 'transparent',
      textStyle: { color: '#f5f1e8', fontSize: 13 },
      formatter: (p: any) => {
        const lines = dims.map((d, i) => {
          const base = d.type === 'subject' ? `（年段均分 ${d.gradeAvg}）` : '（综合能力）'
          return `${d.name}：<b>${p.value[i]}</b> ${base}`
        })
        return `${p.name}<br/>${lines.join('<br/>')}`
      },
    },
    legend: {
      bottom: 0,
      data: ['我的能力', '年段基准'],
      textStyle: { color: '#1b2a4a', fontSize: 12 },
    },
    radar: {
      indicator,
      center: ['50%', '48%'],
      radius: '65%',
      axisName: { color: '#1b2a4a', fontSize: 12 },
      splitLine: { lineStyle: { color: '#1b2a4a20' } },
      splitArea: { areaStyle: { color: ['#f5f1e820', '#e0a45810'] } },
      axisLine: { lineStyle: { color: '#1b2a4a20' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: myValues,
            name: '我的能力',
            areaStyle: { color: 'rgba(224,164,88,0.35)' },
            lineStyle: { color: '#e0a458', width: 2 },
            itemStyle: { color: '#e0a458' },
          },
          {
            value: gradeValues,
            name: '年段基准',
            areaStyle: { color: 'rgba(27,42,74,0.12)' },
            lineStyle: { color: '#1b2a4a', width: 1.5, type: 'dashed' },
            itemStyle: { color: '#1b2a4a' },
          },
        ],
      },
    ],
  }
})

const { setOption: updateRadar } = useECharts(radarChart, radarOptions)

watch(data, (val) => {
  if (!val?.bound) return
  requestAnimationFrame(() => updateRadar(radarOptions.value, true))
})
</script>

<template>
  <div class="min-h-screen">
    <Navbar />
    <main class="mx-auto max-w-6xl px-6 py-8">
      <div class="mb-6">
        <h2 class="font-display text-2xl font-semibold text-navy">我的学业看板</h2>
        <p class="mt-1 text-sm text-navy/60">个人排名、能力评估与提升建议</p>
      </div>

      <!-- 加载 / 错误 / 未绑定 -->
      <div v-if="loading" class="flex h-48 items-center justify-center text-navy/50">
        <TrendingUp class="mr-2 animate-pulse" :size="20" /> 正在加载个人数据...
      </div>
      <a-alert v-else-if="error" :message="error" type="error" show-icon />
      <a-alert
        v-else-if="!bound"
        type="warning"
        show-icon
        :message="'未绑定学生档案'"
        :description="data?.message"
      />

      <template v-else>
        <!-- ── 排名卡片 ── -->
        <a-row :gutter="16" class="mb-6">
          <a-col :xs="24" :sm="12" :lg="6">
            <a-card class="!rounded-lg">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber/15">
                  <Trophy :size="24" class="text-amber" />
                </div>
                <div>
                  <p class="text-xs text-navy/60">班级排名</p>
                  <p class="text-2xl font-bold text-navy">
                    {{ data!.ranking!.classRank }}<span class="text-sm font-normal text-navy/50"> / {{ data!.ranking!.classTotal }}</span>
                  </p>
                </div>
              </div>
            </a-card>
          </a-col>
          <a-col :xs="24" :sm="12" :lg="6">
            <a-card class="!rounded-lg">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-navy/10">
                  <Users :size="24" class="text-navy" />
                </div>
                <div>
                  <p class="text-xs text-navy/60">年段排名</p>
                  <p class="text-2xl font-bold text-navy">
                    {{ data!.ranking!.gradeRank }}<span class="text-sm font-normal text-navy/50"> / {{ data!.ranking!.gradeTotal }}</span>
                  </p>
                </div>
              </div>
            </a-card>
          </a-col>
          <a-col :xs="24" :sm="12" :lg="6">
            <a-card class="!rounded-lg">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Target :size="24" class="text-green-600" />
                </div>
                <div>
                  <p class="text-xs text-navy/60">年段百分位</p>
                  <p class="text-2xl font-bold text-navy">前 {{ (100 - data!.ranking!.percentile).toFixed(1) }}%</p>
                </div>
              </div>
            </a-card>
          </a-col>
          <a-col :xs="24" :sm="12" :lg="6">
            <a-card class="!rounded-lg">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber/15">
                  <Award :size="24" class="text-amber" />
                </div>
                <div>
                  <p class="text-xs text-navy/60">平均分</p>
                  <p class="text-2xl font-bold text-navy">{{ data!.profile!.average ?? '—' }}</p>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>

        <div class="grid gap-6 lg:grid-cols-5">
          <!-- ── 雷达图 ── -->
          <a-card class="lg:col-span-2 !rounded-lg">
            <template #title>
              <span class="flex items-center gap-2 font-display font-semibold text-navy">
                <Target :size="18" class="text-amber" /> 能力评估
              </span>
            </template>
            <div ref="radarChart" class="h-[360px] w-full" />
          </a-card>

          <!-- ── 提升建议 ── -->
          <a-card class="lg:col-span-3 !rounded-lg">
            <template #title>
              <span class="flex items-center gap-2 font-display font-semibold text-navy">
                <BookOpen :size="18" class="text-amber" /> 学习提升建议
              </span>
            </template>

            <a-empty v-if="!data!.suggestions?.length" description="暂无成绩数据，无法生成建议" />
            <div v-else class="space-y-4">
              <div
                v-for="s in data!.suggestions"
                :key="s.subject"
                class="rounded-lg border border-navy/10 p-4"
              >
                <div class="mb-2 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-navy">{{ s.subject }}</span>
                    <a-tag :color="levelColor(s.level)">{{ s.level }}</a-tag>
                  </div>
                  <span class="text-sm text-navy/60">我的分数 <b class="text-navy">{{ s.score }}</b></span>
                </div>

                <!-- 基准对比 -->
                <div class="mb-3 grid grid-cols-3 gap-2 text-xs">
                  <div class="rounded bg-cream/60 px-2 py-1.5 text-center">
                    <p class="text-navy/50">我的</p>
                    <p class="font-semibold text-navy">{{ s.score }}</p>
                  </div>
                  <div class="rounded bg-cream/60 px-2 py-1.5 text-center">
                    <p class="text-navy/50">班级均分</p>
                    <p class="font-semibold text-navy">{{ s.classAvg }}</p>
                  </div>
                  <div class="rounded bg-cream/60 px-2 py-1.5 text-center">
                    <p class="text-navy/50">年段均分</p>
                    <p class="font-semibold text-navy">{{ s.gradeAvg }}</p>
                  </div>
                </div>

                <!-- 差距进度条 -->
                <a-progress
                  :percent="Math.min(100, (s.score / 100) * 100)"
                  :stroke-color="levelColor(s.level)"
                  :show-info="false"
                  size="small"
                  class="mb-2"
                />
                <p class="mb-2 text-xs" :class="s.gapToGrade < 0 ? 'text-red-500' : 'text-green-600'">
                  {{ s.gapToGrade < 0 ? `低于年段平均 ${Math.abs(s.gapToGrade)} 分，建议重点提升` : `高于年段平均 ${s.gapToGrade} 分，继续保持` }}
                </p>

                <!-- 建议列表 -->
                <ul class="ml-4 list-disc space-y-1 text-sm text-navy/70">
                  <li v-for="(tip, i) in s.suggestions" :key="i">{{ tip }}</li>
                </ul>
              </div>
            </div>
          </a-card>
        </div>
      </template>
    </main>
  </div>
</template>
