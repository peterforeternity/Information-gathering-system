import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import Navbar from '@/components/Navbar'
import StudentFormModal, { type StudentInput } from '@/components/StudentFormModal'
import { apiRequest } from '@/utils/api'
import type { Student } from '@/types'

/** 学生管理页：列表 + 增删改。 */
export default function Students() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiRequest<{ data: Student[] }>('/students')
      setStudents(res.data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (data: StudentInput) => {
    if (editing) {
      await apiRequest(`/students/${editing.id}`, { method: 'PUT', body: data })
    } else {
      await apiRequest('/students', { method: 'POST', body: data })
    }
    await load()
  }

  const handleDelete = async (student: Student) => {
    if (!window.confirm(`确定删除学生「${student.name}」吗？其成绩也将一并删除。`)) return
    try {
      await apiRequest(`/students/${student.id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (student: Student) => {
    setEditing(student)
    setModalOpen(true)
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-navy">学生管理</h2>
            <p className="mt-1 text-sm text-navy/60">共 {students.length} 名学生</p>
          </div>
          <button className="btn-accent" onClick={openCreate}>
            <Plus size={16} /> 新增学生
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy text-left text-cream">
                  <th className="px-4 py-3 font-medium">学号</th>
                  <th className="px-4 py-3 font-medium">姓名</th>
                  <th className="px-4 py-3 font-medium">性别</th>
                  <th className="px-4 py-3 font-medium">班级</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-navy/50">
                      加载中...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-navy/50">
                      <Users className="mx-auto mb-2 opacity-40" size={32} />
                      暂无学生，点击右上角「新增学生」开始录入
                    </td>
                  </tr>
                ) : (
                  students.map((s, i) => (
                    <tr
                      key={s.id}
                      className={i % 2 === 0 ? 'bg-white' : 'bg-cream/60'}
                    >
                      <td className="px-4 py-3 font-medium text-navy">{s.studentNo}</td>
                      <td className="px-4 py-3">{s.name}</td>
                      <td className="px-4 py-3">{s.gender}</td>
                      <td className="px-4 py-3">{s.className}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-navy transition hover:bg-navy/10"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil size={14} /> 编辑
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-red-600 transition hover:bg-red-50"
                            onClick={() => handleDelete(s)}
                          >
                            <Trash2 size={14} /> 删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <StudentFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
