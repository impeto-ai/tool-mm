import { maxDataApi } from './max-data-api'
import { supabase, ImageRecord } from './supabase'
import { tokenService } from './token-service'
import { 
  MaxDataProduct, 
  ProductSyncResult, 
  ProductSyncStatus, 
  MissingProductInfo,
  MaxDataGroup,
  MaxDataSubGroup
} from '@/types'

class ProductSyncService {
  private isRunning = false
  private lastSyncResults: Map<number, ProductSyncResult> = new Map()

  /**
   * Obtém todos os IDs de produtos existentes no Supabase
   */
  private async getSupabaseProductIds(): Promise<Set<string>> {
    try {
      console.log('[PRODUCT-SYNC] Iniciando busca de todos os IDs do Supabase...')
      
      const productIds = new Set<string>()
      let currentPage = 0
      const pageSize = 1000 // Tamanho da página
      let hasMoreData = true
      
      while (hasMoreData) {
        const from = currentPage * pageSize
        const to = from + pageSize - 1
        
        console.log(`[PRODUCT-SYNC] Buscando página ${currentPage + 1} (registros ${from}-${to})...`)
        
        const { data, error, count } = await supabase
          .from('images')
          .select('original_id', { count: 'exact' })
          .range(from, to)

        if (error) {
          throw new Error(`Erro ao buscar produtos do Supabase: ${error.message}`)
        }

        // Adiciona IDs desta página ao Set
        data?.forEach(record => {
          if (record.original_id) {
            productIds.add(record.original_id)
          }
        })
        
        // Log do progresso
        const totalRegistros = count || 0
        const registrosBuscados = Math.min(to + 1, totalRegistros)
        console.log(`[PRODUCT-SYNC] Página ${currentPage + 1}: ${data?.length || 0} registros encontrados (${registrosBuscados}/${totalRegistros})`)
        
        // Verifica se há mais dados
        hasMoreData = data && data.length === pageSize && registrosBuscados < totalRegistros
        currentPage++
        
        // Pequeno delay para não sobrecarregar o Supabase
        if (hasMoreData) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      console.log(`[PRODUCT-SYNC] Busca do Supabase concluída: ${productIds.size} IDs únicos encontrados`)
      return productIds
      
    } catch (error) {
      console.error('Erro ao obter IDs dos produtos do Supabase:', error)
      throw error
    }
  }

  /**
   * Compara produtos de uma empresa com os existentes no Supabase
   */
  private async syncCompanyProducts(empId: number): Promise<ProductSyncResult> {
    console.log(`Iniciando sincronização para empresa ${empId}...`)

    try {
      // Busca produtos da API Max Data
      const maxDataProducts = await maxDataApi.getAllProducts(empId)
      
      // Busca IDs dos produtos existentes no Supabase
      const supabaseProductIds = await this.getSupabaseProductIds()
      
      // Identifica produtos faltantes
      const missingProducts: MaxDataProduct[] = []
      
      maxDataProducts.forEach(product => {
        const productIdStr = product.id.toString()
        if (!supabaseProductIds.has(productIdStr)) {
          missingProducts.push(product)
        }
      })

      const result: ProductSyncResult = {
        totalProductsMaxData: maxDataProducts.length,
        totalProductsSupabase: supabaseProductIds.size,
        missingProducts,
        empId,
        lastSync: new Date(),
        errors: []
      }

      console.log(`Sincronização concluída para empresa ${empId}:`)
      console.log(`- Total Max Data: ${result.totalProductsMaxData}`)
      console.log(`- Total Supabase: ${result.totalProductsSupabase}`)
      console.log(`- Produtos faltantes: ${result.missingProducts.length}`)

      // Salva resultado
      this.lastSyncResults.set(empId, result)
      
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error(`Erro na sincronização da empresa ${empId}:`, error)
      
      const result: ProductSyncResult = {
        totalProductsMaxData: 0,
        totalProductsSupabase: 0,
        missingProducts: [],
        empId,
        lastSync: new Date(),
        errors: [errorMessage]
      }

      this.lastSyncResults.set(empId, result)
      return result
    }
  }

  /**
   * Executa sincronização completa para empresas 2 e 3
   */
  async syncAllCompanies(): Promise<ProductSyncStatus> {
    if (this.isRunning) {
      throw new Error('Sincronização já está em execução')
    }

    try {
      this.isRunning = true
      console.log('Iniciando sincronização completa...')

      // Obtém tokens do Redis e configura API
      const tokens = await tokenService.getTokens()
      maxDataApi.setAuthTokens(tokens)

      // Filtra apenas empresas 2 e 3
      const company2Token = tokens.find(t => t.empId === 2)
      const company3Token = tokens.find(t => t.empId === 3)

      const results: ProductSyncResult[] = []
      const errors: string[] = []

      // Sincroniza empresa 2
      if (company2Token) {
        try {
          const result2 = await this.syncCompanyProducts(2)
          results.push(result2)
        } catch (error) {
          const errorMsg = `Erro na empresa 2: ${error instanceof Error ? error.message : error}`
          errors.push(errorMsg)
        }
      } else {
        errors.push('Token da empresa 2 não encontrado')
      }

      // Sincroniza empresa 3
      if (company3Token) {
        try {
          const result3 = await this.syncCompanyProducts(3)
          results.push(result3)
        } catch (error) {
          const errorMsg = `Erro na empresa 3: ${error instanceof Error ? error.message : error}`
          errors.push(errorMsg)
        }
      } else {
        errors.push('Token da empresa 3 não encontrado')
      }

      const status: ProductSyncStatus = {
        isRunning: false,
        empresa2: this.lastSyncResults.get(2) || null,
        empresa3: this.lastSyncResults.get(3) || null,
        lastSync: new Date(),
        errors
      }

      console.log('Sincronização completa finalizada!')
      return status

    } finally {
      this.isRunning = false
    }
  }

  /**
   * Obtém o status atual da sincronização
   */
  getSyncStatus(): ProductSyncStatus {
    return {
      isRunning: this.isRunning,
      empresa2: this.lastSyncResults.get(2) || null,
      empresa3: this.lastSyncResults.get(3) || null,
      lastSync: this.getLastSyncDate(),
      errors: []
    }
  }

  /**
   * Obtém a data da última sincronização
   */
  private getLastSyncDate(): Date | null {
    const results = Array.from(this.lastSyncResults.values())
    if (results.length === 0) return null
    
    return results.reduce((latest, current) => 
      current.lastSync > latest ? current.lastSync : latest, 
      results[0].lastSync
    )
  }

  /**
   * Obtém produtos faltantes com informações enriquecidas
   */
  async getMissingProductsWithDetails(empId: number): Promise<MissingProductInfo[]> {
    const syncResult = this.lastSyncResults.get(empId)
    if (!syncResult || syncResult.missingProducts.length === 0) {
      return []
    }

    try {
      console.log(`[PRODUCT-SYNC] Preparando ${syncResult.missingProducts.length} produtos faltantes da empresa ${empId}...`)

      // Retorna produtos básicos sem buscar groups/subgroups para evitar timeouts
      const basicProducts: MissingProductInfo[] = syncResult.missingProducts.map(product => ({
        id: product.id,
        descricao: product.descricao,
        ean: product.ean,
        saldoEstoque: product.saldoEstoque,
        empId: product.empId,
        grupo: product.idGrupo ? `Grupo ${product.idGrupo}` : undefined,
        subgrupo: product.idSubGrupo ? `Subgrupo ${product.idSubGrupo}` : undefined,
        preco: product.preco,
        hasImage: !!product.foto
      }))

      console.log(`[PRODUCT-SYNC] ${basicProducts.length} produtos básicos preparados para empresa ${empId}`)
      return basicProducts

    } catch (error) {
      console.error('Erro ao preparar produtos faltantes:', error)
      // Retorna versão básica em caso de erro
      return syncResult.missingProducts.map(product => ({
        id: product.id,
        descricao: product.descricao,
        ean: product.ean,
        saldoEstoque: product.saldoEstoque,
        empId: product.empId,
        preco: product.preco,
        hasImage: !!product.foto
      }))
    }
  }

  /**
   * Obtém estatísticas rápidas de sincronização
   */
  getSyncStats(): {
    totalMissing: number
    empresa2Missing: number
    empresa3Missing: number
    lastSync: Date | null
  } {
    const empresa2Result = this.lastSyncResults.get(2)
    const empresa3Result = this.lastSyncResults.get(3)

    const empresa2Missing = empresa2Result?.missingProducts.length || 0
    const empresa3Missing = empresa3Result?.missingProducts.length || 0

    return {
      totalMissing: empresa2Missing + empresa3Missing,
      empresa2Missing,
      empresa3Missing,
      lastSync: this.getLastSyncDate()
    }
  }

  /**
   * Força uma nova sincronização para uma empresa específica
   */
  async syncSingleCompany(empId: number): Promise<ProductSyncResult> {
    if (this.isRunning) {
      throw new Error('Sincronização já está em execução')
    }

    try {
      this.isRunning = true
      
      // Configura tokens
      const tokens = await tokenService.getTokens()
      maxDataApi.setAuthTokens(tokens)

      return await this.syncCompanyProducts(empId)

    } finally {
      this.isRunning = false
    }
  }

  /**
   * Verifica se há produtos faltantes
   */
  hasMissingProducts(): boolean {
    return this.getSyncStats().totalMissing > 0
  }

  /**
   * Obtém produtos faltantes únicos (sem duplicatas entre empresas)
   */
  getUniqueMissingProducts(): MissingProductInfo[] {
    const empresa2Result = this.lastSyncResults.get(2)
    const empresa3Result = this.lastSyncResults.get(3)

    const allMissingProducts: MissingProductInfo[] = []
    const productIds = new Set<number>()

    // Adiciona produtos da empresa 2
    if (empresa2Result && empresa2Result.missingProducts.length > 0) {
      empresa2Result.missingProducts.forEach(product => {
        if (!productIds.has(product.id)) {
          productIds.add(product.id)
          allMissingProducts.push({
            id: product.id,
            descricao: product.descricao,
            ean: product.ean,
            saldoEstoque: product.saldoEstoque,
            empId: product.empId,
            preco: product.preco,
            hasImage: !!product.foto
          })
        }
      })
    }

    // Adiciona produtos da empresa 3 (só se não estiver duplicado)
    if (empresa3Result && empresa3Result.missingProducts.length > 0) {
      empresa3Result.missingProducts.forEach(product => {
        if (!productIds.has(product.id)) {
          productIds.add(product.id)
          allMissingProducts.push({
            id: product.id,
            descricao: product.descricao,
            ean: product.ean,
            saldoEstoque: product.saldoEstoque,
            empId: product.empId,
            preco: product.preco,
            hasImage: !!product.foto
          })
        }
      })
    }

    return allMissingProducts.sort((a, b) => a.id - b.id)
  }

  /**
   * Obtém produtos faltantes únicos com informações enriquecidas
   */
  async getUniqueMissingProductsWithDetails(): Promise<MissingProductInfo[]> {
    const uniqueProducts = this.getUniqueMissingProducts()
    
    if (uniqueProducts.length === 0) {
      return []
    }

    console.log(`[PRODUCT-SYNC] ${uniqueProducts.length} produtos únicos básicos preparados`)
    
    // Retorna os produtos únicos que já vêm com a estrutura correta
    return uniqueProducts
  }

  /**
   * Obtém estatísticas de duplicatas entre empresas
   */
  getDuplicateStats(): {
    totalUnique: number
    totalDuplicates: number
    empresa2Total: number
    empresa3Total: number
    duplicateIds: number[]
  } {
    const empresa2Result = this.lastSyncResults.get(2)
    const empresa3Result = this.lastSyncResults.get(3)

    const empresa2Products = empresa2Result ? empresa2Result.missingProducts : []
    const empresa3Products = empresa3Result ? empresa3Result.missingProducts : []

    const empresa2Ids = new Set(empresa2Products.map(p => p.id))
    const empresa3Ids = new Set(empresa3Products.map(p => p.id))

    // Encontra duplicatas
    const duplicateIds = empresa2Products
      .filter(p => empresa3Ids.has(p.id))
      .map(p => p.id)

    const totalUnique = new Set([...empresa2Ids, ...empresa3Ids]).size
    const totalDuplicates = duplicateIds.length

    return {
      totalUnique,
      totalDuplicates,
      empresa2Total: empresa2Products.length,
      empresa3Total: empresa3Products.length,
      duplicateIds
    }
  }
}

// Instância singleton do serviço
export const productSyncService = new ProductSyncService() 