import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"
import Anthropic from "@anthropic-ai/sdk"

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

// Prompt para analise de ligacoes telefonicas
const PROMPT_ANALISE_LIGACAO = `Você é um especialista em análise de vendas por telefone de consórcios.
Analise esta ligação e forneça:

1. **Resumo** (2-3 frases): O que aconteceu na ligação
2. **Score Geral** (0-10): Qualidade geral da ligação
3. **Pontos Positivos**: O que o vendedor fez bem
4. **Pontos a Melhorar**: O que pode melhorar
5. **Próximo Passo**: Sugestão de ação

Retorne APENAS um JSON válido no formato:
{
  "resumo": "string",
  "score_geral": number,
  "pontos_positivos": ["string"],
  "pontos_criticos": ["string"],
  "proximo_passo_sugerido": "string",
  "cliente_interessado": boolean,
  "agendou_retorno": boolean
}

TRANSCRIÇÃO DA LIGAÇÃO:
`

// Retry wrapper
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delayMs: number,
  label: string
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      console.error(`[v0] ${label} tentativa ${attempt}/${maxAttempts} falhou:`, error)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  return null
}

// Transcreve audio com Deepgram
async function transcreverComDeepgram(audioUrl: string): Promise<string | null> {
  if (!DEEPGRAM_API_KEY) {
    console.error("[v0] DEEPGRAM_API_KEY não configurada")
    return null
  }

  const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&language=pt-BR&smart_format=true&diarize=true", {
    method: "POST",
    headers: {
      "Authorization": `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: audioUrl }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Deepgram error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript

  return transcript || null
}

// Analisa com Claude
async function analisarComClaude(transcricao: string): Promise<any> {
  const anthropic = new Anthropic()
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: PROMPT_ANALISE_LIGACAO + transcricao,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== "text") {
    throw new Error("Resposta do Claude não é texto")
  }

  // Extrai JSON da resposta
  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Não foi possível extrair JSON da resposta")
  }

  return JSON.parse(jsonMatch[0])
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const supabase = createServiceClient()

    // 1. Busca a ligação
    const { data: ligacao, error: fetchError } = await supabase
      .from("ligacoes")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !ligacao) {
      return NextResponse.json({ error: "Ligação não encontrada" }, { status: 404 })
    }

    // Se já foi processada, retorna os dados existentes
    if (ligacao.transcricao) {
      return NextResponse.json({
        message: "Ligação já foi processada",
        ligacao,
      })
    }

    const audioUrlOriginal = ligacao.audio_url_original
    if (!audioUrlOriginal) {
      return NextResponse.json({ error: "URL do áudio não encontrada" }, { status: 400 })
    }

    console.log("[v0] Iniciando processamento da ligação:", id)

    // 2. Baixa o áudio do servidor TotalPhone e salva no Blob
    console.log("[v0] Baixando áudio de:", audioUrlOriginal)
    
    let audioBlob: Blob
    try {
      const audioResponse = await fetch(audioUrlOriginal)
      if (!audioResponse.ok) {
        throw new Error(`Erro ao baixar áudio: ${audioResponse.status}`)
      }
      audioBlob = await audioResponse.blob()
    } catch (error) {
      console.error("[v0] Erro ao baixar áudio do TotalPhone:", error)
      return NextResponse.json({ 
        error: "Não foi possível baixar o áudio do servidor TotalPhone" 
      }, { status: 500 })
    }

    // Salva no Vercel Blob
    const blobResult = await put(
      `ligacoes/${id}.mp3`,
      audioBlob,
      {
        access: "public",
        contentType: "audio/mpeg",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    )

    console.log("[v0] Áudio salvo no Blob:", blobResult.url)

    // 3. Transcreve com Deepgram (usando URL do Blob)
    console.log("[v0] Transcrevendo áudio...")
    const transcricao = await withRetry(
      () => transcreverComDeepgram(blobResult.url),
      3,
      2000,
      "Deepgram"
    )

    if (!transcricao) {
      // Atualiza com erro
      await supabase
        .from("ligacoes")
        .update({
          audio_url: blobResult.url,
          resumo: "Erro: Não foi possível transcrever o áudio",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      return NextResponse.json({ 
        error: "Não foi possível transcrever o áudio" 
      }, { status: 500 })
    }

    console.log("[v0] Transcrição concluída, tamanho:", transcricao.length)

    // 4. Analisa com Claude
    console.log("[v0] Analisando com Claude...")
    const analise = await withRetry(
      () => analisarComClaude(transcricao),
      3,
      2000,
      "Claude"
    )

    if (!analise) {
      // Salva pelo menos a transcrição
      await supabase
        .from("ligacoes")
        .update({
          audio_url: blobResult.url,
          transcricao,
          resumo: "Erro na análise com IA",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      return NextResponse.json({ 
        error: "Erro na análise com IA, mas transcrição foi salva" 
      }, { status: 500 })
    }

    console.log("[v0] Análise concluída, score:", analise.score_geral)

    // 5. Salva tudo no banco
    const { error: updateError } = await supabase
      .from("ligacoes")
      .update({
        audio_url: blobResult.url,
        transcricao,
        analise_ia: analise,
        score_geral: analise.score_geral,
        resumo: analise.resumo,
        processado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("[v0] Erro ao salvar análise:", updateError)
      return NextResponse.json({ error: "Erro ao salvar análise" }, { status: 500 })
    }

    // 6. Envia para Kommo (nota com análise)
    if (KOMMO_ACCESS_TOKEN && ligacao.kommo_lead_id) {
      try {
        const notaKommo = `[IA - Análise de Ligação]

📞 Resumo: ${analise.resumo}

⭐ Score: ${analise.score_geral}/10

✅ Pontos Positivos:
${analise.pontos_positivos?.map((p: string) => `• ${p}`).join('\n') || 'N/A'}

⚠️ Pontos a Melhorar:
${analise.pontos_criticos?.map((p: string) => `• ${p}`).join('\n') || 'N/A'}

📋 Próximo Passo: ${analise.proximo_passo_sugerido || 'N/A'}
`
        
        await fetch(
          `https://crm2lrmultimarcascom.kommo.com/api/v4/leads/${ligacao.kommo_lead_id}/notes`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${KOMMO_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify([{
              note_type: "common",
              params: { text: notaKommo }
            }]),
          }
        )
        console.log("[v0] Nota enviada para Kommo")
      } catch (kommoError) {
        console.warn("[v0] Erro ao enviar nota para Kommo (não crítico):", kommoError)
      }
    }

    // Busca ligação atualizada
    const { data: ligacaoAtualizada } = await supabase
      .from("ligacoes")
      .select("*")
      .eq("id", id)
      .single()

    return NextResponse.json({
      success: true,
      message: "Ligação processada com sucesso",
      ligacao: ligacaoAtualizada,
    })

  } catch (error) {
    console.error("[v0] Erro ao processar ligação:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Erro interno" 
    }, { status: 500 })
  }
}
