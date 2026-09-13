import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchZones, createZone } from '../api/zones'

export function useZones(){
  return useQuery({
    queryKey: ['zones'],
    queryFn: fetchZones,
    staleTime: 30_000,
  })
}

export function useCreateZone(){
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createZone,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
  })
}
