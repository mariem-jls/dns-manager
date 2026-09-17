import React from 'react'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { useZone } from '../../hooks/useZones'

interface ZoneDetailModalProps {
  open: boolean
  onClose: () => void
  zoneName: string | null
  onEdit?: (name: string) => void
}

export default function ZoneDetailModal({
  open,
  onClose,
  zoneName,
  onEdit,
}: ZoneDetailModalProps) {
  const { data: zone, isLoading, error } = useZone(zoneName)

  return (
    <Modal open={open} onClose={onClose} title={`Zone : ${zoneName ?? ''}`}>
      {isLoading && (
        <div className="py-6 text-center text-sm text-[#586069]">
          Chargement...
        </div>
      )}

      {error && (
        <div className="rounded-md border border-[#cf222e] bg-[#ffebe9] p-3 text-sm text-[#cf222e]">
          Erreur lors du chargement de la zone.
        </div>
      )}

      {zone && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[#586069]">Nom</div>
              <div className="font-medium text-[#24292f]">{zone.name}</div>
            </div>
            <div>
              <div className="text-[#586069]">Type</div>
              <div className="font-medium text-[#24292f] capitalize">{zone.type}</div>
            </div>
            <div>
              <div className="text-[#586069]">Serial</div>
              <div className="font-medium text-[#24292f]">{zone.serial}</div>
            </div>
            <div>
              <div className="text-[#586069]">Fichier</div>
              <div className="font-mono text-xs text-[#24292f] break-all">
                {zone.file ?? '—'}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-[#586069]">Description</div>
              <div className="font-medium text-[#24292f]">
                {zone.description || <span className="text-[#586069] italic">Aucune description</span>}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#d0d7de] pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="border border-[#d0d7de] bg-white text-[#24292f] hover:bg-[#f6f8fa]"
            >
              Fermer
            </Button>
            {onEdit && (
              <Button
                type="button"
                onClick={() => {
                  onClose()
                  onEdit(zone.name)
                }}
              >
                Modifier
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
