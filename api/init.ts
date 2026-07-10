/**
 * 数据库初始化：服务启动时检查，若库为空则自动创建默认 admin + demo 数据。
 * 确保 Railway 等全新部署环境开箱即用。
 */
import { store } from './store.js'
import { hashPassword } from './auth.js'
import crypto from 'crypto'

const DEMO_PASSWORD = 'demo123456'
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin123'

/** Demo 学生数据（与 SeedDemo 风格一致的虚拟数据）。 */
const DEMO_STUDENTS = [
  { studentNo: 'DEMO0001', name: '张三', gender: '男' as const, className: '三年级一班' },
  { studentNo: 'DEMO0002', name: '李婷', gender: '女' as const, className: '三年级一班' },
  { studentNo: 'DEMO0003', name: '王磊', gender: '男' as const, className: '三年级一班' },
  { studentNo: 'DEMO0004', name: '赵敏', gender: '女' as const, className: '三年级二班' },
  { studentNo: 'DEMO0005', name: '孙浩', gender: '男' as const, className: '三年级二班' },
  { studentNo: 'DEMO0006', name: '周丽', gender: '女' as const, className: '三年级二班' },
  { studentNo: 'DEMO0007', name: '吴强', gender: '男' as const, className: '三年级三班' },
  { studentNo: 'DEMO0008', name: '郑雪', gender: '女' as const, className: '三年级三班' },
]

const SUBJECTS = ['语文', '数学', '英语', '科学']

function randomScore(min = 30, max = 100): number {
  return Math.round(Math.random() * (max - min) + min)
}

/** 为缺少登录账号的学生补建账号（用户名=学号，密码 demo123456）。幂等，可重复执行。 */
function backfillStudentAccounts(): void {
  try {
    const students = store.getStudents()
    let created = 0
    for (const s of students) {
      if (!store.getUserByUsername(s.studentNo)) {
        const { hash, salt } = hashPassword(DEMO_PASSWORD)
        store.createUser({
          id: crypto.randomUUID(),
          username: s.studentNo,
          passwordHash: hash,
          salt,
          role: 'student',
        })
        created++
      }
    }
    if (created > 0) {
      console.log(`[init] 补建学生登录账号 ×${created}（密码 ${DEMO_PASSWORD}）`)
    } else {
      console.log('[init] 所有学生均已有登录账号，无需补建')
    }
  } catch (err) {
    console.error('[init] 补建学生账号出错:', err)
  }
}

/** 仅在新数据库（无 admin 用户）时执行初始化。已存在的库不做任何修改。 */
export function ensureInitialized(): void {
  console.log('[init] 开始检查数据库状态...')

  try {
    const existingAdmin = store.getUserByUsername(ADMIN_USERNAME)
    console.log(`[init] admin 用户存在: ${!!existingAdmin}`)

    if (existingAdmin) {
      console.log('[init] 数据库已初始化，检查学生账号完整性...')
      backfillStudentAccounts() // 关键：修复历史数据中缺失的学生账号
      return
    }
  } catch (err) {
    console.error('[init] 查询 admin 用户失败:', err)
    return // 不阻塞启动，容错
  }

  console.log('[init] 检测到空数据库，正在创建默认数据...')

  try {
    // 1. 创建 admin 账号
    const { hash, salt } = hashPassword(ADMIN_PASSWORD)
    store.createUser({
      id: crypto.randomUUID(),
      username: ADMIN_USERNAME,
      passwordHash: hash,
      salt,
      role: 'admin',
    })
    console.log('[init] admin 账号已创建')

    // 2. 创建 demo 学生 + 登录账号 + 成绩
    for (const s of DEMO_STUDENTS) {
      // 学生档案
      const studentId = crypto.randomUUID()
      store.createStudent({
        id: studentId,
        studentNo: s.studentNo,
        name: s.name,
        gender: s.gender,
        className: s.className,
      })

      // 登录账号（用户名=学号，统一密码）
      const { hash: h, salt: sl } = hashPassword(DEMO_PASSWORD)
      store.createUser({
        id: crypto.randomUUID(),
        username: s.studentNo,
        passwordHash: h,
        salt: sl,
        role: 'student',
      })

      // 为每个学生随机生成各科成绩
      for (const subject of SUBJECTS) {
        store.upsertGrade(studentId, subject, randomScore(40, 98))
      }
    }

    const studentCount = DEMO_STUDENTS.length
    const gradeCount = studentCount * SUBJECTS.length
    console.log(`[init] 初始化完成：admin ×1，学生 ×${studentCount}，科目 ×${SUBJECTS.length}，成绩 ×${gradeCount}`)
    console.log(`[init] 学生登录：学号 + 密码 ${DEMO_PASSWORD}，管理员：admin / ${ADMIN_PASSWORD}`)
  } catch (err) {
    console.error('[init] 初始化过程出错:', err)
  }
}
