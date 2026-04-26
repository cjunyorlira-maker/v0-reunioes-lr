import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/supabase/admin"

interface VendedorStats {
  vendedor: string
  equipe: string
  total: number
  atendidas: number
  nao_atendidas: number
  tempo_total_segundos: number
  analisadas: number
  score_medio: number | null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const equipe = searchParams.get("equipe")
    const dataInicio = searchParams.get("dataInicio")
    const dataFim = searchParams.get("dataFim")

    const supabase = createSupabaseAdmin()

    let query = supabase
      .from("ligacoes")
      .select("*")

    if (equipe && equipe !== "all") {
      query = query.eq("equipe", equipe)
    }

    if (dataInicio) {
      query = query.gte("data_ligacao", dataInicio)
    }

    if (dataFim) {
      query = query.lte("data_ligacao", dataFim)
    }

    const { data: ligacoes, error } = await query

    if (error) {
      console.error("[v0] Erro ao buscar ligacoes para stats:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Agrupa por vendedor
    const statsMap = new Map<string, VendedorStats>()

    ligacoes?.forEach((lig) => {
      const key = lig.vendedor || "Desconhecido"
      
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          vendedor: key,
          equipe: lig.equipe || "Sem equipe",
          total: 0,
          atendidas: 0,
          nao_atendidas: 0,
          tempo_total_segundos: 0,
          analisadas: 0,
          score_medio: null,
        })
      }

      const stats = statsMap.get(key)!
      stats.total++
      
      if (lig.status === "atendida") {
        stats.atendidas++
      } else {
        stats.nao_atendidas++
      }

      stats.tempo_total_segundos += lig.duracao_segundos || 0

      if (lig.transcricao) {
        stats.analisadas++
      }

      if (lig.score_geral) {
        const currentScores = statsMap.get(key)!
        if (currentScores.score_medio === null) {
          currentScores.score_medio = lig.score_geral
        } else {
          // Calcula media progressiva
          currentScores.score_medio = (currentScores.score_medio * (currentScores.analisadas - 1) + lig.score_geral) / currentScores.analisadas
        }
      }
    })

    // Converte para array e ordena por total
    const statsPorVendedor = Array.from(statsMap.values())
      .sort((a, b) => b.total - a.total)

    // Stats gerais
    const statsGerais = {
      total: ligacoes?.length || 0,
      atendidas: ligacoes?.filter(l => l.status === "atendida").length || 0,
      nao_atendidas: ligacoes?.filter(l => l.status === "nao_atendida").length || 0,
      tempo_total_segundos: ligacoes?.reduce((acc, l) => acc + (l.duracao_segundos || 0), 0) || 0,
      analisadas: ligacoes?.filter(l => l.transcricao).length || 0,
      pendentes_analise: ligacoes?.filter(l => !l.transcricao && l.status === "atendida").length || 0,
    }

    return NextResponse.json({
      geral: statsGerais,
      porVendedor: statsPorVendedor,
    })
  } catch (error) {
    console.error("[v0] Erro na API ligacoes/stats:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
