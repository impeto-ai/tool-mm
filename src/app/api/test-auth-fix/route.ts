import { NextRequest, NextResponse } from 'next/server'
import { tokenService } from '@/lib/token-service'

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST-AUTH-FIX] Iniciando teste de correção de autenticação...')

    // Testa se consegue obter tokens do Redis
    const tokens = await tokenService.getTokens()
    console.log(`[TEST-AUTH-FIX] Tokens encontrados: ${tokens.length}`)

    if (tokens.length === 0) {
      return NextResponse.json({
        error: 'Nenhum token encontrado no Redis',
        success: false
      })
    }

    const results = []

    // Testa cada empresa
    for (const tokenData of tokens) {
      const { empId, token } = tokenData
      
      if (empId !== 2 && empId !== 3) continue

      console.log(`[TEST-AUTH-FIX] Testando empresa ${empId}...`)

      try {
        // Testa o novo endpoint de produto
        const testProductId = empId === 2 ? '1373' : '2087' // IDs de teste conhecidos
        const productResponse = await fetch(`${request.nextUrl.origin}/api/products/${empId}/${testProductId}`)
        
        const productResult = {
          empId,
          productId: testProductId,
          success: productResponse.ok,
          status: productResponse.status,
          message: productResponse.ok ? 'Produto carregado com sucesso' : 'Erro ao carregar produto'
        }

        if (!productResponse.ok) {
          const errorText = await productResponse.text()
          productResult.message = errorText
        }

        results.push(productResult)
        console.log(`[TEST-AUTH-FIX] Empresa ${empId}: ${productResult.success ? 'SUCESSO' : 'ERRO'}`)

      } catch (error) {
        const errorResult = {
          empId,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
        results.push(errorResult)
        console.error(`[TEST-AUTH-FIX] Erro na empresa ${empId}:`, error)
      }
    }

    const successCount = results.filter(r => r.success).length
    const summary = {
      totalTests: results.length,
      successful: successCount,
      failed: results.length - successCount,
      allPassed: successCount === results.length,
      results
    }

    console.log(`[TEST-AUTH-FIX] Resumo: ${successCount}/${results.length} testes passaram`)

    return NextResponse.json({
      message: 'Teste de correção de autenticação concluído',
      success: true,
      summary
    })

  } catch (error) {
    console.error('[TEST-AUTH-FIX] Erro geral:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erro interno',
      success: false
    }, { status: 500 })
  }
} 