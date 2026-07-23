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

// Prompt para análise de RETORNO - COMPLEMENTO do atendimento anterior
const PROMPT_ANALISE_RETORNO = `Você é um especialista em análise de atendimentos comerciais de financiamento e consórcio imobiliário/automotivo, treinado no método Alan Caçula.

CONTEXTO IMPORTANTE:
Este é um RETORNO/COMPLEMENTO de um atendimento anterior que não fechou. O cliente voltou para continuar a negociação.
NÃO é uma reanálise - é um COMPLEMENTO para verificar se o vendedor conseguiu fechar desta vez.

⚠️ ATENÇÃO: O FGTS NÃO É MAIS ACEITO como entrada no consórcio. Se o cliente quer usar SÓ FGTS, o lead é INVIÁVEL.

DADOS DO ATENDIMENTO ANTERIOR:
{contexto_anterior}

FOCO DA ANÁLISE:
1. O cliente FECHOU desta vez?
2. As objeções pendentes do atendimento anterior foram resolvidas?
3. O perfil do cliente mudou (conseguiu entrada, decisor presente)?

GARANTIA DE CONTEMPLAÇÃO:
✅ ACEITÁVEL: criar expectativa de contemplação rápida
⛔ CRÍTICO: dar DATA/PRAZO específico ("vai ser contemplado em 6 meses")
NÃO marcar como crítico só porque "garantiu contemplação" — só se DEU DATA.

RETORNE OBRIGATORIAMENTE UM JSON com esta estrutura:
{
  "score_geral": número 0-10,
  "score_abordagem": número 0-10,
  "score_consorcio": número 0-10,
  "score_fechamento": número 0-10,
  "resumo": "texto de 2-3 linhas resumindo este retorno",
  "pontos_positivos": ["array"],
  "pontos_criticos": ["array"],
  "objecoes_cliente": [
    {"objecao": "string", "resposta_vendedor": "string", "eficaz": true/false}
  ],
  "perfil_cliente": {
    "tipo": "sem_entrada|apenas_pesquisando|indeciso|vai_analisar|decisor_com_freio|cliente_trauma|cliente_fechado_por_vendedor|cliente_naturalmente_fechado|pronto_pra_fechar|sem_perfil_real",
    "tem_entrada": true/false/null,
    "conexao_com_vendedor": "boa|regular|fraca",
    "viabilidade_fechamento_atual": "alta|media|baixa|inviavel"
  },
  "garantiu_contemplacao": true/false,
  "deu_data_ou_prazo_contemplacao": true/false,
  "tecnicas_fechamento": {
    "tentou_fechar": true/false,
    "quantidade_tentativas": número,
    "tecnicas_usadas": ["array"],
    "resultado": "fechou|nao_fechou|em_aberto"
  },
  "motivo_nao_fechamento": "string ou null se fechou",
  "categoria_motivo": "vendedor|cliente|neutro|null",
  "proximo_passo_sugerido": "string acionável",
  "feedback_coaching": "texto breve focado em fechamento"
}

IMPORTANTE:
- Speaker 0 = Supervisor/Vendedor
- Speaker 1 = Cliente
- Responda APENAS com o JSON válido
- O mais importante é identificar se FECHOU ou NÃO FECHOU
- Seja conservador: vendedor padrão = 5-6/10

## Transcrição do Retorno:
`

// Prompt completo do Claude para analise de atendimentos - V2 com método Alan Caçula
const PROMPT_ANALISE = `Você é um especialista em análise de atendimentos comerciais de financiamento e consórcio imobiliário/automotivo, treinado no método Alan Caçula.

CONTEXTO DO NEGÓCIO:
A LR Multimarcas é uma agência de CRÉDITO IMOBILIÁRIO/AUTOMOTIVO. O carro chefe é o CONSÓRCIO. O cliente foi captado pelo pré-vendas com a proposta de conhecer um "sistema próprio de financiamento" diferenciado. Ele vem à agência acreditando que vai ver algo que nunca viu antes. O atendimento presencial é feito pelo SUPERVISOR (não pelo pré-vendas). A estratégia é: apresentar o financiamento mostrando as limitações do mercado, e conduzir naturalmente para o consórcio (produto principal).

⚠️ ATENÇÃO: O FGTS NÃO É MAIS ACEITO como entrada no consórcio. Se o cliente quer usar SÓ FGTS, o lead é INVIÁVEL.

ANALISE OS SEGUINTES PONTOS:

1. ABORDAGEM INICIAL
- O atendimento foi humanizado ou frio/robótico?
- Houve rapport e conexão real com o cliente?
- Coletou perfil completo (objetivo, situação financeira, entrada, decisor)?
- Identificou resistências iniciais?
- O cliente demonstrou abertura ou já chegou resistente?

2. APRESENTAÇÃO DO FINANCIAMENTO
- Apresentou de forma dinâmica ou só leu telas sem argumentação?
- Argumentou sobre os juros do mercado e limitações?
- Falou do "sistema próprio" como diferencial?
- Conduziu naturalmente para o consórcio mostrando as limitações?
- A ideia: cliente sair com a sensação "se não consigo aqui, não consigo em lugar nenhum"

3. APRESENTAÇÃO DO CONSÓRCIO
- Explicou bem sorteio e lance?
- Apresentou cases reais e prova social (Reclame Aqui, site)?
- Respondeu a REAL dor do cliente ou só desviou?
- Cliente demonstrou resistência? Em qual momento?

4. SITUAÇÃO FINANCEIRA DO CLIENTE
- Tinha entrada disponível?
- Mapeou o perfil financeiro completo?
- Investigou o REAL motivo do não fechamento (não aceitou "vou pensar" superficial)?

5. TÉCNICAS DE FECHAMENTO
- Tentou fechar? Quantas vezes?
- Quais técnicas usou?
- Tentou contornar o "vou pensar"?
- Aproveitou as janelas de fechamento (quando cliente sinalizou interesse)?

6. COERÊNCIA E ARGUMENTAÇÃO
- Linha lógica progressiva ou confuso?
- Argumentos no momento certo ou aleatórios?
- Soube ler o momento do cliente e adaptar?

7. AVALIAÇÃO DE TEMPO
- Houve momento de desengajamento?
- Ritmo adequado ou apressado/lento?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 ANÁLISE DO PERFIL DO CLIENTE (CRÍTICO!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLASSIFIQUE O CLIENTE EM UM DOS 10 TIPOS:

1. SEM_ENTRADA: Não tem nenhum recurso disponível ("não tenho nada guardado")
2. APENAS_PESQUISANDO: Curioso, sem intenção real de comprar agora
3. INDECISO: Tem perfil mas trava na decisão (medo, insegurança)
4. VAI_ANALISAR: Tem entrada disponível mas pediu pra pensar
5. DECISOR_COM_FREIO: Precisa aval de cônjuge/sócio/gestor
6. CLIENTE_TRAUMA: Já teve experiência ruim com consórcio (não foi contemplado, demorou)
7. CLIENTE_FECHADO_POR_VENDEDOR: Vendedor não criou conexão, cliente travou
8. CLIENTE_NATURALMENTE_FECHADO: Perfil reservado, fala pouco por natureza
9. PRONTO_PRA_FECHAR: Sinalizou interesse claro mas vendedor não conduziu
10. SEM_PERFIL_REAL: Renda incompatível com parcela, não viável

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CATEGORIZAÇÃO DO MOTIVO DO NÃO FECHAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GRUPO A — CULPA DO VENDEDOR (cobrar do supervisor):
- Não tentou nenhum fechamento
- Aceitou "vou pensar" sem explorar
- Não investigou objeção real (ficou na superfície)
- Não criou urgência (custo de oportunidade)
- Não agendou retorno concreto
- Cliente sinalizou interesse e vendedor não conduziu
- Argumentação fora de ordem
- Não validou se cliente é o decisor
- Apresentação muito longa, repetitiva, gerou fadiga

GRUPO B — CULPA DO CLIENTE (não cobrar):
- Sem entrada real (não tinha como)
- Decisor não estava presente (descobriu na hora)
- Renda incompatível com parcela
- Quer usar SÓ FGTS sem renda (não aceito mais)
- Cliente sem perfil real (orçamento muito apertado)

GRUPO C — NEUTROS (anotar pra próximo contato):
- Cliente vai analisar com entrada disponível (legítimo)
- Pendência burocrática (documento, comprovante)
- Pré-aprovação pendente
- Trauma anterior que vendedor identificou mas não conseguiu desconstruir

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 GARANTIA DE CONTEMPLAÇÃO — REGRA REVISADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONCEITO IMPORTANTE (método Alan Caçula):
A contemplação É garantida CONTRATUALMENTE — todo consorciado SERÁ contemplado em algum momento. O que NÃO se garante é a DATA.

✅ ACEITÁVEL (criar expectativa positiva):
- "Existe possibilidade de contemplação rápida"
- "Já vi clientes contemplados em 2-3 meses"
- "Vamos buscar a contemplação juntos"
- "Se Deus quiser, no primeiro mês a gente busca"
- "Eu só faço consórcio com você se for pra dar certo"
- "A contemplação é garantida contratualmente, só não a data"

⛔ CRÍTICO (garantia explícita de DATA/PRAZO):
- "Você VAI ser contemplado em 6 meses"
- "GARANTO que em até 1 ano você tem o crédito"
- "Pode confiar, em X meses está com o bem"
- "Em até 90 dias você é contemplado"

DIFERENÇA-CHAVE: Possibilidade futura (verbo no condicional/subjuntivo) = OK
Promessa concreta com prazo (verbo na 1a pessoa direta + tempo) = CRÍTICO

NÃO marcar como crítico apenas porque o vendedor "garantiu contemplação" — só marcar se ele DEU DATA OU PRAZO específico.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLASSIFICAÇÕES ESPECIAIS — marcar como CRÍTICO se:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛔ Garantiu DATA OU PRAZO específico de contemplação (não só "garantiu contemplação")
⛔ Foi direto demais dizendo que cliente "não tem perfil"
⛔ Não tentou nenhuma técnica de fechamento
⛔ Atendimento robótico sem conexão humana
⛔ Ignorou a REAL objeção do cliente
⛔ Argumentação fora de ordem e contexto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETORNE OBRIGATORIAMENTE UM JSON com esta estrutura:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  "perfil_cliente": {
    "tipo": "sem_entrada|apenas_pesquisando|indeciso|vai_analisar|decisor_com_freio|cliente_trauma|cliente_fechado_por_vendedor|cliente_naturalmente_fechado|pronto_pra_fechar|sem_perfil_real",
    "tem_entrada": true/false/null,
    "valor_entrada_disponivel": "string ou null",
    "experiencia_anterior_consorcio": {
      "ja_teve": true/false/null,
      "experiencia_foi": "ruim|boa|neutra|null",
      "motivo_experiencia_ruim": "string ou null"
    },
    "conexao_com_vendedor": "boa|regular|fraca",
    "motivo_conexao_fraca": "vendedor_nao_criou|cliente_naturalmente_fechado|null",
    "e_decisor": true/false/null,
    "barreiras_identificadas": ["array de barreiras"],
    "viabilidade_fechamento_atual": "alta|media|baixa|inviavel"
  },
  "situacao_financeira": {
    "tinha_entrada": true/false/null,
    "impeditivo_principal": "string",
    "perfil_mapeado": true/false
  },
  "garantiu_contemplacao": true/false,
  "deu_data_ou_prazo_contemplacao": true/false,
  "trecho_garantia_data": "string com a frase exata se deu prazo, null caso contrário",
  "usou_prova_social": {
    "reclame_aqui": true/false,
    "site_empresa": true/false,
    "referencias_clientes": true/false
  },
  "tecnicas_fechamento": {
    "tentou_fechar": true/false,
    "quantidade_tentativas": número,
    "tecnicas_usadas": ["array"],
    "resultado": "fechou|nao_fechou|em_aberto",
    "janelas_de_fechamento_perdidas": número
  },
  "motivo_nao_fechamento": "string principal ou null se fechou",
  "categoria_motivo": "vendedor|cliente|neutro|null",
  "explicacao_categoria": "string explicando por que está nessa categoria",
  "proximo_passo_sugerido": "string com recomendação clara e ACIONÁVEL",
  "feedback_coaching": "texto de coaching detalhado para o vendedor"
}

IMPORTANTE: 
- Speaker 0 = Supervisor/Vendedor
- Speaker 1 = Cliente
- Responda APENAS com o JSON válido, sem texto adicional
- Se algo não ficou claro na transcrição, indique null
- Seja CONSERVADOR nos scores: vendedor padrão (sem destaque) = 5-6/10
- Score 9-10 só para excelência genuína
- Score 0-3 só para erros críticos graves

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

/**
 * Gera nota ENXUTA para enviar ao Kommo
 * Diferente do resumo do sistema (mais técnico)
 * Foco: PRÉ-VENDAS + SUPERVISOR
 * Objetivo: feedback rápido pra ambos os papéis
 */
function gerarNotaKommoEnxuta(analise: any, vendedor: string, nomeCliente?: string): string {
  if (!analise) return ''
  
  const tipoCliente = analise.perfil_cliente?.tipo || 'indefinido'
  const temEntrada = analise.perfil_cliente?.tem_entrada
  const conexao = analise.perfil_cliente?.conexao_com_vendedor || 'regular'
  const viabilidade = analise.perfil_cliente?.viabilidade_fechamento_atual || 'media'
  const fechou = analise.tecnicas_fechamento?.resultado === 'fechou'
  const motivo = analise.motivo_nao_fechamento
  const categoria = analise.categoria_motivo
  const expRuim = analise.perfil_cliente?.experiencia_anterior_consorcio?.experiencia_foi === 'ruim'
  
  // Mapeamento de tipos para descrição amigável
  const tipoLabel: Record<string, string> = {
    sem_entrada: '💸 Sem entrada disponível',
    apenas_pesquisando: '🔍 Apenas pesquisando (sem urgência real)',
    indeciso: '🤔 Indeciso (tem perfil mas trava na decisão)',
    vai_analisar: '📊 Vai analisar (com entrada disponível)',
    decisor_com_freio: '👥 Precisa aval de cônjuge/sócio/gestor',
    cliente_trauma: '⚠️ Trauma com consórcio anterior',
    cliente_fechado_por_vendedor: '🔒 Cliente travou (vendedor não criou conexão)',
    cliente_naturalmente_fechado: '🤐 Perfil naturalmente reservado',
    pronto_pra_fechar: '🔥 Estava pronto pra fechar',
    sem_perfil_real: '❌ Sem perfil financeiro real',
  }
  
  let nota = `🎯 *ANÁLISE IA — ATENDIMENTO PRESENCIAL*`
  if (nomeCliente) nota += ` — *${nomeCliente}*`
  
  // PERFIL DO CLIENTE
  nota += `\n\n👤 *PERFIL DO CLIENTE*`
  nota += `\n• Tipo: ${tipoLabel[tipoCliente] || tipoCliente}`
  if (temEntrada !== null && temEntrada !== undefined) {
    nota += `\n• Tem entrada: ${temEntrada ? 'Sim ✅' : 'Não ❌'}`
    if (analise.perfil_cliente?.valor_entrada_disponivel) {
      nota += ` (${analise.perfil_cliente.valor_entrada_disponivel})`
    }
  }
  if (expRuim) {
    nota += `\n• ⚠️ Já teve experiência ruim com consórcio`
    const motivoExp = analise.perfil_cliente?.experiencia_anterior_consorcio?.motivo_experiencia_ruim
    if (motivoExp) nota += ` — ${motivoExp}`
  }
  nota += `\n• Conexão na conversa: ${conexao === 'boa' ? '🟢 Boa' : conexao === 'regular' ? '🟡 Regular' : '🔴 Fraca'}`
  if (conexao === 'fraca' && analise.perfil_cliente?.motivo_conexao_fraca === 'vendedor_nao_criou') {
    nota += ` (vendedor não criou rapport)`
  }
  
  // RESULTADO
  if (fechou) {
    nota += `\n\n✅ *FECHOU A VENDA!*`
  } else {
    nota += `\n\n❌ *NÃO FECHOU*`
    if (motivo) {
      nota += `\n• Motivo: ${motivo}`
    }
    if (categoria === 'vendedor') {
      nota += `\n• 🔍 *Categoria: Falha do vendedor*`
    } else if (categoria === 'cliente') {
      nota += `\n• 🔍 *Categoria: Limitação do cliente*`
    } else if (categoria === 'neutro') {
      nota += `\n• 🔍 *Categoria: Neutro (acompanhar)*`
    }
  }
  
  // FEEDBACK PRO PRÉ-VENDAS (só se categoria for vendedor ou neutro)
  if (categoria === 'vendedor' || categoria === 'neutro' || tipoCliente === 'decisor_com_freio' || tipoCliente === 'sem_entrada') {
    nota += `\n\n📞 *FEEDBACK PRO PRÉ-VENDAS*`
    
    if (tipoCliente === 'sem_entrada') {
      nota += `\n• Lead chegou SEM entrada real. Validar isso na qualificação.`
    } else if (tipoCliente === 'decisor_com_freio') {
      nota += `\n• Cliente precisa de aval de outra pessoa. Validar "você decide sozinho?" antes de marcar.`
    } else if (tipoCliente === 'apenas_pesquisando') {
      nota += `\n• Lead estava só pesquisando. Aprofundar urgência na qualificação.`
    } else if (categoria === 'vendedor') {
      nota += `\n• Lead chegou com perfil. Foi falha da execução do supervisor.`
    } else {
      nota += `\n• Acompanhar próxima abordagem desse perfil.`
    }
  }
  
  // FEEDBACK PRO SUPERVISOR (sempre que não fechou)
  if (!fechou) {
    nota += `\n\n🎓 *FEEDBACK PRO SUPERVISOR (${vendedor})*`
    
    const proximoPasso = analise.proximo_passo_sugerido
    if (proximoPasso) {
      nota += `\n• ${proximoPasso}`
    }
    
    // Pontos críticos resumidos (top 2)
    const pontosCriticos = analise.pontos_criticos || []
    const top2Criticos = pontosCriticos.slice(0, 2)
    if (top2Criticos.length > 0) {
      nota += `\n\n*Pontos a melhorar:*`
      top2Criticos.forEach((p: string) => {
        // Limpa o "CRÍTICO —" do início pra ficar mais curto
        const clean = p.replace(/^[⛔]?\s*CR[ÍI]TICO\s*[—-]\s*/i, '').replace(/^GRAVE\s*[—-]\s*/i, '')
        nota += `\n• ${clean}`
      })
    }
  }
  
  // SCORES (sempre)
  nota += `\n\n📊 *Score Geral: ${analise.score_geral || 0}/10*`
  
  // VIABILIDADE FUTURA
  if (!fechou && viabilidade === 'inviavel') {
    nota += `\n\n💡 *RECOMENDAÇÃO: Lead INVIÁVEL no momento. Marcar adequadamente no Kommo.*`
  } else if (!fechou && viabilidade === 'alta') {
    nota += `\n\n💡 *Lead com BOM POTENCIAL. Vale follow-up estruturado.*`
  }
  
  nota += `\n\n_Gerado automaticamente — Vendedor: ${vendedor}_`
  
  return nota
}

export async function POST(request: Request) {
  const supabase = createServiceClient()
  let atendimentoId: string | null = null
  
  try {
    console.log("[v0] Processar POST iniciado")
    const body = await request.json()
    atendimentoId = body.atendimentoId
    const audioUrl = body.audioUrl
    const audioParts: string[] = Array.isArray(body.audioParts) ? body.audioParts.filter(Boolean) : []
    const isRetorno = body.isRetorno || false

    console.log("[v0] Body recebido:", { atendimentoId, isRetorno, audioUrl: audioUrl?.substring(0, 50) })

    if (!atendimentoId || !audioUrl) {
      console.error("[v0] Dados incompletos - atendimentoId:", atendimentoId, "audioUrl:", !!audioUrl)
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // 1. Buscar dados do atendimento
    console.log("[v0] Buscando dados do atendimento:", atendimentoId)
    const { data: atendimento } = await supabase
      .from("atendimentos")
      .select("kommo_id, nome_lead, responsavel, equipe, atendimento_original_id")
      .eq("id", atendimentoId)
      .single()
    
    console.log("[v0] Atendimento encontrado:", atendimento?.nome_lead)
    console.log("[v0] É retorno de gravação?", isRetorno)

    // 2. Transcrever com Deepgram (3 tentativas)
    console.log("[v0] Iniciando Deepgram...")
    const transcricao = await withRetry(
      () => (audioParts.length > 1 ? transcreverAudioPartes(audioParts) : transcreverAudio(audioUrl)),
      3,
      2000,
      "Deepgram transcricao"
    )

    console.log("[v0] Transcricao completa:", transcricao?.substring(0, 100))

    if (!transcricao) {
      console.error("[v0] Deepgram falhou - audio sem fala ou microfone mudo")
      // VOLTA para aguardando para poder tentar gravar novamente
      // NAO marca como erro permanente
      await supabase
        .from("atendimentos")
        .update({ 
          status: "aguardando", 
          gravando: false,
          gravando_por: null,
          resumo: "Audio sem fala detectada. Verifique o microfone e grave novamente.",
          updated_at: new Date().toISOString() 
        })
        .eq("id", atendimentoId)
      return NextResponse.json({ 
        error: "Audio sem fala detectada. Verifique se o microfone esta funcionando e grave novamente.",
        canRetry: true 
      }, { status: 400 })
    }

    // 3. Analisar com Claude (3 tentativas) - use prompt diferente se for retorno
    // Se for retorno, passa os dados do atendimento original como contexto
    console.log("[v0] Iniciando Claude...")
    const analise = await withRetry(
      () => analisarComClaude(transcricao, isRetorno, isRetorno ? atendimento : null),
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
    console.log("[v0] Salvando resultados no Supabase - isRetorno:", isRetorno)
    
    // Se for retorno, salva nos campos de retorno; senão, salva nos campos normais
    const updatePayload: any = isRetorno ? {
      retorno_transcricao: transcricao,
      retorno_resumo: analise?.resumo || null,
      retorno_fechou: analise?.tecnicas_fechamento?.resultado === "fechou" || false,
      retorno_data: new Date().toISOString(),
      gravando: false,
      gravando_por: null,
      updated_at: new Date().toISOString(),
    } : {
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
      gravando: false,
      gravando_por: null,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from("atendimentos")
      .update(updatePayload)
      .eq("id", atendimentoId)

    if (updateError) {
      console.error("[v0] Erro ao atualizar atendimento no Supabase:", updateError)
      throw new Error(`Erro ao salvar resultados: ${updateError.message}`)
    }
    console.log("[v0] Atendimento salvo no Supabase com sucesso")

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
    console.error("[v0] ERRO CRITICO no processamento:", errorMsg, error)

    // SO marca como erro se for falha CRITICA (Deepgram, Claude, banco de dados, transcricao)
    // Se o atendimento ja foi salvo com analise, nao sobrescrever com status "erro"
    if (atendimentoId) {
      try {
        const supabaseErr = createServiceClient()
        
        // Verificar se ja foi salvo com dados de analise
        const { data: check } = await supabaseErr
          .from("atendimentos")
          .select("resumo, status")
          .eq("id", atendimentoId)
          .single()
        
        // Se ja tem resumo salvo, significa que o processamento funcionou
        // Nao marcar como erro - deixar como "concluido"
        if (!check?.resumo) {
          // SO marca como erro se nao tem nada salvo ainda
          await supabaseErr
            .from("atendimentos")
            .update({ 
              status: "erro",
              resumo: `Erro no processamento: ${errorMsg}`,
              updated_at: new Date().toISOString() 
            })
            .eq("id", atendimentoId)
          console.log("[v0] Atendimento marcado como ERRO (critico):", errorMsg)
        } else {
          console.log("[v0] Atendimento ja foi salvo com analise, mantendo status concluido")
        }
      } catch (dbError) {
        console.error("[v0] Erro ao verificar/salvar erro no banco:", dbError)
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

// Transcreve gravação em PARTES (gravador blindado): baixa, concatena e envia o binário
async function transcreverAudioPartes(parts: string[]): Promise<string | null> {
  if (!DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY nao configurada")
  console.log("[v0] Baixando", parts.length, "partes para concatenar...")
  const buffers: Buffer[] = []
  for (const url of parts) {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`Falha ao baixar parte: ${url.slice(-30)}`)
    buffers.push(Buffer.from(await r.arrayBuffer()))
  }
  const audio = Buffer.concat(buffers)
  console.log("[v0] Audio concatenado:", (audio.length / 1024 / 1024).toFixed(1), "MB — enviando ao Deepgram")
  const response = await fetch(
    "https://api.deepgram.com/v1/listen?language=pt-BR&model=nova-2&diarize=true&punctuate=true&smart_format=true",
    { method: "POST", headers: { Authorization: `Token ${DEEPGRAM_API_KEY}`, "Content-Type": "audio/webm" }, body: audio }
  )
  if (!response.ok) throw new Error(`Deepgram HTTP ${response.status}: ${await response.text()}`)
  const data = await response.json()
  const transcricao = data?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript
    || data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || null
  if (!transcricao || transcricao.trim().length === 0) throw new Error("Transcricao vazia retornada pelo Deepgram")
  return transcricao
}

// ─── Claude ────────────────────────────────────────────────────────────��──────
async function analisarComClaude(transcricao: string, isRetorno: boolean = false, atendimentoAnterior: any = null): Promise<any | null> {
  console.log("[v0] Claude analisarComClaude iniciando")
  console.log("[v0] Claude transcricao length:", transcricao.length)
  console.log("[v0] Claude isRetorno:", isRetorno)
  
  if (!ANTHROPIC_API_KEY) {
    console.error("[v0] Claude ANTHROPIC_API_KEY nao configurada!")
    throw new Error("ANTHROPIC_API_KEY nao configurada")
  }

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
    console.log("[v0] Claude client criado")

    // Selecionar prompt baseado em tipo de atendimento
    let promptSelecionado = PROMPT_ANALISE
    if (isRetorno && atendimentoAnterior) {
      console.log("[v0] Claude usando PROMPT_ANALISE_RETORNO")
      const contextoAnterior = `
Score anterior: ${atendimentoAnterior.score_geral}/10
Motivo de não fechamento anterior: ${atendimentoAnterior.motivo_nao_fechamento || "N/A"}
Pontos críticos identificados: ${(atendimentoAnterior.pontos_criticos || []).join("; ") || "Nenhum"}
Recomendação anterior: ${atendimentoAnterior.feedback_coaching || "Nenhuma"}
`
      promptSelecionado = PROMPT_ANALISE_RETORNO.replace("{contexto_anterior}", contextoAnterior)
    }

    // Usar streaming para evitar timeout em operacoes longas (thinking pode demorar)
    console.log("[v0] Claude iniciando stream com thinking...")
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 28000,  // 16000 thinking + 12000 resposta JSON
      thinking: {
        type: "enabled",
        budget_tokens: 16000,
      },
      messages: [{ role: "user", content: promptSelecionado + transcricao }],
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

  // ETAPA 4: Usa a NOVA nota enxuta focada em pré-vendas + supervisor
  const notaKommoEnxuta = gerarNotaKommoEnxuta(analise, responsavel, nomeLead)
  
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
      body: JSON.stringify([{ note_type: "common", params: { text: notaKommoEnxuta } }]),
    }
  )

  if (!noteRes.ok) {
    const errText = await noteRes.text()
    throw new Error(`Kommo notes HTTP ${noteRes.status}: ${errText}`)
  }

  return true
}
