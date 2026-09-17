import React, { useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import Alert from '../../components/UI/Alert'
import ConfirmModal from '../../components/UI/ConfirmModal'
import ZoneDetailModal from '../../components/Zones/ZoneDetailModal'
import ZoneEditModal from '../../components/Zones/ZoneEditModal'
import {
  useZones,
  useCreateZone,
  useDeleteZone,
} from '../../hooks/useZones'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(3),
  type: z.enum(['master', 'slave']).default('master'),
})

const PAGE_SIZE = 5

export default function ZonesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'serial'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const skip = page * PAGE_SIZE
  const { data, isLoading } = useZones({ 
    search, 
    skip, 
    limit: PAGE_SIZE 
  })
  const zones = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const create = useCreateZone()
  const remove = useDeleteZone()

  const [openCreate, setOpenCreate] = useState(false)
  const [detailZone, setDetailZone] = useState<string | null>(null)
  const [editZone, setEditZone] = useState<string | null>(null)
  const [deleteZone, setDeleteZone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (formData: any) => {
    setError(null)
    try {
      await create.mutateAsync(formData)
      reset()
      setOpenCreate(false)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Erreur lors de la création')
    }
  }

  const handleDelete = async () => {
    if (!deleteZone) return
    try {
      await remove.mutateAsync(deleteZone)
      setDeleteZone(null)
    } catch (e) {
      // Géré par l'Alert
    }
  }

  const sortedZones = [...zones].sort((a, b) => {
    const aVal = a[sortBy] ?? ''
    const bVal = b[sortBy] ?? ''
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (column: 'name' | 'type' | 'serial') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">
            Gestion DNS
          </p>
          <h2 className="mt-1 text-3xl font-bold text-[#24292f]">Zones</h2>
          <p className="mt-2 text-sm text-[#586069]">
            Créer, valider et administrer les zones hébergées par BIND9.
          </p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>Nouvelle zone</Button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher une zone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="w-full max-w-md rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#d0d7de] bg-white shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
        <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3 text-sm font-medium text-[#24292f] flex items-center justify-between">
          <span>Liste des zones</span>
          <span className="text-[#586069]">{total} zone(s)</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-[#586069]">
            Chargement des zones...
          </div>
        ) : zones.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#586069]">
            {search
              ? 'Aucune zone ne correspond à votre recherche.'
              : 'Aucune zone disponible pour le moment.'}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b border-[#d0d7de] bg-[#f6f8fa]">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-[#586069] uppercase tracking-wider cursor-pointer hover:bg-[#eaeef2]"
                    onClick={() => handleSort('name')}
                  >
                    Nom {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-[#586069] uppercase tracking-wider cursor-pointer hover:bg-[#eaeef2]"
                    onClick={() => handleSort('type')}
                  >
                    Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-[#586069] uppercase tracking-wider cursor-pointer hover:bg-[#eaeef2]"
                    onClick={() => handleSort('serial')}
                  >
                    Serial {sortBy === 'serial' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#586069] uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#586069] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de]">
                {sortedZones.map((z) => (
                  <tr key={z.name} className="hover:bg-[#f6f8fa] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#24292f]">{z.name}</div>
                      <div className="text-xs text-[#586069]">{z.file ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        z.type === 'master' 
                          ? 'bg-[#dafbe1] text-[#1a7f37]' 
                          : 'bg-[#fff8c5] text-[#9a6700]'
                      }`}>
                        {z.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#24292f]">
                      {z.serial}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#586069]">
                      {z.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDetailZone(z.name)}
                          className="rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-sm hover:bg-[#f6f8fa]"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => setEditZone(z.name)}
                          className="rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-sm hover:bg-[#f6f8fa]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteZone(z.name)}
                          className="rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-sm text-[#cf222e] hover:bg-[#fff8f8]"
                        >
                          Suppr.
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-[#d0d7de] bg-[#f6f8fa] px-4 py-3">
              <div className="text-sm text-[#586069]">
                Page {page + 1} sur {totalPages} ({total} zones)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-sm hover:bg-[#f6f8fa] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Précédent
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-sm hover:bg-[#f6f8fa] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Créer une zone">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="danger" title="Erreur">
              {error}
            </Alert>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-[#24292f]">
              Nom
            </label>
            <input
              {...register('name')}
              placeholder="exemple.com"
              className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[#cf222e]">
                Nom requis (min. 3 caractères)
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#24292f]">
              Type
            </label>
            <select
              {...register('type')}
              className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
            >
              <option value="master">master</option>
              <option value="slave">slave</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setOpenCreate(false)}
              className="border border-[#d0d7de] bg-white text-[#24292f] hover:bg-[#f6f8fa]"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      <ZoneDetailModal
        open={!!detailZone}
        onClose={() => setDetailZone(null)}
        zoneName={detailZone}
        onEdit={(name) => setEditZone(name)}
      />

      <ZoneEditModal
        open={!!editZone}
        onClose={() => setEditZone(null)}
        zoneName={editZone}
      />

      <ConfirmModal
        open={!!deleteZone}
        onClose={() => setDeleteZone(null)}
        onConfirm={handleDelete}
        title="Supprimer la zone"
        message={`Êtes-vous sûr de vouloir supprimer la zone "${deleteZone}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        loading={remove.isPending}
      />
    </Layout>
  )
}