import client from './client'

export async function fetchDnssecStatus() {
  const r = await client.get('/api/security/dnssec')
  return r.data
}

export async function signDnssec(payload: { zone_name: string }) {
  const r = await client.post('/api/security/dnssec/sign', payload)
  return r.data
}

export async function rotateDnssec(payload: { zone_name: string }) {
  const r = await client.post('/api/security/dnssec/rotate', payload)
  return r.data
}

export async function fetchRpzEntries() {
  const r = await client.get('/api/security/rpz')
  return r.data
}

export async function addRpzEntry(payload: { domain: string }) {
  const r = await client.post('/api/security/rpz', payload)
  return r.data
}

export async function deleteRpzEntry(domain: string) {
  const r = await client.delete(`/api/security/rpz/${domain}`)
  return r.data
}

export async function fetchDotDohStatus() {
  const r = await client.get('/api/security/dot-doh')
  return r.data
}

export async function fetchSecurityAudit(limit = 20) {
  const r = await client.get(`/api/security/audit?limit=${limit}`)
  return r.data
}