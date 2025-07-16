// Tipos para o sistema de estoque

export interface Produto {
  id: number
  nome: string
  categoria: string
  estoque: number
  preco: string
  precoNumerico: number
  status: 'normal' | 'baixo' | 'falta'
  descricao?: string
  codigoBarras?: string
  fornecedor?: string
  dataCriacao: Date
  dataAtualizacao: Date
}

export interface Categoria {
  id: number
  nome: string
  descricao?: string
  cor?: string
  icone?: string
}

export interface Fornecedor {
  id: number
  nome: string
  contato: string
  email?: string
  telefone?: string
  endereco?: string
}

export interface MovimentacaoEstoque {
  id: number
  produtoId: number
  tipo: 'entrada' | 'saida'
  quantidade: number
  motivo: string
  usuario: string
  data: Date
}

export interface FiltrosProdutos {
  busca?: string
  categoria?: string
  status?: string
  fornecedor?: string
  estoqueMinimo?: number
  estoqueMaximo?: number
}

export interface EstatisticasEstoque {
  totalProdutos: number
  produtosEmFalta: number
  vendasMes: number
  crescimento: number
  valorTotalEstoque: number
}

export type StatusProduto = 'normal' | 'baixo' | 'falta'

// Tipos para tokens do Redis
export interface TokenEmpresa {
  empId: number
  token: string
}

export interface TokenStatus {
  isValid: boolean
  expiresAt?: string
  terminal?: string
  empId: number
}

export interface SyncStatus {
  lastSync: Date | null
  nextSync: Date | null
  isRunning: boolean
  tokensCount: number
  errors: string[]
}

// Tipos para API Max Data
export interface MaxDataProduct {
  id: number
  descricao: string
  ean?: string
  preco?: number
  precoPromocional?: number
  saldoEstoque: number
  idGrupo?: number
  idSubGrupo?: number
  empId: number
  ativo: boolean
  ecommerce?: boolean
  observacao?: string
  unidade?: string
  marca?: string
  modelo?: string
  foto?: string
  created_at: string
  updated_at: string
}

export interface MaxDataApiResponse<T> {
  docs: T[]  // Max Data usa "docs", não "data"
  total: number
  limit: number
  page: number
  pages: number
}

export interface MaxDataGroup {
  id: number
  nome: string
  empId: number
  ecommerce?: boolean
}

export interface MaxDataSubGroup {
  id: number
  nome: string
  grupoId: number
  empId: number
  ecommerce?: boolean
}

// Tipos para sincronização de produtos
export interface ProductSyncResult {
  totalProductsMaxData: number
  totalProductsSupabase: number
  missingProducts: MaxDataProduct[]
  empId: number
  lastSync: Date
  errors: string[]
}

export interface ProductSyncStatus {
  isRunning: boolean
  empresa2: ProductSyncResult | null
  empresa3: ProductSyncResult | null
  lastSync: Date | null
  errors: string[]
}

export interface MissingProductInfo {
  id: number
  descricao: string
  ean?: string
  saldoEstoque: number
  empId: number
  grupo?: string
  subgrupo?: string
  preco?: number
  hasImage: boolean
} 