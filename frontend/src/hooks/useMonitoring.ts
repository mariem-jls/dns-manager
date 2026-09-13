import { useQuery } from '@tanstack/react-query'
import {
  fetchMonitoringStats,
  fetchMonitoringTopDomains,
  fetchMonitoringAlerts,
  fetchMonitoringHealth,
} from '../api/monitoring'

export function useMonitoringStats(){
  return useQuery({
    queryKey: ['monitoring-stats'],
    queryFn: fetchMonitoringStats,
    refetchInterval: 15_000,
  })
}

export function useTopDomains(){
  return useQuery({
    queryKey: ['monitoring-top-domains'],
    queryFn: fetchMonitoringTopDomains,
    refetchInterval: 30_000,
  })
}

export function useAlerts(){
  return useQuery({
    queryKey: ['monitoring-alerts'],
    queryFn: fetchMonitoringAlerts,
    refetchInterval: 15_000,
  })
}

export function useMonitoringHealth(){
  return useQuery({
    queryKey: ['monitoring-health'],
    queryFn: fetchMonitoringHealth,
    refetchInterval: 15_000,
  })
}
