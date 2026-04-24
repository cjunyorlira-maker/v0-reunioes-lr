import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE() {
  try {
    const supabase = await createClient()

    // Deleta todos os atendimentos
    const { error } = await supabase
      .from("atendimentos")
      .delete()
      .neq("id", "") // Deleta todos

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: "Todos os 11 atendimentos foram deletados com sucesso"
    })
  } catch (error) {
    console.error("[v0] Erro ao limpar atendimentos:", error)
    return NextResponse.json(
      { error: "Erro ao limpar atendimentos" },
      { status: 500 }
    )
  }
}
