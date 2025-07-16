"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Toast } from "@/components/ui/toast"
import { MaxDataProduct, MaxDataGroup, MaxDataSubGroup } from '@/types'
import { 
  Save, 
  X, 
  Image as ImageIcon, 
  Package, 
  DollarSign, 
  Building2,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Check,
  CloudUpload
} from "lucide-react"

interface ProductEditModalProps {
  productId: number
  empId: number
  isOpen: boolean
  onClose: () => void
  onSave?: (product: MaxDataProduct) => void
}

interface ProductFormData {
  descricao: string
  ean: string
  preco: number | undefined
  precoPromocional: number | undefined
  saldoEstoque: number
  idGrupo: number | undefined
  idSubGrupo: number | undefined
  ativo: boolean
  ecommerce: boolean
  observacao: string
  unidade: string
  marca: string
  modelo: string
}

export function ProductEditModal({ productId, empId, isOpen, onClose, onSave }: ProductEditModalProps) {
  // Estados do produto
  const [_product, setProduct] = useState<MaxDataProduct | null>(null)
  const [formData, setFormData] = useState<ProductFormData>({
    descricao: '',
    ean: '',
    preco: undefined,
    precoPromocional: undefined,
    saldoEstoque: 0,
    idGrupo: undefined,
    idSubGrupo: undefined,
    ativo: true,
    ecommerce: false,
    observacao: '',
    unidade: '',
    marca: '',
    modelo: ''
  })
  
  // Estados de grupos e subgrupos
  const [groups, setGroups] = useState<MaxDataGroup[]>([])
  const [subgroups, setSubgroups] = useState<MaxDataSubGroup[]>([])
  const [filteredSubgroups, setFilteredSubgroups] = useState<MaxDataSubGroup[]>([])
  
  // Estados de imagem
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // Estados de carregamento e erro
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Estados para feedbacks visuais melhorados
  const [saveProgress, setSaveProgress] = useState(0)
  const [saveStep, setSaveStep] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const [toastConfig, setToastConfig] = useState<{
    title: string
    description: string
    variant: 'default' | 'success' | 'error' | 'warning' | 'info'
  }>({
    title: '',
    description: '',
    variant: 'default'
  })

  // Carrega dados do produto quando o modal abre
  useEffect(() => {
    if (isOpen && productId && empId) {
      loadProductData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productId, empId])

  // Filtra subgrupos quando o grupo é alterado
  useEffect(() => {
    if (formData.idGrupo) {
      const filtered = subgroups.filter(sg => sg.grupoId === formData.idGrupo)
      setFilteredSubgroups(filtered)
      
      // Limpa o subgrupo se não for válido para o novo grupo
      if (formData.idSubGrupo && !filtered.find(sg => sg.id === formData.idSubGrupo)) {
        setFormData(prev => ({ ...prev, idSubGrupo: undefined }))
      }
    } else {
      setFilteredSubgroups([])
      setFormData(prev => ({ ...prev, idSubGrupo: undefined }))
    }
  }, [formData.idGrupo, formData.idSubGrupo, subgroups])

  // Carrega dados do produto
  const loadProductData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`[PRODUCT-EDIT-MODAL] Carregando produto ${productId} da empresa ${empId}...`)

      // Usa endpoint específico que obtém tokens corretos do Redis
      const productResponse = await fetch(`/api/products/${empId}/${productId}`)

      if (!productResponse.ok) {
        const errorText = await productResponse.text()
        throw new Error(`Erro ao carregar produto: ${errorText}`)
      }

      const productData = await productResponse.json()

      // Atualiza estados - apenas produto por enquanto
      setProduct(productData)
      setGroups([]) // Deixa vazio por enquanto para evitar timeout
      setSubgroups([]) // Deixa vazio por enquanto para evitar timeout

      console.log(`[PRODUCT-EDIT-MODAL] Produto carregado:`, productData.descricao || productData.id)

      // Preenche formulário com dados do produto
      setFormData({
        descricao: productData.descricao || '',
        ean: productData.codBarras?.[0] || productData.ean || '',
        saldoEstoque: productData.estoque || productData.saldoEstoque || 0,
        preco: productData.valorVenda || productData.preco || 0,
        precoPromocional: productData.precoPromocional || 0,
        idGrupo: productData.grupoId || productData.idGrupo,
        idSubGrupo: productData.subGrupoId || productData.idSubGrupo,
        ativo: productData.desativado === false, // Inverte a lógica
        ecommerce: productData.ecommerce ?? false,
        observacao: productData.observacao || productData.aplicacao || '',
        unidade: productData.un || productData.unidade || '',
        marca: productData.marca || productData.fabricante || '',
        modelo: productData.modelo || ''
      })

      // Sempre tenta carregar a imagem (o endpoint retorna vazio se não houver)
      loadProductImage()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados'
      setError(errorMessage)
      console.error('[PRODUCT-EDIT-MODAL] Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Carrega imagem do produto
  const loadProductImage = async () => {
    try {
      setImageLoading(true)
      // Usa endpoint específico que obtém tokens corretos do Redis
      const response = await fetch(`/api/products/${empId}/${productId}/image`)

      if (response.ok) {
        const blob = await response.blob()
        const imageUrl = URL.createObjectURL(blob)
        setImageUrl(imageUrl)
      }
    } catch (err) {
      console.error('Erro ao carregar imagem:', err)
    } finally {
      setImageLoading(false)
    }
  }

  // Manipula upload de nova imagem
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setNewImage(file)
      
      // Gera preview
      const reader = new FileReader()
      reader.onload = (e: ProgressEvent<FileReader>) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Salva as alterações
  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSaveProgress(0)
      setSaveStep('Preparando atualização...')

      // Passo 1: Atualizar dados do produto
      setSaveStep('Atualizando informações do produto...')
      setSaveProgress(25)

      const updateResponse = await fetch(`/api/products/${empId}/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        throw new Error(`Erro ao atualizar produto: ${errorText}`)
      }

      setSaveProgress(50)
      setSaveStep('Produto atualizado com sucesso!')

      // Passo 2: Atualizar imagem se necessário
      if (newImage) {
        setSaveStep('Enviando nova imagem...')
        setSaveProgress(75)
        await uploadNewImage()
      }

      const updatedProduct = await updateResponse.json()
      
      setSaveProgress(100)
      setSaveStep('Salvamento concluído!')
      setSuccess(true)
      
      // Mostra toast de sucesso
      showToastMessage(
        'Produto atualizado!', 
        'Todas as alterações foram salvas com sucesso.',
        'success'
      )
      
      onSave?.(updatedProduct)
      
      // Fecha modal após sucesso
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setSaveProgress(0)
        setSaveStep('')
      }, 2000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar'
      setError(errorMessage)
      setSaveStep('Erro ao salvar')
      
      // Mostra toast de erro
      showToastMessage(
        'Erro ao salvar!', 
        errorMessage,
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  // Faz upload da nova imagem
  const uploadNewImage = async () => {
    if (!newImage) return

    setUploadProgress(0)
    const reader = new FileReader()
    
    return new Promise((resolve, reject) => {
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          setUploadProgress(30)
          const base64 = e.target?.result as string
          
          setUploadProgress(60)
          
          const response = await fetch(`/api/products/${empId}/${productId}/image`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              image_base64: base64
            })
          })

          setUploadProgress(90)

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Erro ao fazer upload da imagem: ${errorText}`)
          }

          // Atualiza a imagem na tela
          setImageUrl(imagePreview)
          setNewImage(null)
          setImagePreview(null)
          setUploadProgress(100)

          resolve(true)
        } catch (err) {
          setUploadProgress(0)
          reject(err)
        }
      }
      reader.readAsDataURL(newImage)
    })
  }

  // Reset quando modal fecha
  const handleClose = () => {
    setProduct(null)
    setFormData({
      descricao: '',
      ean: '',
      preco: undefined,
      precoPromocional: undefined,
      saldoEstoque: 0,
      idGrupo: undefined,
      idSubGrupo: undefined,
      ativo: true,
      ecommerce: false,
      observacao: '',
      unidade: '',
      marca: '',
      modelo: ''
    })
    setGroups([])
    setSubgroups([])
    setFilteredSubgroups([])
    setImageUrl(null)
    setNewImage(null)
    setImagePreview(null)
    setError(null)
    setSuccess(false)
    onClose()
  }

  // Helper para atualizar o estado do formulário
  const handleSelectChange = (field: 'idGrupo' | 'idSubGrupo', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value && value !== 'none' ? parseInt(value) : undefined }))
  }

  // Helper para mostrar toast
  const showToastMessage = (title: string, description: string, variant: 'default' | 'success' | 'error' | 'warning' | 'info' = 'default') => {
    setToastConfig({ title, description, variant })
    setShowToast(true)
  }

  // Helper para esconder toast
  const hideToast = () => {
    setShowToast(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Editar Produto #{productId}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresa {empId}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : success ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Produto atualizado com sucesso!</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Imagem do Produto */}
            <Card>
              <CardContent className="p-4">
                <Label className="text-sm font-medium">Imagem do Produto</Label>
                <div className="mt-2 flex items-start gap-4">
                  <div className="flex-1">
                    {imageLoading ? (
                      <Skeleton className="w-32 h-32 rounded" />
                    ) : imagePreview ? (
                      <Image src={imagePreview} alt="Preview" width={128} height={128} className="w-32 h-32 object-cover rounded border" />
                    ) : imageUrl ? (
                      <Image src={imageUrl} alt="Produto" width={128} height={128} className="w-32 h-32 object-cover rounded border" />
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="mb-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Formatos suportados: JPG, PNG, GIF (máx. 5MB)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição do produto"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ean">Código EAN</Label>
                  <Input
                    id="ean"
                    value={formData.ean}
                    onChange={(e) => setFormData(prev => ({ ...prev, ean: e.target.value }))}
                    placeholder="Código de barras"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade</Label>
                  <Input
                    id="unidade"
                    value={formData.unidade}
                    onChange={(e) => setFormData(prev => ({ ...prev, unidade: e.target.value }))}
                    placeholder="UN, KG, L, etc."
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Preços e Estoque */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preco" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Preço Normal
                </Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  value={formData.preco || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, preco: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precoPromocional">Preço Promocional</Label>
                <Input
                  id="precoPromocional"
                  type="number"
                  step="0.01"
                  value={formData.precoPromocional || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, precoPromocional: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saldoEstoque">Estoque</Label>
                <Input
                  id="saldoEstoque"
                  type="number"
                  value={formData.saldoEstoque}
                  onChange={(e) => setFormData(prev => ({ ...prev, saldoEstoque: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <Separator />

            {/* Categorização */}
            {/* Grupo */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="idGrupo" className="text-right">
                Grupo
              </Label>
              <Select 
                value={formData.idGrupo?.toString() || ''} 
                onValueChange={(value) => handleSelectChange('idGrupo', value)}
                disabled={true} // Temporariamente desabilitado para evitar timeout
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Grupos temporariamente indisponíveis" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subgrupo */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="idSubGrupo" className="text-right">
                Subgrupo
              </Label>
              <Select 
                value={formData.idSubGrupo?.toString() || ''} 
                onValueChange={(value) => handleSelectChange('idSubGrupo', value)}
                disabled={true} // Temporariamente desabilitado para evitar timeout
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Subgrupos temporariamente indisponíveis" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubgroups.map((subgroup) => (
                    <SelectItem key={subgroup.id} value={subgroup.id.toString()}>
                      {subgroup.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Informações Adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input
                  id="marca"
                  value={formData.marca}
                  onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                  placeholder="Marca do produto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                  placeholder="Modelo do produto"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                placeholder="Observações adicionais sobre o produto"
                className="min-h-[60px]"
              />
            </div>

            {/* Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="ativo">Produto Ativo</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ecommerce"
                  checked={formData.ecommerce}
                  onChange={(e) => setFormData(prev => ({ ...prev, ecommerce: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="ecommerce">Disponível no E-commerce</Label>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar e Feedback Visual */}
        {saving && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {saveStep}
                </span>
              </div>
              
              <div className="space-y-2">
                <Progress value={saveProgress} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progresso</span>
                  <span>{saveProgress}%</span>
                </div>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CloudUpload className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Enviando imagem...
                    </span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Upload</span>
                    <span>{uploadProgress}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toast de Feedback */}
        {showToast && (
          <Toast
            title={toastConfig.title}
            description={toastConfig.description}
            variant={toastConfig.variant}
            onClose={hideToast}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading || !formData.descricao}
            className={success ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {saveStep || 'Salvando...'}
              </>
            ) : success ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Salvo com Sucesso!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 