import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import Anthropic from "@anthropic-ai/sdk"
import CloudConvert from "cloudconvert"

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

// Converte áudio WAV para MP3 usando CloudConvert (serverless-friendly)
async function converterWAVParaMP3CloudConvert(audioBuffer: Buffer): Promise<Buffer | null> {
  if (!process.env.CLOUDCONVERT_API_KEY) {
    console.warn('[CloudConvert] API key não configurada, retornando áudio original')
    return null
  }

  try {
    const cloudconvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY!)

    console.log('[CloudConvert] Iniciando conversão WAV → MP3...')

    // Cria um job de conversão
    const job = await cloudconvert.jobs.create({
      tasks: {
        'import-file': {
          operation: 'import/upload',
        },
        'convert-file': {
          operation: 'convert',
          input: 'import-file',
          input_format: 'wav',
          output_format: 'mp3',
          audio_bitrate: 128,
          audio_channels: 1,
          audio_frequency: 16000,
          engine: 'ffmpeg',
        },
        'export-file': {
          operation: 'export/url',
          input: 'convert-file',
        },
      },
    })

    console.log('[CloudConvert] Job criado:', job.id)

    // Faz upload do arquivo
    const uploadTask = job.tasks.find((t: any) => t.name === 'import-file')
    if (!uploadTask) {
      console.error('[CloudConvert] Task de upload não encontrada')
      return null
    }
    await cloudconvert.tasks.upload(uploadTask, audioBuffer, 'audio.wav')
    console.log('[CloudConvert] Upload concluído, aguardando conversão...')

    // Aguarda conclusão com polling
    let completedJob = job
    let tentativas = 0
    const maxTentativas = 60 // 5 minutos (5s * 60)

    while (!['finished', 'error'].includes(completedJob.status) && tentativas < maxTentativas) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      completedJob = await cloudconvert.jobs.get(job.id)
      tentativas++
      console.log(`[CloudConvert] Status: ${completedJob.status} (${tentativas}/${maxTentativas})`)
    }

    if (completedJob.status === 'error') {
      console.error('[CloudConvert] Conversão falhou:', completedJob)
      return null
    }

    if (completedJob.status !== 'finished') {
      console.error('[CloudConvert] Timeout aguardando conversão')
      return null
    }

    // Obtém arquivo convertido
    const exportTask = completedJob.tasks.filter((task: any) => task.name === 'export-file')[0]
    if (!exportTask?.result?.files?.[0]) {
      console.error('[CloudConvert] Arquivo não encontrado')
      return null
    }

    const fileUrl = exportTask.result.files[0].url
    console.log('[CloudConvert] ✅ Conversão ok, baixando MP3...')

    const mp3Response = await fetch(fileUrl)
    if (!mp3Response.ok) {
      console.error('[CloudConvert] Erro ao baixar:', mp3Response.status)
      return null
    }

    const mp3Buffer = Buffer.from(await mp3Response.arrayBuffer())
    console.log('[CloudConvert] ✅ MP3 pronto:', mp3Buffer.length, 'bytes')
    return mp3Buffer

  } catch (error) {
    console.error('[CloudConvert] Erro:', error)
    return null
  }
}

// Detecta status da ligacao pela transcricao
function detectarStatusPorTranscricao(
  transcricao: string | null,
  duracao: number,
  sipCode: string | number | null = null
): string {
  // ============================================================
  // PRIORIDADE 1: SIP_CODE da Total Phone (FONTE DA VERDADE)
  // ============================================================
  // O sip_code vem direto do PABX e é a fonte mais confiável.
  // Se temos sip_code, ele DEFINE o status — transcrição é ignorada
  // (exceto para sip 200 onde validamos com a transcrição também)
  
  if (sipCode) {
    const sip = typeof sipCode === 'string' ? parseInt(sipCode) : sipCode
    
    // Códigos de NÃO atendimento — independem da transcrição
    if (sip === 486) {
      console.log('[Status] sip 486 = OCUPADO (definido pelo PABX)')
      return 'ocupado'
    }
    if (sip === 487) {
      console.log('[Status] sip 487 = RECUSADA/CANCELADA (definido pelo PABX)')
      return 'cancelada'
    }
    if (sip === 480 || sip === 503) {
      console.log('[Status] sip', sip, '= FORA DE ÁREA (definido pelo PABX)')
      return 'fora_area'
    }
    if (sip === 404) {
      console.log('[Status] sip 404 = NÚMERO INEXISTENTE (definido pelo PABX)')
      return 'numero_errado'
    }
    if (sip === 408) {
      console.log('[Status] sip 408 = NÃO ATENDIDA (definido pelo PABX)')
      return 'nao_atendida'
    }
    if (sip === 600 || sip === 603) {
      console.log('[Status] sip', sip, '= RECUSADA pelo cliente (definido pelo PABX)')
      return 'cancelada'
    }
    
    // Sip 200 = chamada estabelecida tecnicamente
    // Mas precisa validar se foi atendida de verdade
    if (sip === 200) {
      // Duração muito curta = atendeu e desligou rápido (ou caiu)
      if (duracao < 5) {
        console.log('[Status] sip 200 com duração <5s = CANCELADA')
        return 'cancelada'
      }
      
      // Sem transcrição = chamada atendida mas sem áudio captado
      if (!transcricao || transcricao.trim().length === 0) {
        return 'atendida'
      }
      
      // Tem transcrição: verifica se é caixa postal antes de marcar atendida
      const texto = transcricao.toLowerCase()
      
      const padroesCaixaPostal = [
        'caixa postal', 'deixe sua mensagem', 'deixe uma mensagem',
        'após o sinal', 'apos o sinal', 'após o bipe', 'apos o bipe',
        'voicemail', 'grave sua mensagem', 'caixa de mensagens',
        'gravar sua mensagem', 'deixe seu recado',
      ]
      if (padroesCaixaPostal.some(p => texto.includes(p))) {
        console.log('[Status] sip 200 + transcrição de caixa postal = CAIXA_POSTAL')
        return 'caixa_postal'
      }
      
      // Transcrições de mensagens automáticas que aparecem mesmo com sip 200
      const padroesNaoAtendimento = [
        'fora da área de cobertura', 'fora da area de cobertura',
        'desligado ou fora', 'momentaneamente fora',
        'não pode ser completada', 'nao pode ser completada',
        'não está disponível', 'nao esta disponivel',
      ]
      if (padroesNaoAtendimento.some(p => texto.includes(p))) {
        console.log('[Status] sip 200 + mensagem de não atendimento na transcrição = FORA_AREA')
        return 'fora_area'
      }
      
      return 'atendida'
    }
    
    // Outros sip codes não mapeados — log para análise
    console.log('[Status] sip code não mapeado:', sip, '— usando fallback de transcrição')
  }
  
  // ============================================================
  // PRIORIDADE 2: Fallback para transcrição (quando NÃO tem sip_code)
  // ============================================================
  // Só chega aqui se a Total Phone não retornou sip_code (caso raro)
  
  if (!transcricao || transcricao.trim().length === 0) {
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

/**
 * Valida se a transcrição parece ser de uma ligação real atendida,
 * ou se é provavelmente áudio ambiente captado pelo microfone do vendedor
 * enquanto a chamada não foi atendida.
 * 
 * Critérios:
 * - Precisa ter sinais de atendimento (alô, oi, boa tarde, etc.) nos primeiros 200 chars
 * - Densidade de palavras por segundo razoável (conversa real é mais densa)
 */
function transcricaoEhDeLigacaoReal(transcricao: string, duracao: number): {
  valida: boolean
  motivo: string
} {
  if (!transcricao || transcricao.length < 50) {
    return { valida: false, motivo: 'transcricao_muito_curta' }
  }
  
  const texto = transcricao.toLowerCase()
  const primeiros300chars = texto.substring(0, 300)
  
  // Sinais clássicos de início de ligação atendida
  const sinaisAtendimento = [
    'alô', 'alo', 'oi', 'olá', 'ola', 'pronto',
    'boa tarde', 'bom dia', 'boa noite',
    'quem fala', 'quem é', 'tudo bem',
    'sim?', 'pois não', 'pois nao',
    'fala', 'falando',
  ]
  
  const temSinalAtendimento = sinaisAtendimento.some(s => 
    primeiros300chars.includes(s)
  )
  
  if (!temSinalAtendimento) {
    return { 
      valida: false, 
      motivo: 'sem_sinal_de_atendimento_no_inicio' 
    }
  }
  
  // Densidade de palavras (conversa ambiente é mais esparsa)
  const palavras = transcricao.split(/\s+/).filter(p => p.length > 0).length
  const palavrasPorSegundo = palavras / Math.max(duracao, 1)
  
  if (palavrasPorSegundo < 0.5) {
    return { 
      valida: false, 
      motivo: `densidade_palavras_baixa_${palavrasPorSegundo.toFixed(2)}_pps` 
    }
  }
  
  return { valida: true, motivo: 'ok' }
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
    
    // PARTE ESTÁTICA — vai no SYSTEM com cache_control
    // Todo o conteúdo que NÃO muda entre as ligações
    const systemPromptEstatico = `Você é um especialista em análise de ligações comerciais de uma agência de crédito imobiliário (LR Multimarcas), formado no método Alan Caçula de vendas consultivas.

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

TIPO 1 — FACEBOOK/GRUPOS (DETALHADO)

⚠️ CONTEXTO CRÍTICO DO NEGÓCIO:

A LR Multimarcas é AGÊNCIA DE CRÉDITO IMOBILIÁRIO 
(consórcio, financiamento, parcelamento), NÃO é uma 
imobiliária. NÃO vende imóveis. Vende crédito.

ESTRATÉGIA DE CAPTAÇÃO:
A empresa cria anúncios no Facebook/Grupos usando 
imóveis "como se fossem reais" (alguns são imagens 
reais de outros sites, outros são imagens ilustrativas) 
como CHAMARIZ para captar pessoas interessadas em 
adquirir imóveis. O imóvel anunciado NÃO está à venda 
pela LR — é apenas uma porta de entrada.

A HABILIDADE-CHAVE DO VENDEDOR É: REVERTER COM 
NATURALIDADE o interesse do cliente no imóvel 
ESPECÍFICO para o produto real: o CRÉDITO IMOBILIÁRIO.

SCRIPT IDEAL DE REVERSÃO (PADRÃO LR):

✅ PERGUNTA-CHAVE DE REVERSÃO:
"Você está buscando imóveis com a ideia de comprar 
À VISTA ou te interessa o PARCELAMENTO? Porque 
minha função aqui é justamente a parte de liberação 
do crédito imobiliário."

➡️ SE CLIENTE DIZ "PARCELADO" / "FINANCIADO":
Caminho natural — vendedor segue para qualificação 
dos 4 pilares (crédito, parcela, entrada, momento).
Tom: "Perfeito! Então deixa eu te ajudar a entender 
qual a melhor opção pra você. Qual valor de imóvel 
você tá pensando?"

➡️ SE CLIENTE DIZ "À VISTA":
NÃO desistir do lead! Reverter mostrando que muitos 
clientes COM CAPITAL usam o crédito da empresa para:
- Adquirir VÁRIOS bens (não só um)
- Manter a liquidez do dinheiro próprio
- Aproveitar oportunidades de investimento
- Aproveitar parcerias com imobiliárias parceiras

Tom: "Que ótimo que você tem o recurso! Olha, muitos 
clientes nossos que têm capital optam pelo crédito 
porque conseguem comprar VÁRIOS imóveis em vez de 
um só. Inclusive temos parcerias com imobiliárias 
que dão acesso a opções exclusivas. Posso te 
explicar como funciona?"

➡️ SE CLIENTE INSISTE EM VER FOTOS / SABER DO IMÓVEL:
Reverter educadamente sem prometer o que não pode:
"Trabalhamos com várias opções de imóveis através 
das nossas parcerias com imobiliárias. Para te 
apresentar as melhores opções dentro do seu perfil, 
deixa eu primeiro entender o que você está buscando..."

NUNCA prometer enviar fotos do imóvel anunciado 
(elas não existem como imóvel à venda da LR).
NUNCA marcar visita ao imóvel específico do anúncio.

ORDEM IDEAL DA LIGAÇÃO FACEBOOK/GRUPOS (5 PASSOS):

PASSO 1 — APRESENTAÇÃO RÁPIDA E PROFISSIONAL
"Oi [Nome], aqui é o [Vendedor] da LR Multimarcas. 
Você se interessou por um imóvel que anunciamos no 
Facebook, certo?"
[ESPERAR confirmação do cliente]

PASSO 2 — APLICAR PERGUNTA-CHAVE DE REVERSÃO
"Deixa eu te perguntar uma coisa antes: você está 
buscando imóveis com a ideia de comprar À VISTA ou 
te interessa o PARCELAMENTO? Porque minha função 
aqui é justamente a parte de liberação do crédito."
[ESCUTAR a resposta com atenção]

PASSO 3 — TRATAR A RESPOSTA CONFORME ROTEIRO ACIMA
- Parcelado → seguir para qualificação
- À vista → reverter mostrando vantagens
- Insistente no imóvel → mencionar parcerias

PASSO 4 — QUALIFICAR (4 PILARES) COM NATURALIDADE
Depois da reversão bem-feita, descobrir:
- CRÉDITO: valor do imóvel que busca
- PARCELA: quanto consegue pagar/mês
- ENTRADA: quanto tem disponível
- MOMENTO: pronto agora ou pesquisando
Lembrar: ouvir mais que falar (proporção 70/30)

PASSO 5 — APRESENTAR CONDIÇÕES E MARCAR REUNIÃO
Com base nos pilares coletados, oferecer reunião 
PRESENCIAL com contexto concreto:
"Vou preparar uma simulação personalizada com base 
no seu perfil. Amanhã 14h ou sexta 10h você consegue 
vir aqui na agência?"

PROTOCOLO QUANDO O CLIENTE FICA RESISTENTE:

Cliente apegado ao chamariz pode ficar resistente 
ou irritado. Vendedor deve seguir esta ESCALADA:

1ª TENTATIVA — Reverter educadamente
"Entendo seu interesse no imóvel. Posso te ajudar 
a viabilizar a compra. Deixa eu primeiro entender 
seu perfil..."

2ª TENTATIVA — Reformular com outra linguagem
"Olha, na verdade meu papel é diferente do que você 
imaginou. Eu não vendo esse imóvel específico, eu 
ajudo pessoas como você a CONSEGUIREM o crédito 
para comprar imóveis. Posso te explicar como?"

3ª TENTATIVA — Reconhecer o desejo e oferecer alternativa
"Você quer ver esse imóvel específico, certo? Olha, 
trabalhamos com várias opções similares através das 
nossas parcerias. Posso te apresentar opções que 
encaixam no seu perfil?"

4ª TENTATIVA OU CLIENTE MUITO IRRITADO — ENCERRAR COM ELEGÂNCIA
"Entendi sua expectativa, [Nome]. Não vou tomar 
mais seu tempo. Se mudar de ideia e quiser conversar 
sobre crédito imobiliário, estamos à disposição. 
Tenha um ótimo dia!"

NÃO insistir além disso. NÃO prometer fotos que 
não existem. NÃO enganar o cliente. NÃO se desculpar 
por focar em crédito (é a estratégia correta).

COMO AVALIAR LIGAÇÕES TIPO FACEBOOK_GRUPOS:

CRITÉRIO 1 — APLICOU A PERGUNTA DE REVERSÃO?
✅ Sim, com naturalidade e no momento certo (após 
   apresentação) → ponto positivo
⚠️ Aplicou de forma brusca/decorada/robotizada → 
   execução ruim, gera resistência
❌ Não aplicou (passou direto pra crédito sem 
   reverter) → pulou etapa fundamental
❌ Aplicou tarde demais (depois do cliente já 
   estar irritado) → fora de tempo

CRITÉRIO 2 — REVERSÃO FOI BEM EXECUTADA?
✅ Cliente entendeu o posicionamento e seguiu 
   naturalmente
⚠️ Cliente confuso mas aceitou a transição
❌ Cliente ficou resistente/irritado pela forma 
   como foi feito

CRITÉRIO 3 — RESPEITOU O MODELO DE NEGÓCIO?
✅ Sim, manteve foco no crédito sem prometer o 
   indevido
❌ Prometeu enviar fotos do imóvel anunciado
❌ Marcou visita ao imóvel específico
❌ Conduziu como se fosse corretor de imóveis
❌ Pediu desculpas por focar em crédito (errado!)
❌ Mentiu sobre o imóvel ("já vendeu", etc) — 
   melhor reverter com transparência

CRITÉRIO 4 — CONSEGUIU QUALIFICAR APÓS REVERTER?
✅ Coletou pelo menos 3 dos 4 pilares
⚠️ Coletou 1-2 pilares
❌ Não conseguiu qualificar nada após a reversão

CRITÉRIO 5 — SOUBE LIDAR COM RESISTÊNCIA?
✅ Tentou reverter 2-3 vezes com habilidade e 
   linguagens diferentes
✅ Encerrou com elegância quando viu que não ia 
   engatar
❌ Insistiu de forma agressiva mesmo com cliente 
   irritado
❌ Desistiu na primeira resistência sem tentar 
   outra abordagem
❌ Ficou repetindo o mesmo discurso decorado

⛔ ERROS GRAVES ESPECÍFICOS DESSE TIPO DE LIGAÇÃO:
1. PULAR a pergunta-chave de reversão
2. Fazer a reversão SEM criar mínimo rapport antes
3. PROMETER enviar fotos que não existem
4. Falar de poder de compra/aprovação ANTES de 
   aplicar a reversão
5. Ser robotizado/decorado ao reverter
6. Marcar visita ao imóvel anunciado
7. Pedir desculpas por focar em crédito
8. Enganar o cliente sobre status do imóvel

⭐ PONTOS POSITIVOS ESPECÍFICOS DESSE TIPO:
1. Aplicou pergunta-chave com naturalidade
2. Reverteu mostrando valor do crédito
3. Mencionou parcerias como alternativa
4. Não prometeu o que não podia entregar
5. Manteve postura profissional mesmo com 
   resistência
6. Conseguiu qualificar pelo menos 3 dos 4 pilares
7. Marcou reunião com contexto concreto
8. Encerrou com elegância quando necessário

LEMBRETE FINAL PARA AVALIAÇÃO:

Em ligações facebook_grupos, a "falha real" NÃO é 
"não enviar fotos" ou "não atender ao pedido do 
cliente sobre o imóvel". A falha real é:
- Não conseguir REVERTER bem
- Ser robotizado ao reverter
- Não criar conexão antes da transição
- Não explicar o modelo de negócio com clareza

O vendedor está CERTO em focar no crédito. O que 
precisa avaliar é a QUALIDADE DA EXECUÇÃO da 
reversão, não a estratégia em si.

TIPO 2 — SIMULADOR EMPRESA: Lead pré-qualificado com dados concretos (valor do imóvel, entrada, parcela desejada). Vendedor JÁ TEM informações antes de ligar. Foco: confirmar dados, descobrir momento, marcar reunião. Esperado: rápido e assertivo.

TIPO 3 — SIMULADOR FACEBOOK: Lead com dados parciais (passou por formulário). Vendedor tem ALGUMAS informações. Foco: completar qualificação dos 4 pilares que faltam, conferir dados, marcar reunião.

TIPO 4 — ATIVAÇÃO WHATSAPP: Cliente já respondeu no WhatsApp (sim, tem interesse). Ligação é praticamente agendada. Vendedor deveria ser rápido: "Ótimo! Viemos conversar sobre...". Foco: confirmar disponibilidade, agendar reunião.

TIPO 5 — CONFIRMAÇÃO DE REUNIÃO: Ligação é apenas para confirmar presença/horário de reunião já marcada. Não é venda — é confirmação logística. Esperado: breve e cordial.

TIPO 6 — RETORNO: Ligação de acompanhamento após reunião ou ligação anterior. Vendedor deveria saber contexto prévio. Foco: avanço na negociação ou identificar bloqueios.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLASSIFICAÇÕES CRÍTICAS — CONCEITOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLIENT_BOM: Lead genuinamente interessado, com potencial real de compra. Mostrou sinais de interesse, respondeu perguntas, não colocou barreiras indevidas.

CLIENT_MORNO: Lead interessado mas com resistência ou barreiras (precisa pensar, não tem dinheiro, quer comparar). Não é descartado — precisa follow-up.

CLIENT_RUIM: Lead desinteressado, agressivo, fora do perfil ou enganado. Exemplos: ligou por engano, pessoa irritada, sem perfil, fake lead.

VEND_BOM: Vendedor profissional, ouviu o cliente, coletou 4 pilares, contornou objeções, manteve rapport, seguiu roteiro.

VEND_RUIM: Vendedor agressivo, decorado, robotizado, não ouviu, pulou etapas, não contornou objeções, prometeu o indevido.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCHEMA DE RETORNO JSON (RESPEITAR EXATAMENTE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "tipo_ligacao": "facebook_grupos|simulador_empresa|simulador_facebook|ativacao_whatsapp|confirmacao_reuniao|retorno",
  "resumo_executivo": "1-2 frases resumindo o resultado",
  "score_geral": 0-100,
  "cliente_interessado": true/false,
  "agendou_retorno": true/false,
  "quatro_pilares": {
    "pilares_coletados": 0-4,
    "credito": "valor em reais ou nulo",
    "parcela": "valor em reais ou nulo",
    "entrada": "valor em reais ou nulo",
    "momento": "agora|pesquisando|indefinido"
  },
  "perfil_lead": {
    "nivel_interesse": "alto|medio|baixo",
    "tipo_cliente": "client_bom|client_morno|client_ruim",
    "objecoes_principais": ["array de objeções ouvidas"],
    "barreiras_compra": ["array de barreiras reais vs percebidas"]
  },
  "reuniao": {
    "marcou": true/false,
    "tipo": "presencial|online|undefined",
    "data_sugerida": "string ou null"
  },
  "vendedor_performance": {
    "qualidade": "excelente|bom|medio|ruim",
    "tipo_cliente": "vend_bom|vend_ruim",
    "3_segredos_metodo": {
      "consultor_nao_vendedor": true/false,
      "ajudou_cliente_decidir": true/false,
      "ouviu_mais_que_falou": true/false
    }
  },
  "qualificacao": {
    "qualificou_antes_de_falar_muito": true/false,
    "leu_sinais_do_cliente": true/false,
    "identificou_lead_ruim_a_tempo": true/false/null,
    "proporcao_falar_ouvir": "ouviu_mais|equilibrado|falou_mais",
    "reversao_facebook_grupos": {
      "aplicou_pergunta_reversao": true/false,
      "qualidade_reversao": "natural|adequada|brusca|robotizada|nao_aplicou",
      "respeitou_modelo_negocio": true/false,
      "prometeu_algo_indevido": true/false,
      "comentario_reversao": "string explicando como foi"
    }
  },
  "objecoes_tratadas": [
    {
      "objecao": "string",
      "resposta_vendedor": "string",
      "foi_pergunta_ou_ataque": "pergunta|ataque",
      "resultado": "converteu|nao_converteu"
    }
  ],
  "alertas_criticos": ["array"],
  "proximo_passo_sugerido": "string",
  "feedback_vendedor": "Coaching com: 1) o que fez bem 2) cada ponto crítico com exemplo concreto de como deveria ter sido feito 3) como contornar cada objeção 4) script ideal para os primeiros 2 minutos 5) o que dizer no próximo contato"
}

IMPORTANTE:
- Speaker 0 = Vendedor, Speaker 1 = Cliente
- Identifique o tipo automaticamente pelo contexto
- Os 4 pilares são o coração da análise
- Toda objeção: pergunta = correto, contra-ataque = erro
- Responda APENAS com JSON válido`

    // PARTE DINÂMICA — vai no MESSAGES sem cache
    // Apenas as informações que mudam a cada ligação
    const promptDinamico = `CONTEXTO DESTA LIGAÇÃO ESPECÍFICA:
- Vendedor: ${vendedorNome}
- Tipo identificado pela detecção automática: ${tipoDetectado}
- Duração: ${duracao} segundos

TRANSCRIÇÃO DA LIGAÇÃO:
${transcricao}`

    // CHAMADA À API COM PROMPT CACHING ATIVADO
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: [
        {
          type: 'text',
          text: systemPromptEstatico,
          cache_control: { type: 'ephemeral' }   // CACHE DE 5 MINUTOS
        }
      ],
      messages: [
        {
          role: 'user',
          content: promptDinamico
        }
      ],
    })

    // LOG DE MONITORAMENTO DO CACHE (economia em tempo real)
    if (response.usage) {
      const usage = response.usage as any
      const cacheCreated = usage.cache_creation_input_tokens || 0
      const cacheRead = usage.cache_read_input_tokens || 0
      const inputNormal = usage.input_tokens || 0
      const output = usage.output_tokens || 0
      
      const cacheStatus = cacheRead > 0 ? '✅ HIT (90% mais barato)' : 
                          cacheCreated > 0 ? '🆕 MISS (criou cache)' : 
                          '⚠️ NO CACHE'
      
      console.log('[Claude Cache]', {
        cache_criado: cacheCreated,
        cache_lido: cacheRead,
        input_normal: inputNormal,
        output: output,
        cache_status: cacheStatus,
      })
    }

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
async function enviarNotaKommo(
  leadId: string | number, 
  analise: any,
  pdfUrl: string | null = null
): Promise<void> {
  if (!KOMMO_ACCESS_TOKEN || !leadId) return

  try {
    const pilares = analise.quatro_pilares || {}
    const reuniao = analise.reuniao || {}
    const credito = analise.abordagem_credito || {}
    const qualificacao = analise.qualificacao || {}
    const perfil = analise.perfil_lead || {}
    const reversao = qualificacao.reversao_facebook_grupos || null
    
    const tipoEmoji: Record<string, string> = {
      'facebook_grupos': '📱',
      'simulador_empresa': '🧮',
      'simulador_facebook': '📊',
      'ativacao_whatsapp': '💬',
      'confirmacao_reuniao': '📅',
      'retorno': '🔁',
      'abordagem_inicial': '☎️',
    }
    const emoji = tipoEmoji[analise.tipo_ligacao] || '📞'
    const interesseEmoji = perfil.nivel_interesse === 'alto' ? '🔥' :
                           perfil.nivel_interesse === 'medio' ? '🌤️' : '❄️'
    const ouvirFalarEmoji = qualificacao.proporcao_falar_ouvir === 'ouviu_mais' ? '👂' :
                            qualificacao.proporcao_falar_ouvir === 'equilibrado' ? '⚖️' : '🗣️'
    
    let nota = `${emoji} ANÁLISE — ${(analise.tipo_ligacao || 'LIGAÇÃO').toUpperCase().replace(/_/g, ' ')} (Score: ${analise.score_geral || 0}/100)`
    nota += `\n\n📝 RESUMO: ${analise.resumo_executivo || 'N/A'}`
    nota += `\n\n📊 SCORES: Geral ${analise.score_geral || 0} | Abertura ${analise.score_abertura || 0} | Qualif. ${analise.score_qualificacao || 0} | Crédito ${analise.score_abordagem_credito || 0} | Reunião ${analise.score_conducao_reuniao || 0}`
    nota += `\n\n🎯 4 PILARES (${pilares.pilares_coletados || 0}/4) ${interesseEmoji}`
    nota += `\n• Crédito: ${pilares.credito || '—'} | Parcela: ${pilares.parcela || '—'} | Entrada: ${pilares.entrada || '—'} | Momento: ${pilares.momento || '—'}`
    nota += `\n\n📅 REUNIÃO: ${reuniao.marcou ? `✅ Marcada (${reuniao.tipo || 'tipo indefinido'})` : '❌ Não marcada'}`
    nota += `\n💰 ABORDAGEM CRÉDITO: ${credito.apresentou_valores_concretos ? '✅ Valores concretos' : '❌ Sem valores concretos'} | ${credito.usou_simulacao ? '✅ Simulação' : '❌ Sem simulação'}`
    nota += `\n🎯 QUALIFICAÇÃO: ${qualificacao.qualificou_antes_de_falar_muito ? '✅ Qualificou bem' : '❌ Falhou em qualificar'} | ${ouvirFalarEmoji} ${qualificacao.proporcao_falar_ouvir || 'N/A'}`
    
    if (analise.tipo_ligacao === 'facebook_grupos' && reversao) {
      nota += `\n\n🔄 REVERSÃO PARA CRÉDITO:`
      nota += `\n${reversao.aplicou_pergunta_reversao ? '✅' : '❌'} Aplicou pergunta-chave | Qualidade: ${reversao.qualidade_reversao || 'N/A'}`
      if (reversao.comentario_reversao) nota += `\n💬 ${reversao.comentario_reversao}`
    }
    
    nota += `\n\n━━━━━━━━━━━━━━━━━━━━`
    nota += `\n\n🎯 PRÓXIMO PASSO:\n${analise.proximo_passo_sugerido || 'Definir próxima ação'}`
    nota += `\n\n━━━━━━━━━━━━━━━━━━━━`
    nota += `\n\n🎓 FEEDBACK PARA O VENDEDOR`
    
    if (analise.pontos_positivos?.length > 0) {
      nota += `\n\n✅ TOP O QUE FEZ BEM:`
      analise.pontos_positivos.slice(0, 5).forEach((p: string, i: number) => {
        nota += `\n${i + 1}. ${p}`
      })
    }
    
    if (analise.pontos_criticos?.length > 0) {
      nota += `\n\n⚠️ TOP PONTOS CRÍTICOS:`
      analise.pontos_criticos.slice(0, 4).forEach((p: string, i: number) => {
        nota += `\n${i + 1}. ${p}`
      })
    }
    
    if (analise.objecoes_cliente?.length > 0) {
      nota += `\n\n━━━━━━━━━━━━━━━━━━━━`
      nota += `\n\n📚 COMO CONTORNAR ESSAS OBJEÇÕES:`
      analise.objecoes_cliente.slice(0, 5).forEach((obj: any) => {
        nota += `\n\n🗣️ "${obj.objecao || 'N/A'}"`
        nota += `\n→ ${obj.resposta_ideal || 'Resposta não disponível'}`
      })
    }
    
    // Link do PDF completo
    if (pdfUrl) {
      nota += `\n\n━━━━━━━━━━━━━━━━━━━━`
      nota += `\n\n📎 ANÁLISE COMPLETA + TRANSCRIÇÃO:`
      nota += `\n👉 ${pdfUrl}`
    }
    
    nota += `\n\n${analise.cliente_interessado ? '✅' : '❌'} Cliente interessado | ${analise.agendou_retorno ? '✅' : '❌'} Agendou retorno`
    
    // ENVIO COM VALIDAÇÃO REAL
    const response = await fetch(
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Kommo] ❌ ERRO ao enviar nota ao LEAD:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText.substring(0, 500),
        leadId,
        notaSize: nota.length,
        notaPreview: nota.substring(0, 200),
      })
      return
    }

    console.log('[Kommo] ✅ Nota enviada ao LEAD com sucesso. Tamanho:', nota.length, 'chars')
  } catch (error) {
    console.error('[Kommo] Erro ao enviar nota ao LEAD:', error)
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
        
        // ✅ DETECTA STATUS PELO SIP_CODE MESMO SEM TRANSCRIÇÃO
        // Isso é importante para casos como sip 603, 487, 486, 480
        // onde a chamada não foi atendida e o áudio é só toque (sem voz)
        if (sipCode) {
          statusFinal = detectarStatusPorTranscricao(transcricao, duracaoSegundos, sipCode)
          console.log("[TotalPhone] Status detectado pelo sip_code da API:", statusFinal, '(sip:', sipCode, ')')
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
    // Só dispara análise IA se TODAS as condições forem verdadeiras
    const podeAnalisarComIA = (() => {
      // 1. Status deve ser "atendida"
      if (statusFinal !== 'atendida') {
        console.log('[Análise IA] ❌ Bloqueada: status não é atendida (status:', statusFinal, ')')
        return false
      }
      
      // 2. Sip code deve ser 200 (chamada efetivamente atendida)
      const sip = typeof sipCode === 'string' ? parseInt(sipCode) : sipCode
      if (sipCode && sip !== 200) {
        console.log('[Análise IA] ❌ Bloqueada: sip code não é 200 (sip:', sip, ')')
        return false
      }
      
      // 3. Duração mínima de 30 segundos (conversa real)
      if (duracaoSegundos < 30) {
        console.log('[Análise IA] ❌ Bloqueada: duração curta (', duracaoSegundos, 's)')
        return false
      }
      
      // 4. Transcrição deve existir e ter tamanho mínimo
      if (!transcricao || transcricao.length < 100) {
        console.log('[Análise IA] ❌ Bloqueada: transcrição muito curta')
        return false
      }
      
      // 5. Transcrição deve parecer ligação real (não áudio ambiente)
      const validacao = transcricaoEhDeLigacaoReal(transcricao, duracaoSegundos)
      if (!validacao.valida) {
        console.log('[Análise IA] ❌ Bloqueada: transcrição não parece ligação real (motivo:', validacao.motivo, ')')
        return false
      }
      
      return true
    })()

    if (podeAnalisarComIA) {
      try {
        console.log('[Análise IA] ✅ Disparando análise com Claude...')
        analise = await analisarComClaude(
          transcricao,
          tipoLigacao,
          duracaoSegundos,
          vendedorData?.vendedor || 'Vendedor'
        )
        if (analise) {
          console.log('[Análise IA] ✅ Análise concluída. Score geral:', analise.score_geral)
        }
      } catch (analiseError) {
        console.error('[Análise IA] Erro:', analiseError)
      }
    }
    
    // 4. Salva áudio no Blob (para o Kommo player funcionar)
    if (audioBuffer) {
      try {
        console.log("[TotalPhone] Salvando áudio no Blob...")
        
        // Tenta converter WAV para MP3 com CloudConvert
        let audioParaSalvar = audioBuffer
        let formatoSalvo = 'wav'
        
        try {
          const mp3Buffer = await converterWAVParaMP3CloudConvert(audioBuffer)
          if (mp3Buffer && mp3Buffer.length > 1000) {
            audioParaSalvar = mp3Buffer
            formatoSalvo = 'mp3'
            console.log('[TotalPhone] ✅ Usando MP3 convertido')
          } else {
            console.log('[TotalPhone] ⚠️ MP3 não gerado, usando WAV')
          }
        } catch (convError) {
          console.warn('[TotalPhone] ⚠️ Erro na conversão CloudConvert, usando WAV:', convError)
        }
        
        const blobResult = await put(
          `ligacoes/${callid}.${formatoSalvo}`,
          audioParaSalvar,
          {
            access: "public",
            contentType: formatoSalvo === 'mp3' ? "audio/mpeg" : "audio/wav",
            token: process.env.ATENTIMENTOS_READ_WRITE_TOKEN,
          }
        )
        
        audioBlobUrl = blobResult.url
        console.log("[TotalPhone] Áudio salvo no Blob:", audioBlobUrl, `(${formatoSalvo.toUpperCase()})`)
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
