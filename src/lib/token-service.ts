import { redis, REDIS_KEYS } from './redis'
import { TokenEmpresa, TokenStatus, SyncStatus } from '@/types'

class TokenService {
  private syncInterval: NodeJS.Timeout | null = null
  private isRunning = false

  /**
   * Função auxiliar para decodificar base64url
   */
  private base64urlDecode(str: string): string {
    // Converte base64url para base64 padrão
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    
    // Adiciona padding se necessário
    while (base64.length % 4) {
      base64 += '='
    }
    
    try {
      // No browser, usa atob; no Node.js, usa Buffer
      if (typeof window !== 'undefined') {
        return atob(base64)
      } else {
        return Buffer.from(base64, 'base64').toString('utf-8')
      }
    } catch (error) {
      throw new Error('Erro ao decodificar base64url')
    }
  }

  /**
   * Obtém a lista de tokens do Redis
   */
  async getTokens(): Promise<TokenEmpresa[]> {
    try {
      const tokens = await redis.lrange(REDIS_KEYS.TOKENS_MM, 0, -1)
      
      if (!tokens || tokens.length === 0) {
        return []
      }

      // Parse dos tokens JSON
      const parsedTokens: TokenEmpresa[] = tokens
        .map(token => {
          try {
            return typeof token === 'string' ? JSON.parse(token) : token
          } catch (error) {
            console.error('Erro ao parsear token:', error)
            return null
          }
        })
        .filter(token => token !== null)

      return parsedTokens
    } catch (error) {
      console.error('Erro ao obter tokens do Redis:', error)
      throw new Error('Falha ao carregar tokens')
    }
  }

  /**
   * Decodifica um token JWT para obter informações
   */
  decodeToken(token: string): TokenStatus {
    try {
      const [header, payload, signature] = token.split('.')
      
      if (!payload) {
        return { isValid: false, empId: 0 }
      }

      const decodedPayload = JSON.parse(this.base64urlDecode(payload))

      return {
        isValid: true,
        empId: decodedPayload.empId || 0,
        expiresAt: decodedPayload.expiresAt,
        terminal: decodedPayload.terminal
      }
    } catch (error) {
      console.error('Erro ao decodificar token:', error)
      return { isValid: false, empId: 0 }
    }
  }

  /**
   * Verifica se um token está válido (não expirado)
   */
  isTokenValid(token: string): boolean {
    try {
      const decoded = this.decodeToken(token)
      
      if (!decoded.isValid || !decoded.expiresAt) {
        return false
      }

      const expirationDate = new Date(decoded.expiresAt)
      const now = new Date()
      
      return expirationDate > now
    } catch (error) {
      return false
    }
  }

  /**
   * Obtém o status da sincronização
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const lastSyncStr = await redis.get(REDIS_KEYS.LAST_SYNC)
      const tokens = await this.getTokens()
      
      const lastSync = lastSyncStr ? new Date(lastSyncStr as string) : null
      const nextSync = lastSync ? new Date(lastSync.getTime() + 30 * 60 * 1000) : null

      return {
        lastSync,
        nextSync,
        isRunning: this.isRunning,
        tokensCount: tokens.length,
        errors: []
      }
    } catch (error) {
      return {
        lastSync: null,
        nextSync: null,
        isRunning: this.isRunning,
        tokensCount: 0,
        errors: ['Erro ao obter status da sincronização']
      }
    }
  }

  /**
   * Força uma sincronização manual
   */
  async forcSync(): Promise<void> {
    try {
      await redis.set(REDIS_KEYS.LAST_SYNC, new Date().toISOString())
      console.log('Sincronização forçada executada')
    } catch (error) {
      console.error('Erro na sincronização forçada:', error)
      throw error
    }
  }

  /**
   * Inicia a sincronização automática a cada 30 minutos
   */
  startAutoSync(): void {
    if (this.syncInterval) {
      console.log('Sincronização automática já está rodando')
      return
    }

    console.log('Iniciando sincronização automática (30 minutos)')

    // Primeira sincronização imediata
    this.performSync()

    // Configurar intervalo de 30 minutos (30 * 60 * 1000 ms)
    this.syncInterval = setInterval(() => {
      this.performSync()
    }, 30 * 60 * 1000)
  }

  /**
   * Para a sincronização automática
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      this.isRunning = false
      console.log('Sincronização automática parada')
    }
  }

  /**
   * Executa uma sincronização
   */
  private async performSync(): Promise<void> {
    if (this.isRunning) {
      console.log('Sincronização já está em execução')
      return
    }

    try {
      this.isRunning = true
      console.log('Iniciando sincronização de tokens...')

      // Atualizar timestamp da última sincronização
      await redis.set(REDIS_KEYS.LAST_SYNC, new Date().toISOString())

      // Obter tokens atualizados
      const tokens = await this.getTokens()
      console.log(`Sincronização concluída: ${tokens.length} tokens encontrados`)

    } catch (error) {
      console.error('Erro durante sincronização:', error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Obtém estatísticas dos tokens
   */
  async getTokenStats(): Promise<{
    total: number
    valid: number
    expired: number
    companies: number[]
  }> {
    try {
      const tokens = await this.getTokens()
      
      let validCount = 0
      let expiredCount = 0
      const companies = new Set<number>()

      tokens.forEach(tokenData => {
        companies.add(tokenData.empId)
        
        if (this.isTokenValid(tokenData.token)) {
          validCount++
        } else {
          expiredCount++
        }
      })

      return {
        total: tokens.length,
        valid: validCount,
        expired: expiredCount,
        companies: Array.from(companies)
      }
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error)
      return { total: 0, valid: 0, expired: 0, companies: [] }
    }
  }
}

// Instância singleton do serviço
export const tokenService = new TokenService() 