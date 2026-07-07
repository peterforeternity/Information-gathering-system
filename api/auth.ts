/**
 * 认证相关工具：密码哈希、token 会话管理与鉴权中间件。
 */
import crypto from 'crypto'
import { type Request, type Response, type NextFunction } from 'express'
import { store, type User } from './store.js'

/** 使用 scrypt 对密码加盐哈希，避免明文存储。 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt ?? crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, useSalt, 64).toString('hex')
  return { hash, salt: useSalt }
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const { hash: computed } = hashPassword(password, salt)
  const a = Buffer.from(computed, 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** 简单的内存会话表：token -> userId。进程重启后需要重新登录。 */
const sessions = new Map<string, string>()

export function createSession(userId: string): string {
  const token = crypto.randomBytes(24).toString('hex')
  sessions.set(token, userId)
  return token
}

export function destroySession(token: string): void {
  sessions.delete(token)
}

function getTokenFromReq(req: Request): string | null {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  return header.slice(7)
}

export interface AuthedRequest extends Request {
  user?: User
}

/** 校验登录态，注入 req.user。 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = getTokenFromReq(req)
  const userId = token ? sessions.get(token) : null
  if (!userId) {
    res.status(401).json({ success: false, error: '未登录或登录已失效' })
    return
  }
  const user = store.getUsers().find((u) => u.id === userId)
  if (!user) {
    res.status(401).json({ success: false, error: '用户不存在' })
    return
  }
  req.user = user
  next()
}

/** 在 requireAuth 之后使用，限制仅管理员访问。 */
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: '仅管理员可执行该操作' })
    return
  }
  next()
}
