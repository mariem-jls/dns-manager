import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

// ============================================
// TYPES
// ============================================
export interface Zone {
  name: string
  type: 'master' | 'slave'
  file: string | null
  serial: number
  description: string | null
}

export interface ZoneListResponse {
  items: Zone[]
  total: number
  skip: number
  limit: number
  has_more: boolean
}

// ============================================
// LISTE
// ============================================
export function useZones(params?: { skip?: number; limit?: number; search?: string }) {
  const skip = params?.skip ?? 0
  const limit = params?.limit ?? 50
  const search = params?.search ?? ''

  return useQuery<ZoneListResponse>({
    queryKey: ['zones', skip, limit, search],
    queryFn: async () => {
      const r = await client.get<ZoneListResponse>('/api/zones/', {
        params: { skip, limit, search: search || undefined },
      })
      return r.data
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

// ============================================
// DÉTAIL
// ============================================
export function useZone(name: string | null) {
  return useQuery<Zone | null>({
    queryKey: ['zone', name],
    queryFn: async () => {
      if (!name) return null
      const r = await client.get<Zone>(`/api/zones/${name}`)
      return r.data
    },
    enabled: !!name,
    staleTime: 30_000,
  })
}

// ============================================
// CRÉER
// ============================================
export function useCreateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; type: string; description?: string }) => {
      const r = await client.post<Zone>('/api/zones/', data)
      return r.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
  })
}

// ============================================
// MODIFIER
// ============================================
export function useUpdateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string | null }) => {
      const r = await client.patch<Zone>(`/api/zones/${name}`, { description })
      return r.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['zones'] })
      qc.invalidateQueries({ queryKey: ['zone', variables.name] })
    },
  })
}

// ============================================
// SUPPRIMER
// ============================================
export function useDeleteZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      await client.delete(`/api/zones/${name}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
  })
}

// ============================================
// VALIDER
// ============================================
export function useValidateZone() {
  return useMutation({
    mutationFn: async (name: string) => {
      const r = await client.post<{ ok: boolean; output: string }>(
        `/api/zones/${name}/validate`
      )
      return r.data
    },
  })
}