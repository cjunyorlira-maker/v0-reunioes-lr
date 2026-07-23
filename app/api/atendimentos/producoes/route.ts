import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// GET: lista as produções configuradas (mais recente primeiro)
export async function GET() {
  const supabase = createSupabaseAdmin()
  const { data } = await supabase.from("producoes_config")
    .select("id, nome, data_inicio, data_fim")
    .order("data_inicio", { ascending: false })
  return NextResponse.json({ producoes: data || [] })
}

// POST: cria ou edita uma produção { id?, nome, data_inicio, data_fim } | DELETE via { id, excluir: true }
export async function POST(request: Request) {
  const body = await request.json()
  const supabase = createSupabaseAdmin()
  if (body.excluir && body.id) {
    await supabase.from("producoes_config").delete().eq("id", body.id)
    return NextResponse.json({ ok: true })
  }
  if (!body.nome || !body.data_inicio || !body.data_fim) {
    return NextResponse.json({ error: "nome, data_inicio e data_fim são obrigatórios" }, { status: 400 })
  }
  if (body.id) {
    await supabase.from("producoes_config").update({ nome: body.nome, data_inicio: body.data_inicio, data_fim: body.data_fim }).eq("id", body.id)
  } else {
    await supabase.from("producoes_config").insert({ nome: body.nome, data_inicio: body.data_inicio, data_fim: body.data_fim })
  }
  return NextResponse.json({ ok: true })
}
