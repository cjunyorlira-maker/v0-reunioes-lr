import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getPeriodoProducaoAtual } from "@/lib/periodo-producao"

// Inicializa Supabase apenas se as variáveis estiverem disponíveis
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null

export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase não configurado" },
        { status: 500 }
      )
    }

    // Aceita filtro de datas via query params.
    // Se NAO vier filtro: retorna TODAS as vendas (espelho da etapa "Vendido" do Kommo),
    // pois o sync ja garante que a tabela so contem vendas da etapa de producao atual.
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const periodoProd = getPeriodoProducaoAtual()

    let query = supabase
      .from("vendas")
      .select("*")
      .order("data_venda", { ascending: false })

    // Aplica filtro de datas APENAS se ambos vierem na query (ex: dashboard com periodo custom)
    if (startDate && endDate) {
      query = query.gte("data_venda", startDate).lte("data_venda", endDate)
    }

    const { data: vendas, error } = await query

    if (error) {
      console.error("Erro ao buscar vendas:", error)
      return NextResponse.json({ vendas: [] })
    }

    // Headers para evitar cache - dados sempre frescos
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }

    return NextResponse.json({ 
      vendas: vendas || [],
      periodo: {
        inicio: startDate || periodoProd.inicio,
        fim: endDate || periodoProd.fim,
        mesReferencia: periodoProd.mesReferencia,
      },
      _timestamp: Date.now(), // Para debug - mostra quando os dados foram buscados
    }, { headers })
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
