/**
 * 测试数据生成与推送 API（仅管理员可访问）。
 * - POST /api/seed/generate  根据参数生成演示数据，返回预览（不写入数据库）。
 * - POST /api/seed/push      将预览数据正式写入数据库。
 */
import { Router, type Response } from 'express'
import { store } from '../store.js'
import { requireAuth, requireAdmin, hashPassword, type AuthedRequest } from '../auth.js'
import crypto from 'crypto'

const router = Router()
router.use(requireAuth, requireAdmin)

/** 推送 demo 学生时统一使用的默认登录密码。 */
const DEMO_PASSWORD = 'demo123456'

// ── 中文姓名素材 ──
const SURNAMES = ['张', '李', '王', '赵', '孙', '周', '吴', '郑', '陈', '刘', '杨', '黄', '林', '何', '罗']
const GIVEN_NAMES = ['伟', '芳', '磊', '婷', '浩', '洁', '明', '丽', '强', '敏', '洋', '雪', '博', '瑶', '宇']

function randomName(): string {
  const s = SURNAMES[Math.floor(Math.random() * SURNAMES.length)]
  const g1 = GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)]
  const g2 = GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)]
  return s + g1 + g2
}

function randomScore(min: number, max: number): number {
  return Math.round(Math.random() * (max - min) + min)
}

function randomGender(): '男' | '女' {
  return Math.random() > 0.5 ? '男' : '女'
}

interface SeedParams {
  studentCount: number
  classPrefix: string
  classes: string[]
  subjects: string[]
  scoreRange: { min: number; max: number }
}

/** POST /api/seed/generate */
router.post('/generate', (req: AuthedRequest, res: Response): void => {
  const body = req.body ?? {}
  const params: SeedParams = {
    studentCount: Math.min(Math.max(Number(body.studentCount) || 8, 1), 50),
    classPrefix: String(body.classPrefix || '三年级'),
    classes: body.classes?.length ? body.classes : ['一班', '二班', '三班'],
    subjects: body.subjects?.length ? body.subjects : ['语文', '数学', '英语'],
    scoreRange: {
      min: Math.max(Number(body.scoreRange?.min) || 30, 0),
      max: Math.min(Number(body.scoreRange?.max) || 100, 100),
    },
  }

  const students: Array<{ studentNo: string; name: string; gender: '男' | '女'; className: string }> = []
  const grades: Array<{ studentNo: string; subject: string; score: number }> = []

  for (let i = 1; i <= params.studentCount; i++) {
    const studentNo = 'DEMO' + String(i).padStart(4, '0')
    const className = params.classPrefix + params.classes[i % params.classes.length]
    const student = {
      studentNo,
      name: randomName(),
      gender: randomGender(),
      className,
    }
    students.push(student)

    for (const subject of params.subjects) {
      grades.push({ studentNo, subject, score: randomScore(params.scoreRange.min, params.scoreRange.max) })
    }
  }

  res.json({
    success: true,
    data: {
      students,
      grades,
      summary: {
        studentCount: students.length,
        gradeCount: grades.length,
        classes: Array.from(new Set(students.map((s) => s.className))),
        subjects: params.subjects,
      },
    },
  })
})

/** POST /api/seed/push */
router.post('/push', (req: AuthedRequest, res: Response): void => {
  const { students, grades } = req.body ?? {}

  if (!Array.isArray(students) || students.length === 0) {
    res.status(400).json({ success: false, error: '学生数据不能为空' })
    return
  }
  if (!Array.isArray(grades)) {
    res.status(400).json({ success: false, error: '成绩数据格式错误' })
    return
  }

  const errors: string[] = []
  let studentInserted = 0
  let studentSkipped = 0
  let accountInserted = 0
  let accountSkipped = 0

  // 先插入学生
  for (const s of students) {
    const { studentNo, name, gender, className } = s
    if (!studentNo || !name || !gender || !className) {
      errors.push(`学生数据不完整: ${JSON.stringify(s)}`)
      continue
    }
    try {
      // 学号已存在则跳过
      const existing = store.getStudentByNo(studentNo)
      if (existing) {
        studentSkipped++
      } else {
        store.createStudent({
          id: crypto.randomUUID(),
          studentNo,
          name,
          gender,
          className,
        })
        studentInserted++
      }

      // 同步创建登录账号：用户名=学号，默认密码 demo123456，角色 student。
      // 已存在同名账号则跳过（幂等）。
      if (store.getUserByUsername(studentNo)) {
        accountSkipped++
      } else {
        const { hash, salt } = hashPassword(DEMO_PASSWORD)
        store.createUser({
          id: crypto.randomUUID(),
          username: studentNo,
          passwordHash: hash,
          salt,
          role: 'student',
        })
        accountInserted++
      }
    } catch (err: any) {
      errors.push(`学生 ${name}(${studentNo}) 写入失败: ${err.message}`)
    }
  }

  // 再插入成绩
  let gradeInserted = 0
  let gradeSkipped = 0
  for (const g of grades) {
    const { studentNo, subject, score } = g
    const numScore = Number(score)
    if (!studentNo || !subject || !Number.isFinite(numScore)) {
      errors.push(`成绩数据不完整: ${JSON.stringify(g)}`)
      continue
    }
    if (numScore < 0 || numScore > 100) {
      errors.push(`分数越界: ${studentNo} ${subject}=${numScore}`)
      continue
    }
    try {
      const student = store.getStudentByNo(studentNo)
      if (!student) {
        gradeSkipped++
        continue
      }
      store.upsertGrade(student.id, subject, numScore)
      gradeInserted++
    } catch (err: any) {
      errors.push(`成绩 ${studentNo}/${subject} 写入失败: ${err.message}`)
    }
  }

  res.json({
    success: errors.length === 0,
    data: {
      students: { inserted: studentInserted, skipped: studentSkipped },
      accounts: { inserted: accountInserted, skipped: accountSkipped, defaultPassword: DEMO_PASSWORD },
      grades: { inserted: gradeInserted, skipped: gradeSkipped },
      errors,
    },
  })
})

export default router
