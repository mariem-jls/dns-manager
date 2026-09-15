import React, { useEffect, useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import LineChart from '../../components/Charts/LineChart'
import client from '../../api/client'
import Alert from '../../components/UI/Alert'


export default function Dashboard(){
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    client.get('/api/monitoring/stats')
      .then(r => {
        setStats(r.data)
        // Si le backend dit available:false, c'est une erreur explicite
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
      .finally(() => setLoading(false))
  }, [])

  // Plus aucune courbe inventée
  const series: any[] = []

  const requestRate = stats?.request_rate
  const requestRateDisplay = requestRate !== null && requestRate !== undefined
    ? Math.round(requestRate).toLocaleString()
    : '—'

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">Dynamix Service</p>
          <h1 className="mt-1 text-3xl font-bold text-[#24292f]">DNS Control Center</h1>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Zones actives</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">—</div>
          <div className="mt-2 text-sm text-[#586069]">Source : API zones</div>
        </Card>
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Enregistrements</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">—</div>
          <div className="mt-2 text-sm text-[#586069]">A / AAAA / MX / CNAME</div>
        </Card>
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Requêtes/sec</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">{requestRateDisplay}</div>
          <div className="mt-2 text-sm text-[#586069]">
            {requestRate !== null && requestRate !== undefined ? 'Source Prometheus' : 'Indisponible'}
          </div>
        </Card>
      </div>

      <Card className="mt-6 border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#24292f]">Requêtes/sec sur 30 minutes</h3>
          <span className="text-sm text-[#586069]">Mise à jour automatique</span>
        </div>
        {series.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#586069]">
            Aucune donnée disponible — Prometheus ne renvoie pas de série temporelle.
          </div>
        ) : (
          <LineChart data={series} />
        )}
      </Card>
    </Layout>
  )
}