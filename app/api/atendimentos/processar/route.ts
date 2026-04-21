import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN
const KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN

// Prompt do Claude para analise
const PROMPT_ANALISE = `Você é um especialista em análise de atendimentos comerciais onde financiamento e consórcio imobiliário são oferecidos. Analise a transcrição da reunião abaixo com os seguintes critérios:

## Critérios de Avaliação (0 a 10):

### 1. Abordagem Inicial (score_abordagem)
- Rapport e conexão com cliente
- Coleta de informações (perfil, necessidade, urgência)
- Escuta ativa

### 2. Apresentação do Financiamento (score_financiamento)
- Clareza na explicação
- Argumentação de benefícios
- Transição para consórcio quando financiamento não é viável

### 3. Apresentação do Consórcio (score_consorcio)
- Explicação do funcionamento
- Uso de provas sociais e casos de sucesso
- Resposta a objeções

### 4. Técnicas de Fechamento (score_fechamento)
- Criação de urgência
- Tentativas de fechamento
- Superação de objeções finais

## Retorne APENAS um JSON válido com esta estrutura:
{
  "score_geral": 7.5,
  "score_abordagem": 8.0,
  "score_financiamento": 7.0,
  "score_consorcio": 7.5,
  "score_fechamento": 6.5,
  "resumo": "Resumo executivo do atendimento em 2-3 frases",
  "pontos_positivos": ["ponto 1", "ponto 2", "ponto 3"],
  "pontos_criticos": ["ponto a melhorar 1", "ponto a melhorar 2"],
  "objecoes_cliente": [
    {"objecao": "texto da objecao", "resposta_vendedor": "como o vendedor respondeu", "avaliacao": "boa/ruim/ausente"}
  ],
  "motivo_nao_fechamento": "Principal motivo identificado ou null se fechou",
  "feedback_coaching": "Feedback direto e construtivo para o vendedor melhorar"
}

## Transcrição da Reunião:
`

// Utilitario de retry com backoff exponencial
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 2000,
  label = "operacao"
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn()
      if (result !== null && result !== undefined) return result
      throw new Error("Resultado vazio")
    } catch (error: any) {
      const isLast = attempt === maxAttempts
      console.error(`[v0] ${label} - tentativa ${attempt}/${maxAttempts} falhou:`, error?.message)
      if (isLast) return null
      // Backoff exponencial: 2s, 4s, 8s...
      const wait = delayMs * Math.pow(2, attempt - 1)
      console.error(`[v0] ${label} - aguardando ${wait}ms antes de tentar novamente...`)
      await new Promise(resolve => setTimeout(resolve, wait))
    }
  }
  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  let atendimentoId: string | null = null

  try {
    const body = await request.json()
    atendimentoId = body.atendimentoId
    const audioUrl = body.audioUrl

    if (!atendimentoId || !audioUrl) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // 1. Buscar dados do atendimento (kommo_id, nome_lead, responsavel)
    const { data: atendimento } = await supabase
      .from("atendimentos")
      .select("kommo_id, nome_lead, responsavel, equipe")
      .eq("id", atendimentoId)
      .single()

    // 2. Transcrever com Deepgram (3 tentativas)
    const transcricao = await withRetry(
      () => transcreverAudio(audioUrl),
      3,
      2000,
      "Deepgram transcricao"
    )

    if (!transcricao) {
      await supabase
        .from("atendimentos")
        .update({ status: "erro", updated_at: new Date().toISOString() })
        .eq("id", atendimentoId)
      return NextResponse.json({ error: "Falha na transcricao após 3 tentativas" }, { status: 500 })
    }

    // 3. Analisar com Claude (3 tentativas)
    const analise = await withRetry(
      () => analisarComClaude(transcricao),
      3,
      3000,
      "Claude analise"
    )

    if (!analise) {
      // Salva ao menos a transcricao mesmo sem analise
      await supabase
        .from("atendimentos")
        .update({
          transcricao_completa: transcricao,
          status: "erro",
          updated_at: new Date().toISOString(),
        })
        .eq("id", atendimentoId)
      return NextResponse.json({ error: "Falha na analise após 3 tentativas" }, { status: 500 })
    }

    // 4. Salvar resultados no Supabase
    await supabase
      .from("atendimentos")
      .update({
        transcricao_completa: transcricao,
        resumo: analise?.resumo || null,
        motivo_nao_fechamento: analise?.motivo_nao_fechamento || null,
        score_geral: analise?.score_geral || null,
        score_abordagem: analise?.score_abordagem || null,
        score_financiamento: analise?.score_financiamento || null,
        score_consorcio: analise?.score_consorcio || null,
        score_fechamento: analise?.score_fechamento || null,
        pontos_positivos: analise?.pontos_positivos || null,
        pontos_criticos: analise?.pontos_criticos || null,
        objecoes_cliente: analise?.objecoes_cliente || null,
        feedback_coaching: analise?.feedback_coaching || null,
        status: "concluido",
        updated_at: new Date().toISOString(),
      })
      .eq("id", atendimentoId)

    // 5. Enviar nota para o Kommo com o resumo da analise
    if (atendimento?.kommo_id && KOMMO_ACCESS_TOKEN && KOMMO_SUBDOMAIN) {
      await withRetry(
        () => enviarNotaKommo(
          atendimento.kommo_id,
          atendimento.nome_lead,
          atendimento.responsavel,
          analise
        ),
        2,
        1500,
        "Kommo nota"
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Erro geral no processamento:", error)

    // Marca como erro no banco se tiver o ID
    if (atendimentoId) {
      const supabaseErr = await createClient()
      await supabaseErr
        .from("atendimentos")
        .update({ status: "erro", updated_at: new Date().toISOString() })
        .eq("id", atendimentoId)
    }

    return NextResponse.json({ error: "Erro no processamento" }, { status: 500 })
  }
}

// ─── Deepgram ────────────────────────────────────────────────────────────────
async function transcreverAudio(audioUrl: string): Promise<string | null> {
  if (!DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY nao configurada")

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?language=pt-BR&model=nova-2&diarize=true&punctuate=true&smart_format=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: audioUrl }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Deepgram HTTP ${response.status}: ${error}`)
  }

  const data = await response.json()

  // Formatar com diarizacao (speakers)
  const words = data.results?.channels?.[0]?.alternatives?.[0]?.words
  if (words && words.length > 0 && words[0].speaker !== undefined) {
    let formatted = ""
    let currentSpeaker = -1
    for (const word of words) {
      if (word.speaker !== currentSpeaker) {
        currentSpeaker = word.speaker
        formatted += `\n\n[${currentSpeaker === 0 ? "Vendedor" : "Cliente"}]: `
      }
      formatted += word.punctuated_word + " "
    }
    return formatted.trim()
  }

  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript
  if (!transcript || transcript.trim().length === 0) throw new Error("Transcricao vazia retornada pelo Deepgram")
  return transcript
}

// ─── Claude ───────────────────────────────────────────────────────────────────
async function analisarComClaude(transcricao: string): Promise<any | null> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY nao configurada")

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: PROMPT_ANALISE + transcricao }],
  })

  const content = response.content[0]
  if (content.type !== "text") throw new Error("Resposta do Claude sem conteudo texto")

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("JSON nao encontrado na resposta do Claude")

  return JSON.parse(jsonMatch[0])
}

// ─── Kommo: Enviar Nota ───────────────────────────────────────────────────────
async function enviarNotaKommo(
  kommoId: string,
  nomeLead: string,
  responsavel: string,
  analise: any
): Promise<boolean> {
  if (!KOMMO_ACCESS_TOKEN || !KOMMO_SUBDOMAIN) throw new Error("Credenciais Kommo ausentes")

  // Monta o texto da nota formatado
  const motivo = analise.motivo_nao_fechamento
    ? `\n❌ *Motivo não fechou:* ${analise.motivo_nao_fechamento}`
    : "\n✅ *Resultado:* Fechamento realizado"

  const pontosPositivos = (analise.pontos_positivos || []).map((p: string) => `  + ${p}`).join("\n")
  const pontosCriticos = (analise.pontos_criticos || []).map((p: string) => `  - ${p}`).join("\n")

  const nota = `🤖 *Análise IA do Atendimento — ${nomeLead}*\n\n` +
    `📋 *Resumo:* ${analise.resumo || "—"}\n` +
    motivo + "\n\n" +
    `📊 *Scores:*\n` +
    `  • Geral: ${analise.score_geral || "—"}/10\n` +
    `  • Abordagem: ${analise.score_abordagem || "—"}/10\n` +
    `  • Financiamento: ${analise.score_financiamento || "—"}/10\n` +
    `  • Consórcio: ${analise.score_consorcio || "—"}/10\n` +
    `  • Fechamento: ${analise.score_fechamento || "—"}/10\n\n` +
    (pontosPositivos ? `✅ *Pontos Positivos:*\n${pontosPositivos}\n\n` : "") +
    (pontosCriticos ? `⚠️ *Pontos a Melhorar:*\n${pontosCriticos}\n\n` : "") +
    `💡 *Coaching:* ${analise.feedback_coaching || "—"}\n\n` +
    `_Gerado automaticamente — Vendedor: ${responsavel}_`

  // Busca o leadId numerico pelo kommo_id
  const searchRes = await fetch(
    `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads?query=${kommoId}`,
    { headers: { Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}` } }
  )

  if (!searchRes.ok) throw new Error(`Kommo search HTTP ${searchRes.status}`)

  const searchData = await searchRes.json()
  const leadId = searchData?._embedded?.leads?.[0]?.id
  if (!leadId) throw new Error(`Lead ${kommoId} nao encontrado no Kommo`)

  // Envia a nota
  const noteRes = await fetch(
    `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/${leadId}/notes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ note_type: "common", params: { text: nota } }]),
    }
  )

  if (!noteRes.ok) {
    const errText = await noteRes.text()
    throw new Error(`Kommo notes HTTP ${noteRes.status}: ${errText}`)
  }

  return true
}
