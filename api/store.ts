/**
 * SQLite 数据存储层（better-sqlite3）。
 * 负责将用户、学生、成绩数据持久化到本地 SQLite 数据库文件，保证重启后数据不丢失。
 * 数据库文件位于 DATA_DIR/app.db（DATA_DIR 默认为项目下的 data 目录，可通过环境变量指向持久化卷）。
 */
import Database from 'better-sqlite3'
import crypto from 'crypto'
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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const db = new Database(path.join(DATA_DIR, 'app.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 初始化表结构：用户、学生、成绩。
// grades 通过外键关联 students，并在删除学生时级联删除其成绩。
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    studentNo TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    className TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS grades (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    subject TEXT NOT NULL,
    score REAL NOT NULL,
    UNIQUE(studentId, subject),
    FOREIGN KEY(studentId) REFERENCES students(id) ON DELETE CASCADE
  );
`)

export const store = {
  // ---- 用户 ----
  getUserById: (id: string): User | undefined =>
    db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined,

  getUserByUsername: (username: string): User | undefined =>
    db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined,

  createUser: (user: User): void => {
    db.prepare(
      'INSERT INTO users (id, username, passwordHash, salt, role) VALUES (?, ?, ?, ?, ?)',
    ).run(user.id, user.username, user.passwordHash, user.salt, user.role)
  },

  // ---- 学生 ----
  getStudents: (): Student[] =>
    db.prepare('SELECT * FROM students ORDER BY studentNo').all() as Student[],

  getStudentById: (id: string): Student | undefined =>
    db.prepare('SELECT * FROM students WHERE id = ?').get(id) as Student | undefined,

  getStudentByNo: (studentNo: string): Student | undefined =>
    db.prepare('SELECT * FROM students WHERE studentNo = ?').get(studentNo) as Student | undefined,

  createStudent: (student: Student): void => {
    db.prepare(
      'INSERT INTO students (id, studentNo, name, gender, className) VALUES (?, ?, ?, ?, ?)',
    ).run(student.id, student.studentNo, student.name, student.gender, student.className)
  },

  updateStudent: (id: string, data: Omit<Student, 'id'>): void => {
    db.prepare(
      'UPDATE students SET studentNo = ?, name = ?, gender = ?, className = ? WHERE id = ?',
    ).run(data.studentNo, data.name, data.gender, data.className, id)
  },

  /** 删除学生；其成绩通过外键级联删除。 */
  deleteStudent: (id: string): void => {
    db.prepare('DELETE FROM students WHERE id = ?').run(id)
  },

  // ---- 成绩 ----
  getGrades: (): Grade[] => db.prepare('SELECT * FROM grades').all() as Grade[],

  findGrade: (studentId: string, subject: string): Grade | undefined =>
    db
      .prepare('SELECT * FROM grades WHERE studentId = ? AND subject = ?')
      .get(studentId, subject) as Grade | undefined,

  /** 录入或更新成绩：同一学生同一科目已存在则更新分数，否则新增。 */
  upsertGrade: (studentId: string, subject: string, score: number): void => {
    db.prepare(
      `INSERT INTO grades (id, studentId, subject, score) VALUES (?, ?, ?, ?)
       ON CONFLICT(studentId, subject) DO UPDATE SET score = excluded.score`,
    ).run(crypto.randomUUID(), studentId, subject, score)
  },
}
