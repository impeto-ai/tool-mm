import { MaxDataProduct, MaxDataApiResponse, MaxDataGroup, MaxDataSubGroup, TokenEmpresa } from '@/types'

/**
 * IMPORTANTE: Por regra de negócio, todas as consultas de produtos devem incluir
 * o filtro 'saldoEstoque=positivo' para retornar apenas produtos com estoque disponível.
 * Isso garante que o sistema trabalhe apenas com produtos que podem ser vendidos.
 */
const ESTOQUE_POSITIVO_FILTER = 'saldoEstoque=positivo'

class MaxDataApiClient {
  // URL do proxy interno - detecta se está no servidor ou cliente
  private get baseUrl() {
    // Se estamos no servidor (API routes), usa URL completa
    if (typeof window === 'undefined') {
      return 'http://localhost:3000/api/max-data'
    }
    // Se estamos no cliente (browser), usa URL relativa
    return '/api/max-data'
  }
  
  private authTokens: Map<number, string> = new Map()

  /**
   * Define tokens de autenticação para as empresas
   */
  setAuthTokens(tokens: TokenEmpresa[]) {
    this.authTokens.clear()
    tokens.forEach(token => {
      this.authTokens.set(token.empId, token.token)
    })
  }

  /**
   * Obtém o token de autenticação para uma empresa
   */
  private getAuthToken(empId: number): string | null {
    return this.authTokens.get(empId) || null
  }

  /**
   * Faz uma requisição HTTP autenticada
   */
  private async makeRequest<T>(
    endpoint: string, 
    empId: number, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken(empId)
    
    if (!token) {
      throw new Error(`Token de autenticação não encontrado para empresa ${empId}`)
    }

    // Remove a barra inicial do endpoint se existir
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint
    const url = `${this.baseUrl}/${cleanEndpoint}`
    
    console.log(`[MAX-DATA-CLIENT] Fazendo requisição para: ${url}`)
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        let errorMessage = `Erro na API (${response.status})`
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch {
          errorMessage = await response.text() || errorMessage
        }
        
        console.error(`[MAX-DATA-CLIENT] Erro ${response.status}:`, errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log(`[MAX-DATA-CLIENT] Resposta recebida com sucesso`)
      return data
      
    } catch (error) {
      console.error(`[MAX-DATA-CLIENT] Erro na requisição:`, error)
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Erro de conexão - verifique sua internet e tente novamente')
      }
      
      throw error
    }
  }

  /**
   * Busca uma página específica de produtos
   */
  async getProductsPage(empId: number, page: number = 1, limit: number = 1000): Promise<MaxDataApiResponse<MaxDataProduct>> {
    const endpoint = `product?limit=${limit}&${ESTOQUE_POSITIVO_FILTER}&page=${page}`
    return this.makeRequest<MaxDataApiResponse<MaxDataProduct>>(endpoint, empId)
  }

  /**
   * Busca TODOS os produtos de uma empresa (com paginação automática)
   */
  async getAllProducts(empId: number): Promise<MaxDataProduct[]> {
    // Validação inicial
    if (!empId || typeof empId !== 'number') {
      throw new Error(`ID da empresa inválido: ${empId}`)
    }

    // Verifica se há token para a empresa
    const token = this.getAuthToken(empId)
    if (!token) {
      throw new Error(`Token não encontrado para a empresa ${empId}`)
    }

    console.log(`[MAX-DATA-CLIENT] Iniciando busca de produtos para empresa ${empId}...`)
    
    const allProducts: MaxDataProduct[] = []
    let currentPage = 1
    let hasMorePages = true
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 3

    while (hasMorePages && consecutiveErrors < maxConsecutiveErrors) {
      try {
        console.log(`[MAX-DATA-CLIENT] Buscando página ${currentPage} para empresa ${empId}...`)
        
        const response = await this.getProductsPage(empId, currentPage, 1000)
        
        // Reset contador de erros consecutivos em caso de sucesso
        consecutiveErrors = 0
        
        // Validação robusta da resposta
        if (!response) {
          console.error('[MAX-DATA-CLIENT] Resposta vazia/null')
          throw new Error('Resposta vazia da API')
        }
        
        if (typeof response !== 'object') {
          console.error('[MAX-DATA-CLIENT] Resposta não é um objeto:', typeof response)
          throw new Error('Resposta da API em formato inválido')
        }
        
        if (!('docs' in response)) {
          console.error('[MAX-DATA-CLIENT] Campo "docs" ausente na resposta:', Object.keys(response))
          throw new Error('Resposta da API não possui a estrutura esperada (falta campo "docs")')
        }
        
        if (!Array.isArray(response.docs)) {
          console.error('[MAX-DATA-CLIENT] Campo "docs" não é um array:', typeof response.docs, response.docs)
          throw new Error('Campo "docs" da resposta não é um array')
        }
        
        // Adiciona produtos da página atual (proteção contra undefined)
        const pageProducts = response.docs.filter(Boolean) // Remove itens null/undefined
        allProducts.push(...pageProducts)
        
        // Verifica se há mais páginas usando a estrutura da Max Data API
        const totalPages = Number(response.pages) || 1
        const currentPageNum = Number(response.page) || currentPage
        
        hasMorePages = currentPageNum < totalPages
        currentPage++
        
        console.log(`[MAX-DATA-CLIENT] Página ${currentPageNum}: ${pageProducts.length} produtos válidos encontrados (total: ${allProducts.length}, páginas restantes: ${Math.max(0, totalPages - currentPageNum)})`)
        
        // Pequeno delay para evitar rate limiting
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
      } catch (error) {
        consecutiveErrors++
        console.error(`[MAX-DATA-CLIENT] Erro ao buscar página ${currentPage} para empresa ${empId} (erro ${consecutiveErrors}/${maxConsecutiveErrors}):`, error)
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(`[MAX-DATA-CLIENT] Máximo de erros consecutivos atingido para empresa ${empId}`)
          throw new Error(`Falha após ${maxConsecutiveErrors} tentativas consecutivas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
        
        // Pequeno delay antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`[MAX-DATA-CLIENT] Busca concluída para empresa ${empId}: ${allProducts.length} produtos encontrados`)
    
    // Validação final
    if (!Array.isArray(allProducts)) {
      throw new Error('Lista de produtos final não é um array')
    }
    
    return allProducts
  }

  /**
   * Busca um produto específico por ID
   */
  async getProduct(empId: number, productId: number): Promise<MaxDataProduct> {
    const endpoint = `product/${productId}?${ESTOQUE_POSITIVO_FILTER}`
    return this.makeRequest<MaxDataProduct>(endpoint, empId)
  }

  /**
   * Busca um produto por EAN (código de barras)
   */
  async getProductByEan(empId: number, ean: string): Promise<MaxDataProduct> {
    const endpoint = `product/ean/${ean}?${ESTOQUE_POSITIVO_FILTER}`
    return this.makeRequest<MaxDataProduct>(endpoint, empId)
  }

  /**
   * Busca grupos (categorias) de produtos
   */
  async getGroups(empId: number): Promise<MaxDataGroup[]> {
    const endpoint = 'product/groups'
    const response = await this.makeRequest<MaxDataApiResponse<MaxDataGroup> | MaxDataGroup[]>(endpoint, empId)
    
    // Se a resposta tem estrutura paginada, retorna docs
    if (response && typeof response === 'object' && 'docs' in response) {
      return Array.isArray(response.docs) ? response.docs : []
    }
    
    // Se é array direto, retorna como está
    if (Array.isArray(response)) {
      return response
    }
    
    // Fallback para array vazio
    console.warn('[MAX-DATA-CLIENT] Estrutura de grupos inesperada:', response)
    return []
  }

  /**
   * Busca subgrupos (subcategorias) de produtos
   */
  async getSubGroups(empId: number): Promise<MaxDataSubGroup[]> {
    const endpoint = 'product/subgroups'
    const response = await this.makeRequest<MaxDataApiResponse<MaxDataSubGroup> | MaxDataSubGroup[]>(endpoint, empId)
    
    // Se a resposta tem estrutura paginada, retorna docs
    if (response && typeof response === 'object' && 'docs' in response) {
      return Array.isArray(response.docs) ? response.docs : []
    }
    
    // Se é array direto, retorna como está
    if (Array.isArray(response)) {
      return response
    }
    
    // Fallback para array vazio
    console.warn('[MAX-DATA-CLIENT] Estrutura de subgrupos inesperada:', response)
    return []
  }

  /**
   * Busca imagem de um produto
   */
  async getProductImage(empId: number, productId: number): Promise<Blob> {
    const token = this.getAuthToken(empId)
    
    if (!token) {
      throw new Error(`Token de autenticação não encontrado para empresa ${empId}`)
    }

    const url = `${this.baseUrl}/product/${productId}/image`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Erro ao buscar imagem do produto ${productId}: ${response.status}`)
    }

    return response.blob()
  }

  /**
   * Verifica se a API está acessível para uma empresa
   */
  async testConnection(empId: number): Promise<boolean> {
    try {
      console.log(`[MAX-DATA-CLIENT] Testando conexão para empresa ${empId}...`)
      await this.getProductsPage(empId, 1, 1)
      console.log(`[MAX-DATA-CLIENT] Conexão OK para empresa ${empId}`)
      return true
    } catch (error) {
      console.error(`[MAX-DATA-CLIENT] Erro ao testar conexão para empresa ${empId}:`, error)
      return false
    }
  }

  /**
   * Obtém estatísticas rápidas de produtos
   */
  async getProductStats(empId: number): Promise<{
    totalProducts: number
    totalPages: number
    hasConnection: boolean
  }> {
    try {
      console.log(`[MAX-DATA-CLIENT] Obtendo estatísticas para empresa ${empId}...`)
      const firstPage = await this.getProductsPage(empId, 1, 1)
      
      const stats = {
        totalProducts: firstPage.total || 0,
        totalPages: firstPage.pages || 0,
        hasConnection: true
      }
      
      console.log(`[MAX-DATA-CLIENT] Estatísticas para empresa ${empId}:`, stats)
      return stats
      
    } catch (error) {
      console.error(`[MAX-DATA-CLIENT] Erro ao obter estatísticas para empresa ${empId}:`, error)
      return {
        totalProducts: 0,
        totalPages: 0,
        hasConnection: false
      }
    }
  }
}

// Instância singleton do cliente
export const maxDataApi = new MaxDataApiClient() 