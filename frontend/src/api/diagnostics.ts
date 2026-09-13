import client from './client'

export async function runDig(payload: { domain: string; type: string; server?: string }){
  const response = await client.post('/api/diagnostics/dig', payload)
  return response.data
}

export async function checkZone(payload: { zone: string; path?: string }){
  const response = await client.post('/api/diagnostics/zone-check', payload)
  return response.data
}

export async function testPropagation(payload: { zone: string; primary?: string; secondary?: string }){
  const response = await client.post('/api/diagnostics/propagation', payload)
  return response.data
}