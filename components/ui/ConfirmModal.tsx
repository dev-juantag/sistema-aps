'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-slate-100 animate-in zoom-in-95 fade-in duration-200">
        {/* Icon */}
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${danger ? 'bg-red-50 text-red-600' : 'bg-[#081e69]/10 text-[#081e69]'}`}>
          <AlertTriangle className="w-7 h-7" />
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-center text-slate-900 mb-2">
          {title}
        </h2>
        <p className="text-sm text-slate-600 text-center leading-relaxed">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg ${
              danger
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                : 'bg-[#081e69] hover:bg-[#0f2d99] shadow-[#081e69]/30'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
