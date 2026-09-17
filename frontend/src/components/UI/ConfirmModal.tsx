import React from 'react'
import Modal from './Modal'
import Button from './Button'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-[#24292f]">{message}</p>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="border border-[#d0d7de] bg-white text-[#24292f] hover:bg-[#f6f8fa]"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              variant === 'danger'
                ? 'bg-[#cf222e] text-white hover:bg-[#a40e26] border-[#cf222e]'
                : 'bg-[#bf8700] text-white hover:bg-[#9a6700] border-[#bf8700]'
            }
          >
            {loading ? 'En cours...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
