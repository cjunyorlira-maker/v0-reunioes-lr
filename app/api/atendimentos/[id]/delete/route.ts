import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdmin()
    const atendimentoId = params.id

    console.log("[v0] DELETE atendimento:", atendimentoId)

    // Buscar atendimento para verificar equipe
    const { data: atendimento, error: fetchError } = await supabase
      .from("atendimentos")
      .select("equipe")
      .eq("id", atendimentoId)
      .single()

    if (fetchError || !atendimento) {
      return NextResponse.json({ error: "Atendimento não encontrado" }, { status: 404 })
    }

    // Permitir delete apenas para equipe Admin
    if (atendimento.equipe !== "Admin") {
      return NextResponse.json(
        { error: "Apenas Admin pode deletar atendimentos" },
        { status: 403 }
      )
    }

    // Deletar atendimento
    const { error: deleteError } = await supabase
      .from("atendimentos")
      .delete()
      .eq("id", atendimentoId)

    if (deleteError) {
      console.error("[v0] Erro ao deletar:", deleteError)
      return NextResponse.json(
        { error: "Erro ao deletar atendimento" },
        { status: 500 }
      )
    }

    console.log("[v0] Atendimento deletado com sucesso")
    return NextResponse.json({ success: true, message: "Atendimento deletado" })
  } catch (error: any) {
    console.error("[v0] Erro no DELETE:", error)
    return NextResponse.json(
      { error: "Erro ao processar delete" },
      { status: 500 }
    )
  }
}
