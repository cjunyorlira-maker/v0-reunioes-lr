import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Caixa-preta da gravação: registra cada passo (aceita fetch e sendBeacon)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { atendimentoId, evento, detalhe, usuario } = body || {}
    if (!atendimentoId || !evento) return NextResponse.json({ ok: false }, { status: 400 })
    const supabase = createSupabaseAdmin()
    await supabase.from("gravacao_eventos").insert({
      atendimento_id: atendimentoId,
      evento,
      detalhe: detalhe || null,
      usuario: usuario || null,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }) // telemetria nunca quebra o fluxo
  }
}
