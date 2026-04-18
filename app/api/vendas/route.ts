import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: vendas, error } = await supabase
      .from("vendas")
      .select("*")
      .order("data_venda", { ascending: false })

    if (error) {
      console.error("Erro ao buscar vendas:", error)
      return NextResponse.json({ vendas: [] })
    }

    return NextResponse.json({ vendas: vendas || [] })
  } catch (err) {
    console.error("Erro na API de vendas:", err)
    return NextResponse.json({ vendas: [] })
  }
}
