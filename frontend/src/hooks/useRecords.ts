import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

export interface DnsRecord {
  id: string
  name: string
  type: string
  value: string
  ttl: number
  priority: number | null
  line: number
}

export function useRecords(zoneName: string | null) {
  return useQuery<DnsRecord[]>({
    queryKey: ['records', zoneName],
    queryFn: async () => {
      if (!zoneName) return []
      const r = await client.get<DnsRecord[]>(`/api/zones/${zoneName}/records`)
      return r.data
    },
    enabled: !!zoneName,
    staleTime: 10_000,
  })
}

export function useCreateRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      zoneName,
      ...payload
    }: {
      zoneName: string
      name: string
      type: string
      value: string
      ttl: number
      priority?: number | null
    }) => {
      const r = await client.post(`/api/zones/${zoneName}/records`, payload)
      return r.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['records', variables.zoneName] })
      qc.invalidateQueries({ queryKey: ['zones'] })
    },
  })
}

export function useDeleteRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ zoneName, recordId }: { zoneName: string; recordId: string }) => {
      await client.delete(`/api/zones/${zoneName}/records/${recordId}`)
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['records', variables.zoneName] })
      qc.invalidateQueries({ queryKey: ['zones'] })
    },
  })
}