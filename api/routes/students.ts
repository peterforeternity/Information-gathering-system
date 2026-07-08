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
  if (store.getStudentByNo(result.value.studentNo)) {
    res.status(409).json({ success: false, error: '学号已存在' })
    return
  }
  const student: Student = { id: crypto.randomUUID(), ...result.value }
  store.createStudent(student)
  res.status(201).json({ success: true, data: student })
})

/** PUT /api/students/:id - 编辑学生（管理员） */
router.put('/:id', requireAdmin, (req: AuthedRequest, res: Response): void => {
  const result = validate(req.body)
  if (result.error || !result.value) {
    res.status(400).json({ success: false, error: result.error })
    return
  }
  const existing = store.getStudentById(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '学生不存在' })
    return
  }
  const conflict = store.getStudentByNo(result.value.studentNo)
  if (conflict && conflict.id !== req.params.id) {
    res.status(409).json({ success: false, error: '学号已存在' })
    return
  }
  store.updateStudent(req.params.id, result.value)
  res.json({ success: true, data: { id: req.params.id, ...result.value } })
})

/** DELETE /api/students/:id - 删除学生并级联删除成绩（管理员） */
router.delete('/:id', requireAdmin, (req: AuthedRequest, res: Response): void => {
  const existing = store.getStudentById(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: '学生不存在' })
    return
  }
  store.deleteStudent(req.params.id)
  res.json({ success: true })
})

export default router
