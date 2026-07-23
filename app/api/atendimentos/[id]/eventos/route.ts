import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createSupabaseAdmin()
  const { data } = await supabase
    .from("gravacao_eventos")
    .select("evento, detalhe, usuario, criado_em")
    .eq("atendimento_id", id)
    .order("criado_em", { ascending: true })
    .limit(100)
  return NextResponse.json({ eventos: data || [] })
}
