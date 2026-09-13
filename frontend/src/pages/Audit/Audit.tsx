import React from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '../../api/audit'

export default function AuditPage(){
  const logsQuery = useQuery({ queryKey: ['audit-logs'], queryFn: () => fetchAuditLogs({ limit: 100 }), refetchInterval: 30_000 })

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">Traçabilité</p>
          <h1 className="mt-1 text-3xl font-bold text-[#24292f]">Audit</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#586069]">Historique des opérations sensibles exécutées depuis l’interface.</p>
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
            {(logsQuery.data?.items ?? []).map((log: any, index: number) => (
              <div key={`${log.timestamp}-${index}`} className="grid grid-cols-5 px-4 py-3 text-sm text-[#24292f]">
                <div>{log.timestamp ?? '—'}</div>
                <div>{log.actor ?? 'system'}</div>
                <div className="font-medium">{log.action ?? '—'}</div>
                <div className="text-[#586069]">{log.details ?? log.raw ?? '—'}</div>
                <div><span className="rounded-full bg-[#ddf4ff] px-2.5 py-1 text-xs font-semibold text-[#0969da]">{log.level ?? 'INFO'}</span></div>
              </div>
            ))}
            {(logsQuery.data?.items ?? []).length === 0 && <div className="px-4 py-6 text-sm text-[#586069]">Aucun log d’audit trouvé.</div>}
          </div>
        </div>
      </Card>
    </Layout>
  )
}