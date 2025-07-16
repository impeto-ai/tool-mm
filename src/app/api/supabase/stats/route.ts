import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('[SUPABASE-STATS] Iniciando busca de estatísticas...')

    // Busca total de registros na tabela images
    const { count: totalImages, error: countError } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('[SUPABASE-STATS] Erro ao buscar total de imagens:', countError)
      throw new Error(`Erro ao buscar total de registros: ${countError.message}`)
    }

    // Busca estatísticas de status de download
    const { data: statusStats, error: statusError } = await supabase
      .from('images')
      .select('download_status')

    if (statusError) {
      console.error('[SUPABASE-STATS] Erro ao buscar status:', statusError)
      throw new Error(`Erro ao buscar status de download: ${statusError.message}`)
    }

    // Conta status de download
    const downloadStats = statusStats?.reduce((acc, item) => {
      const status = item.download_status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Busca registros com IDs únicos
    const { data: uniqueIds, error: uniqueError } = await supabase
      .from('images')
      .select('original_id')
      .not('original_id', 'is', null)

    if (uniqueError) {
      console.error('[SUPABASE-STATS] Erro ao buscar IDs únicos:', uniqueError)
      throw new Error(`Erro ao buscar IDs únicos: ${uniqueError.message}`)
    }

    const uniqueOriginalIds = new Set(uniqueIds?.map(item => item.original_id) || [])

    // Busca registros processados com sucesso
    const { count: successfulCount, error: successError } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('isOk', true)

    if (successError) {
      console.error('[SUPABASE-STATS] Erro ao buscar registros bem-sucedidos:', successError)
    }

    // Busca registros com erro
    const { count: errorCount, error: errorCountError } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('isOk', false)

    if (errorCountError) {
      console.error('[SUPABASE-STATS] Erro ao buscar registros com erro:', errorCountError)
    }

    const stats = {
      total: totalImages || 0,
      uniqueOriginalIds: uniqueOriginalIds.size,
      successful: successfulCount || 0,
      errors: errorCount || 0,
      downloadStatus: downloadStats,
      lastUpdated: new Date().toISOString()
    }

    console.log('[SUPABASE-STATS] Estatísticas calculadas:', stats)

    return NextResponse.json(stats)

  } catch (error) {
    console.error('[SUPABASE-STATS] Erro geral:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao buscar estatísticas do Supabase',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 