import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callid: string }> }
) {
  const { callid } = await params
  
  if (!callid) {
    return new NextResponse('callid obrigatório', { status: 400 })
  }
  
  try {
    // Busca a URL do áudio no Supabase
    const { data: ligacao } = await supabase
      .from('ligacoes')
      .select('audio_url')
      .eq('callid', callid)
      .single()
    
    if (!ligacao?.audio_url) {
      return new NextResponse('Áudio não encontrado', { status: 404 })
    }
    
    // Pega o range do header se houver (para seek funcionar)
    const range = request.headers.get('range')
    
    // Faz fetch no Vercel Blob com o range
    const blobResponse = await fetch(ligacao.audio_url, {
      headers: range ? { range } : {},
    })
    
    if (!blobResponse.ok && blobResponse.status !== 206) {
      return new NextResponse('Erro ao buscar áudio', { status: 500 })
    }
    
    const buffer = await blobResponse.arrayBuffer()
    const totalSize = blobResponse.headers.get('content-length') || buffer.byteLength.toString()
    
    // Monta resposta com headers corretos para o player do Kommo
    const headers: Record<string, string> = {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Content-Length': totalSize,
    }
    
    // Se foi range request, retorna 206 Partial Content
    if (range) {
      const contentRange = blobResponse.headers.get('content-range')
      if (contentRange) headers['Content-Range'] = contentRange
      return new NextResponse(buffer, { status: 206, headers })
    }
    
    return new NextResponse(buffer, { status: 200, headers })
    
  } catch (error: any) {
    console.error('[AudioProxy] Erro:', error.message)
    return new NextResponse('Erro interno', { status: 500 })
  }
}

// Suporte ao OPTIONS para CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
    },
  })
}

// HEAD request também é importante para o player
export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ callid: string }> }
) {
  const { callid } = await params
  
  const { data: ligacao } = await supabase
    .from('ligacoes')
    .select('audio_url')
    .eq('callid', callid)
    .single()
  
  if (!ligacao?.audio_url) {
    return new NextResponse(null, { status: 404 })
  }
  
  const blobResponse = await fetch(ligacao.audio_url, { method: 'HEAD' })
  const contentLength = blobResponse.headers.get('content-length') || '0'
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Access-Control-Allow-Origin': '*',
    },
  })
}
