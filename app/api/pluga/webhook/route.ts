import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// IDs dos campos customizados do Kommo
const CAMPO_ORIGEM_ID = 797344

// GET - Para o Pluga verificar se a API está funcionando
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "Webhook Pluga LR Multimarcas ativo",
    timestamp: new Date().toISOString()
  }, { status: 200 })
}

// OPTIONS - Para CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

// IDs de status de leads perdidos no Kommo (para filtrar)
const STATUS_PERDIDO_IDS = [143, 142] // Ajustar conforme seu pipeline

// Webhook para receber eventos do Pluga
// Pluga pode enviar: { nome, origem, Qualifiquei, lead_id?, id? }
// Se lead_id vier, usa direto. Senão busca pelo nome EXATO no Kommo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Log completo do payload para debug
    console.log("[v0] ========== PLUGA WEBHOOK ==========")
    console.log("[v0] Payload completo:", JSON.stringify(body, null, 2))
    console.log("[v0] Chaves recebidas:", Object.keys(body))
    
    // Campos que vêm do Pluga - verifica TODAS as possíveis chaves de lead_id
    const lead_id_from_pluga = body.lead_id || body.id || body.leadId || body.ID || body.card_id || body.cardId
    const lead_nome = body.nome || body.lead_nome || body.name || body.lead_name
    const origem = body.origem || body.origin
    const data_evento = body.Qualifiquei || body.qualifiquei || body.data_evento || body.data_qualificacao

    console.log("[v0] lead_id do Pluga:", lead_id_from_pluga)
    console.log("[v0] nome:", lead_nome)
    console.log("[v0] origem:", origem)
    console.log("[v0] data_evento:", data_evento)

    if (!lead_nome && !lead_id_from_pluga) {
      return NextResponse.json({ error: "Campo obrigatório: nome ou lead_id" }, { status: 400 })
    }

    // Tipo é sempre "qualificado" (único evento que o Pluga está disparando)
    const tipo = "qualificado"
    
    // Dados finais
    let finalLeadId: string | null = lead_id_from_pluga?.toString() || null
    let finalVendedor: string | null = null
    let finalEquipe: string | null = null
    let finalOrigem = origem || null
    let finalLeadNome = lead_nome || null

    // Busca o lead no Kommo
    const token = process.env.KOMMO_ACCESS_TOKEN
    const subdomain = process.env.KOMMO_SUBDOMAIN

    if (token && subdomain) {
      try {
        let leadData = null

        // Se veio lead_id do Pluga, busca direto pelo ID (mais preciso)
        if (finalLeadId) {
          console.log("[v0] Buscando lead pelo ID:", finalLeadId)
          const leadResponse = await fetch(
            `https://${subdomain}.kommo.com/api/v4/leads/${finalLeadId}`,
            {
              headers: { "Authorization": `Bearer ${token}` },
            }
          )
          if (leadResponse.ok) {
            leadData = await leadResponse.json()
            console.log("[v0] Lead encontrado por ID:", leadData.name, "Responsible:", leadData.responsible_user_id)
          }
        }
        
        // Se não veio lead_id ou não encontrou, busca pelo nome
        if (!leadData && lead_nome) {
          console.log("[v0] Buscando lead pelo nome:", lead_nome)
          const searchResponse = await fetch(
            `https://${subdomain}.kommo.com/api/v4/leads?query=${encodeURIComponent(lead_nome)}&limit=50`,
            {
              headers: { "Authorization": `Bearer ${token}` },
            }
          )

          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            const leads = searchData._embedded?.leads || []
            
            console.log("[v0] Leads encontrados:", leads.length)
            
            if (leads.length > 0) {
              // Filtra leads perdidos e busca o que tem nome EXATO
              const leadsAtivos = leads.filter((l: any) => !STATUS_PERDIDO_IDS.includes(l.status_id))
              console.log("[v0] Leads ativos (não perdidos):", leadsAtivos.length)
              
              // Primeiro tenta match exato pelo nome
              let matchExato = leadsAtivos.find((l: any) => l.name === lead_nome)
              
              // Se não achar exato, pega o mais recente entre os ativos
              if (!matchExato && leadsAtivos.length > 0) {
                matchExato = leadsAtivos.sort((a: any, b: any) => {
                  const dateA = new Date(a.updated_at || a.created_at).getTime()
                  const dateB = new Date(b.updated_at || b.created_at).getTime()
                  return dateB - dateA
                })[0]
              }
              
              if (matchExato) {
                leadData = matchExato
                console.log("[v0] Lead selecionado:", leadData.name, "ID:", leadData.id, "Status:", leadData.status_id)
              }
            }
          }
        }

        if (leadData) {
          finalLeadId = leadData.id?.toString() || finalLeadId
          finalLeadNome = finalLeadNome || leadData.name

          // Busca dados do responsável (vendedor e equipe)
          if (leadData.responsible_user_id) {
            console.log("[v0] Buscando user ID:", leadData.responsible_user_id)
            const userResponse = await fetch(
              `https://${subdomain}.kommo.com/api/v4/users/${leadData.responsible_user_id}?with=group`,
              {
                headers: { "Authorization": `Bearer ${token}` },
              }
            )

            if (userResponse.ok) {
              const user = await userResponse.json()
              console.log("[v0] User encontrado:", user.name, "ID:", user.id)
              finalVendedor = user.name || "Não informado"
              finalEquipe = user._embedded?.groups?.[0]?.name || user.group?.name || "Sem equipe"
            }
          }

          // Extrai origem do Kommo se não veio do Pluga
          if (!finalOrigem) {
            const customFields = leadData.custom_fields_values || []
            for (const field of customFields) {
              if (field.field_id === CAMPO_ORIGEM_ID) {
                finalOrigem = field.values?.[0]?.enum || field.values?.[0]?.value || null
                break
              }
            }
          }
        } else {
          console.log("[v0] Lead não encontrado no Kommo")
        }
      } catch (kommoError) {
        console.error("[v0] Erro ao buscar dados no Kommo:", kommoError)
      }
    } else {
      console.error("[v0] Kommo não configurado - faltam KOMMO_ACCESS_TOKEN ou KOMMO_SUBDOMAIN")
    }

    // Usa a data_evento que vem do Pluga ou data atual
    const dataEventoFormatada = data_evento 
      ? new Date(data_evento).toISOString() 
      : new Date().toISOString()

    console.log("[v0] ========== SALVANDO ==========")
    console.log("[v0] lead_id final:", finalLeadId)
    console.log("[v0] lead_nome final:", finalLeadNome)
    console.log("[v0] vendedor final:", finalVendedor)
    console.log("[v0] equipe final:", finalEquipe)

    // Insere o evento na tabela
    const { data, error } = await supabase
      .from("pluga_eventos")
      .insert({
        tipo: tipo,
        lead_id: finalLeadId || `pluga_${Date.now()}`,
        lead_nome: finalLeadNome || lead_nome,
        vendedor: finalVendedor || "Não informado",
        equipe: finalEquipe || "Sem equipe",
        origem: finalOrigem,
        data_evento: dataEventoFormatada,
      })
      .select()

    if (error) {
      console.error("[v0] Erro ao salvar evento Pluga:", error)
      return NextResponse.json({ error: "Erro ao processar evento", details: error.message }, { status: 500 })
    }

    console.log(`[v0] Evento ${tipo} registrado: ${lead_nome} - Vendedor: ${finalVendedor}, Equipe: ${finalEquipe}, Origem: ${finalOrigem}`)

    // Também insere na tabela qualificacoes para o dashboard
    if (tipo === "qualificado") {
      const dataQualFormatada = data_evento 
        ? new Date(data_evento).toISOString().split("T")[0] 
        : new Date().toISOString().split("T")[0]

      const { error: qualError } = await supabase
        .from("qualificacoes")
        .upsert({
          kommo_id: finalLeadId,
          kommo_lead_id: finalLeadId,
          nome: finalLeadNome || lead_nome,
          responsavel: finalVendedor || "Não informado",
          equipe: finalEquipe || "Sem equipe",
          origem: finalOrigem,
          data_qualificacao: dataQualFormatada,
        }, { onConflict: "kommo_id" })

      if (qualError) {
        console.error("[v0] Erro ao salvar na tabela qualificacoes:", qualError)
      } else {
        console.log("[v0] Qualificação salva na tabela qualificacoes")
      }
    }

    return NextResponse.json({ 
      success: true, 
      data,
      leadInfo: {
        lead_id: finalLeadId,
        nome: lead_nome,
        vendedor: finalVendedor,
        equipe: finalEquipe,
        origem: finalOrigem,
        dataEvento: dataEventoFormatada
      }
    }, { status: 200 })
  } catch (error) {
    console.error("[v0] Erro no webhook Pluga:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
