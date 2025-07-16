import { NextRequest, NextResponse } from 'next/server'

const MAX_DATA_BASE_URL = 'https://rds.skytins.com.br:13345/v2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = resolvedParams.id
    
    if (!productId) {
      return NextResponse.json(
        { error: 'ID do produto é obrigatório' },
        { status: 400 }
      )
    }

    // Obtém o token de autorização
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    // Configura timeout para evitar requests muito longos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout

    try {
      console.log(`[PRODUCT-API] Buscando produto específico ${productId}...`)
      
      // Faz requisição DIRETA para a API MaxData (sem saldoEstoque=positivo)
      const response = await fetch(`${MAX_DATA_BASE_URL}/product/${productId}`, {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'User-Agent': 'Ferrament-MM-Proxy/1.0',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[PRODUCT-API] Erro ${response.status}: ${errorText}`)
        return NextResponse.json(
          { error: `Erro ao buscar produto: ${errorText}` },
          { status: response.status }
        )
      }

      const productData = await response.json()
      console.log(`[PRODUCT-API] Produto ${productId} carregado com sucesso`)
      
      // Se retornou array, pega o primeiro item
      const product = Array.isArray(productData) ? productData[0] : productData
      
      return NextResponse.json(product)

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[PRODUCT-API] Timeout ao buscar produto ${productId}`)
        return NextResponse.json(
          { error: 'Timeout ao buscar produto' },
          { status: 408 }
        )
      }
      
      console.error(`[PRODUCT-API] Erro na requisição:`, error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[PRODUCT-API] Erro geral:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = resolvedParams.id
    
    if (!productId) {
      return NextResponse.json(
        { error: 'ID do produto é obrigatório' },
        { status: 400 }
      )
    }

    // Obtém o token de autorização
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    // Obtém os dados do produto do body
    const productData = await request.json()

    // Configura timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      console.log(`[PRODUCT-API] Atualizando produto ${productId}...`)
      
      // Faz requisição DIRETA para a API MaxData
      const response = await fetch(`${MAX_DATA_BASE_URL}/product/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'User-Agent': 'Ferrament-MM-Proxy/1.0',
        },
        body: JSON.stringify(productData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[PRODUCT-API] Erro ao atualizar ${response.status}: ${errorText}`)
        return NextResponse.json(
          { error: `Erro ao atualizar produto: ${errorText}` },
          { status: response.status }
        )
      }

      const updatedProduct = await response.json()
      console.log(`[PRODUCT-API] Produto ${productId} atualizado com sucesso`)
      
      return NextResponse.json(updatedProduct)

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[PRODUCT-API] Timeout ao atualizar produto ${productId}`)
        return NextResponse.json(
          { error: 'Timeout ao atualizar produto' },
          { status: 408 }
        )
      }
      
      console.error(`[PRODUCT-API] Erro na requisição de atualização:`, error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[PRODUCT-API] Erro geral na atualização:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 