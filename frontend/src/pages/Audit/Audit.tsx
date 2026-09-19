import React, { useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '../../api/audit'

const PAGE_SIZE = 8

export default function AuditPage(){
  const [page, setPage] = useState(0)
  const skip = page * PAGE_SIZE

  const logsQuery = useQuery({ 
    queryKey: ['audit-logs', skip], 
    queryFn: () => fetchAuditLogs({ skip, limit: PAGE_SIZE }), 
    refetchInterval: 30_000 
  })

  const items = logsQuery.data?.items ?? []
  const total = logsQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">Traçabilité</p>
          <h1 className="mt-1 text-3xl font-bold text-[#24292f]">Audit</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#586069]">
            Historique des opérations sensibles exécutées depuis l'interface.
          </p>
        </div>
        <div className="text-sm text-[#586069]">
          {total} log(s)
        </div>
      </div>

      <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
        <div className="overflow-hidden rounded-lg border border-[#d0d7de]">
          <div className="grid grid-cols-5 bg-[#f6f8fa] px-4 py-3 text-sm font-medium text-[#24292f]">
            <div>Heure</div>
            <div>Utilisateur</div>
            <div>Action</div>
            <div>Détails</div>
            <div>Niveau</div>
          </div>
          <div className="divide-y divide-[#d0d7de] bg-white">
            {logsQuery.isLoading && (
              <div className="px-4 py-6 text-sm text-[#586069]">
                Chargement...
              </div>
            )}

            {!logsQuery.isLoading && items.length === 0 && (
              <div className="px-4 py-6 text-sm text-[#586069]">
                Aucun log d'audit trouvé.
              </div>
            )}

            {items.map((log: any, index: number) => (
              <div 
                key={`${log.id ?? log.timestamp}-${index}`} 
                className="grid grid-cols-5 px-4 py-3 text-sm text-[#24292f] hover:bg-[#f6f8fa]"
              >
                <div className="text-[#586069]">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}
                </div>
                <div>{log.actor ?? 'system'}</div>
                <div className="font-medium">{log.action ?? '—'}</div>
                <div className="text-[#586069]">{log.details ?? log.raw ?? '—'}</div>
                <div>
                  <span className="rounded-full bg-[#ddf4ff] px-2.5 py-1 text-xs font-semibold text-[#0969da]">
                    {log.level ?? 'INFO'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between border-t border-[#d0d7de] bg-[#f6f8fa] px-4 py-3">
              <div className="text-sm text-[#586069]">
                Page {page + 1} sur {totalPages} ({total} logs)
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
          )}
        </div>
      </Card>
    </Layout>
  )
}