import { useEffect, useMemo, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, ChevronsUpDown, ClipboardList, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import Navbar from '@/components/Navbar'
import GradeFormModal, { type GradeInput } from '@/components/GradeFormModal'
import { apiRequest } from '@/utils/api'
import { useAuthStore } from '@/store/useAuthStore'
import type { GradeRow, GradeTable, Student } from '@/types'
import { cn } from '@/lib/utils'

type SortDir = 'asc' | 'desc'
// 排序键：固定列名或某个科目名或 average
type SortKey = 'studentNo' | 'name' | 'className' | 'average' | string

/** 成绩管理页：表格展示所有学生各科成绩，支持排序与录入。 */
export default function Grades() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')
  const [table, setTable] = useState<GradeTable>({ subjects: [], rows: [] })
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('studentNo')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const load = async () => {
    setLoading(true)
    try {
      const gradeRes = await apiRequest<{ data: GradeTable }>('/grades')
      setTable(gradeRes.data)
      if (isAdmin) {
        const stuRes = await apiRequest<{ data: Student[] }>('/students')
        setStudents(stuRes.data)
      }
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const getValue = (row: GradeRow, key: SortKey): string | number | null => {
    if (key === 'studentNo') return row.studentNo
    if (key === 'name') return row.name
    if (key === 'className') return row.className
    if (key === 'average') return row.average
    return row.scores[key] ?? null // 科目分数
  }

  const sortedRows = useMemo(() => {
    const rows = [...table.rows]
    rows.sort((a, b) => {
      const av = getValue(a, sortKey)
      const bv = getValue(b, sortKey)
      // null 值始终排在末尾
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv), 'zh-CN')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [table.rows, sortKey, sortDir])

  const handleSubmit = async (data: GradeInput) => {
    await apiRequest('/grades', { method: 'POST', body: data })
    await load()
  }

  /** 将当前表格（按当前排序）导出为 Excel 文件。 */
  const handleExport = () => {
    const data = sortedRows.map((row) => {
      const record: Record<string, string | number> = {
        学号: row.studentNo,
        姓名: row.name,
        性别: row.gender,
        班级: row.className,
      }
      table.subjects.forEach((subject) => {
        record[subject] = row.scores[subject] ?? ''
      })
      record['平均分'] = row.average ?? ''
      return record
    })

    const header = ['学号', '姓名', '性别', '班级', ...table.subjects, '平均分']
    const worksheet = XLSX.utils.json_to_sheet(data, { header })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '成绩表')
    const today = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `成绩表_${today}.xlsx`)
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ChevronsUpDown size={13} className="opacity-40" />
    return sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
  }

  const HeaderCell = ({
    column,
    label,
    align = 'left',
  }: {
    column: SortKey
    label: string
    align?: 'left' | 'center'
  }) => (
    <th className="px-4 py-3 font-medium">
      <button
        onClick={() => handleSort(column)}
        className={cn(
          'inline-flex items-center gap-1 transition hover:text-amber',
          align === 'center' && 'justify-center',
        )}
      >
        {label}
        <SortIcon column={column} />
      </button>
    </th>
  )

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-navy">成绩管理</h2>
            <p className="mt-1 text-sm text-navy/60">
              点击表头可对任意列排序 · 共 {table.rows.length} 名学生 · {table.subjects.length} 门科目
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={handleExport} disabled={table.rows.length === 0}>
              <Download size={16} /> 导出成绩
            </button>
            {isAdmin && (
              <button className="btn-accent" onClick={() => setModalOpen(true)}>
                <Plus size={16} /> 录入成绩
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="overflow-hidden rounded-lg border border-navy/10 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy text-left text-cream">
                  <HeaderCell column="studentNo" label="学号" />
                  <HeaderCell column="name" label="姓名" />
                  <HeaderCell column="className" label="班级" />
                  {table.subjects.map((subject) => (
                    <HeaderCell key={subject} column={subject} label={subject} />
                  ))}
                  <th className="bg-amber/20 px-4 py-3 font-medium">
                    <button
                      onClick={() => handleSort('average')}
                      className="inline-flex items-center gap-1 transition hover:text-amber"
                    >
                      平均分
                      <SortIcon column="average" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4 + table.subjects.length} className="px-4 py-10 text-center text-navy/50">
                      加载中...
                    </td>
                  </tr>
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={4 + table.subjects.length} className="px-4 py-12 text-center text-navy/50">
                      <ClipboardList className="mx-auto mb-2 opacity-40" size={32} />
                      暂无成绩数据
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row, i) => (
                    <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-cream/60'}>
                      <td className="px-4 py-3 font-medium text-navy">{row.studentNo}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{row.className}</td>
                      {table.subjects.map((subject) => {
                        const val = row.scores[subject]
                        return (
                          <td key={subject} className="px-4 py-3">
                            {val === undefined ? (
                              <span className="text-navy/30">—</span>
                            ) : (
                              <span className={val < 60 ? 'font-medium text-red-600' : ''}>{val}</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="bg-amber/10 px-4 py-3 font-semibold text-navy">
                        {row.average ?? <span className="text-navy/30">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isAdmin && (
        <GradeFormModal
          open={modalOpen}
          students={students}
          subjects={table.subjects}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
