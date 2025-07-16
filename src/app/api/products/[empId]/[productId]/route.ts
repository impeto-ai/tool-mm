import { NextRequest, NextResponse } from 'next/server'
import { tokenService } from '@/lib/token-service'

const MAX_DATA_BASE_URL = 'https://rds.skytins.com.br:13345/v2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ empId: string; productId: string }> }
) {
  try {
    const resolvedParams = await params
    const empId = parseInt(resolvedParams.empId)
    const productId = resolvedParams.productId
    
    if (!empId || !productId) {
      return NextResponse.json(
        { error: 'EmpId e ProductId são obrigatórios' },
        { status: 400 }
      )
    }

    if (empId !== 2 && empId !== 3) {
      return NextResponse.json(
        { error: 'EmpId deve ser 2 ou 3' },
        { status: 400 }
      )
    }

    console.log(`[PRODUCT-BY-COMPANY] Buscando produto ${productId} da empresa ${empId}...`)

    // Obtém tokens válidos do Redis
    const tokens = await tokenService.getTokens()
    const companyToken = tokens.find(t => t.empId === empId)

    if (!companyToken) {
      console.error(`[PRODUCT-BY-COMPANY] Token não encontrado para empresa ${empId}`)
      return NextResponse.json(
        { error: `Token não encontrado para empresa ${empId}` },
        { status: 401 }
      )
    }

    // Configura timeout para evitar requests muito longos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout

    try {
      // Faz requisição DIRETA para a API MaxData com token correto
      const response = await fetch(`${MAX_DATA_BASE_URL}/product/${productId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${companyToken.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Ferrament-MM-Proxy/1.0',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[PRODUCT-BY-COMPANY] Erro ${response.status}: ${errorText}`)
        return NextResponse.json(
          { error: `Erro ao buscar produto: ${errorText}` },
          { status: response.status }
        )
      }

      const productData = await response.json()
      console.log(`[PRODUCT-BY-COMPANY] Produto ${productId} da empresa ${empId} carregado com sucesso`)
      
      // Se retornou array, pega o primeiro item
      const product = Array.isArray(productData) ? productData[0] : productData
      
      // Adiciona empId ao produto para referência
      product.empId = empId
      
      return NextResponse.json(product)

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[PRODUCT-BY-COMPANY] Timeout ao buscar produto ${productId} da empresa ${empId}`)
        return NextResponse.json(
          { error: 'Timeout ao buscar produto' },
          { status: 408 }
        )
      }
      
      console.error(`[PRODUCT-BY-COMPANY] Erro na requisição:`, error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[PRODUCT-BY-COMPANY] Erro geral:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ empId: string; productId: string }> }
) {
  try {
    const resolvedParams = await params
    const empId = parseInt(resolvedParams.empId)
    const productId = resolvedParams.productId
    
    if (!empId || !productId) {
      return NextResponse.json(
        { error: 'EmpId e ProductId são obrigatórios' },
        { status: 400 }
      )
    }

    if (empId !== 2 && empId !== 3) {
      return NextResponse.json(
        { error: 'EmpId deve ser 2 ou 3' },
        { status: 400 }
      )
    }

    // Obtém tokens válidos do Redis
    const tokens = await tokenService.getTokens()
    const companyToken = tokens.find(t => t.empId === empId)

    if (!companyToken) {
      console.error(`[PRODUCT-BY-COMPANY] Token não encontrado para empresa ${empId}`)
      return NextResponse.json(
        { error: `Token não encontrado para empresa ${empId}` },
        { status: 401 }
      )
    }

    // Obtém os dados do produto do body
    const productData = await request.json()

    // Configura timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      console.log(`[PRODUCT-BY-COMPANY] Atualizando produto ${productId} da empresa ${empId}...`)
      
      // Faz requisição DIRETA para a API MaxData com token correto
      const response = await fetch(`${MAX_DATA_BASE_URL}/product/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${companyToken.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Ferrament-MM-Proxy/1.0',
        },
        body: JSON.stringify(productData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[PRODUCT-BY-COMPANY] Erro ao atualizar ${response.status}: ${errorText}`)
        return NextResponse.json(
          { error: `Erro ao atualizar produto: ${errorText}` },
          { status: response.status }
        )
      }

      const updatedProduct = await response.json()
      console.log(`[PRODUCT-BY-COMPANY] Produto ${productId} da empresa ${empId} atualizado com sucesso`)
      
      return NextResponse.json(updatedProduct)

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[PRODUCT-BY-COMPANY] Timeout ao atualizar produto ${productId} da empresa ${empId}`)
        return NextResponse.json(
          { error: 'Timeout ao atualizar produto' },
          { status: 408 }
        )
      }
      
      console.error(`[PRODUCT-BY-COMPANY] Erro na requisição de atualização:`, error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[PRODUCT-BY-COMPANY] Erro geral na atualização:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 