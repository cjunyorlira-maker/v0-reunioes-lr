import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/supabase/admin"

interface VendedorStats {
  vendedor: string
  equipe: string
  total: number
  atendidas: number
  nao_atendidas: number
  taxa_atendimento: number
  tempo_total_chamadas_segundos: number  // todas as ligações
  tempo_real_fala_segundos: number       // SÓ das atendidas (real produtividade)
  tempo_medio_fala_segundos: number      // tempo_real_fala / atendidas
  analisadas: number
  score_vendedor_medio: number | null    // score do vendedor (técnica)
  score_lead_medio: number | null        // score do lead (viabilidade)
  reunioes_marcadas: number
  leads_viavel_alta: number              // viabilidade alta
  leads_inviaveis: number                // viabilidade inviável
}

interface EquipeStats {
  equipe: string
  total: number
  atendidas: number
  nao_atendidas: number
  taxa_atendimento: number
  tempo_real_fala_segundos: number
  score_vendedor_medio: number | null
  reunioes_marcadas: number
  vendedores_count: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const equipe = searchParams.get("equipe")
    const dataInicio = searchParams.get("dataInicio")
    const dataFim = searchParams.get("dataFim")

    const supabase = createSupabaseAdmin()

    let query = supabase.from("ligacoes").select("*")

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
      console.error("[Stats] Erro:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const lista = ligacoes || []

    // ============================================
    // STATS POR VENDEDOR
    // ============================================
    const statsMap = new Map<string, VendedorStats>()
    const scoresVendedor = new Map<string, number[]>()
    const scoresLead = new Map<string, number[]>()

    lista.forEach((lig) => {
      const key = lig.vendedor || "Desconhecido"

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          vendedor: key,
          equipe: lig.equipe || "Sem equipe",
          total: 0,
          atendidas: 0,
          nao_atendidas: 0,
          taxa_atendimento: 0,
          tempo_total_chamadas_segundos: 0,
          tempo_real_fala_segundos: 0,
          tempo_medio_fala_segundos: 0,
          analisadas: 0,
          score_vendedor_medio: null,
          score_lead_medio: null,
          reunioes_marcadas: 0,
          leads_viavel_alta: 0,
          leads_inviaveis: 0,
        })
        scoresVendedor.set(key, [])
        scoresLead.set(key, [])
      }

      const stats = statsMap.get(key)!
      stats.total++
      stats.tempo_total_chamadas_segundos += lig.duracao_segundos || 0

      const atendida = lig.status === "atendida"
      
      if (atendida) {
        stats.atendidas++
        // SÓ conta tempo de fala REAL nas atendidas
        stats.tempo_real_fala_segundos += lig.duracao_segundos || 0
      } else {
        stats.nao_atendidas++
      }

      if (lig.transcricao) {
        stats.analisadas++
      }

      // Scores
      const analise = lig.analise_ia || {}
      
      if (analise.score_vendedor) {
        scoresVendedor.get(key)!.push(analise.score_vendedor)
      } else if (lig.score_geral) {
        // Fallback pro score geral antigo
        scoresVendedor.get(key)!.push(lig.score_geral)
      }
      
      if (analise.score_lead) {
        scoresLead.get(key)!.push(analise.score_lead)
      }

      // Reuniões marcadas
      if (analise.reuniao?.marcou) {
        stats.reunioes_marcadas++
      }

      // Viabilidade do lead
      const viab = analise.perfil_lead?.viabilidade
      if (viab === "alta") stats.leads_viavel_alta++
      if (viab === "inviavel") stats.leads_inviaveis++
    })

    // Calcula médias e taxas
    statsMap.forEach((stats, key) => {
      const sV = scoresVendedor.get(key) || []
      const sL = scoresLead.get(key) || []
      
      stats.score_vendedor_medio = sV.length > 0 
        ? Math.round(sV.reduce((a, b) => a + b, 0) / sV.length) 
        : null
      
      stats.score_lead_medio = sL.length > 0 
        ? Math.round(sL.reduce((a, b) => a + b, 0) / sL.length) 
        : null
      
      stats.taxa_atendimento = stats.total > 0 
        ? Math.round((stats.atendidas / stats.total) * 100) 
        : 0
      
      stats.tempo_medio_fala_segundos = stats.atendidas > 0
        ? Math.round(stats.tempo_real_fala_segundos / stats.atendidas)
        : 0
    })

    const statsPorVendedor = Array.from(statsMap.values())
      .sort((a, b) => b.tempo_real_fala_segundos - a.tempo_real_fala_segundos)

    // ============================================
    // STATS POR EQUIPE
    // ============================================
    const equipeMap = new Map<string, EquipeStats & { _scores: number[] }>()

    statsPorVendedor.forEach((vend) => {
      const key = vend.equipe
      if (!equipeMap.has(key)) {
        equipeMap.set(key, {
          equipe: key,
          total: 0,
          atendidas: 0,
          nao_atendidas: 0,
          taxa_atendimento: 0,
          tempo_real_fala_segundos: 0,
          score_vendedor_medio: null,
          reunioes_marcadas: 0,
          vendedores_count: 0,
          _scores: [],
        })
      }
      const eq = equipeMap.get(key)!
      eq.total += vend.total
      eq.atendidas += vend.atendidas
      eq.nao_atendidas += vend.nao_atendidas
      eq.tempo_real_fala_segundos += vend.tempo_real_fala_segundos
      eq.reunioes_marcadas += vend.reunioes_marcadas
      eq.vendedores_count++
      if (vend.score_vendedor_medio !== null) {
        eq._scores.push(vend.score_vendedor_medio)
      }
    })

    const statsPorEquipe = Array.from(equipeMap.values()).map(eq => {
      const scores = eq._scores
      const score_vendedor_medio = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : null
      
      return {
        equipe: eq.equipe,
        total: eq.total,
        atendidas: eq.atendidas,
        nao_atendidas: eq.nao_atendidas,
        taxa_atendimento: eq.total > 0 ? Math.round((eq.atendidas / eq.total) * 100) : 0,
        tempo_real_fala_segundos: eq.tempo_real_fala_segundos,
        score_vendedor_medio,
        reunioes_marcadas: eq.reunioes_marcadas,
        vendedores_count: eq.vendedores_count,
      }
    }).sort((a, b) => b.tempo_real_fala_segundos - a.tempo_real_fala_segundos)

    // ============================================
    // STATS GERAIS
    // ============================================
    const totalAtendidas = lista.filter(l => l.status === "atendida")
    
    const statsGerais = {
      total: lista.length,
      atendidas: totalAtendidas.length,
      nao_atendidas: lista.filter(l => l.status === "nao_atendida").length,
      canceladas: lista.filter(l => l.status === "cancelada").length,
      caixa_postal: lista.filter(l => l.status === "caixa_postal").length,
      ocupado: lista.filter(l => l.status === "ocupado").length,
      
      tempo_total_chamadas_segundos: lista.reduce((acc, l) => acc + (l.duracao_segundos || 0), 0),
      tempo_real_fala_segundos: totalAtendidas.reduce((acc, l) => acc + (l.duracao_segundos || 0), 0),
      
      taxa_atendimento: lista.length > 0 
        ? Math.round((totalAtendidas.length / lista.length) * 100) 
        : 0,
      
      analisadas: lista.filter(l => l.transcricao).length,
      pendentes_analise: lista.filter(l => !l.transcricao && l.status === "atendida").length,
      
      reunioes_marcadas: lista.filter(l => l.analise_ia?.reuniao?.marcou).length,
      leads_viavel_alta: lista.filter(l => l.analise_ia?.perfil_lead?.viabilidade === "alta").length,
      leads_inviaveis: lista.filter(l => l.analise_ia?.perfil_lead?.viabilidade === "inviavel").length,
    }

    return NextResponse.json({
      geral: statsGerais,
      porEquipe: statsPorEquipe,
      porVendedor: statsPorVendedor,
    })
  } catch (error) {
    console.error("[Stats] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
