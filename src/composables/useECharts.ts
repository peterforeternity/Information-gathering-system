/**
 * Vue 3 ECharts 集成 composable。
 * 封装图表实例的创建、响应式尺寸调整与销毁，提供 setOption 更新方法。
 *
 * 支持延迟初始化：当图表容器通过 v-if / v-else 条件渲染时，
 * composable 会在容器 DOM 元素首次出现时自动初始化图表，无需手动干预。
 */
import {
  ref,
  watch,
  onBeforeUnmount,
  toValue,
  type Ref,
  type MaybeRefOrGetter,
} from 'vue'
import * as echarts from 'echarts/core'
import type { EChartsCoreOption } from 'echarts/core'
import { PieChart, BarChart, LineChart, RadarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  RadarComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 按需注册：仅引入本模块需要的图表与组件，减小打包体积。
echarts.use([
  PieChart,
  BarChart,
  LineChart,
  RadarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  RadarComponent,
  CanvasRenderer,
])

export function useECharts(
  containerRef: Ref<HTMLElement | null>,
  options: MaybeRefOrGetter<EChartsCoreOption>,
) {
  const instance = ref<echarts.ECharts | null>(null)
  let resizeHandler: (() => void) | null = null

  /** 初始化（或重新初始化）图表实例。 */
  function init(el: HTMLElement) {
    if (instance.value && !instance.value.isDisposed()) {
      instance.value.dispose()
    }
    instance.value = echarts.init(el)
    instance.value.setOption(toValue(options))
  }

  /** 更新图表配置（数据变化时调用）。 */
  function setOption(opts: EChartsCoreOption, notMerge = false) {
    instance.value?.setOption(opts, { notMerge })
  }

  /** 注册窗口尺寸监听。 */
  function attachResize() {
    resizeHandler = () => {
      if (!instance.value || instance.value.isDisposed()) return
      instance.value.resize()
    }
    window.addEventListener('resize', resizeHandler)
  }

  function detachResize() {
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = null
    }
  }

  // 监听容器 DOM 元素：首次出现时初始化图表，移除时销毁。
  watch(
    () => containerRef.value,
    (el) => {
      if (el) {
        init(el)
        attachResize()
      } else {
        detachResize()
        instance.value?.dispose()
        instance.value = null
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    detachResize()
    instance.value?.dispose()
  })

  return { instance, setOption }
}
