import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Corrigir/definir quem atendeu (preenchido pela própria equipe no card)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { atendente } = await request.json()
  if (!atendente || typeof atendente !== "string") {
    return NextResponse.json({ error: "atendente é obrigatório" }, { status: 400 })
  }
  const supabase = createSupabaseAdmin()
  const { error } = await supabase.from("atendimentos")
    .update({ atendente: atendente.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
