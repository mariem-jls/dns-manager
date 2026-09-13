import client from './client'

export async function fetchMonitoringStats(){
  const response = await client.get('/api/monitoring/stats')
  return response.data
}

export async function fetchMonitoringTopDomains(){
  const response = await client.get('/api/monitoring/top-domains')
  return response.data
}

export async function fetchMonitoringAlerts(){
  const response = await client.get('/api/monitoring/alerts')
  return response.data
}

export async function fetchMonitoringHealth(){
  const response = await client.get('/api/monitoring/health')
  return response.data
}
