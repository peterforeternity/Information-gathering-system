/** 前端共享类型定义 */

export type Role = 'admin' | 'student'

export interface AuthUser {
  id: string
  username: string
  role: Role
}

export interface Student {
  id: string
  studentNo: string
  name: string
  gender: '男' | '女'
  className: string
}

export interface GradeRow {
  id: string
  studentNo: string
  name: string
  gender: '男' | '女'
  className: string
  scores: Record<string, number>
  average: number | null
}

export interface GradeTable {
  subjects: string[]
  rows: GradeRow[]
}
