"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ProductEditModal } from "@/components/ui/product-edit-modal"
import { useTokens } from "@/hooks/use-tokens"
import { useProductSync } from "@/hooks/use-product-sync"
import { useSupabaseStats } from "@/hooks/use-supabase-stats"
import { useMounted } from "@/hooks/use-mounted"
import { 
  RefreshCw, 
  Database, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Play, 
  Square,
  Building2,
  Key,
  Timer,
  Package,
  AlertTriangle,
  RotateCw,
  ShoppingCart,
  Edit,
  Image as ImageIcon,
  TrendingUp,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react"

export default function Home() {
  // Hook para evitar hydration mismatch
  const mounted = useMounted()
  
  // Estados para modal de edição
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null)
  
  // Estados para busca e paginação
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  const {
    tokens,
    syncStatus: tokenSyncStatus,
    loading: tokensLoading,
    error: tokensError,
    loadTokens,
    forceSync,
    startAutoSync,
    stopAutoSync,
    isTokenValid,
    decodeToken,
    getStats: getTokenStats
  } = useTokens()

  const {
    syncStatus: productSyncStatus,
    uniqueMissingProducts,
    loading: productsLoading,
    error: productsError,
    syncAllCompanies,
    syncSingleCompany,
    getSyncStats,
    getDuplicateStats,
    formatDate,
    totalUniqueMissingProducts,
    totalDuplicates,
    hasResults
  } = useProductSync()

  const {
    stats: supabaseStats,
    loading: supabaseLoading,
    error: supabaseError,
    loadStats: loadSupabaseStats,
    getSuccessRate,
    getLastUpdatedFormatted
  } = useSupabaseStats()

  const [tokenStats, setTokenStats] = useState({
    total: 0,
    valid: 0,
    expired: 0,
    companies: [] as number[]
  })

  // Carrega estatísticas de tokens
  useEffect(() => {
    const loadStats = async () => {
      const newStats = await getTokenStats()
      setTokenStats(newStats)
    }
    
    if (tokens.length > 0) {
      loadStats()
    }
  }, [tokens, getTokenStats])

  // Função para formatar data
  const formatDateLocal = (date: Date | null) => {
    if (!date) return 'Nunca'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Função para obter status do token
  const getTokenStatus = (token: string) => {
    const tokenIsValid = isTokenValid(token)
    const decoded = decodeToken(token)
    
    return {
      ...decoded,
      isValid: tokenIsValid
    }
  }

  // Abre modal de edição
  const handleEditProduct = (productId: number, empId: number) => {
    setSelectedProductId(productId)
    setSelectedEmpId(empId)
    setEditModalOpen(true)
  }

  // Fecha modal de edição
  const handleCloseEditModal = () => {
    setEditModalOpen(false)
    setSelectedProductId(null)
    setSelectedEmpId(null)
  }

  // Callback após salvar produto
  const handleProductSaved = () => {
    // Recarrega dados após salvar
    syncAllCompanies()
    loadSupabaseStats()
  }

  const productStats = getSyncStats()
  const duplicateStats = getDuplicateStats()

  // Filtrar produtos com base na busca
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return uniqueMissingProducts
    
    const term = searchTerm.toLowerCase()
    return uniqueMissingProducts.filter(product =>
      product.descricao.toLowerCase().includes(term) ||
      product.id.toString().includes(term) ||
      product.ean?.toLowerCase().includes(term) ||
      product.grupo?.toLowerCase().includes(term) ||
      product.subgrupo?.toLowerCase().includes(term)
    )
  }, [uniqueMissingProducts, searchTerm])

  // Calcular produtos para página atual
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, currentPage, itemsPerPage])

  // Calcular informações de paginação
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, filteredProducts.length)

  // Reset da página quando busca mudnece
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Evita hydration mismatch - não renderiza conteúdo até estar montado no cliente
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Sistema de Gerenciamento</h1>
              <p className="text-muted-foreground mt-1">
                Tokens Redis + Sincronização de Produtos
              </p>
            </div>
          </div>
          
          {/* Loading skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sistema de Gerenciamento</h1>
            <p className="text-muted-foreground mt-1">
              Tokens Redis + Sincronização de Produtos + Supabase
            </p>
          </div>
        </div>

        {/* Dashboard Cards Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens Ativos</CardTitle>
              <Key className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {tokensLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{tokenStats.valid}</div>
                  <p className="text-xs text-muted-foreground">
                    de {tokenStats.total} total
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos Únicos Faltantes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600">
                    {totalUniqueMissingProducts}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    no MaxData mas não no Supabase
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total MaxData</CardTitle>
              <Database className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {(productSyncStatus.empresa2?.totalProductsMaxData || 0) + 
                     (productSyncStatus.empresa3?.totalProductsMaxData || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    produtos disponíveis (Emp 2+3)
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Salvos no Supabase</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {supabaseLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-blue-600">
                    {supabaseStats?.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    registros no banco de dados
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              {supabaseLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-emerald-600">
                    {getSuccessRate()}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    imagens processadas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas</CardTitle>
              <Users className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              {tokensLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{tokenStats.companies.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {tokenStats.companies.join(', ')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs Principal */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos Faltantes
            </TabsTrigger>
            <TabsTrigger value="tokens" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Gerenciar Tokens
            </TabsTrigger>
          </TabsList>

          {/* Aba de Produtos */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex items-center gap-2">
              <Button
                onClick={syncAllCompanies}
                disabled={productsLoading || productSyncStatus.isRunning}
                size="sm"
              >
                <RotateCw className={`h-4 w-4 mr-2 ${productsLoading ? 'animate-spin' : ''}`} />
                Sincronizar Todas
              </Button>
              <Button
                variant="outline"
                onClick={() => syncSingleCompany(2)}
                disabled={productsLoading || productSyncStatus.isRunning}
                size="sm"
              >
                Empresa 2
              </Button>
              <Button
                variant="outline"
                onClick={() => syncSingleCompany(3)}
                disabled={productsLoading || productSyncStatus.isRunning}
                size="sm"
              >
                Empresa 3
              </Button>
              <Button
                variant="outline"
                onClick={loadSupabaseStats}
                disabled={supabaseLoading}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${supabaseLoading ? 'animate-spin' : ''}`} />
                Atualizar Stats
              </Button>
            </div>

            {/* Error Alerts */}
            {productsError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{productsError}</AlertDescription>
              </Alert>
            )}

            {supabaseError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>Supabase: {supabaseError}</AlertDescription>
              </Alert>
            )}

            {/* Status Cards Produtos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status Sincronização</CardTitle>
                  <Database className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <Badge 
                    variant={productSyncStatus.isRunning ? "default" : "secondary"}
                    className="mb-2"
                  >
                    {productSyncStatus.isRunning ? "Sincronizando..." : "Pronto"}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Última: {formatDate(productStats.lastSync)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Análise Duplicatas</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">Únicos:</span> {duplicateStats.totalUnique}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Duplicados:</span> {duplicateStats.totalDuplicates}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Emp 2: {duplicateStats.empresa2Total} | Emp 3: {duplicateStats.empresa3Total}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status Supabase</CardTitle>
                  <Clock className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">Total:</span> {supabaseStats?.total || 0}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Sucesso:</span> {supabaseStats?.successful || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Atualizado: {getLastUpdatedFormatted()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Produtos Únicos Faltantes */}
            {hasResults && uniqueMissingProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-600" />
                    Produtos Faltantes no Supabase ({uniqueMissingProducts.length})
                  </CardTitle>
                  <CardDescription>
                    Produtos que existem no <strong>MaxData</strong> mas ainda <strong>NÃO estão salvos no Supabase</strong>. 
                    Clique em um produto para editá-lo e salvá-lo no banco de dados.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Estes produtos precisam ser adicionados ao Supabase
                      </span>
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Lista sem duplicatas • Fontes: MaxData Empresa 2 e 3
                    </p>
                  </div>

                  {/* Barra de Busca */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Buscar produtos... (nome, ID, EAN, grupo)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchTerm && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {filteredProducts.length} de {uniqueMissingProducts.length} produtos encontrados
                      </div>
                    )}
                  </div>
                  
                  {/* Lista de Produtos com Paginação */}
                  {filteredProducts.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {paginatedProducts.map((product) => (
                          <div 
                            key={`${product.id}-${product.empId}`} 
                            className="border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-2 hover:bg-orange-50 dark:hover:bg-orange-950/10 cursor-pointer transition-all group hover:shadow-md"
                            onClick={() => handleEditProduct(product.id, product.empId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm flex-1">{product.descricao}</div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                                  MaxData Emp {product.empId}
                                </Badge>
                                <Badge variant="destructive" className="text-xs">
                                  Faltando
                                </Badge>
                                <Edit className="h-4 w-4 text-muted-foreground group-hover:text-orange-600" />
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="font-mono">ID: {product.id}</span>
                              {product.ean && <span className="font-mono">EAN: {product.ean}</span>}
                              <span>Estoque: {product.saldoEstoque}</span>
                              {product.preco && <span>R$ {product.preco.toFixed(2)}</span>}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {product.hasImage && (
                                  <Badge variant="secondary" className="text-xs">
                                    <ImageIcon className="h-3 w-3 mr-1" />
                                    Com Imagem
                                  </Badge>
                                )}
                                {(product.grupo || product.subgrupo) && (
                                  <div className="flex items-center gap-1">
                                    {product.grupo && (
                                      <Badge variant="outline" className="text-xs">
                                        {product.grupo}
                                      </Badge>
                                    )}
                                    {product.subgrupo && (
                                      <Badge variant="outline" className="text-xs">
                                        {product.subgrupo}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                Clique para adicionar ao Supabase →
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Paginação */}
                      {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between border-t pt-4">
                          <div className="text-sm text-muted-foreground">
                            Mostrando {startItem} a {endItem} de {filteredProducts.length} produtos
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                            >
                              <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let pageNum: number
                                if (totalPages <= 5) {
                                  pageNum = i + 1
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i
                                } else {
                                  pageNum = currentPage - 2 + i
                                }
                                
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="w-8 h-8 p-0"
                                  >
                                    {pageNum}
                                  </Button>
                                )
                              })}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                              disabled={currentPage === totalPages}
                            >
                              <ChevronsRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum produto encontrado para "{searchTerm}"</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        className="mt-2"
                      >
                        Limpar filtro
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {hasResults && uniqueMissingProducts.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                  <h3 className="text-lg font-medium mb-2">✅ Sincronização Completa!</h3>
                  <p className="text-muted-foreground">
                    Todos os produtos estão sincronizados entre MaxData e Supabase
                  </p>
                </CardContent>
              </Card>
            )}

            {!hasResults && !productsLoading && (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma sincronização executada</h3>
                  <p className="text-muted-foreground mb-4">
                    Execute uma sincronização para comparar produtos
                  </p>
                  <Button onClick={syncAllCompanies}>
                    <RotateCw className="h-4 w-4 mr-2" />
                    Iniciar Primeira Sincronização
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Aba de Tokens */}
          <TabsContent value="tokens" className="space-y-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadTokens}
                disabled={tokensLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${tokensLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={forceSync}
                disabled={tokensLoading}
              >
                <Database className="h-4 w-4 mr-2" />
                Sincronizar
              </Button>
            </div>

            {/* Error Alert */}
            {tokensError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{tokensError}</AlertDescription>
              </Alert>
            )}

            {/* Status Cards Tokens */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status de Tokens</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="font-medium text-green-600">Válidos:</span> {tokenStats.valid}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-red-600">Expirados:</span> {tokenStats.expired}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Última Sincronização</CardTitle>
                  <Clock className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {formatDateLocal(tokenSyncStatus.lastSync)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status Auto-Sync</CardTitle>
                  <Timer className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {tokenSyncStatus.isRunning ? (
                      <Button variant="outline" size="sm" onClick={stopAutoSync}>
                        <Square className="h-4 w-4 mr-2" />
                        Parar
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={startAutoSync}>
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar
                      </Button>
                    )}
                    <Badge variant={tokenSyncStatus.isRunning ? "default" : "secondary"}>
                      {tokenSyncStatus.isRunning ? "Rodando" : "Parado"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tokens Table */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Tokens</CardTitle>
                <CardDescription>
                  Última sincronização: {formatDateLocal(tokenSyncStatus.lastSync)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tokensLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : tokens.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum token encontrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID Empresa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Terminal</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead>Token</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokens.map((tokenData, index) => {
                        const status = getTokenStatus(tokenData.token)
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {tokenData.empId}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={status.isValid ? "default" : "destructive"}
                              >
                                {status.isValid ? "Válido" : "Expirado"}
                              </Badge>
                            </TableCell>
                            <TableCell>{status.terminal || "N/A"}</TableCell>
                            <TableCell>
                              {status.expiresAt ? formatDateLocal(new Date(status.expiresAt)) : "N/A"}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted p-1 rounded">
                                {tokenData.token.substring(0, 50)}...
                              </code>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Edição de Produto */}
        {selectedProductId && selectedEmpId && (
          <ProductEditModal
            productId={selectedProductId}
            empId={selectedEmpId}
            isOpen={editModalOpen}
            onClose={handleCloseEditModal}
            onSave={handleProductSaved}
          />
        )}
      </div>
    </div>
  )
}
