"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Edit, Package, DollarSign, BarChart3, ImageIcon, AlertCircle } from 'lucide-react'
import { ProductEditModal } from '@/components/ui/product-edit-modal'
import { MaxDataProduct } from '@/types'

interface ProductPageProps {
  params: Promise<{ id: string }>
}

interface ProductWithImage extends MaxDataProduct {
  imageUrl?: string
}

export default function ProductPage({ params }: ProductPageProps) {
  const router = useRouter()
  const [productId, setProductId] = useState<string | null>(null)
  const [product, setProduct] = useState<ProductWithImage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Resolver params assíncronos
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setProductId(resolvedParams.id)
    }
    
    resolveParams()
  }, [params])

  const loadProduct = async () => {
    if (!productId) return

    try {
      setLoading(true)
      setError(null)

      // Primeiro, busca produto da empresa 2 usando endpoint específico
      let productData = null
      let empId = 2

      try {
        const response2 = await fetch(`/api/products/2/${productId}`)
        
        if (response2.ok) {
          productData = await response2.json()
          empId = 2
        }
      } catch (_err) {
        console.log('Produto não encontrado na empresa 2, tentando empresa 3...')
      }

      // Se não encontrou na empresa 2, tenta empresa 3
      if (!productData) {
        try {
          const response3 = await fetch(`/api/products/3/${productId}`)
          
          if (response3.ok) {
            productData = await response3.json()
            empId = 3
          }
        } catch (_err) {
          console.log('Produto não encontrado na empresa 3')
        }
      }

      if (!productData) {
        throw new Error('Produto não encontrado em nenhuma empresa')
      }

      // Adiciona empId ao produto
      productData.empId = empId

      setProduct(productData)

      // Carrega imagem se disponível
      if (productData.foto) {
        loadProductImage(productId, empId)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produto')
    } finally {
      setLoading(false)
    }
  }

  const loadProductImage = async (id: string, empId: number) => {
    try {
      // Usa endpoint específico que obtém tokens corretos do Redis
      const response = await fetch(`/api/products/${empId}/${id}/image`)
      
      if (response.ok) {
        const blob = await response.blob()
        const imageUrl = URL.createObjectURL(blob)
        setProduct(prev => prev ? { ...prev, imageUrl } : null)
      }
    } catch (err) {
      console.log('Erro ao carregar imagem:', err)
    }
  }

  const handleEditSave = async () => {
    // Recarrega o produto após edição
    await loadProduct()
    setEditModalOpen(false)
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  // Carrega produto quando productId estiver disponível
  useEffect(() => {
    if (productId) {
      loadProduct()
    }
  }, [productId, loadProduct])

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Produto não encontrado</h1>
        </div>
        
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                {error || 'Produto não encontrado'}
              </p>
              <Button onClick={() => router.push('/')}>
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{product.descricao}</h1>
            <p className="text-muted-foreground">ID: {product.id} • Empresa {product.empId}</p>
          </div>
        </div>
        
        <Button onClick={() => setEditModalOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Produto
        </Button>
      </div>

      {/* Cards de Informações */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Descrição</label>
              <p className="font-medium">{product.descricao}</p>
            </div>
            
            {product.ean && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">EAN</label>
                <p className="font-mono">{product.ean}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="flex gap-2">
                <Badge variant={product.ativo ? "default" : "secondary"}>
                  {product.ativo ? "Ativo" : "Inativo"}
                </Badge>
                {product.ecommerce && (
                  <Badge variant="outline">E-commerce</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preços e Estoque */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Preços e Estoque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Preço</label>
              <p className="text-lg font-bold">{formatPrice(product.preco)}</p>
            </div>
            
            {product.precoPromocional && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Preço Promocional</label>
                <p className="text-lg font-bold text-green-600">{formatPrice(product.precoPromocional)}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estoque</label>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="font-bold">{product.saldoEstoque}</span>
                {product.unidade && <span className="text-muted-foreground">{product.unidade}</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Imagem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Imagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            {product.imageUrl ? (
              <Image 
                src={product.imageUrl} 
                alt={product.descricao}
                width={600}
                height={300}
                className="w-full h-48 object-cover rounded-lg border"
              />
            ) : product.foto ? (
              <div className="w-full h-48 bg-muted rounded-lg border flex items-center justify-center">
                <div className="text-center space-y-2">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Carregando imagem...</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-48 bg-muted rounded-lg border flex items-center justify-center">
                <div className="text-center space-y-2">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Sem imagem</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informações Adicionais */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Categorização */}
        <Card>
          <CardHeader>
            <CardTitle>Categorização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Grupo</label>
              <p>{product.idGrupo || 'Não definido'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Subgrupo</label>
              <p>{product.idSubGrupo || 'Não definido'}</p>
            </div>
            
            {product.marca && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Marca</label>
                <p>{product.marca}</p>
              </div>
            )}
            
            {product.modelo && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Modelo</label>
                <p>{product.modelo}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadados */}
        <Card>
          <CardHeader>
            <CardTitle>Metadados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Criado em</label>
              <p>{formatDate(product.created_at)}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Atualizado em</label>
              <p>{formatDate(product.updated_at)}</p>
            </div>
            
            {product.observacao && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Observações</label>
                <p className="text-sm">{product.observacao}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição */}
      {product && (
        <ProductEditModal
          productId={product.id}
          empId={product.empId}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={handleEditSave}
        />
      )}
    </div>
  )
} 