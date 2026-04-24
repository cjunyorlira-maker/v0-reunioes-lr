import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await request.json()

    const allowed = ["aguardando", "gravando", "processando", "concluido", "erro"]
    if (!id || !status || !allowed.includes(status)) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()
    const { error } = await supabase
      .from("atendimentos")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
