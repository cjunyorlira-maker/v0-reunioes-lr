import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapeamento de ramais para vendedores e equipes
const RAMAIS: Record<string, { vendedor: string; equipe: string }> = {
  "1000": { vendedor: "Leonardo Freitas", equipe: "Admin" },
  "1001": { vendedor: "Amanda Souza", equipe: "Elite" },
  "1002": { vendedor: "Thalia Fernanda", equipe: "Elite" },
  "1003": { vendedor: "Bianca Isabela", equipe: "TDM" },
  "1004": { vendedor: "Paulo Victor", equipe: "Guerreiros" },
  "1005": { vendedor: "Felipe Santos", equipe: "Guerreiros" },
  "1006": { vendedor: "Ana Gabrielly", equipe: "Gladiadores" },
  "1007": { vendedor: "Lucas Oliveira", equipe: "Gladiadores" },
  "1008": { vendedor: "Mariana Costa", equipe: "Samurais" },
  "1009": { vendedor: "Pedro Henrique", equipe: "Samurais" },
  "1010": { vendedor: "Julia Santos", equipe: "Legado" },
  "1011": { vendedor: "Gabriel Silva", equipe: "Legado" },
  "1012": { vendedor: "Isabelly Ribeiro", equipe: "Lobos" },
  "1013": { vendedor: "Carlos Eduardo", equipe: "Lobos" },
  "1014": { vendedor: "Fernanda Lima", equipe: "Elite" },
  "1015": { vendedor: "Rafael Costa", equipe: "Guerreiros" },
  "1016": { vendedor: "Beatriz Almeida", equipe: "Gladiadores" },
  "1017": { vendedor: "Matheus Souza", equipe: "Samurais" },
  "1018": { vendedor: "Larissa Oliveira", equipe: "Legado" },
  "1019": { vendedor: "Diego Ferreira", equipe: "Lobos" },
  "1020": { vendedor: "Camila Rodrigues", equipe: "TDM" },
  "1021": { vendedor: "Alex Negreiros", equipe: "Lobos" },
  "1022": { vendedor: "Priscila Martins", equipe: "Elite" },
  "1023": { vendedor: "Rodrigo Alves", equipe: "Guerreiros" },
  "1024": { vendedor: "Stephanie", equipe: "Gladiadores" },
}

// Extrai o ramal do numero de origem ou destino
function extrairRamal(numero: string): string | null {
  // O ramal geralmente é um numero de 4 digitos (1000-1099)
  if (!numero) return null
  
  // Se o numero tem 4 digitos e comeca com 10, é um ramal
  if (/^10\d{2}$/.test(numero)) {
    return numero
  }
  
  // Se tem mais digitos, tenta extrair os ultimos 4
  const match = numero.match(/10\d{2}$/)
  if (match) return match[0]
  
  return null
}

// Determina o status da ligacao baseado na duracao
function determinarStatus(duracao: number): string {
  if (duracao > 0) return "atendida"
  return "nao_atendida"
}

export async function POST(request: Request) {
  try {
    // Primeiro tenta ler como texto para debug
    const rawBody = await request.text()
    console.log("[TotalPhone Webhook] Body RAW recebido:", rawBody)
    
    // Tenta fazer parse do JSON, tratando possíveis problemas
    let data: any
    try {
      data = JSON.parse(rawBody)
    } catch (parseError) {
      console.error("[TotalPhone Webhook] Erro ao fazer parse do JSON:", parseError)
      console.error("[TotalPhone Webhook] Body que causou erro:", rawBody)
      
      // Tenta limpar o JSON (remover caracteres inválidos)
      try {
        const cleanedBody = rawBody
          .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
          .trim()
        data = JSON.parse(cleanedBody)
        console.log("[TotalPhone Webhook] JSON limpo com sucesso")
      } catch (cleanError) {
        return NextResponse.json({ 
          error: "JSON inválido recebido", 
          rawBody: rawBody.substring(0, 500) 
        }, { status: 400 })
      }
    }
    
    console.log("[TotalPhone Webhook] Dados parseados:", JSON.stringify(data, null, 2))
    
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
      operador_id,
      tipo_origem
    } = data
    
    if (!callid) {
      console.error("[TotalPhone Webhook] callid não fornecido")
      return NextResponse.json({ error: "callid obrigatório" }, { status: 400 })
    }
    
    // Determina se é entrada ou saida e quem é o vendedor
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
      // Pode vir como "00:01:30" ou "90"
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
      dataLigacaoFormatada = new Date(dataLigacao).toISOString()
    }
    
    // Salva no banco
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
        status: determinarStatus(duracaoSegundos),
        tipo_origem: tipo_origem || null,
        audio_url_original: gravacao || null,
        data_ligacao: dataLigacaoFormatada,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: "callid",
        ignoreDuplicates: false 
      })
      .select()
      .single()
    
    if (error) {
      console.error("[TotalPhone Webhook] Erro ao salvar:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log("[TotalPhone Webhook] Ligação salva:", ligacao?.id)
    
    return NextResponse.json({ 
      success: true, 
      id: ligacao?.id,
      vendedor: vendedorData?.vendedor,
      duracao: duracaoSegundos
    })
    
  } catch (error) {
    console.error("[TotalPhone Webhook] Erro:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Erro interno" 
    }, { status: 500 })
  }
}

// GET para verificar se o webhook está funcionando
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "Webhook TotalPhone ativo",
    timestamp: new Date().toISOString()
  })
}
