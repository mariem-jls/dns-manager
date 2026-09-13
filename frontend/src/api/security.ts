import client from './client'

export async function fetchDnssecStatus(){
  const response = await client.get('/api/security/dnssec')
  return response.data
}

export async function rotateDnssec(payload: { zone_name: string }){
  const response = await client.post('/api/security/dnssec/rotate', payload)
  return response.data
}

export async function fetchRpzEntries(){
  const response = await client.get('/api/security/rpz')
  return response.data
}

export async function addRpzEntry(payload: { domain: string }){
  const response = await client.post('/api/security/rpz', payload)
  return response.data
}

export async function deleteRpzEntry(domain: string){
  const response = await client.delete(`/api/security/rpz/${encodeURIComponent(domain)}`)
  return response.data
}

export async function fetchDotDohStatus(){
  const response = await client.get('/api/security/dot-doh')
  return response.data
}