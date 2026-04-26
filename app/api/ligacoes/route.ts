import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const equipe = searchParams.get("equipe")
    const vendedor = searchParams.get("vendedor")
    const status = searchParams.get("status")
    const dataInicio = searchParams.get("dataInicio")
    const dataFim = searchParams.get("dataFim")

    const supabase = createSupabaseAdmin()

    let query = supabase
      .from("ligacoes")
      .select("*")
      .order("data_ligacao", { ascending: false })

    if (equipe && equipe !== "all") {
      query = query.eq("equipe", equipe)
    }

    if (vendedor) {
      query = query.eq("vendedor", vendedor)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (dataInicio) {
      query = query.gte("data_ligacao", dataInicio)
    }

    if (dataFim) {
      query = query.lte("data_ligacao", dataFim)
    }

    const { data, error } = await query.limit(500)

    if (error) {
      console.error("[v0] Erro ao buscar ligacoes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ligacoes: data || [] })
  } catch (error) {
    console.error("[v0] Erro na API ligacoes:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
