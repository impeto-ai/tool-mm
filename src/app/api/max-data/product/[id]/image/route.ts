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

    // Configura timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout

    try {
      console.log(`[IMAGE-API] Buscando imagem do produto ${productId}...`)
      
      // Faz requisição DIRETA para a API MaxData (sem chamada recursiva)
      const response = await fetch(`${MAX_DATA_BASE_URL}/product/${productId}/image`, {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          'User-Agent': 'Ferrament-MM-Proxy/1.0',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[IMAGE-API] Imagem não encontrada para produto ${productId}`)
          return NextResponse.json(
            { error: 'Imagem não encontrada' },
            { status: 404 }
          )
        }
        
        const errorText = await response.text()
        console.error(`[IMAGE-API] Erro ${response.status}: ${errorText}`)
        return NextResponse.json(
          { error: `Erro ao buscar imagem: ${errorText}` },
          { status: response.status }
        )
      }

      // Retorna o blob da imagem diretamente
      const imageBlob = await response.blob()
      console.log(`[IMAGE-API] Imagem do produto ${productId} carregada com sucesso (${imageBlob.size} bytes)`)
      
      return new NextResponse(imageBlob, {
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
          'Content-Length': imageBlob.size.toString(),
          'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
        }
      })

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[IMAGE-API] Timeout ao buscar imagem do produto ${productId}`)
        return NextResponse.json(
          { error: 'Timeout ao buscar imagem' },
          { status: 408 }
        )
      }
      
      console.error(`[IMAGE-API] Erro na requisição de imagem:`, error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[IMAGE-API] Erro geral:', error)
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

    // Obtém os dados da imagem do body
    const imageData = await request.json()

    // Configura timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos para upload

    try {
      console.log(`[IMAGE-API] Atualizando imagem do produto ${productId}...`)
      
      // Faz requisição DIRETA para a API MaxData
      const response = await fetch(`${MAX_DATA_BASE_URL}/product/${productId}/image`, {
        method: 'PUT',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'User-Agent': 'Ferrament-MM-Proxy/1.0',
        },
        body: JSON.stringify(imageData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[IMAGE-API] Erro ao atualizar ${response.status}: ${errorText}`)
        return NextResponse.json(
          { error: `Erro ao atualizar imagem: ${errorText}` },
          { status: response.status }
        )
      }

      const updatedImage = await response.json()
      console.log(`[IMAGE-API] Imagem do produto ${productId} atualizada com sucesso`)
      
      return NextResponse.json(updatedImage)

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[IMAGE-API] Timeout ao atualizar imagem do produto ${productId}`)
        return NextResponse.json(
          { error: 'Timeout ao atualizar imagem' },
          { status: 408 }
        )
      }
      
      console.error(`[IMAGE-API] Erro na requisição de atualização de imagem:`, error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[IMAGE-API] Erro geral na atualização:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 