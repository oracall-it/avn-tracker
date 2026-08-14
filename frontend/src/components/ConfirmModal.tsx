import { AlertTriangle } from 'lucide-react'
import { useScrollLock } from '../hooks/useScrollLock'

interface Props {
  title: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel }: Props) {
  useScrollLock()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">{title}</h2>
            {message && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">{message}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-medium rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
