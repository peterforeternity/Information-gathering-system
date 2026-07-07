/**
 * JSON 文件数据存储层。
 * 负责将用户、学生、成绩数据以 JSON 文件形式持久化到本地，保证重启后数据不丢失。
 * 写入采用「写临时文件后重命名」的原子写方式，避免写入过程中断导致文件损坏。
 */
import fs from 'fs'
import path from 'path'

export interface User {
  id: string
  username: string
  passwordHash: string
  salt: string
  role: 'admin' | 'student'
}

export interface Student {
  id: string
  studentNo: string
  name: string
  gender: '男' | '女'
  className: string
}

export interface Grade {
  id: string
  studentId: string
  subject: string
  score: number
}

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data')

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  students: path.join(DATA_DIR, 'students.json'),
  grades: path.join(DATA_DIR, 'grades.json'),
}

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readJson<T>(file: string): T[] {
  ensureDir()
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '[]', 'utf-8')
    return []
  }
  try {
    const raw = fs.readFileSync(file, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeJson<T>(file: string, data: T[]): void {
  ensureDir()
  const tmp = `${file}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, file)
}

export const store = {
  getUsers: () => readJson<User>(FILES.users),
  saveUsers: (data: User[]) => writeJson(FILES.users, data),
  getStudents: () => readJson<Student>(FILES.students),
  saveStudents: (data: Student[]) => writeJson(FILES.students, data),
  getGrades: () => readJson<Grade>(FILES.grades),
  saveGrades: (data: Grade[]) => writeJson(FILES.grades, data),
}
