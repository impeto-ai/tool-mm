"use client"

import { useState, useEffect, useCallback } from 'react'
import { productSyncService } from '@/lib/product-sync-service'
import { ProductSyncStatus, MissingProductInfo } from '@/types'

export function useProductSync() {
  const [syncStatus, setSyncStatus] = useState<ProductSyncStatus>({
    isRunning: false,
    empresa2: null,
    empresa3: null,
    lastSync: null,
    errors: []
  })
  
  const [missingProducts2, setMissingProducts2] = useState<MissingProductInfo[]>([])
  const [missingProducts3, setMissingProducts3] = useState<MissingProductInfo[]>([])
  const [uniqueMissingProducts, setUniqueMissingProducts] = useState<MissingProductInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Atualiza status da sincronização
  const updateSyncStatus = useCallback(async () => {
    try {
      const status = productSyncService.getSyncStatus()
      setSyncStatus(status)

      // Carrega produtos faltantes se houver resultados
      if (status.empresa2 && status.empresa2.missingProducts.length > 0) {
        const missing2 = await productSyncService.getMissingProductsWithDetails(2)
        setMissingProducts2(missing2)
      } else {
        setMissingProducts2([])
      }

      if (status.empresa3 && status.empresa3.missingProducts.length > 0) {
        const missing3 = await productSyncService.getMissingProductsWithDetails(3)
        setMissingProducts3(missing3)
      } else {
        setMissingProducts3([])
      }

      // Carrega produtos únicos (sem duplicatas)
      if ((status.empresa2 && status.empresa2.missingProducts.length > 0) || 
          (status.empresa3 && status.empresa3.missingProducts.length > 0)) {
        const uniqueMissing = await productSyncService.getUniqueMissingProductsWithDetails()
        setUniqueMissingProducts(uniqueMissing)
      } else {
        setUniqueMissingProducts([])
      }

    } catch (err) {
      console.error('Erro ao atualizar status da sincronização:', err)
    }
  }, [])

  // Executa sincronização completa
  const syncAllCompanies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const status = await productSyncService.syncAllCompanies()
      setSyncStatus(status)
      
      // Atualiza produtos faltantes
      await updateSyncStatus()
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na sincronização'
      setError(errorMessage)
      console.error('Erro na sincronização completa:', err)
    } finally {
      setLoading(false)
    }
  }, [updateSyncStatus])

  // Sincroniza uma empresa específica
  const syncSingleCompany = useCallback(async (empId: number) => {
    // Validação de entrada
    if (!empId || typeof empId !== 'number' || ![2, 3].includes(empId)) {
      const errorMsg = `ID da empresa inválido: ${empId}. Deve ser 2 ou 3.`
      setError(errorMsg)
      console.error(`[PRODUCT-SYNC] ${errorMsg}`)
      return
    }

    if (loading) {
      console.log(`[PRODUCT-SYNC] Sincronização já em andamento`)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log(`[PRODUCT-SYNC] Iniciando sincronização para empresa ${empId}...`)
      
      // Verifica se o serviço está disponível
      if (!productSyncService) {
        throw new Error('Serviço de sincronização não está disponível')
      }
      
      await productSyncService.syncSingleCompany(empId)
      await updateSyncStatus()
      
      console.log(`[PRODUCT-SYNC] Sincronização concluída para empresa ${empId}`)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido na sincronização'
      const fullError = `Erro empresa ${empId}: ${errorMessage}`
      setError(fullError)
      console.error(`[PRODUCT-SYNC] ${fullError}`, err)
    } finally {
      setLoading(false)
    }
  }, [loading, updateSyncStatus])

  // Obtém estatísticas rápidas
  const getSyncStats = useCallback(() => {
    return productSyncService.getSyncStats()
  }, [])

  // Verifica se há produtos faltantes
  const hasMissingProducts = useCallback(() => {
    return productSyncService.hasMissingProducts()
  }, [])

  // Obtém todos os produtos faltantes
  const getAllMissingProducts = useCallback(() => {
    return [...missingProducts2, ...missingProducts3]
  }, [missingProducts2, missingProducts3])

  // Filtra produtos por empresa
  const getMissingProductsByCompany = useCallback((empId: number) => {
    return empId === 2 ? missingProducts2 : missingProducts3
  }, [missingProducts2, missingProducts3])

  // Obtém estatísticas de duplicatas
  const getDuplicateStats = useCallback(() => {
    return productSyncService.getDuplicateStats()
  }, [])

  // Formata data para exibição
  const formatDate = useCallback((date: Date | null) => {
    if (!date) return 'Nunca'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }, [])

  // Carrega status inicial
  useEffect(() => {
    updateSyncStatus()
  }, [updateSyncStatus])

  // Auto-refresh a cada 2 minutos se não estiver rodando
  useEffect(() => {
    const interval = setInterval(() => {
      if (!syncStatus.isRunning) {
        updateSyncStatus()
      }
    }, 2 * 60 * 1000) // 2 minutos

    return () => clearInterval(interval)
  }, [syncStatus.isRunning, updateSyncStatus])

  const duplicateStats = getDuplicateStats()

  return {
    // Status e dados
    syncStatus,
    missingProducts2,
    missingProducts3,
    uniqueMissingProducts,
    loading,
    error,
    
    // Ações
    syncAllCompanies,
    syncSingleCompany,
    updateSyncStatus,
    
    // Helpers
    getSyncStats,
    hasMissingProducts,
    getAllMissingProducts,
    getMissingProductsByCompany,
    getDuplicateStats,
    formatDate,
    
    // Estados computados
    totalMissingProducts: missingProducts2.length + missingProducts3.length,
    totalUniqueMissingProducts: uniqueMissingProducts.length,
    totalDuplicates: duplicateStats.totalDuplicates,
    hasResults: syncStatus.empresa2 !== null || syncStatus.empresa3 !== null,
    isReady: !loading && !syncStatus.isRunning,
  }
} 