import React, { useEffect, useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import LineChart from '../../components/Charts/LineChart'
import client from '../../api/client'

export default function Dashboard(){
  const [stats, setStats] = useState<any>(null)
  const [series, setSeries] = useState<any[]>([])

  useEffect(()=>{
    client.get('/api/monitoring/stats').then(r=>setStats(r.data)).catch(()=>setStats(null))
    // dummy series
    setSeries(Array.from({length:30}).map((_,i)=>({ts: i, value: Math.round(Math.random()*100)})))
  },[])

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
          Primary et Secondary synchronisés
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Zones actives</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">12</div>
          <div className="mt-2 text-sm text-green-700">+2 cette semaine</div>
        </Card>
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Enregistrements</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">124</div>
          <div className="mt-2 text-sm text-[#586069]">A / AAAA / MX / CNAME</div>
        </Card>
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="text-sm text-[#586069]">Requêtes/jour</div>
          <div className="mt-2 text-3xl font-bold text-[#24292f]">{stats?.data ?? '—'}</div>
          <div className="mt-2 text-sm text-[#586069]">Source Prometheus</div>
        </Card>
      </div>

      <Card className="mt-6 border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#24292f]">Requêtes/sec sur 30 minutes</h3>
          <span className="text-sm text-[#586069]">Mise à jour automatique</span>
        </div>
        <LineChart data={series} />
      </Card>
    </Layout>
  )
}
