import React, { useEffect, useState } from 'react'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import Alert from '../UI/Alert'
import { useUpdateZone, useZone } from '../../hooks/useZones'

interface ZoneEditModalProps {
  open: boolean
  onClose: () => void
  zoneName: string | null
}

export default function ZoneEditModal({ open, onClose, zoneName }: ZoneEditModalProps) {
  const { data: zone, isLoading } = useZone(zoneName)
  const update = useUpdateZone()
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Pré-remplir quand la zone change
  useEffect(() => {
    if (zone) {
      setDescription(zone.description ?? '')
    }
  }, [zone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!zoneName) return
    setError(null)
    try {
      await update.mutateAsync({
        name: zoneName,
        description: description.trim() || null,
      })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Erreur lors de la mise à jour')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Modifier : ${zoneName ?? ''}`}>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-[#586069]">Chargement...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="danger" title="Erreur">
              {error}
            </Alert>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-[#24292f]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Description de la zone..."
              className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
            />
            <p className="mt-1 text-xs text-[#586069]">
              Laisser vide pour retirer la description.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={onClose}
              disabled={update.isPending}
              className="border border-[#d0d7de] bg-white text-[#24292f] hover:bg-[#f6f8fa]"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
