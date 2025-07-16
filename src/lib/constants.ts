// Constantes e configurações do sistema de estoque

export const SISTEMA_CONFIG = {
  nome: 'Sistema de Estoque',
  versao: '1.0.0',
  descricao: 'Sistema moderno de gerenciamento de estoque',
} as const

export const LIMITES_ESTOQUE = {
  estoqueMinimo: 5,
  estoqueBaixo: 10,
  estoqueMaximo: 9999,
} as const

export const CATEGORIAS_PADRÃO = [
  { nome: 'Eletrônicos', cor: 'bg-blue-500' },
  { nome: 'Roupas', cor: 'bg-purple-500' },
  { nome: 'Casa', cor: 'bg-green-500' },
  { nome: 'Livros', cor: 'bg-yellow-500' },
  { nome: 'Esportes', cor: 'bg-red-500' },
  { nome: 'Saúde', cor: 'bg-pink-500' },
  { nome: 'Alimentação', cor: 'bg-orange-500' },
  { nome: 'Outros', cor: 'bg-gray-500' },
] as const

export const STATUS_CORES = {
  normal: 'bg-green-100 text-green-800',
  baixo: 'bg-yellow-100 text-yellow-800',
  falta: 'bg-red-100 text-red-800',
} as const

export const MENSAGENS = {
  sucesso: {
    produtoAdicionado: 'Produto adicionado com sucesso!',
    produtoAtualizado: 'Produto atualizado com sucesso!',
    produtoRemovido: 'Produto removido com sucesso!',
  },
  erro: {
    produtoNaoEncontrado: 'Produto não encontrado',
    estoquesInsuficientes: 'Estoque insuficiente',
    camposObrigatorios: 'Preencha todos os campos obrigatórios',
  },
  confirmacao: {
    removerProduto: 'Tem certeza que deseja remover este produto?',
    zerarEstoque: 'Tem certeza que deseja zerar o estoque?',
  },
} as const

export const PAGINACAO = {
  itensPorPagina: 10,
  opcoesPorPagina: [5, 10, 20, 50],
} as const

export const FORMATOS = {
  data: 'dd/MM/yyyy',
  dataHora: 'dd/MM/yyyy HH:mm',
  moeda: 'pt-BR',
} as const 