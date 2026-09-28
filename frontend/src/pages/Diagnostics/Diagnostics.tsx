import React, { useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import Alert from '../../components/UI/Alert'
import { runDig, checkZone, testPropagation, validateAll } from '../../api/diagnostics'

// Historique en mémoire (limité à 10)
type HistoryItem = {
  id: string
  type: 'dig' | 'zone' | 'propagation'
  label: string
  ok: boolean
  timestamp: Date
}

export default function DiagnosticsPage() {
  // Dig
  const [domain, setDomain] = useState('dynamix.com')
  const [qtype, setQtype] = useState('A')
  const [server, setServer] = useState('bind9')
  const [digResult, setDigResult] = useState<any>(null)

  // Zone check
  const [zoneName, setZoneName] = useState('dynamix.com')
  const [zoneCheckResult, setZoneCheckResult] = useState<any>(null)

  // Validate all
  const [validateAllResult, setValidateAllResult] = useState<any>(null)

  // Propagation
  const [propagationZone, setPropagationZone] = useState('dynamix.com')
  const [propagationResult, setPropagationResult] = useState<any>(null)

  // Historique
  const [history, setHistory] = useState<HistoryItem[]>([])

  const addHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    setHistory((prev) => [
      { ...item, id: Math.random().toString(36), timestamp: new Date() },
      ...prev.slice(0, 9),
    ])
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">
            Diagnostics DNS
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#24292f]">Diagnostics</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#586069]">
            Tester les résolutions, valider les zones et comparer la propagation entre primary et secondary.
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* DNS Lookup + Zone Checker */}
      {/* ============================================ */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* DNS Lookup */}
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">DNS Lookup</h2>
            <span className="text-sm text-[#586069]">dig complet</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Domaine</label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Type</label>
              <select
                value={qtype}
                onChange={(e) => setQtype(e.target.value)}
                className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da]"
              >
                {['A', 'AAAA', 'MX', 'SOA', 'TXT', 'NS', 'CNAME', 'PTR', 'SRV', 'CAA'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Serveur</label>
              <input
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da]"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={async () => {
                const result = await runDig({ domain, type: qtype, server })
                setDigResult(result)
                addHistory({
                  type: 'dig',
                  label: `${domain} ${qtype} @${server}`,
                  ok: result.ok,
                })
              }}
            >
              Exécuter dig
            </Button>
          </div>

          {digResult && (
            <div className="mt-4 space-y-3">
              {/* Résumé */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-2 text-center">
                  <div className="text-xs text-[#586069]">Statut</div>
                  <div className={`text-sm font-semibold ${digResult.parsed?.status === 'NOERROR' ? 'text-[#1a7f37]' : 'text-[#cf222e]'}`}>
                    {digResult.parsed?.status ?? '—'}
                  </div>
                </div>
                <div className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-2 text-center">
                  <div className="text-xs text-[#586069]">Réponses</div>
                  <div className="text-sm font-semibold text-[#24292f]">
                    {digResult.parsed?.answer_count ?? 0}
                  </div>
                </div>
                <div className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-2 text-center">
                  <div className="text-xs text-[#586069]">Temps</div>
                  <div className="text-sm font-semibold text-[#24292f]">
                    {digResult.parsed?.query_time_ms ?? '—'} ms
                  </div>
                </div>
              </div>

              {/* Réponses parsées */}
              {digResult.parsed?.answers?.length > 0 && (
                <div className="overflow-hidden rounded-md border border-[#d0d7de]">
                  <div className="grid grid-cols-[2fr_1fr_1fr_3fr] bg-[#f6f8fa] px-3 py-2 text-xs font-medium text-[#24292f]">
                    <div>Nom</div>
                    <div>TTL</div>
                    <div>Type</div>
                    <div>Valeur</div>
                  </div>
                  <div className="divide-y divide-[#d0d7de] bg-white">
                    {digResult.parsed.answers.map((a: any, i: number) => (
                      <div key={i} className="grid grid-cols-[2fr_1fr_1fr_3fr] px-3 py-2 text-xs">
                        <div className="font-mono truncate">{a.name}</div>
                        <div className="text-[#586069]">{a.ttl}</div>
                        <div>
                          <span className="rounded bg-[#ddf4ff] px-1.5 py-0.5 text-[10px] font-semibold text-[#0969da]">
                            {a.type}
                          </span>
                        </div>
                        <div className="font-mono truncate">{a.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sortie brute */}
              <details className="rounded-md border border-[#d0d7de]">
                <summary className="cursor-pointer bg-[#f6f8fa] px-3 py-2 text-xs font-medium text-[#24292f]">
                  Voir la sortie complète dig
                </summary>
                <pre className="overflow-auto bg-[#0f172a] p-3 text-xs text-white">{digResult.raw}</pre>
              </details>
            </div>
          )}
        </Card>

        {/* Zone Checker */}
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Zone Checker</h2>
            <span className="text-sm text-[#586069]">named-checkzone</span>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#24292f]">Zone</label>
            <input
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da]"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              onClick={async () => {
                const result = await validateAll()
                setValidateAllResult(result)
                addHistory({
                  type: 'zone',
                  label: `Toutes les zones (${result.total})`,
                  ok: result.ok,
                })
              }}
              className="border border-[#d0d7de] bg-white text-[#24292f] hover:bg-[#f6f8fa]"
            >
              Valider toutes les zones
            </Button>
            <Button
              onClick={async () => {
                const result = await checkZone({ zone: zoneName })
                setZoneCheckResult(result)
                addHistory({
                  type: 'zone',
                  label: `Zone ${zoneName}`,
                  ok: result.ok,
                })
              }}
            >
              Vérifier la zone
            </Button>
          </div>

          {/* Résultat validate all */}
          {validateAllResult && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${validateAllResult.failed === 0 ? 'bg-[#dafbe1] text-[#1a7f37]' : 'bg-[#ffebe9] text-[#cf222e]'}`}>
                  {validateAllResult.passed}/{validateAllResult.total} OK
                </span>
                {validateAllResult.failed > 0 && (
                  <span className="text-xs text-[#cf222e]">
                    {validateAllResult.failed} échec(s)
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-auto rounded-md border border-[#d0d7de]">
                <div className="divide-y divide-[#d0d7de] bg-white">
                  {validateAllResult.results.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="font-mono">{r.zone}</span>
                      <span className={r.ok ? 'text-[#1a7f37]' : 'text-[#cf222e]'}>
                        {r.ok ? 'OK' : 'Erreur'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Résultat zone check */}
          {zoneCheckResult && (
            <div className="mt-4">
              <div className={`rounded-md border p-3 text-xs ${zoneCheckResult.ok ? 'border-[#1a7f37] bg-[#dafbe1] text-[#1a7f37]' : 'border-[#cf222e] bg-[#ffebe9] text-[#cf222e]'}`}>
                <div className="font-semibold">
                  {zoneCheckResult.ok ? 'Zone valide' : 'Zone invalide'}
                </div>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap">{zoneCheckResult.output}</pre>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ============================================ */}
      {/* Propagation + Historique */}
      {/* ============================================ */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Propagation */}
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Propagation</h2>
            <span className="text-sm text-[#586069]">Primary / Secondary</span>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#24292f]">Zone</label>
            <input
              value={propagationZone}
              onChange={(e) => setPropagationZone(e.target.value)}
              className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da]"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={async () => {
                const result = await testPropagation({
                  zone: propagationZone,
                  primary: 'bind9',
                  secondary: 'bind9-secondary',
                })
                setPropagationResult(result)
                addHistory({
                  type: 'propagation',
                  label: `Zone ${propagationZone}`,
                  ok: result.in_sync,
                })
              }}
            >
              Tester la propagation
            </Button>
          </div>

          {propagationResult && (
            <div className="mt-4 space-y-3">
              <div className={`rounded-md border p-3 ${propagationResult.in_sync ? 'border-[#1a7f37] bg-[#dafbe1]' : 'border-[#cf222e] bg-[#ffebe9]'}`}>
                <div className={`text-sm font-semibold ${propagationResult.in_sync ? 'text-[#1a7f37]' : 'text-[#cf222e]'}`}>
                  {propagationResult.in_sync ? 'Synchronisé' : 'Désynchronisé'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-[#d0d7de] bg-white p-3">
                  <div className="text-xs text-[#586069]">Primary (bind9)</div>
                  <div className="mt-1 text-lg font-semibold text-[#24292f]">
                    Serial {propagationResult.primary_serial ?? '—'}
                  </div>
                </div>
                <div className="rounded-md border border-[#d0d7de] bg-white p-3">
                  <div className="text-xs text-[#586069]">Secondary (bind9-secondary)</div>
                  <div className="mt-1 text-lg font-semibold text-[#24292f]">
                    Serial {propagationResult.secondary_serial ?? '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Historique */}
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Historique des tests</h2>
            <span className="text-sm text-[#586069]">{history.length}/10</span>
          </div>
          {history.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#586069]">
              Aucun test effectué.
            </div>
          ) : (
            <div className="divide-y divide-[#d0d7de]">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${item.ok ? 'bg-[#1a7f37]' : 'bg-[#cf222e]'}`} />
                    <span className="text-xs text-[#586069] uppercase">{item.type}</span>
                    <span className="font-mono text-xs text-[#24292f] truncate max-w-xs">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-xs text-[#586069]">{formatTime(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}