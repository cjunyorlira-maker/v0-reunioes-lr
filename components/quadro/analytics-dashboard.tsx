"use client"

import { Lead } from "@/lib/types"
import { useMemo, useState } from "react"
import useSWR from "swr"
import { useQualificados } from "@/hooks/use-qualificados"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome } from "@/lib/vendedor-fotos"
import EquipePerformance from "@/components/dashboard/equipe-performance"

const fetcher = (url: string) => fetch(url).then(res => res.json())

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
  // Filtro por dia — null = semana toda
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  // Filtro por equipe — null = todas
  const [selectedEquipe, setSelectedEquipe] = useState<string | null>(null)

  // Busca TODOS os leads (sem filtro de data) para calcular Agendei corretamente
  // Leads com data_agendei nesta semana podem ter data de reunião em outra semana
  // Revalida a cada 5 segundos para pegar mudanças de remarcação
  const { data: allLeadsData } = useSWR<Lead[]>(
    "/api/leads", 
    fetcher,
    { 
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 5000  // Recarrega a cada 5 segundos
    }
  )
  const allLeads = allLeadsData || []
  


  // Dias da semana para os botões do filtro
  const weekDays = useMemo(() => getWeekDays(), [])

  // Todas as equipes disponíveis (usa allLeads para incluir todas)
  const todasEquipes = useMemo(() => {
    const equipes = new Set([
      ...allLeads.map(l => l.equipe).filter(Boolean),
      ...leads.map(l => l.equipe).filter(Boolean)
    ])
    return Array.from(equipes).sort()
  }, [allLeads, leads])

  // Range efetivo: dia selecionado ou semana toda
  const activeRange = useMemo(() => {
    if (!selectedDay) return dateRange
    return { start: selectedDay, end: selectedDay }
  }, [selectedDay, dateRange])

  // Leads filtrados pelo range ativo (dia ou semana) E equipe selecionada
  const leadsAtivos = useMemo(() => {
    return leads.filter(l => {
      const matchesRange = l.data >= activeRange.start && l.data <= activeRange.end
      const matchesEquipe = !selectedEquipe || l.equipe === selectedEquipe
      return matchesRange && matchesEquipe
    })
  }, [leads, activeRange, selectedEquipe])

  // Busca leads qualificados automaticamente pela tabela qualificacoes
  const {
    qualificadosSemana,
    totalSemana: totalQualificadosSemana,
    isLoading: loadingQualificados
  } = useQualificados(dateRange)
  
  // Filtra qualificados pelo dia selecionado
  const qualificadosAtivos = useMemo(() => {
    if (!selectedDay) return qualificadosSemana
    return qualificadosSemana.filter(q => q.data_qualificacao === selectedDay)
  }, [qualificadosSemana, selectedDay])

  // Kommo IDs que já têm reunião marcada no nosso sistema (usa allLeads)
  const kommoIdsNoAgendei = useMemo(() => {
    // Filtra por leads que tem data_agendei no periodo ativo
    const leadsComAgendei = allLeads.filter(l => {
      if (!l.data_agendei) return false
      const dentroDoRange = l.data_agendei >= activeRange.start && l.data_agendei <= activeRange.end
      // Inclui leads sem equipe (null) - só filtra se tem equipe E é diferente da selecionada
      const matchesEquipe = !selectedEquipe || !l.equipe || l.equipe === selectedEquipe
      return dentroDoRange && matchesEquipe
    })
    return new Set(leadsComAgendei.map(l => l.kommo_id).filter(Boolean))
  }, [allLeads, activeRange, selectedEquipe])

  // Qualificados com reunião marcada (apenas do período ativo - dia ou semana)
  // Verifica se o kommo_id do qualificado existe na tabela leads (virou agendei)
  const qualificadosNoAgendei = useMemo(() => {
    return qualificadosAtivos.filter(q => {
      const qKommoId = String(q.kommo_id || q.id)
      return kommoIdsNoAgendei.has(qKommoId)
    })
  }, [qualificadosAtivos, kommoIdsNoAgendei])

  // Qualificados sem reunião marcada (apenas do período ativo)
  const qualificadosSemReuniao = useMemo(() => {
    return qualificadosAtivos.filter(q => {
      const qKommoId = String(q.kommo_id || q.id)
      // Se NÃO tem um lead com agendei neste período, não marcou reunião ainda
      return !kommoIdsNoAgendei.has(qKommoId)
    })
  }, [qualificadosAtivos, kommoIdsNoAgendei])

  const taxaConversaoQualificados = totalQualificadosSemana > 0
    ? Math.round((qualificadosNoAgendei.length / totalQualificadosSemana) * 100)
    : 0

  // Calcula "Qualifiquei" por vendedor usando os dados da tabela qualificacoes
  const qualifiqueiPorVendedor = useMemo(() => {
    const stats: Record<string, number> = {}
    
    qualificadosSemana.forEach((lead) => {
      const vendedor = normalizeVendedorNome(lead.responsavel || "Não informado")
      stats[vendedor] = (stats[vendedor] || 0) + 1
    })
    
    return stats
  }, [qualificadosSemana])

  // Calcula "Agendei" usando data_agendei (quando lead entrou em Confirmar Reuniao)
  // Usa allLeads porque leads com data_agendei desta semana podem ter reunião em outra semana
  const agendeiPorVendedor = useMemo(() => {
    const stats: Record<string, number> = {}
    
    allLeads.forEach((lead) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return
      // Filtra por equipe se selecionada - inclui leads sem equipe (null)
      if (selectedEquipe && lead.equipe && lead.equipe !== selectedEquipe) return
      
      const vendedor = normalizeVendedorNome(lead.responsavel || "Não informado")
      stats[vendedor] = (stats[vendedor] || 0) + 1
    })
    
    return stats
  }, [allLeads, activeRange, selectedEquipe])

  // Leads remarcados para outra semana (para usar em vendedorStats, equipeStats, origemStats)
  const remarcadosOutraSemanaList = useMemo(() => {
    return allLeads.filter(l => {
      if (!l.remarcado) return false
      // Filtra por equipe se selecionada
      if (selectedEquipe && l.equipe && l.equipe !== selectedEquipe) return false
      const dataOriginal = l.data_original || l.data_agendei
      if (!dataOriginal) return false
      const dentroDoRange = dataOriginal >= activeRange.start && dataOriginal <= activeRange.end
      const foraDoRange = l.data && (l.data < activeRange.start || l.data > activeRange.end)
      return dentroDoRange && foraDoRange
    })
  }, [allLeads, activeRange, selectedEquipe])

  // Estatísticas por vendedor — usa leadsAtivos (dia ou semana) para marcados + remarcados
  const vendedorStats = useMemo(() => {
    const stats: Record<string, VendedorStats> = {}

    // Primeiro passa pelos leadsAtivos para marcados/resultados
    leadsAtivos.forEach((lead) => {
      const vendedor = normalizeVendedorNome(lead.responsavel || "Não informado")

      if (!stats[vendedor]) {
        stats[vendedor] = {
          nome: vendedor,
          foto: lead.foto_responsavel || getFotoVendedor(vendedor),
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

      stats[vendedor].total++
      
      if (lead.status === "veio") {
        stats[vendedor].veio++
      } else if (lead.status === "nao" && !lead.remarcado) {
        stats[vendedor].nao++
      } else {
        stats[vendedor].pending++
      }

      if (lead.venda_fechada) stats[vendedor].vendas++
      if (lead.retorno) stats[vendedor].retornos++

      if (lead.origem) {
        stats[vendedor].origens[lead.origem] = (stats[vendedor].origens[lead.origem] || 0) + 1
      }
    })

    // Adiciona remarcados para outra semana como "Faltou"
    remarcadosOutraSemanaList.forEach((lead) => {
      const vendedor = normalizeVendedorNome(lead.responsavel || "Não informado")

      if (!stats[vendedor]) {
        stats[vendedor] = {
          nome: vendedor,
          foto: lead.foto_responsavel || getFotoVendedor(vendedor),
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

      stats[vendedor].total++
      stats[vendedor].nao++ // Conta como faltou
    })

    // Adiciona vendedores que têm Agendei mas não têm leads marcados no período
    Object.entries(agendeiPorVendedor).forEach(([vendedor, count]) => {
      if (!stats[vendedor]) {
        stats[vendedor] = {
          nome: vendedor,
          foto: getFotoVendedor(vendedor) || null,
          equipe: "Sem equipe",
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
      // Armazena o total de agendei no objeto agendeiDia
      stats[vendedor].agendeiDia["total"] = count
    })

    // Calcula conversão
    Object.values(stats).forEach((s) => {
      s.conversao = s.veio > 0 ? Math.round((s.vendas / s.veio) * 100) : 0
    })

    // Ordena por Agendei (produtividade) primeiro, depois por total de marcados
    return Object.values(stats).sort((a, b) => {
      const agendeiA = a.agendeiDia["total"] || 0
      const agendeiB = b.agendeiDia["total"] || 0
      if (agendeiB !== agendeiA) return agendeiB - agendeiA
      return b.total - a.total
    })
  }, [leadsAtivos, agendeiPorVendedor, remarcadosOutraSemanaList])

  // Estatísticas por equipe (inclui remarcados)
  const equipeStats = useMemo(() => {
    const stats: Record<string, { total: number; veio: number; nao: number; vendas: number; conversao: number }> = {}

    leadsAtivos.forEach((lead) => {
      const equipe = lead.equipe || "Sem equipe"

      if (!stats[equipe]) {
        stats[equipe] = { total: 0, veio: 0, nao: 0, vendas: 0, conversao: 0 }
      }

      stats[equipe].total++
      if (lead.status === "veio") stats[equipe].veio++
      if (lead.status === "nao" && !lead.remarcado) stats[equipe].nao++
      if (lead.venda_fechada) stats[equipe].vendas++
    })

    // Adiciona remarcados para outra semana como "Faltou"
    remarcadosOutraSemanaList.forEach((lead) => {
      const equipe = lead.equipe || "Sem equipe"
      if (!stats[equipe]) {
        stats[equipe] = { total: 0, veio: 0, nao: 0, vendas: 0, conversao: 0 }
      }
      stats[equipe].total++
      stats[equipe].nao++
    })

    Object.values(stats).forEach((s) => {
      s.conversao = s.veio > 0 ? Math.round((s.vendas / s.veio) * 100) : 0
    })

    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total)
  }, [leadsAtivos, remarcadosOutraSemanaList])

  // Estatísticas de origem (inclui remarcados)
  const origemStats = useMemo(() => {
    const stats: Record<string, { total: number; veio: number; nao: number }> = {}

    leadsAtivos.forEach((lead) => {
      const origem = lead.origem || "Não informada"

      if (!stats[origem]) {
        stats[origem] = { total: 0, veio: 0, nao: 0 }
      }

      stats[origem].total++
      if (lead.status === "veio") stats[origem].veio++
      if (lead.status === "nao" && !lead.remarcado) stats[origem].nao++
    })

    // Adiciona remarcados para outra semana como "Faltou"
    remarcadosOutraSemanaList.forEach((lead) => {
      const origem = lead.origem || "Não informada"
      if (!stats[origem]) {
        stats[origem] = { total: 0, veio: 0, nao: 0 }
      }
      stats[origem].total++
      stats[origem].nao++
    })

    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total)
  }, [leadsAtivos, remarcadosOutraSemanaList])

  // Estatísticas por atendente
  const atendenteStats = useMemo(() => {
    const stats: Record<string, { total: number; vendas: number; conversao: number }> = {}

    leadsAtivos.forEach((lead) => {
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
  }, [leadsAtivos])

  // Agendei (leads com data_agendei dentro do range ativo - para medir produtividade)
  const agendeiPorDia = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {}
    const totalPorDia: Record<string, number> = {}
    const porEquipe: Record<string, number> = {}

    // Usa allLeads para incluir leads remarcados
    allLeads.forEach((lead) => {
      // Usa data_agendei - data em que o lead foi agendado (criado na etapa Confirmar Reunião)
      const agendadoDate = lead.data_agendei
      if (!agendadoDate) return
      if (agendadoDate < activeRange.start || agendadoDate > activeRange.end) return
      // Filtra por equipe se selecionada - inclui leads sem equipe (null)
      if (selectedEquipe && lead.equipe && lead.equipe !== selectedEquipe) return
      
      const vendedor = normalizeVendedorNome(lead.responsavel || "Não informado")
      const equipe = lead.equipe || "Sem equipe"
      
      if (!stats[vendedor]) stats[vendedor] = {}
      stats[vendedor][agendadoDate] = (stats[vendedor][agendadoDate] || 0) + 1
      totalPorDia[agendadoDate] = (totalPorDia[agendadoDate] || 0) + 1
      porEquipe[equipe] = (porEquipe[equipe] || 0) + 1
    })

    return { porVendedor: stats, totalPorDia, porEquipe }
  }, [allLeads, activeRange, selectedEquipe])

  // Total agendei da semana
  const totalAgendeiSemana = useMemo(() => {
    return Object.values(agendeiPorDia.totalPorDia).reduce((acc, val) => acc + val, 0)
  }, [agendeiPorDia])

  // Totais gerais — usa leadsAtivos + remarcados de allLeads
  const totals = useMemo(() => {
    const veioCount = leadsAtivos.filter(l => l.status === "veio").length
    const naoCount = leadsAtivos.filter(l => l.status === "nao" && !l.remarcado).length
    
    // Leads remarcados para outra semana contam como "Faltou" no período original
    // Busca de allLeads porque o lead remarcado tem data de outra semana (não está em leadsAtivos)
    const remarcadosOutraSemana = allLeads.filter(l => {
      if (!l.remarcado) return false
      // Filtra por equipe se selecionada - inclui leads sem equipe (null)
      if (selectedEquipe && l.equipe && l.equipe !== selectedEquipe) return false
      // Se data_original (ou data_agendei se data_original não existe) está no período
      const dataOriginal = l.data_original || l.data_agendei
      if (!dataOriginal) return false
      const dentroDoRange = dataOriginal >= activeRange.start && dataOriginal <= activeRange.end
      // E a data atual da reunião está FORA do range (foi remarcado para outra semana)
      const foraDoRange = l.data && (l.data < activeRange.start || l.data > activeRange.end)
      return dentroDoRange && foraDoRange
    }).length
    
    const naoTotal = naoCount + remarcadosOutraSemana
    const vendasCount = leadsAtivos.filter(l => l.venda_fechada).length
    const retornosCount = leadsAtivos.filter(l => l.retorno).length
    
    // Total inclui remarcados
    const totalMarcados = leadsAtivos.length + remarcadosOutraSemana

    return {
      total: totalMarcados,
      veio: veioCount,
      nao: naoTotal,
      vendas: vendasCount,
      retornos: retornosCount,
      remarcados: remarcadosOutraSemana,
      taxaPresenca: (veioCount + naoTotal) > 0 ? Math.round((veioCount / (veioCount + naoTotal)) * 100) : 0,
      taxaConversao: veioCount > 0 ? Math.round((vendasCount / veioCount) * 100) : 0,
    }
  }, [leadsAtivos, allLeads, activeRange, selectedEquipe])

  if (leads.length === 0) return null

  return (
    <div className="mx-4 md:mx-6 mb-6 space-y-4">
      {/* Header com filtro por dia */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#f5f0e8]">
            Relatório — {selectedDay ? weekDays.find(d => formatDateForDB(d.date) === selectedDay)?.dayName ?? selectedDay : "Semana Toda"}
          </h2>
          <span className="text-[12px] text-[#8a8070]">{weekLabel}</span>
        </div>
        {/* Botões de filtro por dia */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDay(null)}
            className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors font-medium ${
              selectedDay === null
                ? "bg-[#d4af37] text-black border-[#d4af37]"
                : "bg-transparent text-[#8a8070] border-[rgba(255,255,255,0.08)] hover:border-[#d4af37]/40 hover:text-[#d4af37]"
            }`}
          >
            Semana Toda
          </button>
          {weekDays.map((day) => {
            const dayStr = formatDateForDB(day.date)
            const isActive = selectedDay === dayStr
            return (
              <button
                key={dayStr}
                onClick={() => setSelectedDay(dayStr)}
                className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                  isActive
                    ? "bg-violet-500 text-white border-violet-500"
                    : day.isToday
                    ? "bg-transparent text-violet-400 border-violet-500/40 hover:border-violet-400"
                    : "bg-transparent text-[#8a8070] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] hover:text-[#f5f0e8]"
                }`}
              >
                {day.dayName} {day.dayNumber}
              </button>
            )
          })}
        </div>
      </div>

      {/* Botões de filtro por equipe */}
      {todasEquipes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedEquipe(null)}
            className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors font-medium ${
              selectedEquipe === null
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-transparent text-[#8a8070] border-[rgba(255,255,255,0.08)] hover:border-emerald-600/40 hover:text-emerald-400"
            }`}
          >
            Todas Equipes
          </button>
          {todasEquipes.map((equipe) => (
            <button
              key={equipe}
              onClick={() => setSelectedEquipe(equipe)}
              className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                selectedEquipe === equipe
                  ? "bg-sky-500 text-white border-sky-500"
                  : "bg-transparent text-[#8a8070] border-[rgba(255,255,255,0.08)] hover:border-sky-500/40 hover:text-sky-400"
              }`}
            >
              {equipe}
            </button>
          ))}
        </div>
      )}

      {/* Painel LEADS QUALIFICADOS DA SEMANA — automático pelo campo 1026046 */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[14px] font-bold text-cyan-400">Leads Qualificados da Semana — Vendendo Reunião</h3>
            <p className="text-[11px] text-[#8a8070] mt-0.5">{weekLabel}</p>
          </div>
          {loadingQualificados && (
            <span className="text-[11px] text-[#8a8070]">Carregando...</span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Qualificados Semana</p>
            <p className="text-[32px] font-bold text-cyan-400">{totalQualificadosSemana}</p>
            <p className="text-[10px] text-[#8a8070]">qualificados nesta semana</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Entraram no Agendei</p>
            <p className="text-[32px] font-bold text-emerald-400">{qualificadosNoAgendei.length}</p>
            <p className="text-[10px] text-[#8a8070]">reuniao marcada</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Sem Reuniao</p>
            <p className="text-[32px] font-bold text-amber-400">{qualificadosSemReuniao.length}</p>
            <p className="text-[10px] text-[#8a8070]">aguardando marcar</p>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8a8070] uppercase tracking-wider mb-1">Conversao</p>
            <p className="text-[32px] font-bold text-cyan-300">{taxaConversaoQualificados}%</p>
            <p className="text-[10px] text-[#8a8070]">qualif. entrou no agendei</p>
          </div>
        </div>

        {/* Lista dos que ainda não marcaram reunião */}
        {qualificadosSemReuniao.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] text-amber-400 font-medium mb-2">Sem reuniao marcada:</p>
            <div className="flex flex-wrap gap-2">
              {qualificadosSemReuniao.map(q => (
                <a
                  key={q.id}
                  href={`https://crm2lrmultimarcascom.kommo.com/leads/detail/${q.kommo_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full px-3 py-1 hover:bg-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer"
                  title="Abrir no Kommo"
                >
                  {q.nome}{q.responsavel ? ` · ${q.responsavel}` : ""}
                </a>
              ))}
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
                  <th className="text-center py-2 text-cyan-400 font-medium">Qualif.</th>
                  <th className="text-center py-2 text-violet-400 font-medium">Agendei</th>
                  <th className="text-center py-2 text-[#d4af37] font-medium">Marcados</th>
                  <th className="text-center py-2 text-emerald-400 font-medium">Veio</th>
                  <th className="text-center py-2 text-red-400 font-medium">Faltou</th>
                  <th className="text-center py-2 text-emerald-400 font-medium">Vendas</th>
                  <th className="text-center py-2 text-[#8a8070] font-medium">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {vendedorStats.map((v) => {
                  const agendeiTotal = v.agendeiDia["total"] || 0
                  const qualifiqueiTotal = qualifiqueiPorVendedor[v.nome] || 0
                  return (
                  <tr key={v.nome} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {v.foto ? (
                          <img src={v.foto} alt={v.nome} className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0 border border-[rgba(212,175,55,0.2)]" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[rgba(212,175,55,0.15)] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-[#d4af37] font-semibold">
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
                    <td className="text-center text-cyan-400 font-semibold">{qualifiqueiTotal}</td>
                    <td className="text-center text-violet-400 font-semibold">{agendeiTotal}</td>
                    <td className="text-center text-[#d4af37]">{v.total}</td>
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

        {/* Funil de Conversão por Equipe */}
        <div className="bg-white/[0.04] backdrop-blur-sm border border-[rgba(212,175,55,0.1)] rounded-xl p-4">
          <EquipePerformance qualificados={qualificadosSemana} leads={allLeads} />
        </div>
      </div>
    </div>
  )
}
