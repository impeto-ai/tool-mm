import { NextRequest, NextResponse } from 'next/server'

const MAX_DATA_BASE_URL = 'https://rds.skytins.com.br:13345/v2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params conforme exigido pelo Next.js 15
    const resolvedParams = await params
    
    // Constrói a URL completa da API Max Data
    const pathString = resolvedParams.path.join('/')
    const searchParams = request.nextUrl.searchParams.toString()
    const fullUrl = `${MAX_DATA_BASE_URL}/${pathString}${searchParams ? `?${searchParams}` : ''}`
    
    // Obtém o token de autorização do header
    const authorization = request.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    console.log(`[MAX-DATA-PROXY] Fazendo requisição para: ${fullUrl}`)
    
    // Faz a requisição para a API Max Data com timeout configurado
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos timeout
    
    try {
      const response = await fetch(fullUrl, {
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
        console.error(`[MAX-DATA-PROXY] Erro ${response.status}: ${errorText}`)
        
        return NextResponse.json(
          { 
            error: `Erro na API Max Data (${response.status})`,
            details: errorText 
          },
          { status: response.status }
        )
      }

      const data = await response.json()
      console.log(`[MAX-DATA-PROXY] Resposta recebida com sucesso`)
      
      // Retorna os dados com headers CORS apropriados
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`[MAX-DATA-PROXY] Timeout na requisição para: ${fullUrl}`)
        return NextResponse.json(
          { error: 'Timeout na requisição para API Max Data' },
          { status: 408 }
        )
      }
      
      throw fetchError
    }

  } catch (error) {
    console.error('[MAX-DATA-PROXY] Erro no proxy:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno no proxy',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params conforme exigido pelo Next.js 15
    const resolvedParams = await params
    
    // Constrói a URL completa da API Max Data
    const pathString = resolvedParams.path.join('/')
    const searchParams = request.nextUrl.searchParams.toString()
    const fullUrl = `${MAX_DATA_BASE_URL}/${pathString}${searchParams ? `?${searchParams}` : ''}`
    
    // Obtém o token de autorização do header
    const authorization = request.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    // Obtém o body da requisição
    const body = await request.json()

    console.log(`[MAX-DATA-PROXY] Fazendo requisição PUT para: ${fullUrl}`)
    
    // Faz a requisição para a API Max Data com timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos timeout
    
    try {
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'User-Agent': 'Ferrament-MM-Proxy/1.0',
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[MAX-DATA-PROXY] Erro PUT ${response.status}: ${errorText}`)
        
        return NextResponse.json(
          { 
            error: `Erro na API Max Data (${response.status})`,
            details: errorText 
          },
          { status: response.status }
        )
      }

      const data = await response.json()
      console.log(`[MAX-DATA-PROXY] Resposta PUT recebida com sucesso`)
      
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`[MAX-DATA-PROXY] Timeout na requisição PUT para: ${fullUrl}`)
        return NextResponse.json(
          { error: 'Timeout na requisição PUT para API Max Data' },
          { status: 408 }
        )
      }
      
      throw fetchError
    }

  } catch (error) {
    console.error('[MAX-DATA-PROXY] Erro no proxy PUT:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno no proxy PUT',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 