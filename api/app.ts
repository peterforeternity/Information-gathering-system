/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import studentRoutes from './routes/students.js'
import gradeRoutes from './routes/grades.js'
import seedRoutes from './routes/seed.js'
import studentDashboardRoutes from './routes/student.js'
import { store } from './store.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/seed', seedRoutes)
app.use('/api/student', studentDashboardRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * 诊断端点：返回数据库状态，用于排查 Railway 等远程环境的初始化问题。
 */
app.get('/api/health/diag', (req: Request, res: Response): void => {
  const users = store.getUserByUsername('admin')
  const students = store.getStudents()
  res.json({
    success: true,
    nodeEnv: process.env.NODE_ENV ?? 'not set',
    hasAdmin: !!users,
    adminExists: users ? { username: users.username, role: users.role } : null,
    studentCount: students.length,
    studentSample: students.slice(0, 3).map(s => ({ no: s.studentNo, name: s.name, cls: s.className })),
  })
})

/**
 * 生产环境：托管前端构建产物（dist），并对非 /api 的路由回退到 index.html（支持前端路由）。
 */
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (req: Request, res: Response, next: NextFunction): void => {
    if (req.path.startsWith('/api')) {
      next()
      return
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
