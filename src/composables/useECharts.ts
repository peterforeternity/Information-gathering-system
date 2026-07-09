/**
 * Vue 3 ECharts 集成 composable。
 * 封装图表实例的创建、响应式尺寸调整与销毁，提供 setOption 更新方法。
 */
import { ref, onMounted, onBeforeUnmount, toValue, type Ref, type MaybeRefOrGetter } from 'vue'
import * as echarts from 'echarts/core'
import type { EChartsCoreOption } from 'echarts/core'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 按需注册：仅引入本模块需要的图表与组件，减小打包体积。
echarts.use([PieChart, BarChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

export function useECharts(
  containerRef: Ref<HTMLElement | null>,
  options: MaybeRefOrGetter<EChartsCoreOption>,
) {
  const instance = ref<echarts.ECharts | null>(null)

  /** 初始化图表实例 */
  function init() {
    if (!containerRef.value) return
    instance.value = echarts.init(containerRef.value)
    instance.value.setOption(toValue(options))
  }

  /** 更新图表配置（数据变化时调用） */
  function setOption(opts: EChartsCoreOption, notMerge = false) {
    instance.value?.setOption(opts, { notMerge })
  }

  let resizeHandler: (() => void) | null = null

  /** 监听窗口尺寸变化，触发图表自适应缩放 */
  onMounted(() => {
    init()
    resizeHandler = () => {
      if (!instance.value || instance.value.isDisposed()) return
      instance.value.resize()
    }
    window.addEventListener('resize', resizeHandler)
  })

  onBeforeUnmount(() => {
    if (resizeHandler) window.removeEventListener('resize', resizeHandler)
    instance.value?.dispose()
  })

  return { instance, setOption }
}
