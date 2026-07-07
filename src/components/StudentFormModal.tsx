import { useState, useEffect, type FormEvent } from 'react'
import Modal from '@/components/Modal'
import type { Student } from '@/types'

export interface StudentInput {
  studentNo: string
  name: string
  gender: '男' | '女'
  className: string
}

interface Props {
  open: boolean
  editing: Student | null
  onClose: () => void
  onSubmit: (data: StudentInput) => Promise<void>
}

const empty: StudentInput = { studentNo: '', name: '', gender: '男', className: '' }

/** 新增 / 编辑学生的表单弹窗。 */
export default function StudentFormModal({ open, editing, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<StudentInput>(empty)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              studentNo: editing.studentNo,
              name: editing.name,
              gender: editing.gender,
              className: editing.className,
            }
          : empty,
      )
      setError('')
    }
  }, [open, editing])

  const update = (key: keyof StudentInput, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.studentNo.trim() || !form.name.trim() || !form.className.trim()) {
      setError('请填写所有字段')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        studentNo: form.studentNo.trim(),
        name: form.name.trim(),
        gender: form.gender,
        className: form.className.trim(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title={editing ? '编辑学生' : '新增学生'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">学号</label>
          <input
            className="field"
            value={form.studentNo}
            onChange={(e) => update('studentNo', e.target.value)}
            placeholder="如 2024001"
          />
        </div>
        <div>
          <label className="label">姓名</label>
          <input
            className="field"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="请输入姓名"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">性别</label>
            <select
              className="field"
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div>
            <label className="label">班级</label>
            <input
              className="field"
              value={form.className}
              onChange={(e) => update('className', e.target.value)}
              placeholder="如 三年级二班"
            />
          </div>
        </div>

        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
