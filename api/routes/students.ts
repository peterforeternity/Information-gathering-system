/**
 * 学生管理 API：增删改查。删除学生时级联删除其成绩。仅管理员可写。
 */
import { Router, type Response } from 'express'
import crypto from 'crypto'
import { store, type Student } from '../store.js'
import { requireAuth, requireAdmin, type AuthedRequest } from '../auth.js'

const router = Router()

router.use(requireAuth)

interface ValidateResult {
  error: string | null
  value: Omit<Student, 'id'> | null
}

function validate(body: any): ValidateResult {
  const { studentNo, name, gender, className } = body ?? {}
  if (typeof studentNo !== 'string' || !studentNo.trim()) {
    return { error: '学号不能为空', value: null }
  }
  if (typeof name !== 'string' || !name.trim()) {
    return { error: '姓名不能为空', value: null }
  }
  if (gender !== '男' && gender !== '女') {
    return { error: '性别不合法', value: null }
  }
  if (typeof className !== 'string' || !className.trim()) {
    return { error: '班级不能为空', value: null }
  }
  return {
    error: null,
    value: { studentNo: studentNo.trim(), name: name.trim(), gender, className: className.trim() },
  }
}

/** GET /api/students - 所有登录用户可查看列表 */
router.get('/', (_req: AuthedRequest, res: Response): void => {
  res.json({ success: true, data: store.getStudents() })
})

/** POST /api/students - 新增学生（管理员） */
router.post('/', requireAdmin, (req: AuthedRequest, res: Response): void => {
  const result = validate(req.body)
  if (result.error || !result.value) {
    res.status(400).json({ success: false, error: result.error })
    return
  }
  const students = store.getStudents()
  if (students.some((s) => s.studentNo === result.value!.studentNo)) {
    res.status(409).json({ success: false, error: '学号已存在' })
    return
  }
  const student: Student = { id: crypto.randomUUID(), ...result.value }
  students.push(student)
  store.saveStudents(students)
  res.status(201).json({ success: true, data: student })
})

/** PUT /api/students/:id - 编辑学生（管理员） */
router.put('/:id', requireAdmin, (req: AuthedRequest, res: Response): void => {
  const result = validate(req.body)
  if (result.error || !result.value) {
    res.status(400).json({ success: false, error: result.error })
    return
  }
  const students = store.getStudents()
  const idx = students.findIndex((s) => s.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: '学生不存在' })
    return
  }
  if (students.some((s) => s.studentNo === result.value!.studentNo && s.id !== req.params.id)) {
    res.status(409).json({ success: false, error: '学号已存在' })
    return
  }
  students[idx] = { ...students[idx], ...result.value }
  store.saveStudents(students)
  res.json({ success: true, data: students[idx] })
})

/** DELETE /api/students/:id - 删除学生并级联删除成绩（管理员） */
router.delete('/:id', requireAdmin, (req: AuthedRequest, res: Response): void => {
  const students = store.getStudents()
  const idx = students.findIndex((s) => s.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: '学生不存在' })
    return
  }
  students.splice(idx, 1)
  store.saveStudents(students)

  const grades = store.getGrades().filter((g) => g.studentId !== req.params.id)
  store.saveGrades(grades)

  res.json({ success: true })
})

export default router
