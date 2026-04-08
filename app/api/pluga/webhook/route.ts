import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// IDs dos campos customizados do Kommo
const CAMPO_ORIGEM_ID = 797344
const CAMPO_DATA_QUALIFICACAO_ID = 1026046

// Webhook para receber eventos do Pluga
// Pluga envia apenas: { tipo: "qualificado" | "agendei" | "veio" | "nao_veio" | "venda_fechada", lead_id }
// A API busca os dados completos diretamente no Kommo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tipo, lead_id } = body

    if (!tipo || !lead_id) {
      return NextResponse.json({ error: "Faltam campos obrigatórios: tipo e lead_id" }, { status: 400 })
    }

    const token = process.env.KOMMO_ACCESS_TOKEN
    const subdomain = process.env.KOMMO_SUBDOMAIN

    if (!token || !subdomain) {
      return NextResponse.json({ error: "Kommo não configurado" }, { status: 500 })
    }

    // Busca os dados do lead na API do Kommo
    const leadResponse = await fetch(
      `https://${subdomain}.kommo.com/api/v4/leads/${lead_id}?with=contacts`,
      {
        headers: { "Authorization": `Bearer ${token}` },
      }
    )

    if (!leadResponse.ok) {
      console.error("[v0] Lead não encontrado no Kommo:", lead_id)
      return NextResponse.json({ error: "Lead não encontrado no Kommo" }, { status: 404 })
    }

    const leadData = await leadResponse.json()
    const leadNome = leadData.name || "Sem nome"

    // Busca dados do responsável (vendedor)
    let vendedor = "Não informado"
    let equipe = "Sem equipe"

    if (leadData.responsible_user_id) {
      const userResponse = await fetch(
        `https://${subdomain}.kommo.com/api/v4/users/${leadData.responsible_user_id}?with=group`,
        {
          headers: { "Authorization": `Bearer ${token}` },
        }
      )

      if (userResponse.ok) {
        const user = await userResponse.json()
        vendedor = user.name || "Não informado"
        equipe = user._embedded?.groups?.[0]?.name || 
                 user.group?.name || 
                 "Sem equipe"
      }
    }

    // Extrai campos customizados
    let origem = null
    let dataQualificacao = null
    const customFields = leadData.custom_fields_values || []

    for (const field of customFields) {
      const fieldId = field.field_id
      const value = field.values?.[0]?.value

      // Origem do lead
      if (fieldId === CAMPO_ORIGEM_ID) {
        origem = field.values?.[0]?.enum || value || null
      }

      // Data de qualificação
      if (fieldId === CAMPO_DATA_QUALIFICACAO_ID) {
        if (value && typeof value === "number") {
          const date = new Date(value * 1000)
          dataQualificacao = date.toISOString()
        } else if (value && typeof value === "string") {
          dataQualificacao = value
        }
      }
    }

    // Usa a data de qualificação se existir, senão usa a data atual
    const dataEvento = dataQualificacao || new Date().toISOString()

    // Insere o evento na tabela
    const { data, error } = await supabase
      .from("pluga_eventos")
      .insert({
        tipo: tipo,
        lead_id: lead_id.toString(),
        lead_nome: leadNome,
        vendedor: vendedor,
        equipe: equipe,
        origem: origem,
        data_evento: dataEvento,
      })
      .select()

    if (error) {
      console.error("[v0] Erro ao salvar evento Pluga:", error)
      return NextResponse.json({ error: "Erro ao processar evento" }, { status: 500 })
    }

    console.log(`[v0] Evento ${tipo} registrado para lead ${lead_id} (${leadNome}) - Vendedor: ${vendedor}, Equipe: ${equipe}`)

    return NextResponse.json({ 
      success: true, 
      data,
      leadInfo: {
        nome: leadNome,
        vendedor,
        equipe,
        origem,
        dataEvento
      }
    }, { status: 200 })
  } catch (error) {
    console.error("[v0] Erro no webhook Pluga:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
