import React, { useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import { checkZone, runDig, testPropagation } from '../../api/diagnostics'

export default function DiagnosticsPage(){
  const [domain, setDomain] = useState('dynamix.com')
  const [qtype, setQtype] = useState('A')
  const [server, setServer] = useState('bind9')
  const [digResult, setDigResult] = useState('')

  const [zoneName, setZoneName] = useState('dynamix.com')
  const [zonePath, setZonePath] = useState('')
  const [zoneCheckResult, setZoneCheckResult] = useState('')

  const [propagationZone, setPropagationZone] = useState('dynamix.com')
  const [primary, setPrimary] = useState('bind9')
  const [secondary, setSecondary] = useState('bind9-secondary')
  const [propagationResult, setPropagationResult] = useState<any>(null)

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">Diagnostics DNS</p>
          <h1 className="mt-1 text-3xl font-bold text-[#24292f]">Diagnostics</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#586069]">Tester les résolutions, valider les zones et comparer la propagation entre primary et secondary.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">DNS Lookup</h2>
            <span className="text-sm text-[#586069]">dig intégré</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Domaine</label>
              <input value={domain} onChange={(event) => setDomain(event.target.value)} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Type</label>
              <select value={qtype} onChange={(event) => setQtype(event.target.value)} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20">
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="MX">MX</option>
                <option value="SOA">SOA</option>
                <option value="TXT">TXT</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Serveur</label>
              <input value={server} onChange={(event) => setServer(event.target.value)} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={async () => {
                const result = await runDig({ domain, type: qtype, server })
                setDigResult(result.output || result.error || JSON.stringify(result, null, 2))
              }}
            >
              Exécuter dig
            </Button>
          </div>
          <pre className="mt-4 overflow-auto rounded-lg border border-[#d0d7de] bg-[#0f172a] p-4 text-sm text-white">{digResult || 'Résultat de la commande dig'}</pre>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Zone Checker</h2>
            <span className="text-sm text-[#586069]">named-checkzone</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Zone</label>
              <input value={zoneName} onChange={(event) => setZoneName(event.target.value)} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Chemin fichier</label>
              <input value={zonePath} onChange={(event) => setZonePath(event.target.value)} placeholder="optionnel" className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={async () => {
                const result = await checkZone({ zone: zoneName, path: zonePath || undefined })
                setZoneCheckResult(result.output || JSON.stringify(result, null, 2))
              }}
            >
              Vérifier la zone
            </Button>
          </div>
          <pre className="mt-4 overflow-auto rounded-lg border border-[#d0d7de] bg-[#0f172a] p-4 text-sm text-white">{zoneCheckResult || 'Résultat de named-checkzone'}</pre>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Propagation</h2>
            <span className="text-sm text-[#586069]">Primary / Secondary</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Zone</label>
              <input value={propagationZone} onChange={(event) => setPropagationZone(event.target.value)} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Primary</label>
              <input value={primary} onChange={(event) => setPrimary(event.target.value)} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Secondary</label>
              <input value={secondary} onChange={(event) => setSecondary(event.target.value)} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={async () => {
                const result = await testPropagation({ zone: propagationZone, primary, secondary })
                setPropagationResult(result)
              }}
            >
              Tester la propagation
            </Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-3">
              <div className="text-sm text-[#586069]">Synchronisé</div>
              <div className="mt-2 text-xl font-semibold text-[#24292f]">{propagationResult?.in_sync ? 'Oui' : 'Non'}</div>
            </div>
            <div className="rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-3">
              <div className="text-sm text-[#586069]">Dernière vérification</div>
              <div className="mt-2 text-xl font-semibold text-[#24292f]">{propagationResult ? 'OK' : '—'}</div>
            </div>
          </div>
          <pre className="mt-4 overflow-auto rounded-lg border border-[#d0d7de] bg-[#0f172a] p-4 text-sm text-white">{propagationResult ? JSON.stringify(propagationResult, null, 2) : 'Résultat de propagation'}</pre>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Conseils de test</h2>
            <span className="text-sm text-[#586069]">Exécution locale</span>
          </div>
          <div className="space-y-3 text-sm text-[#24292f]">
            <div className="rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-3">1. Vérifie qu’une zone existe dans `bind9/zones/` avant `named-checkzone`.</div>
            <div className="rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-3">2. `dig` doit utiliser le nom du service Docker si tu testes depuis le backend, par exemple `bind9`.</div>
            <div className="rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-3">3. La propagation compare les réponses SOA entre primary et secondary.</div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}