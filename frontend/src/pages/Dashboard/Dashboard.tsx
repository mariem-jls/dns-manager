import React, { useEffect, useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import LineChart from '../../components/Charts/LineChart'
import Alert from '../../components/UI/Alert'
import client from '../../api/client'

// Helper : formatage de durée
function formatUptime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—'
  const s = Math.floor(seconds)
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  if (days > 0) return `${days}j ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [series, setSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zonesCount, setZonesCount] = useState<number | null>(null)
  const [recordsCount, setRecordsCount] = useState<number | null>(null)
  const [bindInfo, setBindInfo] = useState<any>(null)

  useEffect(() => {
    setLoading(true)

    // Stats Prometheus
    client.get('/api/monitoring/stats')
      .then((r) => {
        setStats(r.data)
        if (r.data?.available === false) {
          setError(r.data?.message ?? 'Prometheus ne répond pas.')
        } else {
          setError(null)
        }
      })
      .catch(() => {
        setStats(null)
        setError('Impossible de contacter le backend.')
      })

    // Bind-info (uptime, version, cache)
    client.get('/api/monitoring/bind-info')
      .then((r) => setBindInfo(r.data))
      .catch(() => setBindInfo(null))

    // Zones
    client.get('/api/zones/')
      .then((r) => {
        const zones = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
        setZonesCount(zones.length)
      })
      .catch(() => setZonesCount(0))

    // Records (compter les enregistrements)
    client.get('/api/records/count')
      .then((r) => setRecordsCount(r.data?.total ?? 0))
      .catch(() => setRecordsCount(0))

    // Série temporelle
    const fetchSeries = () => {
      client.get('/api/monitoring/series?duration_min=30&step=60')
        .then((r) => setSeries(r.data?.items ?? []))
        .catch(() => setSeries([]))
    }
    fetchSeries()
    const interval = setInterval(fetchSeries, 60_000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setLoading(false)
  }, [stats])

  const requestRate = stats?.request_rate
  const errorRate = stats?.error_rate

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">
            Dynamix Service
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#24292f]">
            DNS Control Center
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#586069]">
            Vue d'ensemble des zones, de la santé des serveurs et des métriques de résolution en temps réel.
          </p>
        </div>
        <div className="rounded-full border border-[#d0d7de] bg-white px-3 py-1 text-sm text-[#586069] shadow-sm">
          {loading ? 'Chargement...' : 'Données en direct'}
        </div>
      </div>

      {error && (
        <Alert variant="warning" title="Attention">
          {error}
        </Alert>
      )}

      {/* ============================================ */}
      {/* 4 cartes principales */}
      {/* ============================================ */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Zones actives</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">
            {zonesCount !== null ? zonesCount : '—'}
          </div>
          <div className="mt-2 text-sm text-[#586069]">
            {zonesCount !== null ? 'Source BIND' : 'Chargement...'}
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Enregistrements</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">
            {recordsCount !== null ? recordsCount.toLocaleString() : '—'}
          </div>
          <div className="mt-2 text-sm text-[#586069]">
            {recordsCount !== null ? 'Toutes zones' : 'Chargement...'}
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Requêtes/sec</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">
            {requestRate !== null && requestRate !== undefined
              ? requestRate.toFixed(1)
              : '—'}
          </div>
          <div className="mt-2 text-sm text-[#586069]">
            {requestRate !== null ? 'Source Prometheus' : 'Indisponible'}
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Uptime BIND</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">
            {formatUptime(bindInfo?.uptime_seconds)}
          </div>
          <div className="mt-2 text-sm text-[#586069]">
            {bindInfo?.version ? `v${bindInfo.version}` : 'Non disponible'}
          </div>
        </Card>
      </div>

      {/* ============================================ */}
      {/* 4 cartes secondaires */}
      {/* ============================================ */}
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Cache hit rate</div>
          <div className="mt-2 text-2xl font-semibold text-[#24292f]">
            {stats?.cache_hit_rate !== null && stats?.cache_hit_rate !== undefined
              ? `${stats.cache_hit_rate.toFixed(1)}%`
              : '—'}
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Cache RRsets</div>
          <div className="mt-2 text-2xl font-semibold text-[#24292f]">
            {bindInfo?.cache_rrsets !== null && bindInfo?.cache_rrsets !== undefined
              ? Math.round(bindInfo.cache_rrsets).toLocaleString()
              : '—'}
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Taux d'erreur</div>
          <div className="mt-2 text-2xl font-semibold text-[#24292f]">
            {errorRate !== null && errorRate !== undefined
              ? `${errorRate.toFixed(2)}%`
              : '—'}
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">DNSSEC/sec</div>
          <div className="mt-2 text-2xl font-semibold text-[#24292f]">
            {bindInfo?.dnssec_rate !== null && bindInfo?.dnssec_rate !== undefined
              ? bindInfo.dnssec_rate.toFixed(2)
              : '—'}
          </div>
        </Card>
      </div>

      {/* ============================================ */}
      {/* Graphique */}
      {/* ============================================ */}
      <Card className="mt-6 border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#24292f]">
            Requêtes/sec sur 30 minutes
          </h3>
          <span className="text-sm text-[#586069]">Mise à jour automatique</span>
        </div>
        {series.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#586069]">
            Aucune série temporelle disponible. Générez du trafic DNS pour alimenter les métriques.
          </div>
        ) : (
          <LineChart data={series} />
        )}
      </Card>
    </Layout>
  )
}