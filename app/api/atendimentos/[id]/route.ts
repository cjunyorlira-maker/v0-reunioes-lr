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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()

    console.log("[v0] DELETE atendimento:", id)

    // Buscar atendimento
    const { data: atendimento, error: fetchError } = await supabase
      .from("atendimentos")
      .select("equipe")
      .eq("id", id)
      .single()

    if (fetchError || !atendimento) {
      return NextResponse.json({ error: "Atendimento nao encontrado" }, { status: 404 })
    }

    // Deletar atendimento
    const { error: deleteError } = await supabase
      .from("atendimentos")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[v0] Erro ao deletar:", deleteError)
      return NextResponse.json(
        { error: "Erro ao deletar atendimento" },
        { status: 500 }
      )
    }

    console.log("[v0] Atendimento deletado com sucesso:", id)
    return NextResponse.json({ success: true, message: "Atendimento deletado" })
  } catch (error: any) {
    console.error("[v0] Erro no DELETE:", error)
    return NextResponse.json(
      { error: "Erro ao processar delete" },
      { status: 500 }
    )
  }
}
