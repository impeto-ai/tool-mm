"use client"

import { useState, useEffect, useCallback } from 'react'
import { tokenService } from '@/lib/token-service'
import { TokenEmpresa, SyncStatus } from '@/types'

export function useTokens() {
  const [tokens, setTokens] = useState<TokenEmpresa[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    nextSync: null,
    isRunning: false,
    tokensCount: 0,
    errors: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carrega tokens
  const loadTokens = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [tokensData, statusData] = await Promise.all([
        tokenService.getTokens(),
        tokenService.getSyncStatus()
      ])
      
      setTokens(tokensData)
      setSyncStatus(statusData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tokens')
      console.error('Erro ao carregar tokens:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Força sincronização
  const forceSync = useCallback(async () => {
    try {
      setError(null)
      await tokenService.forcSync()
      await loadTokens() // Recarrega dados após sincronização
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na sincronização')
      console.error('Erro na sincronização:', err)
    }
  }, [loadTokens])

  // Inicia sincronização automática
  const startAutoSync = useCallback(() => {
    tokenService.startAutoSync()
    loadTokens() // Atualiza status
  }, [loadTokens])

  // Para sincronização automática
  const stopAutoSync = useCallback(() => {
    tokenService.stopAutoSync()
    loadTokens() // Atualiza status
  }, [loadTokens])

  // Verifica se token é válido
  const isTokenValid = useCallback((token: string) => {
    return tokenService.isTokenValid(token)
  }, [])

  // Decodifica token
  const decodeToken = useCallback((token: string) => {
    return tokenService.decodeToken(token)
  }, [])

  // Obtém estatísticas
  const getStats = useCallback(async () => {
    try {
      return await tokenService.getTokenStats()
    } catch (err) {
      console.error('Erro ao obter estatísticas:', err)
      return { total: 0, valid: 0, expired: 0, companies: [] }
    }
  }, [])

  // Carrega dados iniciais
  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  // Auto-refresh a cada 5 minutos para atualizar status
  useEffect(() => {
    const interval = setInterval(() => {
      loadTokens()
    }, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [loadTokens])

  return {
    tokens,
    syncStatus,
    loading,
    error,
    loadTokens,
    forceSync,
    startAutoSync,
    stopAutoSync,
    isTokenValid,
    decodeToken,
    getStats
  }
} 