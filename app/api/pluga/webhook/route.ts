import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Webhook para receber eventos do Pluga
// Pluga envia: { event: "qualificado" | "agendei" | "marcado", lead_id, vendedor, equipe, data_evento }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event, lead_id, vendedor, equipe, data_evento } = body

    if (!event || !lead_id) {
      return NextResponse.json({ error: "Faltam campos obrigatórios" }, { status: 400 })
    }

    // Insere o evento na tabela
    const { data, error } = await supabase
      .from("pluga_eventos")
      .insert({
        tipo: event, // qualificado, agendei, marcado, etc
        lead_id,
        vendedor: vendedor || null,
        equipe: equipe || null,
        data_evento: data_evento || new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error("[v0] Erro ao salvar evento Pluga:", error)
      return NextResponse.json({ error: "Erro ao processar evento" }, { status: 500 })
    }

    console.log(`[v0] Evento ${event} registrado para lead ${lead_id}`)

    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error) {
    console.error("[v0] Erro no webhook Pluga:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
