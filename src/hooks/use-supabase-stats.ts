"use client"

import { useState, useEffect, useCallback } from 'react'

export interface SupabaseStats {
  total: number
  uniqueOriginalIds: number
  successful: number
  errors: number
  downloadStatus: Record<string, number>
  lastUpdated: string
}

export function useSupabaseStats() {
  const [stats, setStats] = useState<SupabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carrega estatísticas do Supabase
  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[USE-SUPABASE-STATS] Carregando estatísticas...')

      const response = await fetch('/api/supabase/stats')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro HTTP ${response.status}`)
      }

      const statsData = await response.json()
      setStats(statsData)

      console.log('[USE-SUPABASE-STATS] Estatísticas carregadas:', statsData)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar estatísticas'
      setError(errorMessage)
      console.error('[USE-SUPABASE-STATS] Erro:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carrega estatísticas na inicialização
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Auto-refresh reduzido para a cada 30 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats()
    }, 30 * 60 * 1000) // 30 minutos

    return () => clearInterval(interval)
  }, [loadStats])

  // Calcula porcentagem de sucesso
  const getSuccessRate = useCallback(() => {
    if (!stats || stats.total === 0) return 0
    return Math.round((stats.successful / stats.total) * 100)
  }, [stats])

  // Calcula porcentagem de erro
  const getErrorRate = useCallback(() => {
    if (!stats || stats.total === 0) return 0
    return Math.round((stats.errors / stats.total) * 100)
  }, [stats])

  // Formata data da última atualização
  const getLastUpdatedFormatted = useCallback(() => {
    if (!stats?.lastUpdated) return 'Nunca'
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(stats.lastUpdated))
  }, [stats?.lastUpdated])

  return {
    // Dados
    stats,
    loading,
    error,
    
    // Ações
    loadStats,
    
    // Helpers
    getSuccessRate,
    getErrorRate,
    getLastUpdatedFormatted,
    
    // Estados computados
    hasData: stats !== null,
    isEmpty: stats?.total === 0,
  }
} 