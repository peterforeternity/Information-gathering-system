/**
 * 学生个人学业数据 API（学生本人视角）。
 * 通过「登录用户名 = 学号(studentNo)」的约定，定位当前登录学生对应的档案。
 *
 * GET /api/student/dashboard 返回：
 *  - profile：学生基本信息 + 是否成功绑定
 *  - ranking：班级排名、年段排名（总人数、名次、百分位）
 *  - radar：能力评估雷达图数据（至少 6 维，科目不足时补充能力维度）
 *  - suggestions：薄弱科目分析与学习建议（含班级/年段平均基准）
 */
import { Router, type Response } from 'express'
import { store } from '../store.js'
import { requireAuth, type AuthedRequest } from '../auth.js'

const router = Router()
router.use(requireAuth)

interface StudentAgg {
  id: string
  studentNo: string
  name: string
  className: string
  scores: Record<string, number>
  average: number | null
  count: number
}

/** 聚合所有学生的成绩，返回按学生分组的结构。 */
function aggregateAll(): { list: StudentAgg[]; subjects: string[] } {
  const students = store.getStudents()
  const grades = store.getGrades()
  const subjects = Array.from(new Set(grades.map((g) => g.subject))).sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  )

  const list = students.map((s) => {
    const scores: Record<string, number> = {}
    let sum = 0
    let count = 0
    grades
      .filter((g) => g.studentId === s.id)
      .forEach((g) => {
        scores[g.subject] = g.score
        sum += g.score
        count += 1
      })
    return {
      id: s.id,
      studentNo: s.studentNo,
      name: s.name,
      className: s.className,
      scores,
      average: count > 0 ? Number((sum / count).toFixed(1)) : null,
      count,
    }
  })

  return { list, subjects }
}

/** 计算某集合中，目标平均分的名次（1 起）与该集合规模（仅统计有成绩的学生）。 */
function computeRank(pool: StudentAgg[], targetAvg: number): { rank: number; total: number } {
  const scored = pool.filter((s) => s.average !== null)
  const total = scored.length
  // 名次 = 平均分严格高于自己的人数 + 1
  const higher = scored.filter((s) => (s.average as number) > targetAvg).length
  return { rank: higher + 1, total }
}

/** 能力维度定义：根据整体表现派生的综合指标（0-100）。 */
function buildAbilityDimensions(me: StudentAgg, allScored: StudentAgg[]): { name: string; value: number }[] {
  const dims: { name: string; value: number }[] = []

  // 综合水平：本人均分
  const avg = me.average ?? 0
  dims.push({ name: '综合水平', value: Number(avg.toFixed(1)) })

  // 稳定性：各科分数越集中越高（100 - 标准差，下限 0）
  const vals = Object.values(me.scores)
  if (vals.length >= 2) {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length
    const std = Math.sqrt(variance)
    dims.push({ name: '稳定性', value: Number(Math.max(0, 100 - std * 2).toFixed(1)) })
  } else {
    dims.push({ name: '稳定性', value: Number(avg.toFixed(1)) })
  }

  // 竞争力：本人均分在年段中的百分位
  if (allScored.length > 0 && me.average !== null) {
    const below = allScored.filter((s) => (s.average as number) <= (me.average as number)).length
    const percentile = (below / allScored.length) * 100
    dims.push({ name: '竞争力', value: Number(percentile.toFixed(1)) })
  } else {
    dims.push({ name: '竞争力', value: 0 })
  }

  // 均衡度：最高分与最低分差距越小越高
  if (vals.length >= 2) {
    const gap = Math.max(...vals) - Math.min(...vals)
    dims.push({ name: '均衡度', value: Number(Math.max(0, 100 - gap).toFixed(1)) })
  } else {
    dims.push({ name: '均衡度', value: Number(avg.toFixed(1)) })
  }

  return dims
}

/** GET /api/student/dashboard */
router.get('/dashboard', (req: AuthedRequest, res: Response): void => {
  const user = req.user!

  // 约定：学生登录用户名即学号
  const me = store.getStudentByNo(user.username)

  if (!me) {
    res.json({
      success: true,
      data: {
        bound: false,
        message: `未找到与账号「${user.username}」匹配的学生档案（登录用户名需与学号一致）`,
      },
    })
    return
  }

  const { list, subjects } = aggregateAll()
  const meAgg = list.find((s) => s.id === me.id)!

  // ── 排名 ──
  const classmates = list.filter((s) => s.className === me.className)
  const gradeAvg = meAgg.average ?? 0
  const classRank = computeRank(classmates, gradeAvg)
  const gradeRank = computeRank(list, gradeAvg)

  const percentile =
    gradeRank.total > 0
      ? Number((((gradeRank.total - gradeRank.rank + 1) / gradeRank.total) * 100).toFixed(1))
      : 0

  // ── 各科班级/年段平均基准 ──
  const subjectBaseline: Record<string, { classAvg: number; gradeAvg: number }> = {}
  for (const subject of subjects) {
    const classScores = classmates
      .map((s) => s.scores[subject])
      .filter((v): v is number => v !== undefined)
    const gradeScores = list
      .map((s) => s.scores[subject])
      .filter((v): v is number => v !== undefined)
    subjectBaseline[subject] = {
      classAvg: classScores.length
        ? Number((classScores.reduce((a, b) => a + b, 0) / classScores.length).toFixed(1))
        : 0,
      gradeAvg: gradeScores.length
        ? Number((gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length).toFixed(1))
        : 0,
    }
  }

  // ── 雷达图：科目维度 + 能力维度补足至 ≥6 ──
  const subjectDims = Object.entries(meAgg.scores).map(([subject, score]) => ({
    name: subject,
    value: score,
    classAvg: subjectBaseline[subject]?.classAvg ?? 0,
    gradeAvg: subjectBaseline[subject]?.gradeAvg ?? 0,
    type: 'subject' as const,
  }))

  const radarDims: {
    name: string
    value: number
    classAvg?: number
    gradeAvg?: number
    type: 'subject' | 'ability'
  }[] = [...subjectDims]

  if (radarDims.length < 6) {
    const abilityDims = buildAbilityDimensions(
      meAgg,
      list.filter((s) => s.average !== null),
    )
    for (const d of abilityDims) {
      if (radarDims.length >= 6) break
      radarDims.push({ name: d.name, value: d.value, type: 'ability' })
    }
    // 若仍不足 6（极端无成绩情形），用占位能力维度补齐
    const fillers = ['学习态度', '课堂参与', '作业完成', '进步空间']
    let fi = 0
    while (radarDims.length < 6 && fi < fillers.length) {
      radarDims.push({ name: fillers[fi], value: Number((meAgg.average ?? 0).toFixed(1)), type: 'ability' })
      fi += 1
    }
  }

  // ── 薄弱科目分析与建议 ──
  const RESOURCE_MAP: Record<string, string[]> = {
    语文: ['每日精读一篇范文并做批注', '积累古诗文默写，建立错题本', '每周完成 1 篇限时作文'],
    数学: ['针对错题按知识点归类专项训练', '每天 20 分钟计算能力练习', '整理公式定理思维导图'],
    英语: ['坚持每日背诵 20 个高频词', '精听 + 跟读提升语感', '每周完成 2 篇阅读理解并分析长难句'],
    物理: ['吃透基本概念与受力分析', '按模型分类刷题', '重视实验原理与图像题'],
    化学: ['记牢方程式与实验现象', '构建元素化合物知识网络', '强化计算题规范步骤'],
    生物: ['理解概念本质而非死记', '结合图表记忆过程', '重视遗传与代谢专题'],
    科学: ['多做观察与探究记录', '联系生活理解原理', '整理跨学科知识点'],
  }
  const genericAdvice = ['制定针对性复习计划', '主动向老师请教薄弱点', '定期回顾错题并复盘']

  const weakSubjects = subjectDims
    .map((d) => ({
      subject: d.name,
      score: d.value,
      classAvg: d.classAvg,
      gradeAvg: d.gradeAvg,
      // 与年段均分的差距（负数=低于平均）
      gapToGrade: Number((d.value - d.gradeAvg).toFixed(1)),
    }))
    .sort((a, b) => a.gapToGrade - b.gapToGrade)
    .slice(0, 3)
    .map((w) => ({
      ...w,
      level: w.score >= 90 ? '优秀' : w.score >= 80 ? '良好' : w.score >= 70 ? '中等' : w.score >= 60 ? '及格' : '待提高',
      suggestions: RESOURCE_MAP[w.subject] ?? genericAdvice,
    }))

  res.json({
    success: true,
    data: {
      bound: true,
      profile: {
        studentNo: me.studentNo,
        name: me.name,
        className: me.className,
        average: meAgg.average,
        subjectCount: subjectDims.length,
      },
      ranking: {
        classRank: classRank.rank,
        classTotal: classRank.total,
        gradeRank: gradeRank.rank,
        gradeTotal: gradeRank.total,
        percentile,
      },
      radar: radarDims,
      suggestions: weakSubjects,
    },
  })
})

export default router
