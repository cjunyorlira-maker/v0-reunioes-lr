import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()

    const { data: atendimento, error } = await supabase
      .from("atendimentos")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("[v0] Erro ao buscar atendimento:", error)
      return NextResponse.json({ error: "Atendimento nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ atendimento })
  } catch (error) {
    console.error("[v0] Erro geral:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
