import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// API para buscar eventos do Pluga por período
// Uso: GET /api/pluga/eventos?tipo=qualificado&startDate=2026-04-06&endDate=2026-04-12
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo") || "qualificado"
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  try {
    let query = supabase
      .from("pluga_eventos")
      .select("*")
      .eq("tipo", tipo)
      .order("data_evento", { ascending: false })

    // Filtra por data se fornecido
    if (startDate) {
      query = query.gte("data_evento", `${startDate}T00:00:00`)
    }
    if (endDate) {
      query = query.lte("data_evento", `${endDate}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Erro ao buscar eventos Pluga:", error)
      return NextResponse.json({ error: "Erro ao buscar eventos" }, { status: 500 })
    }

    // Formata para o mesmo formato do useQualificados
    const leads = (data || []).map((evento) => ({
      id: evento.lead_id,
      nome: evento.lead_nome,
      responsavel: evento.vendedor,
      responsavel_id: null,
      equipe: evento.equipe,
      origem: evento.origem,
      criado_em: evento.created_at,
      atualizado_em: evento.created_at,
      data_qualificacao: evento.data_evento?.split("T")[0] || null,
    }))

    return NextResponse.json({
      total: leads.length,
      leads,
    })
  } catch (error) {
    console.error("[v0] Erro ao buscar eventos Pluga:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
