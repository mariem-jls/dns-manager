import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import Alert from '../../components/UI/Alert'
import {
  addRpzEntry,
  deleteRpzEntry,
  fetchDnssecStatus,
  fetchDotDohStatus,
  fetchRpzEntries,
  fetchSecurityAudit,
  rotateDnssec,
  signDnssec,
  fetchFalcoEvents,
  fetchFalcoStats,
} from '../../api/security'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Helper : formatage date
const formatDate = (date: string | null | undefined) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Helper : formatage durée
const formatDuration = (date: string | null | undefined) => {
  if (!date) return '—'
  const diff = new Date(date).getTime() - Date.now()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Expiré'
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  return `Dans ${days} jours`
}

// Helper : tone pour priorité Falco
const falcoPriorityTone = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'critical':
    case 'error':
      return 'bg-[#ffebe9] text-[#cf222e]'
    case 'warning':
      return 'bg-[#fff8c5] text-[#9a6700]'
    case 'notice':
      return 'bg-[#ddf4ff] text-[#0969da]'
    default:
      return 'bg-[#f6f8fa] text-[#586069]'
  }
}

export default function SecurityPage() {
  const queryClient = useQueryClient()
  const [domain, setDomain] = useState('')
  const [zoneName, setZoneName] = useState('dynamix.com')
  const [error, setError] = useState<string | null>(null)

  // Queries
  const dnssecQuery = useQuery({
    queryKey: ['security-dnssec'],
    queryFn: fetchDnssecStatus,
    refetchInterval: 60_000,
  })
  const rpzQuery = useQuery({
    queryKey: ['security-rpz'],
    queryFn: fetchRpzEntries,
    refetchInterval: 30_000,
  })
  const dotDohQuery = useQuery({
    queryKey: ['security-dot-doh'],
    queryFn: fetchDotDohStatus,
    refetchInterval: 60_000,
  })
  const auditQuery = useQuery({
    queryKey: ['security-audit'],
    queryFn: () => fetchSecurityAudit(10),
    refetchInterval: 30_000,
  })

  // Falco queries
  const falcoEventsQuery = useQuery({
    queryKey: ['security-falco-events'],
    queryFn: () => fetchFalcoEvents(20),
    refetchInterval: 30_000,
  })
  const falcoStatsQuery = useQuery({
    queryKey: ['security-falco-stats'],
    queryFn: fetchFalcoStats,
    refetchInterval: 60_000,
  })

  // Mutations
  const signMutation = useMutation({
    mutationFn: signDnssec,
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['security-dnssec'] })
      queryClient.invalidateQueries({ queryKey: ['security-audit'] })
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? 'Erreur lors de la signature')
    },
  })

  const rotateMutation = useMutation({
    mutationFn: rotateDnssec,
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['security-dnssec'] })
      queryClient.invalidateQueries({ queryKey: ['security-audit'] })
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? 'Erreur lors de la rotation')
    },
  })

  const addMutation = useMutation({
    mutationFn: addRpzEntry,
    onSuccess: () => {
      setDomain('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['security-rpz'] })
      queryClient.invalidateQueries({ queryKey: ['security-audit'] })
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Erreur lors de l'ajout")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRpzEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-rpz'] })
      queryClient.invalidateQueries({ queryKey: ['security-audit'] })
    },
  })

  // Données
  const signedZones = dnssecQuery.data?.signed_zones ?? []
  const zonesInfo = dnssecQuery.data?.zones_info ?? []
  const rpzEntries = rpzQuery.data?.items ?? []
  const dotDoh = dotDohQuery.data ?? { dot: {}, doh: {} }
  const auditLogs = auditQuery.data?.items ?? []
  const falcoEvents = falcoEventsQuery.data?.items ?? []
  const falcoStats = falcoStatsQuery.data ?? null

  // Cartes sécurité
  const securityCards = [
    {
      label: 'DNSSEC',
      value: dnssecQuery.data?.enabled ? `${signedZones.length} zone(s)` : 'Inactif',
      tone: dnssecQuery.data?.enabled ? 'text-[#1a7f37]' : 'text-[#cf222e]',
      subtitle: dnssecQuery.data?.enabled ? 'Signatures actives' : 'Aucune zone signée',
    },
    {
      label: 'RPZ',
      value: `${rpzEntries.length} domaine(s)`,
      tone: rpzEntries.length > 0 ? 'text-[#1a7f37]' : 'text-[#586069]',
      subtitle: rpzEntries.length > 0 ? 'Liste noire active' : 'Liste noire vide',
    },
    {
      label: 'Falco',
      value: falcoStats ? `${falcoStats.total} événement(s)` : 'Inactif',
      tone:
        (falcoStats?.by_priority?.Critical ?? 0) > 0
          ? 'text-[#cf222e]'
          : (falcoStats?.by_priority?.Warning ?? 0) > 0
            ? 'text-[#9a6700]'
            : 'text-[#1a7f37]',
      subtitle: 'Runtime security',
    },
    {
      label: 'DoT / DoH',
      value:
        dotDoh.dot?.enabled && dotDoh.doh?.enabled
          ? 'Actifs'
          : dotDoh.dot?.enabled || dotDoh.doh?.enabled
            ? 'Partiel'
            : 'Désactivés',
      tone:
        dotDoh.dot?.enabled && dotDoh.doh?.enabled
          ? 'text-[#1a7f37]'
          : dotDoh.dot?.enabled || dotDoh.doh?.enabled
            ? 'text-[#9a6700]'
            : 'text-[#cf222e]',
      subtitle: 'Transport sécurisé',
    },
  ]

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">
            Sécurité DNS
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#24292f]">Security</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#586069]">
            DNSSEC, RPZ, Falco et exposition DoT/DoH pour piloter la posture de sécurité DNS.
          </p>
        </div>
        <div className="rounded-full border border-[#d0d7de] bg-white px-3 py-1 text-sm text-[#586069] shadow-sm">
          Toutes les actions sont auditées
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Erreur" className="mb-4">
          {error}
        </Alert>
      )}

      {/* ============================================ */}
      {/* 4 cartes de statut */}
      {/* ============================================ */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {securityCards.map((card) => (
          <Card
            key={card.label}
            className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]"
          >
            <div className="text-sm text-[#586069]">{card.label}</div>
            <div className={`mt-2 text-2xl font-semibold ${card.tone}`}>
              {card.value}
            </div>
            <div className="mt-1 text-xs text-[#586069]">{card.subtitle}</div>
          </Card>
        ))}
      </div>

      {/* ============================================ */}
      {/* Falco - Événements runtime security */}
      {/* ============================================ */}
      <Card className="mt-6 border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#24292f]">
              Falco — Runtime Security
            </h2>
            <p className="mt-1 text-xs text-[#586069]">
              Détection d'intrusion en temps réel dans les conteneurs DNS
            </p>
          </div>
          <span className="text-sm text-[#586069]">
            {falcoStats?.total ?? 0} événement(s)
          </span>
        </div>

        {/* Compteurs par priorité */}
        {falcoStats?.by_priority && Object.keys(falcoStats.by_priority).length > 0 && (
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            {['Critical', 'Warning', 'Notice', 'Info'].map((priority) => {
              const count = falcoStats.by_priority[priority] ?? 0
              if (count === 0) return null
              return (
                <div
                  key={priority}
                  className={`rounded-lg border p-3 ${falcoPriorityTone(priority).replace('text-', 'border-').split(' ')[0]} ${falcoPriorityTone(priority)}`}
                >
                  <div className="text-xs font-medium uppercase">{priority}</div>
                  <div className="mt-1 text-2xl font-bold">{count}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Liste des événements */}
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {falcoEventsQuery.isLoading && (
            <div className="py-4 text-sm text-[#586069]">Chargement...</div>
          )}
          {!falcoEventsQuery.isLoading && falcoEvents.length === 0 && (
            <div className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-6 text-center text-sm text-[#586069]">
              Aucun événement Falco détecté. C'est une bonne nouvelle.
            </div>
          )}
          {falcoEvents.map((event: any) => {
            const tone = falcoPriorityTone(event.priority)
            return (
              <div
                key={event.id}
                className="rounded-lg border border-[#d0d7de] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${tone}`}
                  >
                    {event.priority}
                  </span>
                  <span className="text-xs text-[#586069]">
                    {formatDate(event.created_at)}
                  </span>
                </div>
                <div className="font-medium text-[#24292f]">{event.rule}</div>
                <div className="mt-1 font-mono text-xs text-[#586069] break-all">
                  {event.output}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#586069]">
                  {event.container_name && (
                    <span>
                      Container:{' '}
                      <strong className="text-[#24292f]">{event.container_name}</strong>
                    </span>
                  )}
                  {event.user_name && (
                    <span>
                      User:{' '}
                      <strong className="text-[#24292f]">{event.user_name}</strong>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ============================================ */}
      {/* DNSSEC + DoT/DoH */}
      {/* ============================================ */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* DNSSEC */}
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">DNSSEC</h2>
            <span className="text-sm text-[#586069]">
              {dnssecQuery.isLoading ? 'Chargement...' : 'Signatures cryptographiques'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">
                Zone à signer / renouveler
              </label>
              <input
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => signMutation.mutate({ zone_name: zoneName })}
                disabled={signMutation.isPending}
              >
                {signMutation.isPending ? 'Signature...' : 'Signer la zone'}
              </Button>
              <Button
                onClick={() => rotateMutation.mutate({ zone_name: zoneName })}
                disabled={rotateMutation.isPending}
                className="border border-[#d0d7de] bg-white text-[#24292f] hover:bg-[#f6f8fa]"
              >
                {rotateMutation.isPending ? 'Rotation...' : 'Rotation des clés'}
              </Button>
            </div>

            {/* Zones signées */}
            <div className="rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-4">
              <div className="text-sm font-semibold text-[#24292f]">
                Zones signées ({signedZones.length})
              </div>
              {signedZones.length === 0 ? (
                <div className="mt-2 text-sm text-[#586069]">
                  Aucune zone signée. Signez une zone ci-dessus.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {zonesInfo.map((info: any) => (
                    <div
                      key={info.zone}
                      className="flex items-center justify-between rounded-md border border-[#d0d7de] bg-white px-3 py-2"
                    >
                      <div>
                        <div className="font-mono text-sm text-[#24292f]">
                          {info.zone}
                        </div>
                        <div className="text-xs text-[#586069]">
                          {info.has_ksk ? 'KSK' : '—'} / {info.has_zsk ? 'ZSK' : '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-[#586069]">Expiration</div>
                        <div className="text-xs font-medium text-[#24292f]">
                          {formatDuration(info.expires_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* DoT / DoH */}
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">DoT / DoH</h2>
            <span className="text-sm text-[#586069]">Transport sécurisé</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#d0d7de] p-4">
              <div className="text-sm text-[#586069]">DNS over TLS</div>
              <div
                className={`mt-2 text-lg font-semibold ${dotDoh.dot?.enabled ? 'text-[#1a7f37]' : 'text-[#cf222e]'}`}
              >
                {dotDoh.dot?.enabled ? 'Activé' : 'Inactif'}
              </div>
              <div className="mt-1 text-sm text-[#586069]">
                Port {dotDoh.dot?.port ?? '—'}
              </div>
            </div>
            <div className="rounded-lg border border-[#d0d7de] p-4">
              <div className="text-sm text-[#586069]">DNS over HTTPS</div>
              <div
                className={`mt-2 text-lg font-semibold ${dotDoh.doh?.enabled ? 'text-[#1a7f37]' : 'text-[#cf222e]'}`}
              >
                {dotDoh.doh?.enabled ? 'Activé' : 'Inactif'}
              </div>
              <div className="mt-1 text-sm text-[#586069]">
                Port {dotDoh.doh?.port ?? '—'}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-4 text-sm text-[#586069]">
            <div className="font-medium text-[#24292f]">Certificats TLS</div>
            <div className="mt-1 font-mono text-xs">
              DoT: {dotDoh.dot?.certificate ?? '—'}
            </div>
            <div className="font-mono text-xs">
              DoH: {dotDoh.doh?.certificate ?? '—'}
            </div>
          </div>
        </Card>
      </div>

      {/* ============================================ */}
      {/* RPZ + Audit */}
      {/* ============================================ */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* RPZ */}
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">RPZ blacklist</h2>
            <span className="text-sm text-[#586069]">
              {rpzEntries.length} domaine(s)
            </span>
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!domain.trim()) return
              addMutation.mutate({ domain })
            }}
          >
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="bad-domain.example"
              className="flex-1 rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
            />
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Ajout...' : 'Bloquer'}
            </Button>
          </form>

          <div className="mt-4 max-h-64 space-y-2 overflow-auto">
            {rpzEntries.length === 0 && (
              <div className="py-4 text-sm text-[#586069]">
                Aucun domaine bloqué. Ajoutez-en un ci-dessus.
              </div>
            )}
            {rpzEntries.map((entry: string) => (
              <div
                key={entry}
                className="flex items-center justify-between rounded-lg border border-[#d0d7de] px-3 py-2"
              >
                <span className="font-mono text-sm text-[#24292f]">{entry}</span>
                <button
                  className="rounded-md border border-[#d0d7de] px-3 py-1 text-sm text-[#cf222e] hover:bg-[#fff8f8]"
                  onClick={() => deleteMutation.mutate(entry)}
                  type="button"
                >
                  Débloquer
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Audit sécurité */}
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Audit sécurité</h2>
            <span className="text-sm text-[#586069]">
              {auditLogs.length} dernière(s) action(s)
            </span>
          </div>

          <div className="max-h-64 space-y-2 overflow-auto">
            {auditQuery.isLoading && (
              <div className="py-4 text-sm text-[#586069]">Chargement...</div>
            )}
            {!auditQuery.isLoading && auditLogs.length === 0 && (
              <div className="py-4 text-sm text-[#586069]">
                Aucune action de sécurité enregistrée.
              </div>
            )}
            {auditLogs.map((log: any) => (
              <div
                key={log.id}
                className="rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-[#24292f]">
                    {log.action}
                  </span>
                  <span className="text-xs text-[#586069]">
                    {formatDate(log.timestamp)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[#586069]">
                  {log.actor} — {log.details}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  )
}