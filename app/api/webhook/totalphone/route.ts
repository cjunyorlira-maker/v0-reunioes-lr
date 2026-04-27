import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import Anthropic from "@anthropic-ai/sdk"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

// Mapeamento completo: ramal -> vendedor + equipe + kommo_user_id
const RAMAIS: Record<string, { 
  vendedor: string
  equipe: string
  kommo_user_id: number | null
}> = {
  "1000": { vendedor: "Leonardo Freitas",   equipe: "Samurais",    kommo_user_id: 9780139 },
  "1001": { vendedor: "Amanda Souza",       equipe: "TDM",         kommo_user_id: 12760048 },
  "1002": { vendedor: "Ana Beatriz",        equipe: "TDM",         kommo_user_id: 14964227 },
  "1003": { vendedor: "Bianca Isabela",     equipe: "TDM",         kommo_user_id: 13461616 },
  "1004": { vendedor: "Alexia Cunha",       equipe: "Gladiadores", kommo_user_id: 9776739 },
  "1005": { vendedor: "Lidiane Fonseca",    equipe: "Guerreiros",  kommo_user_id: 13583192 },
  "1006": { vendedor: "Rafaella Antunes",   equipe: "Guerreiros",  kommo_user_id: 13583188 },
  "1007": { vendedor: "Nicolas Moraes",     equipe: "Legado",      kommo_user_id: 12651456 },
  "1008": { vendedor: "Gabrielly Pereira",  equipe: "Legado",      kommo_user_id: 14964491 },
  "1009": { vendedor: "Lucas Dionisio",     equipe: "Lobos",       kommo_user_id: 10962508 },
  "1010": { vendedor: "João Victor",        equipe: "Samurais",    kommo_user_id: 14964623 },
  "1011": { vendedor: "Gisely Leal",        equipe: "Guerreiros",  kommo_user_id: 9776731 },
  "1012": { vendedor: "Emily Machado",      equipe: "TDM",         kommo_user_id: 10783760 },
  "1013": { vendedor: "Isabelly",           equipe: "Lobos",       kommo_user_id: 15059511 },
  "1014": { vendedor: "Ana Gabrielly",      equipe: "Lobos",       kommo_user_id: 14967571 },
  "1015": { vendedor: "João Lucas",         equipe: "TDM",         kommo_user_id: 14964211 },
  "1016": { vendedor: "Willy Santana",      equipe: "TDM",         kommo_user_id: 15024963 },
  "1017": { vendedor: "Nathan Caue",        equipe: "Gladiadores", kommo_user_id: 9780891 },
  "1018": { vendedor: "Yuri Ryan",          equipe: "Elite",       kommo_user_id: 9776499 },
  "1019": { vendedor: "Evelyn Rodrigues",   equipe: "Lobos",       kommo_user_id: null },
  "1020": { vendedor: "Janaina Dantas",     equipe: "Legado",      kommo_user_id: 9780703 },
  "1021": { vendedor: "Alex Negreiros",     equipe: "Lobos",       kommo_user_id: 9780871 },
  "1022": { vendedor: "Kleinver Seabra",    equipe: "TDM",         kommo_user_id: 9780887 },
  "1023": { vendedor: "Brayan",             equipe: "Legado",      kommo_user_id: 10780300 },
  "1024": { vendedor: "Rogério Martins",    equipe: "Gladiadores", kommo_user_id: null },
  "9999": { vendedor: "Suporte TotalPhone", equipe: "Admin",       kommo_user_id: null },
}

// Normaliza telefone removendo DDI e zeros extras
function normalizarTelefone(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  // Remove DDI 55 se tiver
  if (digits.startsWith('55') && digits.length > 11) return digits.slice(2)
  // Remove 0 inicial
  if (digits.startsWith('0') && digits.length > 10) return digits.slice(1)
  return digits
}

// Extrai o ramal do numero de origem ou destino
function extrairRamal(numero: string): string | null {
  if (!numero) return null
  
  // Remove o prefixo "grupolr-" se existir
  const cleaned = numero.replace(/^grupolr-/i, "")
  
  // Se o numero tem 4 digitos e comeca com 10, é um ramal
  if (/^10\d{2}$/.test(cleaned)) {
    return cleaned
  }
  
  // Se tem mais digitos, tenta extrair os ultimos 4
  const match = cleaned.match(/10\d{2}$/)
  if (match) return match[0]
  
  return null
}

// Detecta status da ligacao pela transcricao
function detectarStatusPorTranscricao(
  transcricao: string | null,
  duracao: number,
  sipCode: string | number | null = null
): string {
  // Se não tem transcrição, decide pela duração e sip_code
  if (!transcricao || transcricao.trim().length === 0) {
    if (sipCode) {
      const sip = typeof sipCode === 'string' ? parseInt(sipCode) : sipCode
      if (sip === 200) return duracao > 0 ? 'atendida' : 'cancelada'
      if (sip === 486) return 'ocupado'
      if (sip === 487) return 'cancelada'
      if (sip === 480) return 'fora_area'
      if (sip === 404) return 'numero_errado'
      if (sip === 408) return 'nao_atendida'
      if (sip === 503) return 'fora_area'
    }
    return duracao > 0 ? 'atendida' : 'nao_atendida'
  }
  
  const texto = transcricao.toLowerCase()
  
  const padroesCaixaPostal = [
    'caixa postal', 'deixe sua mensagem', 'deixe uma mensagem',
    'após o sinal', 'apos o sinal', 'após o bipe', 'apos o bipe',
    'voicemail', 'grave sua mensagem', 'caixa de mensagens',
    'gravar sua mensagem', 'deixe seu recado',
  ]
  if (padroesCaixaPostal.some(p => texto.includes(p))) return 'caixa_postal'
  
  const padroesForaArea = [
    'fora da área de cobertura', 'fora da area de cobertura',
    'fora de área', 'fora de area', 'desligado ou fora', 'desligado, fora',
    'momentaneamente fora', 'não pode ser completada', 'nao pode ser completada',
    'não está disponível', 'nao esta disponivel', 'temporariamente fora',
  ]
  if (padroesForaArea.some(p => texto.includes(p))) return 'fora_area'
  
  const padroesOcupado = [
    'linha está ocupada', 'linha esta ocupada', 'número ocupado',
    'numero ocupado', 'está ocupado', 'esta ocupado', 'tente novamente',
  ]
  if (padroesOcupado.some(p => texto.includes(p))) return 'ocupado'
  
  const padroesNumeroErrado = [
    'número não existe', 'numero nao existe', 'número inexistente',
    'numero inexistente', 'número inválido', 'numero invalido',
    'não confere com nenhum', 'nao confere com nenhum',
    'não foi reconhecido', 'nao foi reconhecido',
  ]
  if (padroesNumeroErrado.some(p => texto.includes(p))) return 'numero_errado'
  
  if (duracao < 5 && transcricao.length < 30) return 'cancelada'
  
  return 'atendida'
}

// Detecta tipo de ligação pela transcrição
function detectarTipoLigacao(transcricao: string): string {
  if (!transcricao) return 'desconhecido'
  const texto = transcricao.toLowerCase()
  
  if (['confirmar a reunião', 'confirmar a reuniao', 'confirmar nossa reunião', 
       'só pra confirmar', 'so pra confirmar', 'amanhã às', 'amanha as',
       'hoje às', 'hoje as', 'horário marcado', 'horario marcado'
      ].some(p => texto.includes(p))) return 'confirmacao_reuniao'
  
  if (['tentei falar com você', 'tentei falar com voce', 'não consegui falar',
       'nao consegui falar', 'mandei mensagem', 'enviei whatsapp',
       'falamos antes', 'conversamos antes', 'sumiu', 'não respondeu',
       'voltando aqui'
      ].some(p => texto.includes(p))) return 'retorno'
  
  if (['recebeu meu whats', 'recebeu meu whatsapp', 'enviei pelo whats',
       'mandei pelo whats', 'mandei pelo whatsapp', 'meu whatsapp', 'pelo zap'
      ].some(p => texto.includes(p))) return 'ativacao_whatsapp'
  
  if (texto.includes('simulador') && (texto.includes('facebook') || texto.includes('face'))) {
    return 'simulador_facebook'
  }
  if (texto.includes('simulador') || texto.includes('simulação no site') || 
      texto.includes('simulou no site')) {
    return 'simulador_empresa'
  }
  if (['grupo do facebook', 'grupo do face', 'no grupo', 'vi no grupo', 'do grupo'
      ].some(p => texto.includes(p))) return 'facebook_grupos'
  
  return 'abordagem_inicial'
}

// Baixa áudio do TotalPhone via proxy Railway (evita bloqueio de IP)
// Nova função: busca dados da API oficial com retry automático
async function buscarEBaixarAudioTotalPhone(
  callid: string, 
  dataLigacao: string,
  maxTentativas: number = 5
): Promise<{
  audioBuffer: Buffer | null
  transcricao: string | null
  resumo: string | null
  duracao: number
  sipCode: string | number | null
}> {
  // Intervalos crescentes: 15s, 30s, 45s, 60s, 90s
  const intervalos = [15000, 30000, 45000, 60000, 90000]
  
  for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
    try {
      // Aguarda antes de cada tentativa (exceto a primeira)
      if (tentativa > 0) {
        const delay = intervalos[tentativa - 1] || 90000
        console.log(`[TotalPhone] Tentativa ${tentativa + 1}/${maxTentativas} - aguardando ${delay / 1000}s...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        // Primeira tentativa: aguarda 10 segundos para a TotalPhone indexar
        console.log('[TotalPhone] Aguardando 10s para a TotalPhone indexar a chamada...')
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
      
      const dataApenas = dataLigacao.split(' ')[0]
      
      const apiUrl = new URL('https://45.170.138.80/suite/api/listar_historico_chamada')
      apiUrl.searchParams.append('chamada_id', callid)
      apiUrl.searchParams.append('data_inicial', dataApenas)
      apiUrl.searchParams.append('hora_inicial', '00:00')
      apiUrl.searchParams.append('data_final', dataApenas)
      apiUrl.searchParams.append('hora_final', '23:59')
      apiUrl.searchParams.append('retorna_transcricao', 'sim')
      apiUrl.searchParams.append('retorna_resumo', 'sim')
      
      console.log(`[TotalPhone] Buscando chamada na API (tentativa ${tentativa + 1}):`, callid)
      
      const apiResponse = await fetch(apiUrl.toString(), {
        headers: {
          'usuario': process.env.TOTALPHONE_USUARIO!,
          'token': process.env.TOTALPHONE_TOKEN!,
        },
      })
      
      if (!apiResponse.ok) {
        console.error('[TotalPhone] API retornou erro:', apiResponse.status)
        continue
      }
      
      const data = await apiResponse.json()
      const chamada = data?.dados?.[0]
      
      if (!chamada) {
        console.log(`[TotalPhone] Chamada ainda não indexada (tentativa ${tentativa + 1})`)
        continue
      }
      
      console.log('[TotalPhone] ✅ Chamada encontrada! sip_code:', chamada.sip_code, 'duração:', chamada.duracao_real)
      
      // Calcula duração
      const duracaoStr = chamada.duracao_real || '00:00:00'
      const tempoLimpo = duracaoStr.split(',')[0]
      const [h, m, s] = tempoLimpo.split(':').map(Number)
      const duracao = (h * 3600) + (m * 60) + s
      
      const linkGravacao = Array.isArray(chamada.link_gravacao) 
        ? chamada.link_gravacao[0] 
        : chamada.link_gravacao
      
      const transcricaoAPI = chamada.transcricao?.trim() || null
      const resumoAPI = chamada.resumo?.trim() || null
      
      // Se tem transcrição da API, usa direto
      if (transcricaoAPI) {
        console.log('[TotalPhone] Usando transcrição da API TotalPhone')
        return { audioBuffer: null, transcricao: transcricaoAPI, resumo: resumoAPI, duracao, sipCode: chamada.sip_code }
      }
      
      // Se a chamada foi atendida (duracao > 0) mas não tem áudio ainda, continua tentando
      if (duracao > 0 && !linkGravacao) {
        console.log('[TotalPhone] Chamada atendida mas áudio ainda não disponível, tentando de novo...')
        continue
      }
      
      // Se não tem link de gravação (chamada não atendida), retorna sem áudio
      if (!linkGravacao) {
        console.log('[TotalPhone] Chamada sem áudio (não atendida)')
        return { audioBuffer: null, transcricao: null, resumo: null, duracao, sipCode: chamada.sip_code }
      }
      
      // Baixa o áudio
      console.log('[TotalPhone] Baixando áudio pelo link da API...')
      const audioResponse = await fetch(linkGravacao)
      
      if (!audioResponse.ok) {
        console.error('[TotalPhone] Erro ao baixar áudio:', audioResponse.status)
        return { audioBuffer: null, transcricao: null, resumo: null, duracao, sipCode: chamada.sip_code }
      }
      
      const arrayBuffer = await audioResponse.arrayBuffer()
      const audioBuffer = Buffer.from(arrayBuffer)
      
      if (audioBuffer.length < 1024) {
        console.error('[TotalPhone] Áudio muito pequeno:', audioBuffer.length, 'bytes - ainda processando')
        // Tenta novamente
        continue
      }
      
      console.log('[TotalPhone] ✅ Áudio baixado:', audioBuffer.length, 'bytes')
      return { audioBuffer, transcricao: null, resumo: null, duracao, sipCode: chamada.sip_code }
      
    } catch (error: any) {
      console.error(`[TotalPhone] Erro tentativa ${tentativa + 1}:`, error.message)
    }
  }
  
  console.error('[TotalPhone] ❌ Todas as tentativas falharam')
  return { audioBuffer: null, transcricao: null, resumo: null, duracao: 0, sipCode: null }
}

// Transcreve audio com Deepgram (aceita Buffer ou URL)
async function transcreverComDeepgram(audioInput: Buffer | string): Promise<string | null> {
  if (!DEEPGRAM_API_KEY) {
    console.log("[TotalPhone] DEEPGRAM_API_KEY não configurada, pulando transcrição")
    return null
  }

  try {
    const url = "https://api.deepgram.com/v1/listen?model=nova-2&language=pt-BR&smart_format=true&diarize=true"
    const headers = {
      "Authorization": `Token ${DEEPGRAM_API_KEY}`,
    }

    let body: any

    // Se for Buffer (arquivo de áudio), envia direto no body
    if (Buffer.isBuffer(audioInput)) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "audio/wav",
        },
        body: audioInput,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[TotalPhone] Deepgram error:", response.status, errorText)
        return null
      }

      const data = await response.json()
      return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || null
    } else {
      // Se for string (URL), envia como JSON
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: audioInput }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[TotalPhone] Deepgram error:", response.status, errorText)
        return null
      }

      const data = await response.json()
      return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || null
    }
  } catch (error) {
    console.error("[TotalPhone] Erro na transcrição:", error)
    return null
  }
}

// Analisa com Claude - VERSÃO MESCLADA COMPLETA
async function analisarComClaude(
  transcricao: string,
  tipoDetectado: string,
  duracao: number,
  vendedorNome: string
): Promise<any> {
  try {
    const anthropic = new Anthropic()
    
    const prompt = `Você é um especialista em análise de ligações comerciais de uma agência de crédito imobiliário (LR Multimarcas), formado no método Alan Caçula de vendas consultivas.

CONTEXTO DESTA LIGAÇÃO:
- Vendedor: ${vendedorNome}
- Tipo identificado pela detecção automática: ${tipoDetectado}
- Duração: ${duracao} segundos

CONTEXTO DO NEGÓCIO:
A empresa capta leads de três fontes principais:

1. FACEBOOK/GRUPOS — leads vinculados a anúncios de imóveis, às vezes com imagens ilustrativas. O cliente pode ter interesse no imóvel específico ou nas condições de financiamento. Não tem dados prévios do cliente.

2. SIMULADOR EMPRESA — leads que já preencheram uma simulação no site com dados reais (valor do imóvel, entrada, parcela desejada). São leads pré-aquecidos com informações concretas que o vendedor JÁ TEM antes de ligar.

3. SIMULADOR FACEBOOK — leads que vieram de anúncio mas passaram por um formulário/simulação simplificada. Têm algumas informações mas menos qualificados que o simulador empresa.

O objetivo de TODA ligação é:
- Fazer boa abordagem e criar conexão
- Descobrir os 4 pilares de qualificação
- Apresentar simulações e condições concretas de crédito
- Marcar reunião — preferencialmente PRESENCIAL, online apenas se não tiver outro jeito

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OS 3 SEGREDOS DO MÉTODO (FUNDAMENTAIS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Ser CONSULTOR, não vendedor — orientar, não empurrar
2. Ajudar o cliente a DECIDIR — não forçar a venda
3. OUVIR mais que falar — proporção ideal 70/30 (cliente fala 70%, vendedor 30%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROTEIRO IDEAL — 7 PASSOS (Método Alan Caçula)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSO 1 — APRESENTAÇÃO COM RAPPORT: Identificar o ritmo do cliente, criar conexão, pedir permissão para fazer perguntas.
PASSO 2 — QUALIFICAÇÃO: Coletar os 4 pilares. Ouvir mais que falar.
PASSO 3 — TRANSIÇÃO PARA OFERTA: "Deixa eu analisar e voltar com uma condição especial para você."
PASSO 4 — APRESENTAR BENEFÍCIOS CONCRETOS: Números reais, comparativos, exemplos do perfil do cliente.
PASSO 5 — ENTENDER ESTÁGIO DO CLIENTE: Onde está na jornada de decisão? Pesquisando, comparando, decidido?
PASSO 6 — CONTORNAR OBJEÇÕES: Trabalhar confiança em 4 níveis: em você, na empresa, no produto, no perfil dele.
PASSO 7 — FECHAMENTO / MARCAR REUNIÃO: Conduzir com duas opções de horário, contexto concreto.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OS 4 PILARES DE QUALIFICAÇÃO — OBRIGATÓRIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Em TODA ligação o vendedor deve descobrir:
1. CRÉDITO — qual o valor do imóvel que busca?
2. PARCELA — quanto consegue pagar por mês?
3. ENTRADA — tem entrada disponível? Quanto?
4. MOMENTO — está pronto para comprar agora ou ainda está pesquisando?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRINCÍPIO FUNDAMENTAL DAS OBJEÇÕES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Toda objeção é SINAL DE INTERESSE. O cliente não está dizendo NÃO — está dizendo "ainda não confio em você o suficiente."
REGRA DE OURO: Responda toda objeção com PERGUNTA, NUNCA com contra-ataque. Após perguntar, CALE-SE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BIBLIOTECA DE OBJEÇÕES — Significado Real e Resposta Ideal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"PRECISO PENSAR" → Significado: dúvidas não esclarecidas. Resposta ideal: "No que exatamente está em dúvida?"

"NÃO TENHO DINHEIRO" → Significado: barreira percebida. Resposta ideal: "Além disso, tem algo mais que te impede? Se a parcela coubesse, faria sentido?"

"TENHO PRESSA / FINANCIAMENTO MAIS RÁPIDO" → Significado: não acredita em contemplação rápida. Resposta ideal: "Qual prazo seria bom? Tem entrada para lance? Já comparou custo total do financiamento?"

"CONCORRÊNCIA TEM TAXA/PREÇO MENOR" → Significado: não fez cálculos comparativos. Resposta ideal: "Você procura taxa menor ou melhor custo total? Vamos fazer contas?"

"PRECISO FALAR COM ESPOSA/SÓCIO" → Significado: decisor não está na conversa. Resposta ideal: "Quando podemos conversar os 3? Hoje à noite ou amanhã?"

"NÃO É PARA MIM AGORA / VOU ESPERAR" → Significado: falta urgência, medo. Resposta ideal: "Esperar o quê especificamente? De qual lado você quer estar?"

"SUA EMPRESA TEM RECLAMAÇÕES" → Significado: insegurança, falta confiança. Resposta ideal: "Qual empresa não tem? O que importa é COMO tratamos quem reclama."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPOS DE LIGAÇÃO DETALHADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TIPO 1 — FACEBOOK/GRUPOS: Lead de anúncio. Sem dados prévios. Avalie: abertura profissional, qualificação dos 4 pilares, abordagem com valores concretos, condução para reunião.

TIPO 2 — SIMULADOR EMPRESA: Lead com simulação completa. Vendedor TEM crédito/parcela/entrada. Avalie: abertura personalizada com dados, validação dos pilares, foco no MOMENTO.

TIPO 3 — SIMULADOR FACEBOOK: Lead com formulário simplificado. Critérios intermediários entre Tipo 1 e 2.

TIPO 4 — ATIVAÇÃO WHATSAPP: Ligação para avisar envio de mensagem. Deve ser curta, objetiva, criando curiosidade.

TIPO 5 — CONFIRMAÇÃO DE REUNIÃO: Confirmar reunião já marcada com entusiasmo, reforçando valor. Rebater objeções de desculpas.

TIPO 6 — RETORNO / FOLLOW-UP: Lead que já teve contato anterior. Trazer contexto, algo novo e concreto.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRÍTICO SE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ Terminou sem saber pelo menos 3 dos 4 pilares
⛔ Mais de 3 minutos falando sem buscar os pilares
⛔ Abriu ligação de simulador de forma genérica
⛔ Marcou reunião sem dar contexto concreto
⛔ Falou de crédito de forma vaga sem valores reais
⛔ Respondeu objeção com CONTRA-ATAQUE em vez de PERGUNTA (erro grave)
⛔ Não leu os sinais do cliente pelas respostas
⛔ Não identificou quem decide (cônjuge/sócio)
⛔ Falou mais do que ouviu (rompeu proporção 70/30)

RETORNE OBRIGATORIAMENTE JSON:
{
  "tipo_ligacao": "facebook_grupos|simulador_empresa|simulador_facebook|ativacao_whatsapp|confirmacao_reuniao|retorno",
  "score_geral": número 0-100,
  "score_abertura": número 0-100,
  "score_qualificacao": número 0-100,
  "score_abordagem_credito": número 0-100,
  "score_conducao_reuniao": número 0-100,
  "resumo_executivo": "3-4 linhas",
  "quatro_pilares": {
    "credito": "valor ou null",
    "parcela": "valor ou null",
    "entrada": "valor ou null",
    "momento": "imediato|medio_prazo|longo_prazo|indefinido",
    "pilares_coletados": número 0-4,
    "tem_perfil": true/false/null
  },
  "perfil_lead": {
    "localizacao": "string ou null",
    "nivel_interesse": "alto|medio|baixo|indefinido",
    "tipo_reuniao_ideal": "presencial|online|indefinido",
    "sinais_positivos": ["array"],
    "sinais_negativos": ["array"]
  },
  "reuniao": {
    "marcou": true/false,
    "tipo": "presencial|online|null",
    "tentou_presencial_primeiro": true/false,
    "marcou_com_contexto_concreto": true/false,
    "rebateu_objecoes": true/false,
    "quantidade_tentativas": número
  },
  "abordagem_credito": {
    "apresentou_valores_concretos": true/false,
    "usou_simulacao": true/false,
    "houve_negociacao": true/false,
    "foi_generico": true/false
  },
  "qualificacao": {
    "qualificou_antes_de_falar_muito": true/false,
    "leu_sinais_do_cliente": true/false,
    "identificou_lead_ruim_a_tempo": true/false/null,
    "proporcao_falar_ouvir": "ouviu_mais|equilibrado|falou_mais"
  },
  "pontos_positivos": ["array"],
  "pontos_criticos": ["array"],
  "objecoes_cliente": [
    {
      "objecao": "frase exata",
      "significado_real": "o que representa",
      "resposta_vendedor": "o que disse",
      "resposta_ideal": "como deveria ter respondido (com pergunta)",
      "respondeu_com_pergunta": true/false,
      "eficaz": true/false
    }
  ],
  "alertas_criticos": ["array"],
  "proximo_passo_sugerido": "string",
  "feedback_vendedor": "Coaching em 5 partes: 1) o que fez bem 2) cada ponto crítico com exemplo 3) como contornar objeções 4) script para primeiros 2 minutos 5) o que dizer no próximo contato",
  "cliente_interessado": true/false,
  "agendou_retorno": true/false
}

IMPORTANTE:
- Speaker 0 = Vendedor, Speaker 1 = Cliente
- Identifique o tipo automaticamente pelo contexto
- Os 4 pilares são o coração da análise
- Toda objeção: pergunta = correto, contra-ataque = erro
- Responda APENAS com JSON válido

TRANSCRIÇÃO DA LIGAÇÃO:
${transcricao}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') return null

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('[Claude] Erro na análise:', error)
    return null
  }
}

// Busca lead no Kommo pelo telefone (testa várias variações do número)
async function buscarLeadKommoPorTelefone(telefone: string): Promise<{
  lead_id: number | null
  contact_id: number | null
  responsible_user_id: number | null
}> {
  if (!KOMMO_ACCESS_TOKEN) return { lead_id: null, contact_id: null, responsible_user_id: null }
  
  // Limpa o telefone
  const cleaned = telefone.replace(/\D/g, '')
  
  // Gera variações para busca (Kommo é exigente com formato)
  const variacoes = new Set<string>()
  variacoes.add(cleaned)
  
  // Sem DDI
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    variacoes.add(cleaned.slice(2))
  }
  
  // Com DDI
  if (!cleaned.startsWith('55') && cleaned.length >= 10) {
    variacoes.add('55' + cleaned)
  }
  
  // Sem 9 (celular antigo)
  if (cleaned.length === 11) {
    variacoes.add(cleaned.slice(0, 2) + cleaned.slice(3))
  }
  
  // Com 9 (celular novo)
  if (cleaned.length === 10) {
    variacoes.add(cleaned.slice(0, 2) + '9' + cleaned.slice(2))
  }
  
  // Últimos 8 dígitos (busca mais ampla)
  if (cleaned.length >= 8) {
    variacoes.add(cleaned.slice(-8))
  }
  
  console.log('[Kommo] Buscando lead com variações:', Array.from(variacoes))
  
  for (const numero of variacoes) {
    try {
      const url = `https://crm2lrmultimarcascom.kommo.com/api/v4/contacts?query=${numero}&with=leads`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${KOMMO_ACCESS_TOKEN}`,
        },
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      const contacts = data?._embedded?.contacts || []
      
      if (contacts.length > 0) {
        const contact = contacts[0]
        const leads = contact?._embedded?.leads || []
        
        // Pega o primeiro lead (mais recente)
        const lead = leads[0]
        
        console.log('[Kommo] ✅ Lead encontrado:', {
          contact_id: contact.id,
          lead_id: lead?.id || null,
          responsible_user_id: contact.responsible_user_id,
        })
        
        return {
          contact_id: contact.id,
          lead_id: lead?.id || null,
          responsible_user_id: contact.responsible_user_id || null,
        }
      }
    } catch (err) {
      console.error('[Kommo] Erro buscando lead:', err)
    }
  }
  
  console.log('[Kommo] ❌ Nenhum lead encontrado para o telefone')
  return { lead_id: null, contact_id: null, responsible_user_id: null }
}

// Envia chamada para o Kommo
async function enviarChamadaKommo(
  callid: string,
  telefone: string,
  duracao: number,
  status: string,
  responsibleUserId: number | null,
  leadId: number | null,
  contactId: number | null = null,
  resumoIA: string | null = null
): Promise<string | null> {
  if (!KOMMO_ACCESS_TOKEN) {
    console.log("[TotalPhone] KOMMO_ACCESS_TOKEN não configurado")
    return null
  }

  try {
    let callStatus = 4 // default: conversou
    if (status === 'atendida') callStatus = 4
    else if (status === 'caixa_postal') callStatus = 1
    else if (status === 'nao_atendida') callStatus = 3
    else if (status === 'cancelada') callStatus = 3
    else if (status === 'ocupado') callStatus = 6
    else if (status === 'numero_errado') callStatus = 5
    else if (status === 'fora_area') callStatus = 3
    
    const audioPublicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/audio/${callid}`
    
    const callData: any = {
      uniq: callid,
      phone: telefone,
      source: 'TotalPhone',
      created_at: Math.floor(Date.now() / 1000),
      duration: duracao,
      call_status: callStatus,
      direction: 'outbound',
      link: audioPublicUrl,
    }
    
    if (resumoIA) {
      callData.call_result = resumoIA.substring(0, 250)
    } else if (status === 'caixa_postal') {
      callData.call_result = 'Caixa postal'
    } else if (status === 'nao_atendida') {
      callData.call_result = 'Cliente não atendeu'
    } else if (status === 'fora_area') {
      callData.call_result = 'Fora de área / desligado'
    } else if (status === 'ocupado') {
      callData.call_result = 'Ocupado'
    }
    
    if (responsibleUserId) {
      callData.responsible_user_id = responsibleUserId
      callData.created_by = responsibleUserId
    }
    
    // Kommo vincula automaticamente pelo phone:
    // - Se tem 1 lead ativo → adiciona no lead
    // - Se tem só contato → adiciona no contato
    // - Se tem múltiplos leads → adiciona no contato
    if (leadId) {
      console.log('[Kommo] Telefone tem lead ativo, Kommo vai vincular ao lead automaticamente:', leadId)
    } else if (contactId) {
      console.log('[Kommo] Sem lead ativo, Kommo vai vincular ao contato automaticamente:', contactId)
    }
    
    console.log('[Kommo] Enviando chamada:', { callid, phone: telefone, callStatus, leadId, contactId, responsibleUserId })
    
    const response = await fetch(
      'https://crm2lrmultimarcascom.kommo.com/api/v4/calls',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KOMMO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([callData]),
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Kommo] Erro ao enviar chamada:', response.status, errorText)
      return null
    }
    
    const result = await response.json()
    const kommoCallId = result?._embedded?.calls?.[0]?.id || null
    console.log('[Kommo] ✅ Chamada criada:', kommoCallId)
    
    return kommoCallId
  } catch (error) {
    console.error('[Kommo] Erro ao enviar chamada:', error)
    return null
  }
}

// Envia nota de analise para o Kommo
async function enviarNotaKommo(leadId: string | number, analise: any): Promise<void> {
  if (!KOMMO_ACCESS_TOKEN || !leadId) return

  try {
    const pilares = analise.quatro_pilares || {}
    const perfil = analise.perfil_lead || {}
    const reuniao = analise.reuniao || {}
    const credito = analise.abordagem_credito || {}
    const qualific = analise.qualificacao || {}
    const objecoes = analise.objecoes_cliente || []
    const alertas = analise.alertas_criticos || []
    
    // Emoji por tipo de ligação
    const emojiTipo: Record<string, string> = {
      'facebook_grupos': '📱',
      'simulador_empresa': '🧮',
      'simulador_facebook': '🧮',
      'ativacao_whatsapp': '💬',
      'confirmacao_reuniao': '📅',
      'retorno': '🔄',
    }
    const emoji = emojiTipo[analise.tipo_ligacao] || '📞'
    
    // Emoji do nível de interesse
    const interesseEmoji = perfil.nivel_interesse === 'alto' ? '🔥' : 
                           perfil.nivel_interesse === 'medio' ? '🌤️' : 
                           perfil.nivel_interesse === 'baixo' ? '❄️' : '❓'
    
    // Emoji da proporção falar/ouvir
    const proporcaoEmoji = qualific.proporcao_falar_ouvir === 'ouviu_mais' ? '👂' :
                           qualific.proporcao_falar_ouvir === 'equilibrado' ? '⚖️' : '🗣️'
    
    let nota = `${emoji} ANÁLISE IA — ${analise.tipo_ligacao?.toUpperCase().replace(/_/g, ' ') || 'LIGAÇÃO'}

📝 RESUMO:
${analise.resumo_executivo || 'Sem resumo'}

📊 SCORES (0-100):
• Geral: ${analise.score_geral || 0}
• Abertura: ${analise.score_abertura || 0}
• Qualificação: ${analise.score_qualificacao || 0}
• Abordagem Crédito: ${analise.score_abordagem_credito || 0}
• Condução Reunião: ${analise.score_conducao_reuniao || 0}

🎯 4 PILARES (${pilares.pilares_coletados || 0}/4):
${pilares.credito ? '✅' : '❌'} Crédito: ${pilares.credito || 'não coletado'}
${pilares.parcela ? '✅' : '❌'} Parcela: ${pilares.parcela || 'não coletado'}
${pilares.entrada ? '✅' : '❌'} Entrada: ${pilares.entrada || 'não coletado'}
${pilares.momento && pilares.momento !== 'indefinido' ? '✅' : '❌'} Momento: ${pilares.momento || 'indefinido'}
${pilares.tem_perfil === true ? '✅ TEM PERFIL' : pilares.tem_perfil === false ? '❌ SEM PERFIL' : '❓ Perfil indefinido'}

👤 PERFIL DO LEAD:
${interesseEmoji} Nível de interesse: ${perfil.nivel_interesse || 'indefinido'}
• Localização: ${perfil.localizacao || 'não informada'}
• Reunião ideal: ${perfil.tipo_reuniao_ideal || 'indefinido'}`

    if (perfil.sinais_positivos?.length) {
      nota += `\n\n✨ Sinais positivos:`
      perfil.sinais_positivos.forEach((s: string) => {
        nota += `\n  • ${s}`
      })
    }
    if (perfil.sinais_negativos?.length) {
      nota += `\n\n⚠️ Sinais negativos:`
      perfil.sinais_negativos.forEach((s: string) => {
        nota += `\n  • ${s}`
      })
    }

    nota += `\n\n📅 REUNIÃO:
${reuniao.marcou ? `✅ MARCADA — ${reuniao.tipo || 'tipo?'}` : '❌ Não marcada'}`
    
    if (reuniao.marcou) {
      nota += `\n• Tentou presencial primeiro: ${reuniao.tentou_presencial_primeiro ? '✅ sim' : '❌ não'}`
      nota += `\n• Marcou com contexto concreto: ${reuniao.marcou_com_contexto_concreto ? '✅ sim' : '❌ não (genérica)'}`
      nota += `\n• Rebateu objeções: ${reuniao.rebateu_objecoes ? '✅ sim' : '❌ não'}`
      nota += `\n• Tentativas: ${reuniao.quantidade_tentativas || 0}`
    }

    nota += `\n\n💰 ABORDAGEM DE CRÉDITO:
${credito.apresentou_valores_concretos ? '✅' : '❌'} Apresentou valores concretos
${credito.usou_simulacao ? '✅' : '❌'} Usou simulação
${credito.houve_negociacao ? '✅' : '❌'} Houve negociação
${credito.foi_generico ? '⚠️ FOI GENÉRICO (erro)' : '✅ Foi específico'}

🎯 QUALIFICAÇÃO:
${qualific.qualificou_antes_de_falar_muito ? '✅' : '❌'} Qualificou antes de falar muito
${qualific.leu_sinais_do_cliente ? '✅' : '❌'} Leu sinais do cliente
${qualific.identificou_lead_ruim_a_tempo === true ? '✅ Identificou lead ruim a tempo' : qualific.identificou_lead_ruim_a_tempo === false ? '❌ Não identificou lead ruim' : '— Não aplicável'}
${proporcaoEmoji} Proporção falar/ouvir: ${qualific.proporcao_falar_ouvir || 'indefinido'}`

    if (analise.pontos_positivos?.length) {
      nota += `\n\n💪 PONTOS POSITIVOS:`
      analise.pontos_positivos.forEach((p: string) => {
        nota += `\n• ${p}`
      })
    }
    
    if (analise.pontos_criticos?.length) {
      nota += `\n\n🚨 PONTOS CRÍTICOS:`
      analise.pontos_criticos.forEach((p: string) => {
        nota += `\n• ${p}`
      })
    }

    if (objecoes.length > 0) {
      nota += `\n\n⚠️ OBJEÇÕES IDENTIFICADAS:`
      objecoes.forEach((obj: any, i: number) => {
        nota += `\n\n${i + 1}. "${obj.objecao}"`
        nota += `\n   ${obj.eficaz ? '✅ Bem tratada' : '❌ Mal tratada'}`
        nota += ` | ${obj.respondeu_com_pergunta ? '✅ Respondeu com pergunta' : '❌ Contra-atacou (erro)'}`
        nota += `\n   → Significado real: ${obj.significado_real || '—'}`
        nota += `\n   → Vendedor disse: "${obj.resposta_vendedor || '—'}"`
        nota += `\n   → Resposta ideal: "${obj.resposta_ideal || '—'}"`
      })
    }
    
    if (alertas.length > 0) {
      nota += `\n\n🚨 ALERTAS CRÍTICOS:`
      alertas.forEach((a: string) => {
        nota += `\n⛔ ${a}`
      })
    }

    nota += `\n\n🎯 PRÓXIMO PASSO: ${analise.proximo_passo_sugerido || 'N/A'}`
    
    if (analise.feedback_vendedor) {
      nota += `\n\n🎓 FEEDBACK PARA O VENDEDOR:\n${analise.feedback_vendedor}`
    }
    
    nota += `\n\n${analise.cliente_interessado ? '✅' : '❌'} Cliente interessado | ${analise.agendou_retorno ? '✅' : '❌'} Agendou retorno`
    
    await fetch(
      `https://crm2lrmultimarcascom.kommo.com/api/v4/leads/${leadId}/notes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KOMMO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          note_type: 'common',
          params: { text: nota }
        }]),
      }
    )
    console.log('[Kommo] ✅ Nota completa enviada')
  } catch (error) {
    console.error('[Kommo] Erro ao enviar nota:', error)
  }
}

// Envia nota de análise para o CONTATO no Kommo (quando não tem lead ativo)
async function enviarNotaKommoContato(contactId: string | number, analise: any): Promise<void> {
  if (!KOMMO_ACCESS_TOKEN || !contactId) return

  try {
    const pilares = analise.quatro_pilares || {}
    const perfil = analise.perfil_lead || {}
    const reuniao = analise.reuniao || {}
    
    const emojiTipo: Record<string, string> = {
      'facebook_grupos': '📱',
      'simulador_empresa': '🧮',
      'simulador_facebook': '🧮',
      'ativacao_whatsapp': '💬',
      'confirmacao_reuniao': '📅',
      'retorno': '🔄',
    }
    const emoji = emojiTipo[analise.tipo_ligacao] || '📞'
    
    let nota = `${emoji} ANÁLISE IA — ${analise.tipo_ligacao?.toUpperCase().replace(/_/g, ' ') || 'LIGAÇÃO'}

⚠️ NOTA: Cliente sem lead ativo. Análise vinculada ao contato.

📝 RESUMO:
${analise.resumo_executivo || 'Sem resumo'}

📊 SCORE GERAL: ${analise.score_geral || 0}/100

🎯 4 PILARES (${pilares.pilares_coletados || 0}/4):
${pilares.credito ? '✅' : '❌'} Crédito: ${pilares.credito || 'não coletado'}
${pilares.parcela ? '✅' : '❌'} Parcela: ${pilares.parcela || 'não coletado'}
${pilares.entrada ? '✅' : '❌'} Entrada: ${pilares.entrada || 'não coletado'}
${pilares.momento && pilares.momento !== 'indefinido' ? '✅' : '❌'} Momento: ${pilares.momento || 'indefinido'}

👤 Nível de interesse: ${perfil.nivel_interesse || 'indefinido'}
${reuniao.marcou ? `📅 Reunião marcada (${reuniao.tipo})` : '📅 Reunião não marcada'}

🎯 PRÓXIMO PASSO: ${analise.proximo_passo_sugerido || 'N/A'}

💡 SUGESTÃO: Considere abrir um novo lead para esse cliente para acompanhamento adequado.`

    await fetch(
      `https://crm2lrmultimarcascom.kommo.com/api/v4/contacts/${contactId}/notes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KOMMO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          note_type: 'common',
          params: { text: nota }
        }]),
      }
    )
    console.log('[Kommo] ✅ Nota enviada para CONTATO (sem lead)')
  } catch (error) {
    console.error('[Kommo] Erro ao enviar nota para contato:', error)
  }
}

export const maxDuration = 300 // 5 minutos máximo

export async function POST(request: Request) {
  try {
    // Primeiro tenta ler como texto para debug
    const rawBody = await request.text()
    console.log("[TotalPhone] Body RAW recebido:", rawBody)
    
    // Tenta fazer parse do JSON, tratando possíveis problemas
    let data: any
    try {
      data = JSON.parse(rawBody)
    } catch (parseError) {
      // Remove vírgulas extras antes de } ou ]
      const fixedBody = rawBody
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim()
      
      try {
        data = JSON.parse(fixedBody)
        console.log("[TotalPhone] JSON corrigido com sucesso!")
      } catch (cleanError) {
        console.error("[TotalPhone] Falha ao corrigir JSON:", cleanError)
        return NextResponse.json({ 
          error: "JSON inválido", 
          rawBody: rawBody.substring(0, 500) 
        }, { status: 400 })
      }
    }
    
    console.log("[TotalPhone] Dados parseados:", JSON.stringify(data, null, 2))
    
    // Extrai dados do webhook
    const {
      duracao,
      origem,
      destino,
      direcao,
      data: dataLigacao,
      timestamp,
      gravacao,
      callid,
    } = data
    
    if (!callid) {
      return NextResponse.json({ error: "callid obrigatório" }, { status: 400 })
    }
    
    // Determina se �� entrada ou saida e quem é o vendedor
    const isEntrada = direcao === "entrada" || direcao === "inbound"
    const ramal = extrairRamal(isEntrada ? destino : origem)
    const telefoneCliente = isEntrada ? origem : destino
    
    // Busca dados do vendedor pelo ramal
    const vendedorData = ramal ? RAMAIS[ramal] : null
    
    // Converte duracao para segundos
    let duracaoSegundos = 0
    if (typeof duracao === "number") {
      duracaoSegundos = duracao
    } else if (typeof duracao === "string") {
      if (duracao.includes(":")) {
        const partes = duracao.split(":").map(Number)
        if (partes.length === 3) {
          duracaoSegundos = partes[0] * 3600 + partes[1] * 60 + partes[2]
        } else if (partes.length === 2) {
          duracaoSegundos = partes[0] * 60 + partes[1]
        }
      } else {
        duracaoSegundos = parseInt(duracao, 10) || 0
      }
    }
    
    // Monta data da ligação
    let dataLigacaoFormatada: string | null = null
    if (timestamp) {
      dataLigacaoFormatada = new Date(parseInt(timestamp) * 1000).toISOString()
    } else if (dataLigacao) {
      // Tenta converter formato brasileiro dd/mm/yyyy HH:mm:ss
      const match = dataLigacao.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
      if (match) {
        const [, dia, mes, ano, hora, min, seg] = match
        dataLigacaoFormatada = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}`).toISOString()
      } else {
        dataLigacaoFormatada = new Date(dataLigacao).toISOString()
      }
    }
    
    // Monta URL completa do áudio (não será mais usada, mas mantida para compatibilidade)
    let audioUrlOriginal = gravacao || null
    
    console.log("[TotalPhone] Processando ligação:", {
      callid,
      ramal,
      vendedor: vendedorData?.vendedor,
      telefone: telefoneCliente,
      duracao: duracaoSegundos,
    })
    
    // ========== PROCESSAMENTO AUTOMÁTICO ==========
    
    let audioBlobUrl: string | null = null
    let transcricao: string | null = null
    let analise: any = null
    let statusFinal = duracaoSegundos > 0 ? "atendida" : "nao_atendida"
    let sipCode: string | number | null = null
    
    // 1. Busca dados na API oficial (retorna transcrição se disponível)
    let audioBuffer: Buffer | null = null
    
    if (callid && dataLigacao) {
      try {
        console.log('[TotalPhone] Buscando dados da API oficial...')
        const { audioBuffer: ab, transcricao: transcricaoAPI, resumo: resumoAPI, duracao: duracaoAPI, sipCode: apiSipCode } = 
          await buscarEBaixarAudioTotalPhone(callid, dataLigacao)
        
        audioBuffer = ab
        transcricao = transcricaoAPI
        sipCode = apiSipCode
        
        // Se a duração da API é maior, usa ela
        if (duracaoAPI > duracaoSegundos) {
          duracaoSegundos = duracaoAPI
        }
        
        // Se conseguiu transcrição da API, detecta status direto COM sipCode
        if (transcricao) {
          statusFinal = detectarStatusPorTranscricao(transcricao, duracaoSegundos, sipCode)
          console.log("[TotalPhone] Status detectado pela transcrição da API:", statusFinal)
        }
      } catch (apiError) {
        console.error("[TotalPhone] Erro ao buscar da API:", apiError)
      }
    }
    
    // 2. Se não tem transcrição, transcreve o áudio com Deepgram (fallback)
    if (audioBuffer && !transcricao && DEEPGRAM_API_KEY) {
      try {
        console.log("[TotalPhone] Transcrevendo áudio com Deepgram (fallback)...")
        transcricao = await transcreverComDeepgram(audioBuffer)
        
        if (transcricao) {
          console.log("[TotalPhone] Transcrição Deepgram:", transcricao.substring(0, 200))
          
          // Detecta status pela transcrição (com sipCode se disponível)
          statusFinal = detectarStatusPorTranscricao(transcricao, duracaoSegundos, sipCode)
          console.log("[TotalPhone] Status detectado:", statusFinal)
        }
      } catch (transcricaoError) {
        console.error("[TotalPhone] Erro na transcrição:", transcricaoError)
      }
    }
    
    // Detecta tipo de ligação SEMPRE que tem transcrição
    let tipoLigacao = 'desconhecido'
    if (transcricao && transcricao.length > 20) {
      tipoLigacao = detectarTipoLigacao(transcricao)
      console.log('[TotalPhone] Tipo de ligação detectado:', tipoLigacao)
    }

    // Analisa com Claude SOMENTE se foi atendida com conversa real
    if (transcricao && statusFinal === 'atendida' && transcricao.length > 50 && duracaoSegundos > 15) {
      try {
        console.log('[TotalPhone] Analisando com Claude...')
        analise = await analisarComClaude(
          transcricao,
          tipoLigacao,
          duracaoSegundos,
          vendedorData?.vendedor || 'Vendedor'
        )
        if (analise) {
          console.log('[TotalPhone] ✅ Análise concluída. Score geral:', analise.score_geral)
        }
      } catch (analiseError) {
        console.error('[TotalPhone] Erro na análise:', analiseError)
      }
    }
    
    // 4. Salva áudio no Blob (para o Kommo player funcionar)
    if (audioBuffer) {
      try {
        console.log("[TotalPhone] Salvando áudio no Blob...")
        
        // Salva áudio como WAV (mais confiável em serverless)
        const blobResult = await put(
          `ligacoes/${callid}.wav`,
          audioBuffer,
          {
            access: "public",
            contentType: "audio/wav",
            token: process.env.ATENTIMENTOS_READ_WRITE_TOKEN,
          }
        )
        
        audioBlobUrl = blobResult.url
        console.log("[TotalPhone] Áudio salvo no Blob:", audioBlobUrl)
      } catch (blobError) {
        console.error("[TotalPhone] Erro ao salvar no Blob:", blobError)
      }
    }
    
    // 5. Salva no banco
    const { data: ligacao, error } = await supabase
      .from("ligacoes")
      .upsert({
        callid,
        ramal,
        vendedor: vendedorData?.vendedor || `Ramal ${ramal || "Desconhecido"}`,
        equipe: vendedorData?.equipe || "Desconhecida",
        telefone_cliente: telefoneCliente,
        direcao: isEntrada ? "entrada" : "saida",
        duracao_segundos: duracaoSegundos,
        status: statusFinal,
        sip_code: String(sipCode || ''),
        tipo_ligacao: tipoLigacao,
        audio_url_original: audioUrlOriginal,
        audio_url: audioBlobUrl,
        transcricao,
        analise_ia: analise,
        score_geral: analise?.score_geral || null,
        score_abertura: analise?.score_abertura || null,
        score_qualificacao: analise?.score_qualificacao || null,
        score_abordagem_credito: analise?.score_abordagem_credito || null,
        score_conducao_reuniao: analise?.score_conducao_reuniao || null,
        reuniao_marcou: analise?.reuniao?.marcou || false,
        reuniao_tipo: analise?.reuniao?.tipo || null,
        nivel_interesse: analise?.perfil_lead?.nivel_interesse || null,
        pilares_coletados: analise?.quatro_pilares?.pilares_coletados || 0,
        resumo: analise?.resumo_executivo || null,
        data_ligacao: dataLigacaoFormatada,
        processado_em: transcricao ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: "callid",
        ignoreDuplicates: false 
      })
      .select()
      .single()
    
    if (error) {
      console.error("[TotalPhone] Erro ao salvar:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log("[TotalPhone] Ligação salva:", ligacao?.id)
    
    // 6. Envia para Kommo (sempre, independente de ter sido atendida ou não)
    let kommoLeadId: number | null = null
    let kommoContactId: number | null = null

    if (telefoneCliente) {
      const telefoneNormalizado = normalizarTelefone(telefoneCliente)
      console.log('[TotalPhone] Telefone normalizado:', telefoneCliente, '->', telefoneNormalizado)
      
      // Busca lead/contato no Kommo pelo telefone
      const { lead_id, contact_id, responsible_user_id: respUserKommo } = 
        await buscarLeadKommoPorTelefone(telefoneNormalizado)
      
      kommoLeadId = lead_id
      kommoContactId = contact_id
      
      // Se não encontrou nem lead NEM contato, IGNORA
      if (!lead_id && !contact_id) {
        console.log('[TotalPhone] ⚠️ Lead/Contato não encontrado no Kommo, pulando envio da chamada')
      } else {
        // Define o responsável: prioriza ramal mapeado, depois o do contato no Kommo
        const responsibleUserId = vendedorData?.kommo_user_id || respUserKommo || null
        
        if (lead_id) {
          console.log('[TotalPhone] ✅ Lead encontrado, vinculando ligação ao lead:', lead_id)
        } else {
          console.log('[TotalPhone] ⚠️ Sem lead ativo, vinculando ligação ao contato:', contact_id)
        }
        
        // Envia chamada (vincula ao lead se tiver, senão ao contato)
        const kommoCallId = await enviarChamadaKommo(
          callid,
          telefoneNormalizado,
          duracaoSegundos,
          statusFinal,
          responsibleUserId,
          lead_id,
          contact_id,
          analise?.resumo_executivo || null
        )
        
        // Nota com análise SÓ vai para o lead (não para contato em notas complexas)
        // Se tem lead, manda análise completa no lead
        if (analise && lead_id) {
          await enviarNotaKommo(String(lead_id), analise)
        } else if (analise && !lead_id && contact_id) {
          // Se não tem lead, manda nota simplificada no contato
          await enviarNotaKommoContato(String(contact_id), analise)
        }
        
        // Atualiza Supabase com IDs do Kommo
        await supabase
          .from('ligacoes')
          .update({ 
            kommo_call_id: kommoCallId,
            kommo_lead_id: lead_id,
            kommo_contact_id: contact_id,
            kommo_user_id: responsibleUserId,
            enviado_kommo: !!kommoCallId,
          })
          .eq('id', ligacao?.id)
      }
    }

    return NextResponse.json({ 
      success: true, 
      id: ligacao?.id,
      vendedor: vendedorData?.vendedor,
      status: statusFinal,
      duracao: duracaoSegundos,
      transcricao: transcricao ? 'Sim' : 'Não',
      analise: analise ? 'Sim' : 'Não',
      kommo_lead_id: kommoLeadId,
    })
    
  } catch (error) {
    console.error("[TotalPhone] Erro:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Erro interno" 
    }, { status: 500 })
  }
}

// GET para verificar se o webhook está funcionando
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "Webhook TotalPhone ativo - Processamento automático habilitado",
    timestamp: new Date().toISOString()
  })
}
