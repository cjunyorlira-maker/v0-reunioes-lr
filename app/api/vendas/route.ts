import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getPeriodoProducaoAtual } from "@/lib/periodo-producao"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Período de produção: dia 21 ao dia 20 do mês seguinte
    const periodo = getPeriodoProducaoAtual()

    const { data: vendas, error } = await supabase
      .from("vendas")
      .select("*")
      .gte("data_venda", periodo.inicio)
      .lte("data_venda", periodo.fim)
      .order("data_venda", { ascending: false })

    if (error) {
      console.error("Erro ao buscar vendas:", error)
      return NextResponse.json({ vendas: [] })
    }

    return NextResponse.json({ 
      vendas: vendas || [],
      periodo: {
        inicio: periodo.inicio,
        fim: periodo.fim,
        mesReferencia: periodo.mesReferencia,
      }
    })
  } catch (err) {
    console.error("Erro na API de vendas:", err)
    return NextResponse.json({ vendas: [] })
  }
}
