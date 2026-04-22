import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { del } from "@vercel/blob"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Aumentar timeout para 5 minutos (Deepgram + Claude demoram)
export const maxDuration = 300

// Cliente Supabase com Service Role (funciona sem sessão de usuário)
function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN
const KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN

// Prompt completo do Claude para analise de atendimentos (criado no Workbench)
const PROMPT_ANALISE = `Você é um especialista em análise de atendimentos comerciais de financiamento e consórcio imobiliário.

CONTEXTO DO NEGÓCIO:
O cliente foi captado pelo pré-vendas com a proposta de conhecer um "sistema próprio de financiamento" diferenciado. Ele vem à agência acreditando que vai ver algo que nunca viu antes. O atendimento presencial é feito pelo supervisor (não pelo pré-vendas). A estratégia é: apresentar o financiamento mostrando as limitações do mercado, e conduzir naturalmente para o consórcio, que é o produto principal.

ANALISE OS SEGUINTES PONTOS:

1. ABORDAGEM INICIAL
- O atendimento foi humanizado ou frio/robótico?
- Houve rapport e conexão com o cliente?
- O supervisor coletou informações importantes do cliente (perfil, objetivo, situação financeira, tem entrada ou não)?
- Identificou resistências iniciais do cliente?
- O cliente demonstrou abertura ou já chegou resistente?

2. APRESENTAÇÃO DO FINANCIAMENTO
- Foi apresentado de forma dinâmica ou só leu a tela sem argumentação?
- Houve muitas pausas e silêncios sem propósito?
- Apresentou os diferenciais e argumentou sobre os juros do mercado?
- Falou do sistema próprio como diferencial?
- Usou exemplos reais para ilustrar?
- Conduziu naturalmente para o consórcio ao mostrar as limitações do financiamento? (sem falar diretamente que o cliente não tem perfil)
- Argumentou sobre o porquê o financiamento não é a melhor opção naquele momento?

3. APRESENTAÇÃO DO CONSÓRCIO
- Explicou bem o funcionamento de sorteio e lance?
- Garantiu data de contemplação? (ATENÇÃO: isso NÃO pode ser feito — marcar como CRÍTICO se acontecer)
- Apresentou referências e cases de clientes realizados?
- Mostrou o site da empresa e Reclame Aqui como prova social?
- Explicou bem os diferenciais do consórcio vs financiamento?
- Quais foram as objeções do cliente e como foram respondidas?
- O cliente demonstrou resistência? Em qual momento?

4. SITUAÇÃO FINANCEIRA DO CLIENTE
- O cliente tinha entrada disponível?
- Qual foi o impeditivo identificado para fechar?
- O perfil financeiro foi bem mapeado?

5. TÉCNICAS DE FECHAMENTO
- O vendedor tentou fechar? Quantas vezes?
- Quais técnicas de fechamento foram usadas?
- Como respondeu às objeções de fechamento?
- O cliente ficou de pensar? O vendedor tentou contornar?

6. AVALIAÇÃO GERAL DO TEMPO
- Quanto tempo em cada etapa (financiamento / consórcio)?
- Houve momento de desengajamento do cliente?
- O ritmo foi adequado ou apressado/lento demais?

CLASSIFICAÇÕES ESPECIAIS — marcar como CRÍTICO se:
⛔ Garantiu data de contemplação no consórcio
⛔ Foi direto demais dizendo que o cliente não tem perfil para financiamento
⛔ Não tentou nenhuma técnica de fechamento
⛔ Atendimento completamente robótico sem conexão humana

RETORNE OBRIGATORIAMENTE UM JSON com esta estrutura:
{
  "score_geral": número 0-10,
  "score_abordagem": número 0-10,
  "score_financiamento": número 0-10,
  "score_consorcio": número 0-10,
  "score_fechamento": número 0-10,
  "resumo": "texto de 3-4 linhas resumindo o atendimento",
  "pontos_positivos": ["array de pontos que foram bem"],
  "pontos_criticos": ["array de pontos CRÍTICOS — erros graves"],
  "objecoes_cliente": [
    {"objecao": "o que o cliente disse", "resposta_vendedor": "como o vendedor respondeu", "eficaz": true/false}
  ],
  "situacao_financeira": {
    "tinha_entrada": true/false/null,
    "impeditivo_principal": "string",
    "perfil_mapeado": true/false
  },
  "garantiu_contemplacao": true/false,
  "usou_prova_social": {
    "reclame_aqui": true/false,
    "site_empresa": true/false,
    "referencias_clientes": true/false
  },
  "tecnicas_fechamento": {
    "tentou_fechar": true/false,
    "quantidade_tentativas": número,
    "tecnicas_usadas": ["array"],
    "resultado": "fechou/nao_fechou/em_aberto"
  },
  "motivo_nao_fechamento": "string principal ou null se fechou",
  "proximo_passo_sugerido": "string com recomendação clara",
  "feedback_coaching": "texto de coaching para o vendedor — o que melhorar no próximo atendimento"
}

IMPORTANTE: 
- Speaker 0 = Supervisor/Vendedor
- Speaker 1 = Cliente
- Responda APENAS com o JSON válido, sem texto adicional
- Se algo não ficou claro na transcrição, indique null

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
  const supabase = createServiceClient()
  let atendimentoId: string | null = null

  try {
    console.log("[v0] Processar POST iniciado")
    const body = await request.json()
    atendimentoId = body.atendimentoId
    const audioUrl = body.audioUrl

    console.log("[v0] Body recebido:", { atendimentoId, audioUrl: audioUrl?.substring(0, 50) })

    if (!atendimentoId || !audioUrl) {
      console.error("[v0] Dados incompletos - atendimentoId:", atendimentoId, "audioUrl:", !!audioUrl)
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // 1. Buscar dados do atendimento (kommo_id, nome_lead, responsavel)
    console.log("[v0] Buscando dados do atendimento:", atendimentoId)
    const { data: atendimento } = await supabase
      .from("atendimentos")
      .select("kommo_id, nome_lead, responsavel, equipe")
      .eq("id", atendimentoId)
      .single()
    
    console.log("[v0] Atendimento encontrado:", atendimento?.nome_lead)

    // 2. Transcrever com Deepgram (3 tentativas)
    console.log("[v0] Iniciando Deepgram...")
    const transcricao = await withRetry(
      () => transcreverAudio(audioUrl),
      3,
      2000,
      "Deepgram transcricao"
    )

    console.log("[v0] Transcricao completa:", transcricao?.substring(0, 100))

    if (!transcricao) {
      console.error("[v0] Deepgram falhou após 3 tentativas")
      await supabase
        .from("atendimentos")
        .update({ status: "erro", updated_at: new Date().toISOString() })
        .eq("id", atendimentoId)
      return NextResponse.json({ error: "Falha na transcricao após 3 tentativas" }, { status: 500 })
    }

    // 3. Analisar com Claude (3 tentativas)
    console.log("[v0] Iniciando Claude...")
    const analise = await withRetry(
      () => analisarComClaude(transcricao),
      3,
      3000,
      "Claude analise"
    )

    console.log("[v0] Analise completa - score:", analise?.score_geral)

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

    // 4. Salvar resultados no Supabase PRIMEIRO
    console.log("[v0] Salvando resultados no Supabase...")
    const { error: updateError } = await supabase
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
        // Novos campos do prompt expandido
        situacao_financeira: analise?.situacao_financeira || null,
        garantiu_contemplacao: analise?.garantiu_contemplacao ?? null,
        usou_prova_social: analise?.usou_prova_social || null,
        tecnicas_fechamento: analise?.tecnicas_fechamento || null,
        proximo_passo_sugerido: analise?.proximo_passo_sugerido || null,
        status: "concluido",
        updated_at: new Date().toISOString(),
      })
      .eq("id", atendimentoId)

    if (updateError) {
      console.error("[v0] Erro ao atualizar atendimento no Supabase:", updateError)
      throw new Error(`Erro ao salvar resultados: ${updateError.message}`)
    }
    console.log("[v0] Atendimento marcado como concluido no Supabase")

    // 5. Enviar nota para o Kommo com o resumo da analise (DEPOIS de salvar no Supabase)
    console.log("[v0] Enviando nota para Kommo...")
    if (atendimento?.kommo_id && KOMMO_ACCESS_TOKEN && KOMMO_SUBDOMAIN) {
      try {
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
        console.log("[v0] Nota enviada para Kommo com sucesso")
      } catch (kommoError) {
        console.error("[v0] Erro ao enviar nota para Kommo (não falha o processamento):", kommoError)
        // Não falhar o processamento por erro de envio ao Kommo
      }
    } else {
      console.log("[v0] Kommo não será acionado - kommo_id:", atendimento?.kommo_id, "token:", !!KOMMO_ACCESS_TOKEN)
    }

    // 6. Deletar audio do Vercel Blob para liberar storage
    try {
      await del(audioUrl)
      console.log("[v0] Audio deletado do Blob com sucesso:", audioUrl)
    } catch (delError) {
      console.error("[v0] Erro ao deletar audio do Blob:", delError)
      // Nao falhar o processamento por erro de delete
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Erro geral no processamento:", error)

    // Marca como erro no banco se tiver o ID
    if (atendimentoId) {
      const supabaseErr = createServiceClient()
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

  // 1. Baixar o áudio do Vercel Blob usando o token (funciona com private store)
  console.log("[v0] Baixando audio do Blob:", audioUrl.substring(0, 60))
  const blobResponse = await fetch(audioUrl, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  })

  if (!blobResponse.ok) {
    throw new Error(`Erro ao baixar audio do Blob: ${blobResponse.status}`)
  }

  const audioBuffer = await blobResponse.arrayBuffer()
  console.log("[v0] Audio baixado do Blob, tamanho:", audioBuffer.byteLength)

  // 2. Enviar buffer diretamente para o Deepgram
  console.log("[v0] Enviando audio para Deepgram...")
  const response = await fetch(
    "https://api.deepgram.com/v1/listen?language=pt-BR&model=nova-2&diarize=true&punctuate=true&smart_format=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/webm",
      },
      body: audioBuffer,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Deepgram HTTP ${response.status}: ${error}`)
  }

  const data = await response.json()
  console.log("[v0] Deepgram respondeu com sucesso")

  // Formatar com diarização (speakers)
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
    console.log("[v0] Transcricao com diarização formatada")
    return formatted.trim()
  }

  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript
  if (!transcript || transcript.trim().length === 0) {
    throw new Error("Transcricao vazia retornada pelo Deepgram")
  }
  console.log("[v0] Transcricao simples:", transcript.substring(0, 100))
  return transcript
}

// ─── Claude ───────────────────────────────────────────────────────────────────
async function analisarComClaude(transcricao: string): Promise<any | null> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY nao configurada")

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 20000,  // DEVE ser maior que budget_tokens (16000 thinking + 4000 resposta)
    thinking: {
      type: "enabled",
      budget_tokens: 16000,
    },
    messages: [{ role: "user", content: PROMPT_ANALISE + transcricao }],
  })

  // Quando thinking está ativado, o Claude retorna 2 blocos:
  // content[0] = bloco de pensamento (type: "thinking")
  // content[1] = texto com o JSON (type: "text")
  // Usar .find() para pegar o bloco correto
  const content = response.content.find(c => c.type === "text")
  if (!content || content.type !== "text") throw new Error("Resposta do Claude sem conteudo texto")

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
