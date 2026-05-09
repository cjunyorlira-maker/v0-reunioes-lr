import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status, gravando } = await request.json()

    const allowed = ["aguardando", "gravando", "processando", "concluido", "erro"]
    if (!id || (!status && gravando === undefined)) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    if (status && !allowed.includes(status)) {
      return NextResponse.json({ error: "Status invalido" }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()
    
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status) updateData.status = status
    if (gravando !== undefined) updateData.gravando = gravando
    
    const { error } = await supabase
      .from("atendimentos")
      .update(updateData)
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
