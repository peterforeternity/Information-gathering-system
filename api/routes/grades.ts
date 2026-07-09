/**
 * 成绩管理 API：录入/更新成绩、查询聚合成绩表、查询科目列表。仅管理员可写。
 */
import { Router, type Response } from 'express'
import { store } from '../store.js'
import { requireAuth, requireAdmin, type AuthedRequest } from '../auth.js'

const router = Router()

router.use(requireAuth)

/**
 * GET /api/grades
 * 返回聚合后的成绩表：每个学生一行，包含基本信息与各科成绩、平均分。
 */
router.get('/', (_req: AuthedRequest, res: Response): void => {
  const students = store.getStudents()
  const grades = store.getGrades()
  const subjects = Array.from(new Set(grades.map((g) => g.subject))).sort()

  const rows = students.map((s) => {
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
      gender: s.gender,
      className: s.className,
      scores,
      average: count > 0 ? Number((sum / count).toFixed(1)) : null,
    }
  })

  res.json({ success: true, data: { subjects, rows } })
})

/** GET /api/grades/subjects - 已有科目列表 */
router.get('/subjects', (_req: AuthedRequest, res: Response): void => {
  const subjects = Array.from(new Set(store.getGrades().map((g) => g.subject))).sort()
  res.json({ success: true, data: subjects })
})

/**
 * GET /api/grades/analytics - 聚合统计数据，供数据可视化使用。
 * 返回：成绩分档分布、科目统计（均分/最高/最低/人数）、班级统计（均分/人数）。
 */
router.get('/analytics', (_req: AuthedRequest, res: Response): void => {
  const students = store.getStudents()
  const grades = store.getGrades()

  // ── 成绩分档分布（全局，含所有科目所有成绩） ──
  const ranges = [
    { label: '不及格', min: 0, max: 59 },
    { label: '及格', min: 60, max: 69 },
    { label: '中等', min: 70, max: 79 },
    { label: '良好', min: 80, max: 89 },
    { label: '优秀', min: 90, max: 100 },
  ]
  const scoreDistribution = ranges.map((r) => {
    const count = grades.filter((g) => g.score >= r.min && g.score <= r.max).length
    return { name: r.label, value: count, min: r.min, max: r.max }
  })

  // ── 科目统计 ──
  const subjectMap = new Map<string, number[]>()
  grades.forEach((g) => {
    if (!subjectMap.has(g.subject)) subjectMap.set(g.subject, [])
    subjectMap.get(g.subject)!.push(g.score)
  })
  const subjectStats = Array.from(subjectMap.entries())
    .map(([subject, scores]) => {
      const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
      return {
        subject,
        average: avg,
        max: Math.max(...scores),
        min: Math.min(...scores),
        count: scores.length,
      }
    })
    .sort((a, b) => a.subject.localeCompare(b.subject, 'zh-CN'))

  // ── 班级统计 ──
  const classMap = new Map<string, { total: number; count: number; studentCount: number }>()
  students.forEach((s) => {
    if (!classMap.has(s.className)) {
      classMap.set(s.className, { total: 0, count: 0, studentCount: 0 })
    }
    classMap.get(s.className)!.studentCount += 1
  })
  grades.forEach((g) => {
    const s = students.find((st) => st.id === g.studentId)
    if (s && classMap.has(s.className)) {
      const entry = classMap.get(s.className)!
      entry.total += g.score
      entry.count += 1
    }
  })
  const classStats = Array.from(classMap.entries())
    .map(([className, data]) => ({
      className,
      average: data.count > 0 ? Number((data.total / data.count).toFixed(1)) : 0,
      studentCount: data.studentCount,
      gradeCount: data.count,
    }))
    .sort((a, b) => a.className.localeCompare(b.className, 'zh-CN'))

  res.json({
    success: true,
    data: { scoreDistribution, subjectStats, classStats },
  })
})

/**
 * POST /api/grades - 录入或更新某学生某科成绩（管理员）
 * 同一学生同一科目已存在则更新分数。
 */
router.post('/', requireAdmin, (req: AuthedRequest, res: Response): void => {
  const { studentId, subject, score } = req.body ?? {}

  if (typeof studentId !== 'string' || !studentId) {
    res.status(400).json({ success: false, error: '请选择学生' })
    return
  }
  if (typeof subject !== 'string' || !subject.trim()) {
    res.status(400).json({ success: false, error: '科目不能为空' })
    return
  }
  const numScore = Number(score)
  if (!Number.isFinite(numScore) || numScore < 0 || numScore > 100) {
    res.status(400).json({ success: false, error: '分数必须在 0-100 之间' })
    return
  }
  if (!store.getStudentById(studentId)) {
    res.status(404).json({ success: false, error: '学生不存在' })
    return
  }

  store.upsertGrade(studentId, subject.trim(), numScore)
  res.status(201).json({ success: true })
})

export default router
