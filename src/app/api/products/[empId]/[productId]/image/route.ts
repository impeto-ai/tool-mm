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

    console.log(`[PRODUCT-IMAGE-BY-COMPANY] Buscando imagem do produto ${productId} da empresa ${empId}...`)

    // Obtém tokens válidos do Redis
    const tokens = await tokenService.getTokens()
    const companyToken = tokens.find(t => t.empId === empId)

    if (!companyToken) {
      console.error(`[PRODUCT-IMAGE-BY-COMPANY] Token não encontrado para empresa ${empId}`)
      return NextResponse.json(
        { error: `Token não encontrado para empresa ${empId}` },
        { status: 401 }
      )
    }

    // Configura timeout para evitar requests muito longos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 segundos para imagem

    try {
      // Faz requisição DIRETA para a API MaxData com token correto
      const response = await fetch(`${MAX_DATA_BASE_URL}/product/${productId}/image`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${companyToken.token}`,
          'User-Agent': 'Ferrament-MM-Proxy/1.0',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[PRODUCT-IMAGE-BY-COMPANY] Imagem não encontrada para produto ${productId} da empresa ${empId}`)
          return NextResponse.json(
            { error: 'Imagem não encontrada' },
            { status: 404 }
          )
        }
        
        const errorText = await response.text()
        console.error(`[PRODUCT-IMAGE-BY-COMPANY] Erro ${response.status}: ${errorText}`)
        return NextResponse.json(
          { error: `Erro ao buscar imagem: ${errorText}` },
          { status: response.status }
        )
      }

      // Obtém o blob da imagem
      const imageBlob = await response.blob()
      console.log(`[PRODUCT-IMAGE-BY-COMPANY] Imagem do produto ${productId} da empresa ${empId} carregada com sucesso`)
      
      // Determina o tipo de conteúdo baseado na resposta
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      
      // Retorna a imagem como stream
      return new Response(imageBlob, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
          'Cross-Origin-Resource-Policy': 'cross-origin'
        }
      })

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[PRODUCT-IMAGE-BY-COMPANY] Timeout ao buscar imagem do produto ${productId} da empresa ${empId}`)
        return NextResponse.json(
          { error: 'Timeout ao buscar imagem' },
          { status: 408 }
        )
      }
      
      console.error(`[PRODUCT-IMAGE-BY-COMPANY] Erro na requisição:`, error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[PRODUCT-IMAGE-BY-COMPANY] Erro geral:', error)
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

    console.log(`[PRODUCT-IMAGE-UPDATE-BY-COMPANY] Atualizando imagem do produto ${productId} da empresa ${empId}...`)

    // Obtém tokens válidos do Redis
    const tokens = await tokenService.getTokens()
    const companyToken = tokens.find(t => t.empId === empId)

    if (!companyToken) {
      console.error(`[PRODUCT-IMAGE-UPDATE-BY-COMPANY] Token não encontrado para empresa ${empId}`)
      return NextResponse.json(
        { error: `Token não encontrado para empresa ${empId}` },
        { status: 401 }
      )
    }

    // Obtém os dados da imagem do body
    const imageData = await request.json()

    // Configura timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos para upload

    try {
      // Faz requisição DIRETA para a API MaxData com token correto
      const response = await fetch(`${MAX_DATA_BASE_URL}/product/${productId}/image`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${companyToken.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Ferrament-MM-Proxy/1.0',
        },
        body: JSON.stringify(imageData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[PRODUCT-IMAGE-UPDATE-BY-COMPANY] Erro ao atualizar imagem ${response.status}: ${errorText}`)
        return NextResponse.json(
          { error: `Erro ao atualizar imagem: ${errorText}` },
          { status: response.status }
        )
      }

      const result = await response.json()
      console.log(`[PRODUCT-IMAGE-UPDATE-BY-COMPANY] Imagem do produto ${productId} da empresa ${empId} atualizada com sucesso`)
      
      return NextResponse.json(result)

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[PRODUCT-IMAGE-UPDATE-BY-COMPANY] Timeout ao atualizar imagem do produto ${productId} da empresa ${empId}`)
        return NextResponse.json(
          { error: 'Timeout ao atualizar imagem' },
          { status: 408 }
        )
      }
      
      console.error(`[PRODUCT-IMAGE-UPDATE-BY-COMPANY] Erro na requisição de atualização de imagem:`, error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[PRODUCT-IMAGE-UPDATE-BY-COMPANY] Erro geral na atualização de imagem:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 