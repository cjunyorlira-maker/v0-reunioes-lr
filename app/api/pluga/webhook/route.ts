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

// Webhook para receber eventos do Pluga
// Pluga envia apenas: { nome, origem, Qualifiquei }
// A API busca o lead pelo nome no Kommo para pegar lead_id, vendedor e equipe
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("[v0] Pluga webhook recebido:", JSON.stringify(body))
    
    // Campos que vêm do Pluga
    const lead_nome = body.nome || body.lead_nome || body.name
    const origem = body.origem || body.origin
    const data_evento = body.Qualifiquei || body.qualifiquei || body.data_evento

    if (!lead_nome) {
      return NextResponse.json({ error: "Campo obrigatório: nome" }, { status: 400 })
    }

    // Tipo é sempre "qualificado" (único evento que o Pluga está disparando)
    const tipo = "qualificado"
    
    // Dados finais
    let finalLeadId: string | null = null
    let finalVendedor: string | null = null
    let finalEquipe: string | null = null
    let finalOrigem = origem || null

    // Busca o lead pelo nome no Kommo
    const token = process.env.KOMMO_ACCESS_TOKEN
    const subdomain = process.env.KOMMO_SUBDOMAIN

    if (token && subdomain) {
      try {
        // Busca leads pelo nome
        const searchResponse = await fetch(
          `https://${subdomain}.kommo.com/api/v4/leads?query=${encodeURIComponent(lead_nome)}&limit=1`,
          {
            headers: { "Authorization": `Bearer ${token}` },
          }
        )

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          const leads = searchData._embedded?.leads || []
          
          if (leads.length > 0) {
            const leadData = leads[0]
            finalLeadId = leadData.id?.toString() || null

            // Busca dados do responsável (vendedor e equipe)
            if (leadData.responsible_user_id) {
              const userResponse = await fetch(
                `https://${subdomain}.kommo.com/api/v4/users/${leadData.responsible_user_id}?with=group`,
                {
                  headers: { "Authorization": `Bearer ${token}` },
                }
              )

              if (userResponse.ok) {
                const user = await userResponse.json()
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
            console.log("[v0] Lead não encontrado no Kommo pelo nome:", lead_nome)
          }
        } else {
          console.error("[v0] Erro ao buscar lead no Kommo:", await searchResponse.text())
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

    // Insere o evento na tabela
    const { data, error } = await supabase
      .from("pluga_eventos")
      .insert({
        tipo: tipo,
        lead_id: finalLeadId || `pluga_${Date.now()}`,
        lead_nome: lead_nome,
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
