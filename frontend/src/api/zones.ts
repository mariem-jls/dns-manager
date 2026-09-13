import client from './client'

export async function fetchZones(){
  const r = await client.get('/api/zones/')
  return r.data
}

export async function createZone(payload: any){
  const r = await client.post('/api/zones/', payload)
  return r.data
}
