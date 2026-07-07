import { type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** 通用居中弹窗容器。 */
export default function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-navy/10 bg-cream shadow-card">
        <div className="flex items-center justify-between border-b border-navy/10 px-5 py-4">
          <h3 className="font-display text-lg font-semibold text-navy">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-navy/60 transition hover:bg-navy/10 hover:text-navy"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
