import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CAMPO_ORIGEM_ID = 797344

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lead_id } = body

    if (!lead_id) {
      return NextResponse.json({ error: "lead_id obrigatório" }, { status: 400 })
    }

    const token = process.env.KOMMO_ACCESS_TOKEN
    const subdomain = process.env.KOMMO_SUBDOMAIN

    if (!token || !subdomain) {
      return NextResponse.json({ error: "Kommo não configurado" }, { status: 500 })
    }

    // Busca dados atualizados do lead no Kommo
    const leadResponse = await fetch(
      `https://${subdomain}.kommo.com/api/v4/leads/${lead_id}`,
      {
        headers: { "Authorization": `Bearer ${token}` },
      }
    )

    if (!leadResponse.ok) {
      return NextResponse.json({ error: "Lead não encontrado no Kommo" }, { status: 404 })
    }

    const leadData = await leadResponse.json()
    let vendedor = "Não informado"
    let equipe = "Sem equipe"

    // Busca dados do responsável
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
        equipe = user._embedded?.groups?.[0]?.name || user.group?.name || "Sem equipe"
      }
    }

    // Busca origem
    let origem = null
    const customFields = leadData.custom_fields_values || []
    for (const field of customFields) {
      if (field.field_id === CAMPO_ORIGEM_ID) {
        origem = field.values?.[0]?.enum || field.values?.[0]?.value || null
        break
      }
    }

    // Atualiza na tabela pluga_eventos
    const { error } = await supabase
      .from("pluga_eventos")
      .update({
        vendedor: vendedor,
        equipe: equipe,
        origem: origem,
      })
      .eq("lead_id", lead_id.toString())

    if (error) {
      console.error("[v0] Erro ao sincronizar:", error)
      return NextResponse.json({ error: "Erro ao sincronizar" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        lead_id,
        nome: leadData.name,
        vendedor,
        equipe,
        origem,
      }
    }, { status: 200 })
  } catch (error) {
    console.error("[v0] Erro no sincronizar:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
