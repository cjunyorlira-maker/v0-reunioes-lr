import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: vendas, error } = await supabase
      .from("vendas")
      .select("*")
      .order("data_venda", { ascending: false })

    if (error) {
      console.error("Erro ao buscar vendas:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calcular rankings
    const porVendedor: Record<string, { total: number; valor: number }> = {}
    const porEquipe: Record<string, { total: number; valor: number }> = {}
    const porOrigem: Record<string, { total: number; valor: number }> = {}
    const porAvaliacao: Record<string, number> = { Excelente: 0, Bom: 0, "Sem avaliação": 0 }

    vendas?.forEach((venda) => {
      // Por vendedor
      if (!porVendedor[venda.responsavel]) {
        porVendedor[venda.responsavel] = { total: 0, valor: 0 }
      }
      porVendedor[venda.responsavel].total++
      porVendedor[venda.responsavel].valor += Number(venda.valor_venda)

      // Por equipe (usando primeira parte do nome como equipe temporária)
      const equipe = venda.responsavel.split(" ")[0]
      if (!porEquipe[equipe]) {
        porEquipe[equipe] = { total: 0, valor: 0 }
      }
      porEquipe[equipe].total++
      porEquipe[equipe].valor += Number(venda.valor_venda)

      // Por origem
      if (venda.origem) {
        if (!porOrigem[venda.origem]) {
          porOrigem[venda.origem] = { total: 0, valor: 0 }
        }
        porOrigem[venda.origem].total++
        porOrigem[venda.origem].valor += Number(venda.valor_venda)
      }

      // Por avaliação
      if (venda.avaliacao === "Excelente") {
        porAvaliacao["Excelente"]++
      } else if (venda.avaliacao === "Bom") {
        porAvaliacao["Bom"]++
      } else {
        porAvaliacao["Sem avaliação"]++
      }
    })

    // TOP 1 Vendedor
    const rankingVendedores = Object.entries(porVendedor)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.total - a.total || b.valor - a.valor)

    // TOP 1 por valor
    const rankingPorValor = Object.entries(porVendedor)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.valor - a.valor)

    // Ranking Origens
    const rankingOrigens = Object.entries(porOrigem)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.total - a.total)

    const totalVendas = vendas?.length || 0
    const valorTotal = vendas?.reduce((acc, v) => acc + Number(v.valor_venda), 0) || 0

    return NextResponse.json({
      vendas,
      stats: {
        totalVendas,
        valorTotal,
        top1Vendedor: rankingVendedores[0] || null,
        top1PorValor: rankingPorValor[0] || null,
        rankingVendedores,
        rankingOrigens,
        avaliacoes: porAvaliacao,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar vendas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
