import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import Anthropic from "@anthropic-ai/sdk"
import https from "https"
import http from "http"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

// Mapeamento de ramais para vendedores e equipes (ATUALIZADO)
const RAMAIS: Record<string, { vendedor: string; equipe: string }> = {
  "1000": { vendedor: "Leonardo Freitas", equipe: "Admin" },
  "1001": { vendedor: "Amanda Souza", equipe: "Elite" },
  "1002": { vendedor: "Ana Beatriz", equipe: "Elite" },
  "1003": { vendedor: "Bianca Isabela", equipe: "TDM" },
  "1004": { vendedor: "Alexia Cunha", equipe: "Guerreiros" },
  "1005": { vendedor: "Lidiane Fonseca", equipe: "Guerreiros" },
  "1006": { vendedor: "Rafaella Antunes", equipe: "Gladiadores" },
  "1007": { vendedor: "Nicolas Moraes", equipe: "Gladiadores" },
  "1008": { vendedor: "Gabrielly Pereira", equipe: "Samurais" },
  "1009": { vendedor: "Lucas Dionisio", equipe: "Samurais" },
  "1010": { vendedor: "João Victor", equipe: "Legado" },
  "1011": { vendedor: "Gisely Leal", equipe: "Legado" },
  "1012": { vendedor: "Emily Machado", equipe: "Lobos" },
  "1013": { vendedor: "Isabelly", equipe: "Lobos" },
  "1014": { vendedor: "Ana Gabrielly", equipe: "Elite" },
  "1015": { vendedor: "João Lucas", equipe: "Guerreiros" },
  "1016": { vendedor: "Willy Santana", equipe: "Gladiadores" },
  "1017": { vendedor: "Nathan Caue", equipe: "Samurais" },
  "1018": { vendedor: "Yuri Ryan Pereira", equipe: "Legado" },
  "1019": { vendedor: "Evelyn Rodrigues", equipe: "Lobos" },
  "1020": { vendedor: "Anaina Dantas", equipe: "TDM" },
  "1021": { vendedor: "Alex Negreiros", equipe: "Lobos" },
  "1022": { vendedor: "Kleinver Seabra", equipe: "Elite" },
  "1023": { vendedor: "Brayan", equipe: "Guerreiros" },
  "1024": { vendedor: "Rogério Martins", equipe: "Gladiadores" },
  "9999": { vendedor: "Suporte TotalPhone", equipe: "Admin" },
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
function detectarStatusPorTranscricao(transcricao: string, duracao: number): string {
  if (!transcricao || transcricao.trim().length === 0) {
    return duracao > 0 ? "atendida" : "nao_atendida"
  }
  
  const textoLower = transcricao.toLowerCase()
  
  // Padroes de caixa postal
  const padroesCaixaPostal = [
    "caixa postal",
    "deixe uma mensagem",
    "deixe sua mensagem",
    "após o sinal",
    "apos o sinal",
    "voicemail",
    "não está disponível no momento",
    "nao esta disponivel no momento",
    "grave sua mensagem",
    "caixa de mensagens"
  ]
  
  for (const padrao of padroesCaixaPostal) {
    if (textoLower.includes(padrao)) {
      return "caixa_postal"
    }
  }
  
  // Padroes de nao atendida / fora de area
  const padroesNaoAtendida = [
    "fora de área",
    "fora de area",
    "fora da área",
    "fora da area",
    "número inexistente",
    "numero inexistente",
    "não foi possível completar",
    "nao foi possivel completar",
    "número não existe",
    "numero nao existe",
    "temporariamente fora",
    "desligado ou fora",
    "não está recebendo",
    "nao esta recebendo",
    "tente mais tarde",
    "chamada não pode ser completada",
    "chamada nao pode ser completada"
  ]
  
  for (const padrao of padroesNaoAtendida) {
    if (textoLower.includes(padrao)) {
      return "nao_atendida"
    }
  }
  
  // Se duracao muito curta (< 10s) e transcricao muito curta, provavelmente cancelada
  if (duracao < 10 && transcricao.length < 50) {
    return "cancelada"
  }
  
  // Se tem conversa real (duracao > 30s e transcricao > 100 chars), foi atendida
  if (duracao > 30 && transcricao.length > 100) {
    return "atendida"
  }
  
  // Default baseado na duracao
  return duracao > 15 ? "atendida" : "nao_atendida"
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
          "Content-Type": "audio/mpeg",
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

// Analisa com Claude
async function analisarComClaude(transcricao: string): Promise<any> {
  try {
    const anthropic = new Anthropic()
    
    const prompt = `Você é um especialista em análise de vendas por telefone de consórcios.
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
${transcricao}`

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== "text") return null

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error("[TotalPhone] Erro na análise Claude:", error)
    return null
  }
}

// Envia chamada para o Kommo
async function enviarChamadaKommo(
  telefone: string,
  duracao: number,
  status: string,
  audioUrl: string,
  vendedorKommoId?: string
): Promise<string | null> {
  if (!KOMMO_ACCESS_TOKEN) {
    console.log("[TotalPhone] KOMMO_ACCESS_TOKEN não configurado")
    return null
  }

  try {
    // Mapeia status para call_status do Kommo
    // 1 = deixou voicemail, 2 = retornar, 3 = não atendeu, 4 = conversou, 5 = errado, 6 = ocupado
    let callStatus = 4 // conversou (default)
    if (status === "nao_atendida") callStatus = 3
    else if (status === "caixa_postal") callStatus = 1
    else if (status === "cancelada") callStatus = 3
    else if (status === "ocupado") callStatus = 6

    const callData = {
      direction: "outbound",
      duration: duracao,
      source: "TotalPhone",
      phone: telefone,
      link: audioUrl,
      call_status: callStatus,
      created_at: Math.floor(Date.now() / 1000),
    }

    const response = await fetch(
      "https://crm2lrmultimarcascom.kommo.com/api/v4/calls",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${KOMMO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([callData]),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[TotalPhone] Erro ao enviar chamada Kommo:", response.status, errorText)
      return null
    }

    const result = await response.json()
    console.log("[TotalPhone] Chamada enviada para Kommo:", result)
    return result?._embedded?.calls?.[0]?.id || null
  } catch (error) {
    console.error("[TotalPhone] Erro ao enviar chamada Kommo:", error)
    return null
  }
}

// Envia nota de analise para o Kommo
async function enviarNotaKommo(leadId: string, analise: any): Promise<void> {
  if (!KOMMO_ACCESS_TOKEN || !leadId) return

  try {
    const notaKommo = `[IA - Análise de Ligação]

Resumo: ${analise.resumo}

Score: ${analise.score_geral}/10

Pontos Positivos:
${analise.pontos_positivos?.map((p: string) => `- ${p}`).join('\n') || 'N/A'}

Pontos a Melhorar:
${analise.pontos_criticos?.map((p: string) => `- ${p}`).join('\n') || 'N/A'}

Próximo Passo: ${analise.proximo_passo_sugerido || 'N/A'}
Cliente Interessado: ${analise.cliente_interessado ? 'Sim' : 'Não'}
`
    
    await fetch(
      `https://crm2lrmultimarcascom.kommo.com/api/v4/leads/${leadId}/notes`,
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
    console.log("[TotalPhone] Nota enviada para Kommo")
  } catch (error) {
    console.error("[TotalPhone] Erro ao enviar nota Kommo:", error)
  }
}

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
    
    // Monta URL completa do áudio se for relativa
    // Usa HTTP (sem S) porque o certificado SSL do servidor é inválido para o IP
    let audioUrlOriginal = gravacao || null
    if (audioUrlOriginal && !audioUrlOriginal.startsWith("http")) {
      audioUrlOriginal = `http://45.170.138.80/suite/${audioUrlOriginal}`
    }
    
    console.log("[TotalPhone] Processando ligação:", {
      callid,
      ramal,
      vendedor: vendedorData?.vendedor,
      telefone: telefoneCliente,
      duracao: duracaoSegundos,
      audioUrl: audioUrlOriginal
    })
    
    // ========== PROCESSAMENTO AUTOMÁTICO ==========
    
    let audioBlobUrl: string | null = null
    let transcricao: string | null = null
    let analise: any = null
    let statusFinal = duracaoSegundos > 0 ? "atendida" : "nao_atendida"
    
    // 1. Baixa o áudio primeiro (usando HTTP - HTTPS retorna HTML)
    let audioBuffer: Buffer | null = null
    
    if (audioUrlOriginal) {
      // Força HTTP (HTTPS retorna HTML por causa do certificado inválido para IP)
      const httpUrl = audioUrlOriginal.replace('https://', 'http://')
      
      console.log("[TotalPhone] Baixando áudio via HTTP:", httpUrl)
      
      try {
        audioBuffer = await new Promise<Buffer>((resolve, reject) => {
          const url = new URL(httpUrl)
          
          const options = {
            hostname: url.hostname,
            port: 80,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'audio/mpeg, audio/wav, audio/*, */*',
            },
          }
          
          const req = http.request(options, (res) => {
            // Segue redirect (301, 302, 307, 308)
            if ([301, 302, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
              console.log("[TotalPhone] Redirect para:", res.headers.location)
              
              // Faz nova requisição para a URL de redirect
              const redirectUrl = res.headers.location as string
              fetch(redirectUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': 'audio/mpeg, audio/wav, audio/*, */*',
                }
              }).then(async (redirectRes) => {
                const contentType = redirectRes.headers.get('content-type') || ''
                if (contentType.includes('text/html')) {
                  reject(new Error('Redirect retornou HTML em vez de áudio'))
                  return
                }
                
                const arrayBuffer = await redirectRes.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)
                console.log("[TotalPhone] Áudio baixado do redirect:", buffer.length, "bytes, tipo:", contentType)
                resolve(buffer)
              }).catch(reject)
              return
            }
            
            const chunks: Buffer[] = []
            const contentType = res.headers['content-type'] || ''
            
            if (contentType.includes('text/html')) {
              reject(new Error('Servidor retornou HTML em vez de áudio'))
              return
            }
            
            res.on('data', (chunk) => chunks.push(chunk))
            res.on('end', () => {
              const buffer = Buffer.concat(chunks)
              console.log("[TotalPhone] Áudio baixado:", buffer.length, "bytes, tipo:", contentType)
              resolve(buffer)
            })
            res.on('error', reject)
          })
          
          req.on('error', (err) => reject(err))
          req.end()
        })
        
      } catch (downloadError) {
        console.error("[TotalPhone] Erro ao baixar áudio:", downloadError)
        audioBuffer = null
      }
    }
    
    // 2. Transcreve o áudio (agora com buffer em vez de URL)
    if (audioBuffer && DEEPGRAM_API_KEY) {
      try {
        console.log("[TotalPhone] Transcrevendo áudio com Deepgram...")
        transcricao = await transcreverComDeepgram(audioBuffer)
        
        if (transcricao) {
          console.log("[TotalPhone] Transcrição:", transcricao.substring(0, 200))
          
          // 3. Detecta status pela transcrição
          statusFinal = detectarStatusPorTranscricao(transcricao, duracaoSegundos)
          console.log("[TotalPhone] Status detectado:", statusFinal)
          
          // 4. Analisa com Claude (só se foi atendida e tem conversa)
          if (statusFinal === "atendida" && transcricao.length > 50) {
            console.log("[TotalPhone] Analisando com Claude...")
            analise = await analisarComClaude(transcricao)
          }
        }
      } catch (transcricaoError) {
        console.error("[TotalPhone] Erro na transcrição:", transcricaoError)
      }
    }
    
    // 5. Salva áudio no Blob (para o Kommo player funcionar)
    if (audioBuffer) {
      try {
        console.log("[TotalPhone] Salvando áudio no Blob...")
        
        const blobResult = await put(
          `ligacoes/${callid}.mp3`,
          audioBuffer,
          {
            access: "public",
            contentType: "audio/mpeg",
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
        audio_url_original: audioUrlOriginal,
        audio_url: audioBlobUrl,
        transcricao,
        analise_ia: analise,
        score_geral: analise?.score_geral || null,
        resumo: analise?.resumo || null,
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
    
    // 6. Envia para Kommo
    if (audioBlobUrl && telefoneCliente) {
      const telefoneNormalizado = normalizarTelefone(telefoneCliente)
      console.log("[TotalPhone] Telefone normalizado:", telefoneCliente, "->", telefoneNormalizado)
      
      const kommoCallId = await enviarChamadaKommo(
        telefoneNormalizado,
        duracaoSegundos,
        statusFinal,
        audioBlobUrl
      )
      
      // Se tiver análise e lead, envia nota
      if (analise && ligacao?.kommo_lead_id) {
        await enviarNotaKommo(ligacao.kommo_lead_id, analise)
      }
      
      // Atualiza com ID do Kommo
      if (kommoCallId) {
        await supabase
          .from("ligacoes")
          .update({ 
            kommo_call_id: kommoCallId,
            enviado_kommo: true 
          })
          .eq("id", ligacao?.id)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      id: ligacao?.id,
      vendedor: vendedorData?.vendedor,
      status: statusFinal,
      duracao: duracaoSegundos,
      transcricao: transcricao ? "Sim" : "Não",
      analise: analise ? "Sim" : "Não"
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
