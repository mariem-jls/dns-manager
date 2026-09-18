import React, { useState } from 'react'
import Card from '../UI/Card'
import Button from '../UI/Button'
import Alert from '../UI/Alert'
import { useRecords, useCreateRecord, useDeleteRecord, DnsRecord } from '../../hooks/useRecords'

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'PTR', 'CAA']

interface Props {
  zoneName: string
}

export default function ZoneRecords({ zoneName }: Props) {
  const { data: records = [], isLoading, error } = useRecords(zoneName)
  const create = useCreateRecord()
  const remove = useDeleteRecord()

  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [name, setName] = useState('@')
  const [type, setType] = useState('A')
  const [value, setValue] = useState('')
  const [ttl, setTtl] = useState(3600)
  const [priority, setPriority] = useState<number | null>(null)

  const resetForm = () => {
    setName('@')
    setType('A')
    setValue('')
    setTtl(3600)
    setPriority(null)
    setFormError(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    try {
      await create.mutateAsync({
        zoneName,
        name,
        type,
        value,
        ttl,
        priority,
      })
      resetForm()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? 'Erreur lors de l\'ajout')
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('Supprimer cet enregistrement ?')) return
    try {
      await remove.mutateAsync({ zoneName, recordId })
    } catch (err) {
      // Géré par l'Alert
    }
  }

  return (
    <div className="space-y-4">
      {/* Bouton Ajouter */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#24292f]">
          Enregistrements DNS
        </h3>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : 'Ajouter un enregistrement'}
        </Button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card className="border border-[#d0d7de] bg-[#f6f8fa]">
          <form onSubmit={handleSubmit} className="space-y-3">
            {formError && (
              <Alert variant="danger" title="Erreur">
                {formError}
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#24292f]">
                  Nom
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="@"
                  required
                  className="w-full rounded-md border border-[#d0d7de] p-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#24292f]">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-md border border-[#d0d7de] p-2 text-sm"
                >
                  {RECORD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {(type === 'MX' || type === 'SRV') && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#24292f]">
                    Priorité
                  </label>
                  <input
                    type="number"
                    value={priority ?? ''}
                    onChange={(e) => setPriority(e.target.value ? Number(e.target.value) : null)}
                    placeholder="10"
                    className="w-full rounded-md border border-[#d0d7de] p-2 text-sm"
                  />
                </div>
              )}

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-[#24292f]">
                  Valeur
                </label>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="192.168.1.1 ou example.com"
                  required
                  className="w-full rounded-md border border-[#d0d7de] p-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#24292f]">
                  TTL
                </label>
                <input
                  type="number"
                  value={ttl}
                  onChange={(e) => setTtl(Number(e.target.value))}
                  className="w-full rounded-md border border-[#d0d7de] p-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Liste */}
      {isLoading && (
        <div className="py-4 text-sm text-[#586069]">Chargement...</div>
      )}

      {error && (
        <Alert variant="warning" title="Attention">
          Impossible de charger les enregistrements.
        </Alert>
      )}

      {!isLoading && records.length === 0 && (
        <div className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-6 text-center text-sm text-[#586069]">
          Aucun enregistrement dans cette zone.
        </div>
      )}

      {records.length > 0 && (
        <div className="overflow-hidden rounded-md border border-[#d0d7de]">
          <div className="grid grid-cols-[1fr_80px_80px_2fr_60px] gap-2 bg-[#f6f8fa] px-3 py-2 text-xs font-medium text-[#24292f]">
            <div>Nom</div>
            <div>Type</div>
            <div>TTL</div>
            <div>Valeur</div>
            <div></div>
          </div>
          <div className="divide-y divide-[#d0d7de] bg-white">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="grid grid-cols-[1fr_80px_80px_2fr_60px] items-center gap-2 px-3 py-2 text-sm"
              >
                <div className="font-mono text-[#24292f] truncate">{rec.name}</div>
                <div>
                  <span className="rounded bg-[#ddf4ff] px-2 py-0.5 text-xs font-semibold text-[#0969da]">
                    {rec.type}
                  </span>
                </div>
                <div className="text-[#586069]">{rec.ttl}</div>
                <div className="font-mono text-[#24292f] truncate">
                  {rec.priority !== null ? `${rec.priority} ` : ''}
                  {rec.value}
                </div>
                <div className="text-right">
                  <button
                    onClick={() => handleDelete(rec.id)}
                    className="rounded border border-[#d0d7de] px-2 py-1 text-xs text-[#cf222e] hover:bg-[#fff8f8]"
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}