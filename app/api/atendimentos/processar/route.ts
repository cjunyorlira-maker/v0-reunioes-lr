import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { del } from "@vercel/blob"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Timeout máximo para processamento de áudios longos
// Hobby: 60s | Pro: 300s | Enterprise: 900s
// Para áudios de 120+ minutos, recomenda-se plano Pro
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
- Se por ventura não for apresentado o financiamento entender o porquê — se o cliente já queria consórcio isso pode ser válido, mas deve estar justificado no atendimento.
- Foi apresentado de forma dinâmica ou só leu a tela sem argumentação?
- Houve muitas pausas e silêncios sem propósito?
- Apresentou os diferenciais e argumentou sobre os juros do mercado?
- Falou do sistema próprio como diferencial?
- Usou exemplos reais para ilustrar?
- Conduziu naturalmente para o consórcio ao mostrar as limitações do financiamento? (a ideia é que o cliente saia do financiamento com a sensação de que se não conseguiu aqui, não vai conseguir em lugar nenhum)
- Argumentou sobre o porquê o financiamento não é a melhor opção naquele momento?

3. APRESENTAÇÃO DO CONSÓRCIO
- Explicou bem o funcionamento de sorteio e lance?
- Falou sobre possibilidade de contemplação? ATENÇÃO: possibilidade é diferente de garantia — o vendedor pode e deve mencionar que existe a possibilidade de contemplação por sorteio ou lance, mas NUNCA pode garantir data ou prazo. Avaliar se o vendedor deixou claro que é uma possibilidade e não uma certeza. Marcar como CRÍTICO se garantiu data ou prazo de contemplação.
- Apresentou referências e cases de clientes realizados?
- Mostrou o site da empresa e Reclame Aqui como prova social?
- Explicou bem os diferenciais do consórcio vs financiamento?
- Quais foram as objeções do cliente e como foram respondidas?
- O vendedor identificou e respondeu a REAL dor do cliente, ou apenas contornou superficialmente sem resolver o que realmente estava travando a decisão? Avaliar se as respostas às objeções foram diretas e resolveram a raiz do problema ou se foram desvios que ignoraram o ponto central do cliente.
- O cliente demonstrou resistência? Em qual momento?

4. SITUAÇÃO FINANCEIRA DO CLIENTE
- O cliente tinha entrada disponível?
- Qual foi o impeditivo identificado para fechar?
- O perfil financeiro foi bem mapeado?
- Investigar o REAL motivo do não fechamento — muitas vezes o cliente diz "vou pensar" mas há um motivo real por trás (medo, cônjuge, situação financeira, não entendeu o produto, não confiou no vendedor). Avaliar se o vendedor investigou fundo ou aceitou a resposta superficial do cliente.

5. TÉCNICAS DE FECHAMENTO
- O vendedor tentou fechar? Quantas vezes?
- Quais técnicas de fechamento foram usadas?
- Como respondeu às objeções de fechamento?
- O cliente ficou de pensar? O vendedor tentou contornar?

6. COERÊNCIA E QUALIDADE DA ARGUMENTAÇÃO
- O atendimento teve uma linha lógica e progressiva, ou ficou confuso e sem direção?
- O vendedor usou os argumentos na ordem e contexto corretos, ou jogou todas as argumentações de forma aleatória sem conexão com o momento da conversa?
- ATENÇÃO: um atendimento pode aparentemente ter usado "todas as argumentações" mas se foram usadas fora de ordem ou fora de contexto, o efeito é nulo ou negativo. Avaliar se cada argumento foi usado no momento certo e em resposta ao que o cliente estava sentindo naquele instante.
- O vendedor soube ler o momento do cliente e adaptar o discurso, ou seguiu um roteiro fixo independente das reações?

7. AVALIAÇÃO GERAL DO TEMPO
- Quanto tempo em cada etapa (financiamento / consórcio)?
- Houve momento de desengajamento do cliente?
- O ritmo foi adequado ou apressado/lento demais?

CLASSIFICAÇÕES ESPECIAIS — marcar como CRÍTICO se:
⛔ Garantiu data ou prazo de contemplação no consórcio
⛔ Foi direto demais dizendo que o cliente não tem perfil para financiamento
⛔ Não tentou nenhuma técnica de fechamento
⛔ Atendimento completamente robótico sem conexão humana
⛔ Ignorou completamente a real objeção do cliente e apenas desviou sem resolver
⛔ Argumentação completamente fora de ordem e de contexto, tornando o atendimento confuso e sem progressão

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

// Classifica etiqueta automaticamente pelo motivo retornado pela IA
function classificarEtiquetaIA(analise: any): string {
  const motivo = (analise?.motivo_nao_fechamento || "").toLowerCase()
  if (!motivo) return "indecisao"

  if (analise?.situacao_financeira?.tinha_entrada === false) return "sem_entrada"
  if (motivo.includes("entrada") && motivo.includes("levantar")) return "vai_levantar_entrada"
  if (motivo.includes("parcela") || motivo.includes("prestacao") || motivo.includes("mensalidade")) return "parcela"
  if (motivo.includes("sem perfil") || motivo.includes("nao tem perfil") || motivo.includes("nao qualif")) return "sem_perfil"
  if (motivo.includes("conjuge") || motivo.includes("esposa") || motivo.includes("marido") || motivo.includes("socio") || motivo.includes("tomador") || motivo.includes("decisao")) return "sem_tomador_decisao"
  if (motivo.includes("pensar") || motivo.includes("refletir") || motivo.includes("analisa") || motivo.includes("decidir") || motivo.includes("prazo")) return "vai_pensar"
  if (motivo.includes("concorr") || motivo.includes("outra empresa") || motivo.includes("banco") || motivo.includes("proposta") || motivo.includes("outra opcao")) return "concorrencia"
  if (motivo.includes("nao quer consorcio") || motivo.includes("nao gosta consorcio") || motivo.includes("prefere financ")) return "nao_quer_consorcio"
  if (motivo.includes("experiencia ruim") || motivo.includes("ja fez consorcio") || motivo.includes("contempla") || motivo.includes("nao foi contemplado")) return "experiencia_ruim"
  if (motivo.includes("atendimento") || motivo.includes("vendedor") || motivo.includes("nao gostou")) return "nao_gostou_atendimento"
  if (motivo.includes("indeci") || motivo.includes("duvida") || motivo.includes("nao tem certeza")) return "indecisao"
  if (motivo.includes("gas") || motivo.includes("nao tentou") || motivo.includes("nao fechou") || motivo.includes("faltou")) return "faltou_gas_vendedor"
  if (motivo.includes("cpf") || motivo.includes("score") || motivo.includes("negativado") || motivo.includes("consulta")) return "cpf_consultado"

  return "indecisao"
}

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
      console.error(`[v0] ${label} - tentativa ${attempt}/${maxAttempts} falhou`)
      console.error(`[v0] ${label} - erro.message:`, error?.message)
      console.error(`[v0] ${label} - erro.stack:`, error?.stack)
      console.error(`[v0] ${label} - erro.response:`, error?.response?.status, error?.response?.statusText)
      if (error?.response?.data) {
        console.error(`[v0] ${label} - erro.response.data:`, JSON.stringify(error.response.data))
      }
      if (isLast) {
        console.error(`[v0] ${label} - FALHA FINAL após ${maxAttempts} tentativas!`)
        return null
      }
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
        situacao_financeira: analise?.situacao_financeira || null,
        garantiu_contemplacao: analise?.garantiu_contemplacao ?? null,
        usou_prova_social: analise?.usou_prova_social || null,
        tecnicas_fechamento: analise?.tecnicas_fechamento || null,
        proximo_passo_sugerido: analise?.proximo_passo_sugerido || null,
        etiqueta: analise?.motivo_nao_fechamento ? classificarEtiquetaIA(analise) : null,
        status: "concluido",
        fechou: false,  // Por padrao, atendimento vai para "Nao Fechou" ate ser marcado manualmente
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
      await del(audioUrl, { token: process.env.ATENTIMENTOS_READ_WRITE_TOKEN })
      console.log("[v0] Audio deletado do Blob com sucesso:", audioUrl)
    } catch (delError) {
      console.error("[v0] Erro ao deletar audio do Blob:", delError)
      // Nao falhar o processamento por erro de delete
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Erro geral no processamento:", errorMsg, error)

    // Marca como erro no banco se tiver o ID
    if (atendimentoId) {
      try {
        const supabaseErr = createServiceClient()
        await supabaseErr
          .from("atendimentos")
          .update({ 
            status: "erro",
            resumo: `Erro no processamento: ${errorMsg}`,
            updated_at: new Date().toISOString() 
          })
          .eq("id", atendimentoId)
        console.log("[v0] Atendimento marcado como erro com mensagem:", errorMsg)
      } catch (dbError) {
        console.error("[v0] Erro ao salvar erro no banco:", dbError)
      }
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

// ─── Deepgram ────────────────────────────────────────────────────────────────
async function transcreverAudio(audioUrl: string): Promise<string | null> {
  if (!DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY nao configurada")

  // Enviar URL direta para o Deepgram (blob público, sem precisar baixar)
  // Isso economiza tempo e memória para áudios longos (120+ min)
  console.log("[v0] Enviando URL para Deepgram:", audioUrl.substring(0, 60))
  
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
    const errorText = await response.text()
    console.error("[v0] Deepgram erro HTTP:", response.status, response.statusText)
    console.error("[v0] Deepgram URL usada:", audioUrl.substring(0, 100))
    console.error("[v0] Deepgram resposta completa:", errorText.substring(0, 500))
    
    try {
      const errorJson = JSON.parse(errorText)
      console.error("[v0] Deepgram erro JSON:", JSON.stringify(errorJson, null, 2))
    } catch (e) {
      console.error("[v0] Deepgram erro (não é JSON):", errorText.substring(0, 200))
    }
    
    throw new Error(`Deepgram HTTP ${response.status}: ${errorText.substring(0, 200)}`)
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
  console.log("[v0] Claude analisarComClaude iniciando")
  console.log("[v0] Claude transcricao length:", transcricao.length)
  
  if (!ANTHROPIC_API_KEY) {
    console.error("[v0] Claude ANTHROPIC_API_KEY nao configurada!")
    throw new Error("ANTHROPIC_API_KEY nao configurada")
  }

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
    console.log("[v0] Claude client criado")

    // Usar streaming para evitar timeout em operacoes longas (thinking pode demorar)
    console.log("[v0] Claude iniciando stream com thinking...")
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 28000,  // 16000 thinking + 12000 resposta JSON
      thinking: {
        type: "enabled",
        budget_tokens: 16000,
      },
      messages: [{ role: "user", content: PROMPT_ANALISE + transcricao }],
    })

    // Aguardar resposta completa do stream
    console.log("[v0] Claude aguardando stream finalizar...")
    const response = await stream.finalMessage()
    console.log("[v0] Claude stream com thinking finalizado")
    console.log("[v0] Claude response.content.length:", response.content.length)

    // Quando thinking está ativado, o Claude retorna 2 blocos:
    // content[0] = bloco de pensamento (type: "thinking")
    // content[1] = texto com o JSON (type: "text")
    const content = response.content.find(c => c.type === "text")
    if (!content || content.type !== "text") {
      console.error("[v0] Claude resposta sem conteudo texto!")
      console.error("[v0] Claude response.content types:", response.content.map((c: any) => c.type))
      throw new Error("Resposta do Claude sem conteudo texto")
    }

    console.log("[v0] Claude texto encontrado, length:", (content as any).text.length)
    const jsonMatch = (content as any).text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("[v0] Claude JSON nao encontrado!")
      console.error("[v0] Claude resposta text:", (content as any).text.substring(0, 200))
      throw new Error("JSON nao encontrado na resposta do Claude")
    }

    console.log("[v0] Claude JSON encontrado, fazendo parse...")
    const result = JSON.parse(jsonMatch[0])
    console.log("[v0] Claude analise completa - score:", result.score_geral)
    return result
  } catch (error: any) {
    console.error("[v0] Claude erro completo:", error?.message)
    console.error("[v0] Claude erro stack:", error?.stack)
    if (error?.error) {
      console.error("[v0] Claude error.error:", JSON.stringify(error.error))
    }
    throw error
  }
}

// ─── Kommo: Enviar Nota ───────────────────────────────���───────────────────────
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
