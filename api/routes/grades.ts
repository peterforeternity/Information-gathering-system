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
