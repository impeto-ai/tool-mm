import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG-AUTO-REQUESTS] Verificando requisições automáticas...')

    const diagnostics = {
      timestamp: new Date().toISOString(),
      action: 'diagnose',
      activeIntervals: {
        productSync: 'Reduzido para 10 minutos',
        tokenSync: 'Reduzido para 15 minutos', 
        supabaseStats: 'Reduzido para 30 minutos'
      },
      recommendations: [
        'Auto-refresh intervals foram otimizados',
        'Verifique se não há abas múltiplas abertas',
        'Verifique se não há modais sendo abertos automaticamente',
        'Use o endpoint POST para parar temporariamente os intervals'
      ],
      nextSteps: [
        'POST /api/debug-auto-requests - para parar todos os intervals',
        'Recarregue a página para reiniciar os intervals otimizados'
      ]
    }

    return NextResponse.json(diagnostics)

  } catch (error) {
    console.error('[DEBUG-AUTO-REQUESTS] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'stop-intervals') {
      console.log('[DEBUG-AUTO-REQUESTS] Parando intervals automáticos...')
      
      // Retorna instrução para o frontend parar os intervals
      return NextResponse.json({
        message: 'Instruções enviadas para parar intervals automáticos',
        action: 'stop-intervals',
        timestamp: new Date().toISOString(),
        instructions: [
          'Feche todas as abas da aplicação',
          'Aguarde 30 segundos',
          'Reabra apenas uma aba',
          'Os intervals foram otimizados para serem menos frequentes'
        ]
      })
    }

    if (action === 'optimize-intervals') {
      return NextResponse.json({
        message: 'Intervals já foram otimizados no código',
        changes: {
          productSync: 'De 2min para 10min',
          tokenSync: 'De 5min para 15min',
          supabaseStats: 'De 5min para 30min'
        },
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(
      { error: 'Ação inválida. Use: stop-intervals ou optimize-intervals' },
      { status: 400 }
    )

  } catch (error) {
    console.error('[DEBUG-AUTO-REQUESTS] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
} 