import { NextResponse } from 'next/server'

const MAX_DATA_BASE_URL = process.env.MAX_DATA_API_URL || 'https://rds.skytins.com.br:13345/v2'

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: 'vercel',
    baseUrl: MAX_DATA_BASE_URL,
    tests: {} as any
  }

  console.log('[CONNECTIVITY-TEST] Iniciando testes de conectividade...')

  // Teste 1: Parse da URL
  try {
    const url = new URL(MAX_DATA_BASE_URL)
    diagnostics.tests.urlParsing = {
      success: true,
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname
    }
    console.log('[CONNECTIVITY-TEST] ✅ URL parsing OK:', diagnostics.tests.urlParsing)
  } catch (error) {
    diagnostics.tests.urlParsing = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
    console.log('[CONNECTIVITY-TEST] ❌ URL parsing FAILED:', diagnostics.tests.urlParsing)
  }

  // Teste 2: Resolução DNS (teste com fetch simples)
  try {
    const hostname = new URL(MAX_DATA_BASE_URL).hostname
    console.log(`[CONNECTIVITY-TEST] Testando resolução DNS para: ${hostname}`)
    
    // Teste de conectividade básica com timeout curto
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 segundos
    
    await fetch(`https://${hostname}`, {
      method: 'HEAD',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    diagnostics.tests.dnsResolution = { success: true }
    console.log('[CONNECTIVITY-TEST] ✅ DNS resolution OK')
  } catch (error) {
    diagnostics.tests.dnsResolution = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      name: error instanceof Error ? error.name : 'N/A'
    }
    console.log('[CONNECTIVITY-TEST] ❌ DNS resolution FAILED:', diagnostics.tests.dnsResolution)
  }

  // Teste 3: Conectividade com a porta customizada
  try {
    console.log(`[CONNECTIVITY-TEST] Testando conectividade com: ${MAX_DATA_BASE_URL}`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos
    
    const response = await fetch(MAX_DATA_BASE_URL, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Connectivity-Test/1.0'
      }
    })
    
    clearTimeout(timeoutId)
    diagnostics.tests.portConnectivity = {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    }
    console.log('[CONNECTIVITY-TEST] ✅ Port connectivity OK:', diagnostics.tests.portConnectivity)
  } catch (error) {
    diagnostics.tests.portConnectivity = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      name: error instanceof Error ? error.name : 'N/A',
      cause: error instanceof Error ? error.cause : 'N/A'
    }
    console.log('[CONNECTIVITY-TEST] ❌ Port connectivity FAILED:', diagnostics.tests.portConnectivity)
  }

  // Teste 4: Teste com endpoint real (se a conectividade básica funcionar)
  if (diagnostics.tests.portConnectivity?.success) {
    try {
      console.log('[CONNECTIVITY-TEST] Testando endpoint de produtos...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 segundos
      
      const response = await fetch(`${MAX_DATA_BASE_URL}/product?limit=1`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Connectivity-Test/1.0',
          'Content-Type': 'application/json'
        }
      })
      
      clearTimeout(timeoutId)
      diagnostics.tests.apiEndpoint = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        responseSize: response.headers.get('content-length') || 'unknown'
      }
      console.log('[CONNECTIVITY-TEST] ✅ API endpoint test completed:', diagnostics.tests.apiEndpoint)
    } catch (error) {
      diagnostics.tests.apiEndpoint = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        name: error instanceof Error ? error.name : 'N/A'
      }
      console.log('[CONNECTIVITY-TEST] ❌ API endpoint test FAILED:', diagnostics.tests.apiEndpoint)
    }
  }

  // Teste 5: Informações do ambiente
  diagnostics.tests.environment = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: {
      hasMaxDataUrl: !!process.env.MAX_DATA_API_URL,
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
      vercelEnv: process.env.VERCEL_ENV || 'unknown'
    }
  }

  console.log('[CONNECTIVITY-TEST] Testes concluídos:', diagnostics)

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    }
  })
} 