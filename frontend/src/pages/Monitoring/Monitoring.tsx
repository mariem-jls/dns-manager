import React, { useEffect, useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import Alert from '../../components/UI/Alert'
import Gauge from '../../components/Charts/Gauge'
import PieChart from '../../components/Charts/PieChart'
import LineChart from '../../components/Charts/LineChart'
import {
  useMonitoringStats,
  useTopDomains,
  useAlerts,
  useMonitoringHealth,
} from '../../hooks/useMonitoring'
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

export default function MonitoringPage() {
  const { data: stats, isLoading } = useMonitoringStats()
  const { data: topDomainsData, isLoading: topDomainsLoading } = useTopDomains()
  const { data: alertsData, isLoading: alertsLoading } = useAlerts()
  const { data: health } = useMonitoringHealth()

  // Série temporelle
  const [series, setSeries] = useState<any[]>([])
  // Répartition par type
  const [trafficDistribution, setTrafficDistribution] = useState<any[]>([])
  // Infos BIND
  const [bindInfo, setBindInfo] = useState<any>(null)

  useEffect(() => {
    const fetchSeries = () => {
      client.get('/api/monitoring/series?duration_min=30&step=60')
        .then((r) => setSeries(r.data?.items ?? []))
        .catch(() => setSeries([]))
    }
    const fetchDistribution = () => {
      client.get('/api/monitoring/traffic-distribution')
        .then((r) => setTrafficDistribution(r.data?.items ?? []))
        .catch(() => setTrafficDistribution([]))
    }
    const fetchBindInfo = () => {
      client.get('/api/monitoring/bind-info')
        .then((r) => setBindInfo(r.data))
        .catch(() => setBindInfo(null))
    }

    fetchSeries()
    fetchDistribution()
    fetchBindInfo()

    const interval = setInterval(() => {
      fetchSeries()
      fetchDistribution()
      fetchBindInfo()
    }, 60_000)

    return () => clearInterval(interval)
  }, [])

  // Métriques
  const requestRate = stats?.request_rate ?? null
  const cacheHitRate = stats?.cache_hit_rate ?? null
  const latency = stats?.latency_ms ?? null
  const errorRate = stats?.error_rate ?? null

  const statsUnavailable = stats?.available === false

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">
            Observabilité
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#24292f]">Monitoring</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#586069]">
            Suivi des requêtes DNS, de la latence, des alertes et de la répartition du trafic.
          </p>
        </div>
        <div className="rounded-full border border-[#d0d7de] bg-white px-3 py-1 text-sm text-[#586069] shadow-sm">
          {isLoading
            ? 'Actualisation...'
            : statsUnavailable
              ? 'Prometheus indisponible'
              : 'Collecte active'}
        </div>
      </div>

      {statsUnavailable && (
        <Alert variant="warning" title="Attention">
          {stats?.message ?? 'Prometheus ne répond pas. Les métriques ne sont pas disponibles.'}
        </Alert>
      )}

      {/* ============================================ */}
      {/* Jauges principales */}
      {/* ============================================ */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Requêtes/sec</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">
            {requestRate !== null ? requestRate.toFixed(1) : '—'}
          </div>
          <div className="mt-1 text-xs text-[#586069]">
            {requestRate !== null ? 'Source Prometheus' : 'Non disponible'}
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Cache hit rate</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">
            {cacheHitRate !== null && cacheHitRate !== undefined
              ? `${cacheHitRate.toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="mt-1 text-xs text-[#586069]">
            {cacheHitRate !== null && cacheHitRate !== undefined
              ? 'Source Prometheus'
              : 'Non disponible'}
          </div>
        </Card>

       <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
        <div className="text-sm text-[#586069]">DNSSEC validations/sec</div>
        <div className="mt-2 text-3xl font-bold text-[#24292f]">
          {bindInfo?.dnssec_rate !== null && bindInfo?.dnssec_rate !== undefined
            ? bindInfo.dnssec_rate.toFixed(2)
            : '—'}
        </div>
        <div className="mt-1 text-xs text-[#586069]">
          {bindInfo?.dnssec_rate !== null ? 'Source Prometheus' : 'Non disponible'}
        </div>
      </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Taux d'erreur</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">
            {errorRate !== null ? `${errorRate.toFixed(2)}%` : '—'}
          </div>
          <div className="mt-1 text-xs text-[#586069]">
            {errorRate !== null ? 'Source Prometheus' : 'Non disponible'}
          </div>
        </Card>
      </div>

      {/* ============================================ */}
      {/* Infos BIND (uptime, version, cache, DNSSEC) */}
      {/* ============================================ */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Uptime BIND</div>
          <div className="mt-2 text-xl font-semibold text-[#24292f]">
            {formatUptime(bindInfo?.uptime_seconds)}
          </div>
          <div className="mt-1 text-xs text-[#586069]">
            {bindInfo?.config_time_seconds
              ? `Dernière reconfig : ${formatUptime(bindInfo.config_time_seconds)}`
              : 'Depuis le démarrage'}
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Version BIND</div>
          <div className="mt-2 text-xl font-semibold text-[#24292f]">
            {bindInfo?.version ?? '—'}
          </div>
          <div className="mt-1 text-xs text-[#586069]">BIND9 + bind_exporter</div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Cache (RRsets)</div>
          <div className="mt-2 text-xl font-semibold text-[#24292f]">
            {bindInfo?.cache_rrsets !== null && bindInfo?.cache_rrsets !== undefined
              ? Math.round(bindInfo.cache_rrsets).toLocaleString()
              : '—'}
          </div>
          <div className="mt-1 text-xs text-[#586069]">Taille du cache DNS</div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">DNSSEC validations/sec</div>
          <div className="mt-2 text-xl font-semibold text-[#24292f]">
            {bindInfo?.dnssec_rate !== null && bindInfo?.dnssec_rate !== undefined
              ? bindInfo.dnssec_rate.toFixed(2)
              : '—'}
          </div>
          <div className="mt-1 text-xs text-[#586069]">Validations réussies</div>
        </Card>
      </div>

      {/* ============================================ */}
      {/* Série + Répartition */}
      {/* ============================================ */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Requêtes/sec</h2>
            <span className="text-sm text-[#586069]">30 dernières minutes</span>
          </div>
          {series.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#586069]">
              Aucune série temporelle disponible.
            </div>
          ) : (
            <LineChart data={series} />
          )}
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Répartition des requêtes</h2>
            <span className="text-sm text-[#586069]">Types DNS</span>
          </div>
          {trafficDistribution.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#586069]">
              Répartition indisponible.
            </div>
          ) : (
            <PieChart data={trafficDistribution} />
          )}
        </Card>
      </div>

      {/* ============================================ */}
      {/* Top domaines + Alertes */}
      {/* ============================================ */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Top domaines demandés</h2>
            <span className="text-sm text-[#586069]">Top 10</span>
          </div>
          <div className="divide-y divide-[#d0d7de]">
            {topDomainsLoading && (
              <div className="py-4 text-sm text-[#586069]">Chargement...</div>
            )}
            {!topDomainsLoading && (topDomainsData?.items?.length ?? 0) === 0 && (
              <div className="py-6 text-sm text-[#586069]">
                {topDomainsData?.message ??
                  "Statistiques par domaine non exposées par bind_exporter."}
              </div>
            )}
            {topDomainsData?.items?.map((item: any, index: number) => (
              <div
                key={item.domain}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f6f8fa] text-sm font-semibold text-[#586069]">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-medium text-[#24292f]">{item.domain}</div>
                    <div className="text-sm text-[#586069]">Trafic DNS observé</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-[#24292f]">
                  {typeof item.hits === 'number' ? item.hits.toLocaleString() : '—'}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Alertes en temps réel</h2>
            <span className="text-sm text-[#586069]">Prometheus + Wazuh</span>
          </div>
          <div className="space-y-3">
            {alertsLoading && (
              <div className="py-4 text-sm text-[#586069]">Chargement...</div>
            )}
            {alertsData?.items?.map((alert: any) => {
              const tone =
                alert.severity === 'critique'
                  ? 'bg-[#ffebe9] text-[#cf222e]'
                  : alert.severity === 'warning'
                    ? 'bg-[#fff8c5] text-[#9a6700]'
                    : 'bg-[#ddf4ff] text-[#0969da]'

              return (
                <div
                  key={alert.title}
                  className="rounded-lg border border-[#d0d7de] bg-white p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs text-[#586069]">Maintenant</span>
                  </div>
                  <div className="font-medium text-[#24292f]">{alert.title}</div>
                  <div className="mt-1 text-sm text-[#586069]">{alert.detail}</div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* ============================================ */}
      {/* Santé des services */}
      {/* ============================================ */}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Primary</div>
          <div className="mt-2 text-xl font-semibold text-[#24292f] capitalize">
            {health?.primary ?? 'unknown'}
          </div>
        </Card>
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Secondary</div>
          <div className="mt-2 text-xl font-semibold text-[#24292f] capitalize">
            {health?.secondary ?? 'unknown'}
          </div>
        </Card>
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Prometheus</div>
          <div className="mt-2 text-xl font-semibold text-[#24292f] capitalize">
            {health?.prometheus ?? 'unknown'}
          </div>
        </Card>
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Wazuh</div>
          <div className="mt-2 text-xl font-semibold text-[#24292f] capitalize">
            {health?.wazuh ?? 'unknown'}
          </div>
        </Card>
      </div>
    </Layout>
  )
}