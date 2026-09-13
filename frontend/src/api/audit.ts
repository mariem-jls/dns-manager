import client from './client'

export async function fetchAuditLogs(params?: { limit?: number; actor?: string; action?: string }){
  const response = await client.get('/api/audit/logs', { params })
  return response.data
}
