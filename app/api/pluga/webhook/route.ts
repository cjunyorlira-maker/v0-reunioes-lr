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
// Pluga envia: { lead_id, nome, origem, Qualifiquei (data), tipo? }
// A API busca vendedor e equipe no Kommo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("[v0] Pluga webhook recebido:", JSON.stringify(body))
    
    // Aceita diferentes formatos de campos do Pluga
    const lead_id = body.lead_id || body.id
    const lead_nome = body.nome || body.lead_nome || body.name
    const origem = body.origem || body.origin
    const data_evento = body.Qualifiquei || body.qualifiquei || body.data_evento || body.data_qualificacao
    const tipo = body.tipo || "qualificado" // Default para qualificado se não vier

    if (!lead_id) {
      return NextResponse.json({ error: "Campo obrigatório: lead_id" }, { status: 400 })
    }

    // Dados que vêm do Pluga
    let finalLeadNome = lead_nome || null
    let finalOrigem = origem || null
    
    // Vendedor e equipe sempre buscamos no Kommo
    let finalVendedor: string | null = null
    let finalEquipe: string | null = null

    // Busca vendedor e equipe no Kommo (sempre)
    const token = process.env.KOMMO_ACCESS_TOKEN
    const subdomain = process.env.KOMMO_SUBDOMAIN

    if (token && subdomain) {
      try {
        // Busca os dados do lead na API do Kommo
        const leadResponse = await fetch(
          `https://${subdomain}.kommo.com/api/v4/leads/${lead_id}?with=contacts`,
          {
            headers: { "Authorization": `Bearer ${token}` },
          }
        )

        if (leadResponse.ok) {
          const leadData = await leadResponse.json()
          
          // Se não veio nome do Pluga, pega do Kommo
          if (!finalLeadNome) {
            finalLeadNome = leadData.name || "Sem nome"
          }

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
          console.error("[v0] Lead não encontrado no Kommo:", lead_id, await leadResponse.text())
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
        lead_id: lead_id.toString(),
        lead_nome: finalLeadNome || "Sem nome",
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

    console.log(`[v0] Evento ${tipo} registrado para lead ${lead_id} (${finalLeadNome}) - Vendedor: ${finalVendedor}, Equipe: ${finalEquipe}, Origem: ${finalOrigem}`)

    return NextResponse.json({ 
      success: true, 
      data,
      leadInfo: {
        nome: finalLeadNome,
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
