import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { gravando, gravando_por } = await request.json()
    
    const supabase = createSupabaseAdmin()

    const { error } = await supabase
      .from("atendimentos")
      .update({
        gravando: gravando,
        gravando_por: gravando ? gravando_por : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      console.error("[v0] Erro ao atualizar gravando:", error)
      return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Erro geral:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
