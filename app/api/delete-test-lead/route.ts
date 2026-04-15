import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Deleta o lead de teste "teste celebração"
    const { data, error } = await supabase
      .from("leads")
      .delete()
      .eq("nome", "teste celebração")
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${data?.length || 0} lead(s) deletado(s)`,
      deleted: data
    })
  } catch (error) {
    console.error("[v0] Erro ao deletar lead:", error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
