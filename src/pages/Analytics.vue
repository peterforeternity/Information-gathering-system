<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { BarChart3, PieChart, TrendingUp } from 'lucide-vue-next'
import Navbar from '@/components/Navbar.vue'
import { useECharts } from '@/composables/useECharts'
import { apiRequest } from '@/utils/api'
import type { EChartsCoreOption } from 'echarts/core'

/** ── 数据模型 ── */
interface ScoreDist { name: string; value: number; min: number; max: number }
interface SubjectStat { subject: string; average: number; max: number; min: number; count: number }
interface ClassStat { className: string; average: number; studentCount: number; gradeCount: number }
interface AnalyticsData {
  scoreDistribution: ScoreDist[]
  subjectStats: SubjectStat[]
  classStats: ClassStat[]
}

const data = ref<AnalyticsData | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await apiRequest<{ data: AnalyticsData }>('/grades/analytics')
    data.value = res.data
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载统计数据失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** ── 概览指标 ── */
const overview = computed(() => {
  if (!data.value) return null
  const dist = data.value.scoreDistribution
  const total = dist.reduce((s, d) => s + d.value, 0)
  const fail = dist.find((d) => d.name === '不及格')?.value ?? 0
  const excellent = dist.find((d) => d.name === '优秀')?.value ?? 0
  return {
    totalGrades: total,
    subjectCount: data.value.subjectStats.length,
    classCount: data.value.classStats.length,
    failRate: total > 0 ? ((fail / total) * 100).toFixed(1) : '0.0',
    excellentRate: total > 0 ? ((excellent / total) * 100).toFixed(1) : '0.0',
  }
})

/** ── 图表一：成绩分布环形图 ── */
const distChart = ref<HTMLElement | null>(null)
const distOptions = computed<EChartsCoreOption>(() => {
  const dist = data.value?.scoreDistribution ?? []
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1b2a4a',
      borderColor: 'transparent',
      textStyle: { color: '#f5f1e8', fontSize: 13 },
      formatter: (p: any) =>
        `${p.name}（${p.data.min}–${p.data.max}分）<br/>人数：<b>${p.value}</b>（${p.percent}%）`,
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#1b2a4a', fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '78%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 3, borderColor: '#f5f1e8', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' },
          scaleSize: 8,
        },
        data: dist.map((d, i) => ({
          name: d.name,
          value: d.value,
          min: d.min,
          max: d.max,
          itemStyle: { color: ['#ef5350', '#ff9800', '#e0a458', '#8bc34a', '#4caf50'][i] },
        })),
      },
    ],
  }
})

const { setOption: updateDist } = useECharts(distChart, distOptions)

/** ── 图表二：科目平均分柱状图 ── */
const subjectChart = ref<HTMLElement | null>(null)
const subjectOptions = computed<EChartsCoreOption>(() => {
  const stats = data.value?.subjectStats ?? []
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1b2a4a',
      borderColor: 'transparent',
      textStyle: { color: '#f5f1e8', fontSize: 13 },
      formatter: (params: any[]) => {
        const p = params[0]
        return `<b>${p.name}</b><br/>均分：${p.value} 分<br/>最高：${p.data.max} 分<br/>最低：${p.data.min} 分<br/>参考人数：${p.data.count}`  },
    },
    grid: { top: 12, right: 16, bottom: 28, left: 40 },
    xAxis: {
      type: 'category',
      data: stats.map((s) => s.subject),
      axisLabel: { color: '#1b2a4a', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1b2a4a20' } },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#1b2a4a80', fontSize: 11, formatter: '{value} 分' },
      splitLine: { lineStyle: { color: '#1b2a4a10' } },
    },
    series: [
      {
        type: 'bar',
        data: stats.map((s) => ({
          value: s.average,
          max: s.max,
          min: s.min,
          count: s.count,
          itemStyle: { color: '#1b2a4a', borderRadius: [6, 6, 0, 0] },
        })),
        barWidth: '50%',
        emphasis: { itemStyle: { color: '#e0a458' } },
        label: {
          show: true,
          position: 'top',
          color: '#1b2a4a',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: '{c}',
        },
      },
      {
        type: 'bar',
        data: stats.map((s) => ({
          value: s.max - s.average,
          min: 0,
          itemStyle: { color: '#e0a45840', borderRadius: [0, 0, 0, 0] },
        })),
        barWidth: '50%',
        stack: 'error',
        emphasis: { disabled: true },
        tooltip: { show: false },
        silent: true,
      },
      {
        type: 'bar',
        data: stats.map((s) => ({
          value: s.average - s.min,
          min: 0,
          itemStyle: { color: 'transparent', borderRadius: [6, 6, 0, 0] },
        })),
        barWidth: '50%',
        stack: 'error',
        emphasis: { disabled: true },
        tooltip: { show: false },
        silent: true,
      },
    ],
  }
})

const { setOption: updateSubject } = useECharts(subjectChart, subjectOptions)

/** ── 图表三：班级平均分条形图 ── */
const classChart = ref<HTMLElement | null>(null)
const classOptions = computed<EChartsCoreOption>(() => {
  const stats = data.value?.classStats ?? []
  const sorted = [...stats].sort((a, b) => b.average - a.average)
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1b2a4a',
      borderColor: 'transparent',
      textStyle: { color: '#f5f1e8', fontSize: 13 },
      formatter: (params: any[]) => {
        const p = params[0]
        return `<b>${p.name}</b><br/>平均分：${p.value} 分<br/>学生数：${p.data.studentCount}<br/>录入科次：${p.data.gradeCount}`    },
    },
    grid: { top: 12, right: 36, bottom: 28, left: 20 },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#1b2a4a80', fontSize: 11, formatter: '{value}' },
      splitLine: { lineStyle: { color: '#1b2a4a10' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((s) => s.className),
      axisLabel: { color: '#1b2a4a', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1b2a4a20' } },
      inverse: true,
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((s, i) => ({
          value: s.average,
          studentCount: s.studentCount,
          gradeCount: s.gradeCount,
          itemStyle: {
            color: ['#1b2a4a', '#2a3f6b', '#e0a458', '#eab97e', '#4caf50', '#8bc34a'][i % 6],
            borderRadius: [0, 6, 6, 0],
          },
        })),
        barWidth: '60%',
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(27,42,74,0.3)' } },
        label: {
          show: true,
          position: 'right',
          color: '#1b2a4a',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: '{c}',
        },
      },
    ],
  }
})

const { setOption: updateClass } = useECharts(classChart, classOptions)

// 数据加载完成后更新图表
import { watch } from 'vue'
watch(data, (val) => {
  if (!val) return
  requestAnimationFrame(() => {
    updateDist(distOptions.value, true)
    updateSubject(subjectOptions.value, true)
    updateClass(classOptions.value, true)
  })
})
</script>

<template>
  <div class="min-h-screen">
    <Navbar />
    <main class="mx-auto max-w-6xl px-6 py-8">
      <div class="mb-6">
        <h2 class="font-display text-2xl font-semibold text-navy">数据可视化</h2>
        <p class="mt-1 text-sm text-navy/60">
          基于当前成绩数据的多维统计图表 · 支持悬停查看详情
        </p>
      </div>

      <!-- 加载 / 错误状态 -->
      <div v-if="loading" class="flex h-48 items-center justify-center text-navy/50">
        <TrendingUp class="mr-2 animate-pulse" :size="20" /> 正在加载统计数据...
      </div>
      <p v-else-if="error" class="rounded bg-red-50 px-4 py-3 text-sm text-red-600">{{ error }}</p>
      <p
        v-else-if="!data || overview?.totalGrades === 0"
        class="flex h-48 items-center justify-center text-navy/50"
      >
        <BarChart3 class="mr-2 opacity-40" :size="20" />
        暂无成绩数据，请先在「成绩管理」中录入成绩
      </p>

      <template v-else>
        <!-- 概览卡片 -->
        <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div class="rounded-lg border border-navy/10 bg-white px-4 py-3 shadow-card">
            <p class="text-xs text-navy/60">总成绩条数</p>
            <p class="mt-1 text-xl font-bold text-navy">{{ overview!.totalGrades }}</p>
          </div>
          <div class="rounded-lg border border-navy/10 bg-white px-4 py-3 shadow-card">
            <p class="text-xs text-navy/60">科目数</p>
            <p class="mt-1 text-xl font-bold text-navy">{{ overview!.subjectCount }}</p>
          </div>
          <div class="rounded-lg border border-navy/10 bg-white px-4 py-3 shadow-card">
            <p class="text-xs text-navy/60">班级数</p>
            <p class="mt-1 text-xl font-bold text-navy">{{ overview!.classCount }}</p>
          </div>
          <div class="rounded-lg border border-navy/10 bg-white px-4 py-3 shadow-card">
            <p class="text-xs text-navy/60">不及格率</p>
            <p class="mt-1 text-xl font-bold text-red-500">{{ overview!.failRate }}%</p>
          </div>
          <div class="rounded-lg border border-navy/10 bg-white px-4 py-3 shadow-card">
            <p class="text-xs text-navy/60">优秀率</p>
            <p class="mt-1 text-xl font-bold text-green-600">{{ overview!.excellentRate }}%</p>
          </div>
        </div>

        <!-- 图表区域 -->
        <div class="grid gap-6 md:grid-cols-2">
          <!-- 成绩分布环形图 -->
          <div class="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
            <h3 class="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-navy">
              <PieChart :size="18" class="text-amber" /> 成绩分布
            </h3>
            <div ref="distChart" class="h-[340px] w-full" />
          </div>

          <!-- 科目平均分柱状图 -->
          <div class="rounded-lg border border-navy/10 bg-white p-5 shadow-card">
            <h3 class="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-navy">
              <BarChart3 :size="18" class="text-amber" /> 科目平均分
            </h3>
            <div ref="subjectChart" class="h-[340px] w-full" />
          </div>

          <!-- 班级平均分条形图（全宽） -->
          <div class="rounded-lg border border-navy/10 bg-white p-5 shadow-card md:col-span-2">
            <h3 class="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-navy">
              <TrendingUp :size="18" class="text-amber" /> 班级平均分排名
            </h3>
            <div ref="classChart" class="h-[300px] w-full" />
          </div>
        </div>
      </template>
    </main>
  </div>
</template>
