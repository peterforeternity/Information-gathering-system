import { useState, useEffect, type FormEvent } from 'react'
import Modal from '@/components/Modal'
import type { Student } from '@/types'

export interface GradeInput {
  studentId: string
  subject: string
  score: number
}

interface Props {
  open: boolean
  students: Student[]
  subjects: string[]
  onClose: () => void
  onSubmit: (data: GradeInput) => Promise<void>
}

/** 成绩录入弹窗：选择学生、科目并输入分数。 */
export default function GradeFormModal({ open, students, subjects, onClose, onSubmit }: Props) {
  const [studentId, setStudentId] = useState('')
  const [subject, setSubject] = useState('')
  const [score, setScore] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setStudentId(students[0]?.id ?? '')
      setSubject('')
      setScore('')
      setError('')
    }
  }, [open, students])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmedSubject = subject.trim()
    const numScore = Number(score)
    if (!studentId) {
      setError('请选择学生')
      return
    }
    if (!trimmedSubject) {
      setError('请填写科目名称')
      return
    }
    if (!Number.isFinite(numScore) || numScore < 0 || numScore > 100) {
      setError('分数必须在 0-100 之间')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit({ studentId, subject: trimmedSubject, score: numScore })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title="录入成绩" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">学生</label>
          <select
            className="field"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {students.length === 0 && <option value="">暂无学生</option>}
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.studentNo} - {s.name}（{s.className}）
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">科目</label>
          <input
            className="field"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="如 语文 / 数学 / 英语"
            list="subject-options"
          />
          <datalist id="subject-options">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-navy/50">
            可从已有科目中选择，或输入新科目。相同学生同一科目会覆盖更新。
          </p>
        </div>
        <div>
          <label className="label">分数（0-100）</label>
          <input
            className="field"
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="请输入分数"
          />
        </div>

        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={loading || students.length === 0}>
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
