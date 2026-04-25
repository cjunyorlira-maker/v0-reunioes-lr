import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getPeriodoProducaoAtual } from "@/lib/periodo-producao"
import { after } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Controle simples para nao sincronizar a cada request - apenas a cada 2 minutos
let ultimaSinc: number = 0
const INTERVALO_SINC_MS = 2 * 60 * 1000 // 2 minutos

export async function GET() {
  try {
    // Período de produção: dia 21 ao dia 20 do mês seguinte
    const periodo = getPeriodoProducaoAtual()

    // Dispara sincronizacao com Kommo em background (nao bloqueia a resposta)
    // Apenas sincroniza se passaram mais de 2 minutos desde a ultima vez
    const agora = Date.now()
    if (agora - ultimaSinc > INTERVALO_SINC_MS) {
      ultimaSinc = agora
      after(async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
          await fetch(`${baseUrl}/api/vendas/sync`, { method: "POST" })
          console.log("[v0] Sincronizacao de vendas disparada em background")
        } catch (e) {
          console.error("[v0] Erro ao disparar sync de vendas:", e)
        }
      })
    }

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

// POST - Registrar nova venda quando lead é marcado como venda fechada
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { lead_id, nome_lead, responsavel, kommo_id, atendente, valor_venda, origem } = body

    // Verifica se já existe uma venda para esse lead (evita duplicatas)
    const { data: existingVenda } = await supabase
      .from("vendas")
      .select("id")
      .eq("kommo_id", kommo_id)
      .single()

    if (existingVenda) {
      return NextResponse.json({ success: true, message: "Venda já registrada", venda: existingVenda })
    }

    // Cria novo registro de venda
    const { data: venda, error } = await supabase
      .from("vendas")
      .insert({
        nome_lead,
        responsavel,
        kommo_id,
        atendente: atendente || null,
        valor_venda: valor_venda || 0,
        origem: origem || "manual",
        data_venda: new Date().toISOString().split("T")[0],
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao registrar venda:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, venda })
  } catch (err) {
    console.error("Erro na API de vendas POST:", err)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

// DELETE - Remover venda quando desmarca venda fechada
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const kommo_id = searchParams.get("kommo_id")

    if (!kommo_id) {
      return NextResponse.json({ success: false, error: "kommo_id obrigatório" }, { status: 400 })
    }

    const { error } = await supabase
      .from("vendas")
      .delete()
      .eq("kommo_id", kommo_id)

    if (error) {
      console.error("Erro ao remover venda:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Erro na API de vendas DELETE:", err)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
