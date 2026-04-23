import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Calcula o primeiro e último dia do mês atual
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split("T")[0]
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().split("T")[0]

    const { data: vendas, error } = await supabase
      .from("vendas")
      .select("*")
      .gte("data_venda", firstDayOfMonth)
      .lte("data_venda", lastDayOfMonth)
      .order("data_venda", { ascending: false })

    if (error) {
      console.error("Erro ao buscar vendas:", error)
      return NextResponse.json({ vendas: [] })
    }

    return NextResponse.json({ 
      vendas: vendas || [],
      periodo: { inicio: firstDayOfMonth, fim: lastDayOfMonth }
    })
  } catch (err) {
    console.error("Erro na API de vendas:", err)
    return NextResponse.json({ vendas: [] })
  }
}
