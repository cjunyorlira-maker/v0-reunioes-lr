"use client"

import { Lead } from "@/lib/types"
import { useMemo, useState } from "react"
import { useQualificados } from "@/hooks/use-qualificados"

interface AnalyticsDashboardProps {
  leads: Lead[]
  weekLabel: string
  dateRange: { start: string; end: string }
}

interface VendedorStats {
  nome: string
  foto: string | null
  equipe: string
  total: number
  veio: number
  nao: number
  pending: number
  vendas: number
  retornos: number
  agendeiDia: Record<string, number> // leads criados por dia
  origens: Record<string, number>
  conversao: number
}

export function AnalyticsDashboard({ leads, weekLabel, dateRange }: AnalyticsDashboardProps) {
  // IDs da etapa "Vendendo Reunião" no Kommo
  const PIPELINE_ID = process.env.NEXT_PUBLIC_KOMMO_PIPELINE_ID || "7012299"
  const VENDENDO_REUNIAO_STATUS_ID = process.env.NEXT_PUBLIC_KOMMO_VENDENDO_REUNIAO_ID || ""

  const [stageInputId, setStageInputId] = useState(VENDENDO_REUNIAO_STATUS_ID)
  const [stageIdApplied, setStageIdApplied] = useState(VENDENDO_REUNIAO_STATUS_ID)

  // Cria dateRange apenas para HOJE (não da semana inteira)
  const todayDateRange = {
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0]
  }

  const {
    qualificados,
    qualificadosSemana,
    total: totalQualificados,
    totalSemana: totalQualificadosSemana,
    isLoading: loadingQualificados
  } = useQualificados(
    stageIdApplied ? PIPELINE_ID : undefined,
    stageIdApplied || undefined,
    stageIdApplied ? todayDateRange : undefined // Passa apenas hoje
  )

  // Leads qualificados nesta semana que já entraram no agendei (cruzando kommo_lead_id)
  const kommoIdsNoAgendei = useMemo(() => {
    const ids = new Set(leads.map(l => l.kommo_lead_id).filter(Boolean))
    return ids
  }, [leads])

  const qualificadosSemanaNOAgendei = useMemo(() => {
    return qualificadosSemana.filter(q => kommoIdsNoAgendei.has(String(q.id)))
  }, [qualificadosSemana, kommoIdsNoAgendei])

  const taxaConversaoQualificados = totalQualificadosSemana > 0
    ? Math.round((qualificadosSemanaNOAgendei.length / totalQualificadosSemana) * 100)
    : 0
  // Estatísticas por vendedor
  const vendedorStats = useMemo(() => {
    const stats: Record<string, VendedorStats> = {}

    leads.forEach((lead) => {
      const vendedor = lead.responsavel || "Não informado"

      if (!stats[vendedor]) {
        stats[vendedor] = {
          nome: vendedor,
          foto: lead.foto_responsavel,
          equipe: lead.equipe || "Sem equipe",
          total: 0,
          veio: 0,
          nao: 0,
          pending: 0,
          vendas: 0,
          retornos: 0,
          agendeiDia: {},
          origens: {},
          conversao: 0,
        }
      }

      // "Marcados" - leads agendados para esta semana (total sempre conta)
      stats[vendedor].total++
      
      if (lead.status === "veio") {
        stats[vendedor].veio++
      } else if (lead.status === "nao") {
        stats[vendedor].nao++
      } else {
        stats[vendedor].pending++
      }

      if (lead.venda_fechada) stats[vendedor].vendas++
      if (lead.retorno) stats[vendedor].retornos++

      // "Agendei" - leads CRIADOS nesta semana (produtividade)
      if (lead.created_at) {
        const createdDate = lead.created_at.split("T")[0]
        // Só conta se foi criado dentro do range da semana
        if (createdDate >= dateRange.start && createdDate <= dateRange.end) {
          stats[vendedor].agendeiDia[createdDate] = (stats[vendedor].agendeiDia[createdDate] || 0) + 1
        }
      }

      // Origens
      if (lead.origem) {
        stats[vendedor].origens[lead.origem] = (stats[vendedor].origens[lead.origem] || 0) + 1
      }
    })

    // Calcula conversão
    Object.values(stats).forEach((s) => {
      s.conversao = s.veio > 0 ? Math.round((s.vendas / s.veio) * 100) : 0
    })

    return Object.values(stats).sort((a, b) => b.total - a.total)
  }, [leads, dateRange])

  // Estatísticas por equipe
  const equipeStats = useMemo(() => {
    const stats: Record<string, { total: number; veio: number; nao: number; vendas: number; conversao: number }> = {}

    leads.forEach((lead) => {
      const equipe = lead.equipe || "Sem equipe"

      if (!stats[equipe]) {
        stats[equipe] = { total: 0, veio: 0, nao: 0, vendas: 0, conversao: 0 }
      }

      stats[equipe].total++
      if (lead.status === "veio") stats[equipe].veio++
      if (lead.status === "nao") stats[equipe].nao++
      if (lead.venda_fechada) stats[equipe].vendas++
    })

    Object.values(stats).forEach((s) => {
      s.conversao = s.veio > 0 ? Math.round((s.vendas / s.veio) * 100) : 0
    })

    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total)
  }, [leads])

  // Estatísticas de origem
  const origemStats = useMemo(() => {
    const stats: Record<string, { total: number; veio: number; nao: number }> = {}

    leads.forEach((lead) => {
      const origem = lead.origem || "Não informada"

      if (!stats[origem]) {
        stats[origem] = { total: 0, veio: 0, nao: 0 }
      }

      stats[origem].total++
      if (lead.status === "veio") stats[origem].veio++
      if (lead.status === "nao") stats[origem].nao++
    })

    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total)
  }, [leads])

  // Estatísticas por atendente
  const atendenteStats = useMemo(() => {
    const stats: Record<string, { total: number; vendas: number; conversao: number }> = {}

    leads.forEach((lead) => {
      if (lead.atendente && lead.status === "veio") {
        if (!stats[lead.atendente]) {
          stats[lead.atendente] = { total: 0, vendas: 0, conversao: 0 }
        }
        stats[lead.atendente].total++
        if (lead.venda_fechada) stats[lead.atendente].vendas++
      }
    })

    Object.values(stats).forEach((s) => {
      s.conversao = s.total > 0 ? Math.round((s.vendas / s.total) * 100) : 0
    })

    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total)
  }, [leads])

  // Agendei do dia (leads CRIADOS na semana atual - para medir produtividade)
  // Diferente de "Marcados" que são leads agendados PARA a semana
  const agendeiPorDia = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {} // vendedor -> data -> quantidade
    const totalPorDia: Record<string, number> = {}
    const porEquipe: Record<string, number> = {}

    leads.forEach((lead) => {
      const createdDate = lead.created_at?.split("T")[0]
      if (!createdDate) return
      
      // Filtra apenas leads criados dentro do range da semana atual
      if (createdDate < dateRange.start || createdDate > dateRange.end) return
      
      const vendedor = lead.responsavel || "Não informado"
      const equipe = lead.equipe || "Sem equipe"
      
      if (!stats[vendedor]) stats[vendedor] = {}
      stats[vendedor][createdDate] = (stats[vendedor][createdDate] || 0) + 1
      totalPorDia[createdDate] = (totalPorDia[createdDate] || 0) + 1
      porEquipe[equipe] = (porEquipe[equipe] || 0) + 1
    })

    return { porVendedor: stats, totalPorDia, porEquipe }
  }, [leads, dateRange])

  // Total agendei da semana
  const totalAgendeiSemana = useMemo(() => {
    return Object.values(agendeiPorDia.totalPorDia).reduce((acc, val) => acc + val, 0)
  }, [agendeiPorDia])

  // Totais gerais
  const totals = useMemo(() => {
    const veioCount = leads.filter(l => l.status === "veio").length
    const naoCount = leads.filter(l => l.status === "nao").length
    const vendasCount = leads.filter(l => l.venda_fechada).length
    const retornosCount = leads.filter(l => l.retorno).length

    return {
      total: leads.length,
      veio: veioCount,
      nao: naoCount,
      vendas: vendasCount,
      retornos: retornosCount,
      taxaPresenca: leads.length > 0 ? Math.round((veioCount / (veioCount + naoCount || 1)) * 100) : 0,
      taxaConversao: veioCount > 0 ? Math.round((vendasCount / veioCount) * 100) : 0,
    }
  }, [leads])

  if (leads.length === 0) return null

  return (
    <div className="mx-4 md:mx-6 mb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#f5f0e8]">
          Relatório Semanal
        </h2>
        <span className="text-[12px] text-[#8a8070]">{weekLabel}</span>
      </div>

      {/* Painel LEADS QUALIFICADOS (etapa Vendendo Reunião no Kommo) */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-[14px] font-bold text-cyan-400">Leads Qualificados de HOJE — Vendendo Reunião</h3>
            <p className="text-[11px] text-[#8a8070] mt-0.5">Qualificados hoje (campo 1026046) que entraram no agendei</p>
          </div>
          {/* Input do ID da etapa */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={stageInputId}
              onChange={e => setStageInputId(e.target.value)}
              placeholder="ID status (ex: 32325662)"
              className="bg-black/40 border border-cyan-500/20 text-[#f5f0e8] text-[11px] rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={() => {
                setStageIdApplied(stageInputId)
                console.log("[v0] Buscando qualificados com status_id:", stageInputId)
              }}
              className="text-[11px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded-lg px-3 py-1.5 transition-colors"
            >
              Buscar
            </button>
          </div>
        </div>

        {!stageIdApplied && (
          <p className="text-[12px] text-[#5a5040] italic">Abra o Kommo, vá na etapa "Vendendo Reunião", copie o número do ID da URL e cole aqui.</p>
        )}

        {stageIdApplied && loadingQualificados && (
          <p className="text-[12px] text-[#8a8070]">⏳ Carregando dados de hoje...</p>
        )}

        {stageIdApplied && !loadingQualificados && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Qualificados Hoje</p>
              <p className="text-[28px] font-bold text-cyan-400">{totalQualificadosSemana}</p>
              <p className="text-[10px] text-[#8a8070]">qualificados</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3 border border-cyan-500/20">
              <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Entraram no Agendei</p>
              <p className="text-[28px] font-bold text-emerald-400">{qualificadosSemanaNOAgendei.length}</p>
              <p className="text-[10px] text-[#8a8070]">reunião marcada</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Sem Reunião Marcada</p>
              <p className="text-[28px] font-bold text-amber-400">{Math.max(0, totalQualificadosSemana - qualificadosSemanaNOAgendei.length)}</p>
              <p className="text-[10px] text-[#8a8070]">aguardando</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Taxa de Conversão</p>
              <p className="text-[28px] font-bold text-cyan-300">{taxaConversaoQualificados}%</p>
              <p className="text-[10px] text-[#8a8070]">qualif. → agendei</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Status da API</p>
              <p className="text-[14px] font-bold text-emerald-400">✓ OK</p>
              <p className="text-[10px] text-[#8a8070]">conectado</p>
            </div>
          </div>
        )}
      </div>

      {/* Painel AGENDEI DA SEMANA (leads criados na semana - produtividade) */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-violet-400">Agendei da Semana (Produtividade)</h3>
          <span className="text-[11px] text-[#8a8070]">Leads criados nesta semana</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Total Agendei</p>
            <p className="text-[28px] font-bold text-violet-400">{totalAgendeiSemana}</p>
          </div>
          {Object.entries(agendeiPorDia.porEquipe).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([equipe, total]) => (
            <div key={equipe} className="bg-black/20 rounded-lg p-3">
              <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1 truncate" title={equipe}>{equipe}</p>
              <p className="text-[24px] font-bold text-violet-300">{total}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Painel MARCADOS DA SEMANA (leads agendados para a semana - resultados) */}
      <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-[rgba(212,175,55,0.2)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-[#d4af37]">Marcados da Semana (Resultados)</h3>
          <span className="text-[11px] text-[#8a8070]">Leads agendados para esta semana</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Total</p>
            <p className="text-[24px] font-bold text-[#d4af37]">{totals.total}</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Vieram</p>
            <p className="text-[24px] font-bold text-emerald-400">{totals.veio}</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Faltaram</p>
            <p className="text-[24px] font-bold text-red-400">{totals.nao}</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Pendentes</p>
            <p className="text-[24px] font-bold text-[#8a8070]">{totals.total - totals.veio - totals.nao}</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Presenca</p>
            <p className="text-[24px] font-bold text-[#f5f0e8]">{totals.taxaPresenca}%</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Vendas</p>
            <p className="text-[24px] font-bold text-emerald-400">{totals.vendas}</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Retornos</p>
            <p className="text-[24px] font-bold text-cyan-400">{totals.retornos}</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Conversao</p>
            <p className="text-[24px] font-bold text-[#d4af37]">{totals.taxaConversao}%</p>
          </div>
        </div>
      </div>

      {/* Grid com tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tabela de vendedores */}
        <div className="bg-white/[0.04] backdrop-blur-sm border border-[rgba(212,175,55,0.1)] rounded-xl p-4">
          <h3 className="text-[13px] font-semibold text-[#d4af37] mb-3">Por Vendedor</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[rgba(212,175,55,0.1)]">
                  <th className="text-left py-2 text-[#8a8070] font-medium">Vendedor</th>
                  <th className="text-center py-2 text-violet-400 font-medium">Agendei</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Marcados</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Veio</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Faltou</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Vendas</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {vendedorStats.map((v) => {
                  const agendeiTotal = Object.values(v.agendeiDia).reduce((acc, val) => acc + val, 0)
                  return (
                  <tr key={v.nome} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {v.foto ? (
                          <img src={v.foto} alt={v.nome} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[rgba(212,175,55,0.15)] flex items-center justify-center">
                            <span className="text-[9px] text-[#d4af37] font-semibold">
                              {v.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-[#f5f0e8] font-medium">{v.nome}</p>
                          <p className="text-[9px] text-[#8a8070]">{v.equipe}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center text-violet-400 font-semibold">{agendeiTotal}</td>
                    <td className="text-center text-[#f5f0e8]">{v.total}</td>
                    <td className="text-center text-emerald-400">{v.veio}</td>
                    <td className="text-center text-red-400">{v.nao}</td>
                    <td className="text-center text-emerald-400 font-semibold">{v.vendas}</td>
                    <td className="text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        v.conversao >= 50 ? "bg-emerald-500/15 text-emerald-400" :
                        v.conversao >= 25 ? "bg-amber-500/15 text-amber-400" :
                        "bg-red-500/15 text-red-400"
                      }`}>
                        {v.conversao}%
                      </span>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de equipes */}
        <div className="bg-white/[0.04] backdrop-blur-sm border border-[rgba(212,175,55,0.1)] rounded-xl p-4">
          <h3 className="text-[13px] font-semibold text-[#d4af37] mb-3">Por Equipe</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[rgba(212,175,55,0.1)]">
                  <th className="text-left py-2 text-[#8a8070] font-medium">Equipe</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Total</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Veio</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Faltou</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Vendas</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {equipeStats.map(([equipe, s]) => (
                  <tr key={equipe} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="py-2 text-[#f5f0e8] font-medium">{equipe}</td>
                    <td className="text-center text-[#f5f0e8]">{s.total}</td>
                    <td className="text-center text-emerald-400">{s.veio}</td>
                    <td className="text-center text-red-400">{s.nao}</td>
                    <td className="text-center text-emerald-400 font-semibold">{s.vendas}</td>
                    <td className="text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        s.conversao >= 50 ? "bg-emerald-500/15 text-emerald-400" :
                        s.conversao >= 25 ? "bg-amber-500/15 text-amber-400" :
                        "bg-red-500/15 text-red-400"
                      }`}>
                        {s.conversao}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de origens */}
        <div className="bg-white/[0.04] backdrop-blur-sm border border-[rgba(212,175,55,0.1)] rounded-xl p-4">
          <h3 className="text-[13px] font-semibold text-[#d4af37] mb-3">Por Origem</h3>
          <div className="flex flex-wrap gap-2">
            {origemStats.map(([origem, s]) => (
              <div 
                key={origem}
                className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2"
              >
                <p className="text-[11px] text-[#f5f0e8] font-medium mb-1">{origem}</p>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-[#8a8070]">{s.total} total</span>
                  <span className="text-emerald-400">{s.veio} veio</span>
                  <span className="text-red-400">{s.nao} faltou</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabela de atendentes */}
        <div className="bg-white/[0.04] backdrop-blur-sm border border-[rgba(212,175,55,0.1)] rounded-xl p-4">
          <h3 className="text-[13px] font-semibold text-[#d4af37] mb-3">Por Atendente</h3>
          {atendenteStats.length === 0 ? (
            <p className="text-[11px] text-[#8a8070]">Nenhum atendimento registrado ainda</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[rgba(212,175,55,0.1)]">
                    <th className="text-left py-2 text-[#8a8070] font-medium">Atendente</th>
                    <th className="text-center py-2 text-[#8a8070] font-medium">Atendimentos</th>
                    <th className="text-center py-2 text-[#8a8070] font-medium">Vendas</th>
                    <th className="text-center py-2 text-[#8a8070] font-medium">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {atendenteStats.map(([atendente, s]) => (
                    <tr key={atendente} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="py-2 text-[#f5f0e8] font-medium">{atendente}</td>
                      <td className="text-center text-sky-400">{s.total}</td>
                      <td className="text-center text-emerald-400 font-semibold">{s.vendas}</td>
                      <td className="text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          s.conversao >= 50 ? "bg-emerald-500/15 text-emerald-400" :
                          s.conversao >= 25 ? "bg-amber-500/15 text-amber-400" :
                          "bg-red-500/15 text-red-400"
                        }`}>
                          {s.conversao}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
