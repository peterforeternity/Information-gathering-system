/**
 * 用户认证 API：注册、登录、登出。
 */
import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { store, type User } from '../store.js'
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  requireAuth,
  type AuthedRequest,
} from '../auth.js'

const router = Router()

function publicUser(u: User) {
  return { id: u.id, username: u.username, role: u.role }
}

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register', (req: Request, res: Response): void => {
  const { username, password, role } = req.body ?? {}

  if (typeof username !== 'string' || username.trim().length < 3) {
    res.status(400).json({ success: false, error: '用户名至少 3 个字符' })
    return
  }
  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ success: false, error: '密码至少 6 位' })
    return
  }
  if (role !== 'admin' && role !== 'student') {
    res.status(400).json({ success: false, error: '角色不合法' })
    return
  }

  const existing = store.getUserByUsername(username.trim())
  if (existing) {
    res.status(409).json({ success: false, error: '用户名已存在' })
    return
  }

  const { hash, salt } = hashPassword(password)
  const user: User = {
    id: crypto.randomUUID(),
    username: username.trim(),
    passwordHash: hash,
    salt,
    role,
  }
  store.createUser(user)

  const token = createSession(user.id)
  res.status(201).json({ success: true, token, user: publicUser(user) })
})

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body ?? {}
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ success: false, error: '请输入用户名和密码' })
    return
  }

  const user = store.getUserByUsername(username.trim())
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    res.status(401).json({ success: false, error: '用户名或密码错误' })
    return
  }

  const token = createSession(user.id)
  res.json({ success: true, token, user: publicUser(user) })
})

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', requireAuth, (req: AuthedRequest, res: Response): void => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    destroySession(header.slice(7))
  }
  res.json({ success: true })
})

/**
 * 获取当前登录用户
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req: AuthedRequest, res: Response): void => {
  res.json({ success: true, user: publicUser(req.user!) })
})

export default router
