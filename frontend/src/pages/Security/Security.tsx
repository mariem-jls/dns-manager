import React, { useMemo, useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import { addRpzEntry, deleteRpzEntry, fetchDnssecStatus, fetchDotDohStatus, fetchRpzEntries, rotateDnssec } from '../../api/security'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export default function SecurityPage(){
  const queryClient = useQueryClient()
  const [domain, setDomain] = useState('')
  const [zoneName, setZoneName] = useState('dynamix.com')

  const dnssecQuery = useQuery({ queryKey: ['security-dnssec'], queryFn: fetchDnssecStatus, refetchInterval: 60_000 })
  const rpzQuery = useQuery({ queryKey: ['security-rpz'], queryFn: fetchRpzEntries, refetchInterval: 30_000 })
  const dotDohQuery = useQuery({ queryKey: ['security-dot-doh'], queryFn: fetchDotDohStatus, refetchInterval: 60_000 })

  const addMutation = useMutation({
    mutationFn: addRpzEntry,
    onSuccess: async () => {
      setDomain('')
      await queryClient.invalidateQueries({ queryKey: ['security-rpz'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRpzEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['security-rpz'] })
    },
  })

  const rotateMutation = useMutation({
    mutationFn: rotateDnssec,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['security-dnssec'] })
    },
  })

  const signedZones = dnssecQuery.data?.signed_zones ?? []
  const rpzEntries = rpzQuery.data?.items ?? []
  const dotDoh = dotDohQuery.data ?? { dot: {}, doh: {} }

  const securityCards = useMemo(() => [
    { label: 'DNSSEC', value: dnssecQuery.data?.enabled ? 'Activé' : 'Inactif', tone: dnssecQuery.data?.enabled ? 'text-[#1a7f37]' : 'text-[#cf222e]' },
    { label: 'RPZ', value: `${rpzEntries.length} entrées`, tone: 'text-[#24292f]' },
    { label: 'DoT', value: dotDoh.dot?.enabled ? `Port ${dotDoh.dot.port}` : 'Désactivé', tone: dotDoh.dot?.enabled ? 'text-[#1a7f37]' : 'text-[#cf222e]' },
    { label: 'DoH', value: dotDoh.doh?.enabled ? `Port ${dotDoh.doh.port}` : 'Désactivé', tone: dotDoh.doh?.enabled ? 'text-[#1a7f37]' : 'text-[#cf222e]' },
  ], [dnssecQuery.data, dotDoh, rpzEntries.length])

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">Sécurité DNS</p>
          <h1 className="mt-1 text-3xl font-bold text-[#24292f]">Security</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#586069]">DNSSEC, RPZ et exposition DoT/DoH pour piloter la posture de sécurité DNS.</p>
        </div>
        <div className="rounded-full border border-[#d0d7de] bg-white px-3 py-1 text-sm text-[#586069] shadow-sm">Toutes les actions sont auditées</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {securityCards.map(card => (
          <Card key={card.label} className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
            <div className="text-sm text-[#586069]">{card.label}</div>
            <div className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">DNSSEC</h2>
            <span className="text-sm text-[#586069]">{dnssecQuery.isLoading ? 'Chargement...' : 'Statut actuel'}</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Zone à signer / renouveler</label>
              <input value={zoneName} onChange={(event) => setZoneName(event.target.value)} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => rotateMutation.mutate({ zone_name: zoneName })} disabled={rotateMutation.isPending}>Rotation des clés</Button>
            </div>
            <div className="rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-4">
              <div className="text-sm font-semibold text-[#24292f]">Zones signées</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {signedZones.length === 0 && <span className="text-sm text-[#586069]">Aucune zone signée détectée</span>}
                {signedZones.map((zone: string) => (
                  <span key={zone} className="rounded-full bg-white px-3 py-1 text-sm text-[#24292f] border border-[#d0d7de]">{zone}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">DoT / DoH</h2>
            <span className="text-sm text-[#586069]">Transport sécurisé</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#d0d7de] p-4">
              <div className="text-sm text-[#586069]">DNS over TLS</div>
              <div className="mt-2 text-lg font-semibold text-[#24292f]">{dotDoh.dot?.enabled ? 'Activé' : 'Inactif'}</div>
              <div className="mt-1 text-sm text-[#586069]">Port {dotDoh.dot?.port ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-[#d0d7de] p-4">
              <div className="text-sm text-[#586069]">DNS over HTTPS</div>
              <div className="mt-2 text-lg font-semibold text-[#24292f]">{dotDoh.doh?.enabled ? 'Activé' : 'Inactif'}</div>
              <div className="mt-1 text-sm text-[#586069]">Port {dotDoh.doh?.port ?? '—'}</div>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-4 text-sm text-[#586069]">
            Certificats: {dotDoh.dot?.certificate ?? '—'} / {dotDoh.doh?.certificate ?? '—'}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">RPZ blacklist</h2>
            <span className="text-sm text-[#586069]">File-backed</span>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (!domain.trim()) {
                return
              }
              addMutation.mutate({ domain })
            }}
          >
            <input
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="bad-domain.example"
              className="flex-1 rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
            />
            <Button type="submit" disabled={addMutation.isPending}>Ajouter</Button>
          </form>

          <div className="mt-4 space-y-2">
            {rpzEntries.length === 0 && <div className="text-sm text-[#586069]">Aucune entrée RPZ.</div>}
            {rpzEntries.map((entry: string) => (
              <div key={entry} className="flex items-center justify-between rounded-lg border border-[#d0d7de] px-3 py-2">
                <span className="text-sm text-[#24292f]">{entry}</span>
                <button
                  className="rounded-md border border-[#d0d7de] px-3 py-1 text-sm text-[#cf222e] hover:bg-[#fff8f8]"
                  onClick={() => deleteMutation.mutate(entry)}
                  type="button"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Audit sécurité</h2>
            <span className="text-sm text-[#586069]">Dernières actions</span>
          </div>
          <div className="space-y-3">
            {[
              'Rotation DNSSEC demandée pour dynamix.com',
              'Ajout de bad-domain.example dans la RPZ',
              'DoT/DoH vérifiés sur les endpoints exposés',
            ].map((item) => (
              <div key={item} className="rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-3 text-sm text-[#24292f]">{item}</div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  )
}