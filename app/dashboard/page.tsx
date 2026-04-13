"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome } from "@/lib/vendedor-fotos"
import { Calendar } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type TabType = "produtividade" | "resultados" | "funil"
type FilterMode = "semana" | "dia" | "custom"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("produtividade")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>("semana")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  // Dias da semana
  const weekDays = useMemo(() => getWeekDays(), [])
  const dateRange = useMemo(() => ({
    start: formatDateForDB(weekDays[0].date),
    end: formatDateForDB(weekDays[weekDays.length - 1].date),
  }), [weekDays])

  // Range ativo baseado no modo de filtro
  const activeRange = useMemo(() => {
    if (filterMode === "custom" && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate }
    }
    if (filterMode === "dia" && selectedDay) {
      return { start: selectedDay, end: selectedDay }
    }
    return dateRange
  }, [filterMode, selectedDay, customStartDate, customEndDate, dateRange])

  // Busca dados da semana
  const { data: leadsData } = useSWR(
    `/api/leads?startDate=${dateRange.start}&endDate=${dateRange.end}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  // Busca TODOS os leads (para calcular remarcados e agendei corretamente)
  const { data: allLeadsData } = useSWR(
    `/api/leads`,
    fetcher,
    { refreshInterval: 30000 }
  )

  // Busca qualificados da tabela qualificacoes
  const { data: qualificadosData } = useSWR(
    `/api/leads/qualificados?startDate=${activeRange.start}&endDate=${activeRange.end}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const leads = leadsData || []
  const allLeads = allLeadsData || []
  const qualificados = qualificadosData?.leads || []

  // Leads filtrados pelo range ativo (exclui retornos)
  const leadsAtivos = useMemo(() => {
    return leads.filter((l: any) => {
      // Exclui retornos
      if (l.retorno) return false
      
      // Filtra por data
      return l.data >= activeRange.start && l.data <= activeRange.end
    })
  }, [leads, activeRange])

  // Leads remarcados para OUTRA semana (tinham data_original no range mas data atual fora)
  // Usa allLeads porque o lead remarcado pode ter data fora do range atual
  const remarcadosOutraSemana = useMemo(() => {
    return allLeads.filter((l: any) => {
      if (!l.remarcado) return false
      // Se data_original (ou data_agendei) estava no período mas data foi remarcada para fora
      const dataOriginal = l.data_original || l.data_agendei
      if (!dataOriginal) return false
      const dentroDoRange = dataOriginal >= activeRange.start && dataOriginal <= activeRange.end
      const foraDoRange = l.data && (l.data < activeRange.start || l.data > activeRange.end)
      return dentroDoRange && foraDoRange
    })
  }, [allLeads, activeRange])

  // Estatisticas gerais (sem retornos)
  const stats = useMemo(() => {
    const veio = leadsAtivos.filter((l: any) => l.status === "veio").length
    const naoComum = leadsAtivos.filter((l: any) => l.status === "nao" && !l.remarcado).length
    // Remarcados para outra semana contam como "Faltou" no período original
    const nao = naoComum + remarcadosOutraSemana.length
    const remarcados = remarcadosOutraSemana.length
    const vendas = leadsAtivos.filter((l: any) => l.venda_fechada).length
    
    // Total inclui remarcados para outra semana
    const total = leadsAtivos.length + remarcadosOutraSemana.length
    // Pendentes = total - veio - nao
    const pendentes = total - veio - nao

    return {
      total,
      veio,
      nao,
      remarcados,
      vendas,
      pendentes,
      taxaPresenca: (veio + nao) > 0 ? Math.round((veio / (veio + nao)) * 100) : 0,
      taxaConversao: veio > 0 ? Math.round((vendas / veio) * 100) : 0,
    }
  }, [leadsAtivos, remarcadosOutraSemana])

  // Agendei por vendedor (leads com data_agendei no periodo)
  // Usa allLeads para pegar leads que foram agendados nesta semana mas remarcados para outra
  const agendeiPorVendedor = useMemo(() => {
    const map: Record<string, { nome: string; foto: string | null; equipe: string; agendei: number }> = {}

    allLeads.forEach((lead: any) => {
      // Usa data_agendei ao inves de created_at
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const vendedor = normalizeVendedorNome(lead.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: lead.foto_responsavel || getFotoVendedor(vendedor) || null,
          equipe: lead.equipe || "Sem equipe",
          agendei: 0,
        }
      }
      map[vendedor].agendei++
    })

    return Object.values(map).sort((a, b) => b.agendei - a.agendei)
  }, [allLeads, activeRange])

  // Qualifiquei por vendedor
  const qualifiqueiPorVendedor = useMemo(() => {
    const map: Record<string, { nome: string; foto: string | null; equipe: string; qualificados: number }> = {}

    qualificados.forEach((q: any) => {
      const vendedor = normalizeVendedorNome(q.responsavel || q.vendedor || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: getFotoVendedor(vendedor) || null,
          equipe: q.equipe || "Sem equipe",
          qualificados: 0,
        }
      }
      map[vendedor].qualificados++
    })

    return Object.values(map).sort((a, b) => b.qualificados - a.qualificados)
  }, [qualificados])

  // Resultados por vendedor (marcados, veio, faltou, vendas) - sem retornos
  const resultadosPorVendedor = useMemo(() => {
    const map: Record<string, any> = {}

    // Primeiro processa leadsAtivos
    leadsAtivos.forEach((lead: any) => {
      const vendedor = normalizeVendedorNome(lead.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: lead.foto_responsavel || getFotoVendedor(vendedor) || null,
          equipe: lead.equipe || "Sem equipe",
          marcados: 0,
          veio: 0,
          nao: 0,
          remarcados: 0,
          vendas: 0,
        }
      }
      map[vendedor].marcados++
      if (lead.status === "veio") map[vendedor].veio++
      if (lead.status === "nao" && !lead.remarcado) map[vendedor].nao++
      if (lead.venda_fechada) map[vendedor].vendas++
    })

    // Adiciona remarcados para outra semana como "Faltou"
    remarcadosOutraSemana.forEach((lead: any) => {
      const vendedor = normalizeVendedorNome(lead.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: lead.foto_responsavel || getFotoVendedor(vendedor) || null,
          equipe: lead.equipe || "Sem equipe",
          marcados: 0,
          veio: 0,
          nao: 0,
          remarcados: 0,
          vendas: 0,
        }
      }
      map[vendedor].marcados++
      map[vendedor].nao++
      map[vendedor].remarcados++
    })

    return Object.values(map).sort((a: any, b: any) => b.marcados - a.marcados)
  }, [leadsAtivos, remarcadosOutraSemana])

  // Origens dos leads marcados e vendas
  const origensMarcados = useMemo(() => {
    const mapMarcados: Record<string, number> = {}
    const mapVendas: Record<string, number> = {}

    leadsAtivos.forEach((lead: any) => {
      const origem = lead.origem || "Nao informado"
      mapMarcados[origem] = (mapMarcados[origem] || 0) + 1
      if (lead.venda_fechada) {
        mapVendas[origem] = (mapVendas[origem] || 0) + 1
      }
    })

    return {
      marcados: Object.entries(mapMarcados).sort((a, b) => b[1] - a[1]),
      vendas: Object.entries(mapVendas).sort((a, b) => b[1] - a[1]),
    }
  }, [leadsAtivos])

  // Funil por equipe - usa allLeads para pegar todos incluindo remarcados
  const funilPorEquipe = useMemo(() => {
    const map: Record<string, any> = {}

    // Qualificados por equipe (data_qualificacao no periodo)
    qualificados.forEach((q: any) => {
      const equipe = q.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { equipe, qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, remarcados: 0, vendas: 0 }
      }
      map[equipe].qualificados++
    })

    // Agendei por equipe (data_agendei no periodo) - usa allLeads
    allLeads.forEach((lead: any) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const equipe = lead.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { equipe, qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, remarcados: 0, vendas: 0 }
      }
      map[equipe].agendei++
    })

    // Marcados/Veio/Faltou = apenas leads que foram agendados via webhook (data_agendei no periodo)
    // Assim o funil é consistente: só conta quem passou pelo processo completo (Qualifiquei → Agendei → Marcado)
    allLeads.forEach((lead: any) => {
      if (lead.retorno) return

      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const equipe = lead.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { equipe, qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, remarcados: 0, vendas: 0 }
      }
      map[equipe].marcados++
      if (lead.status === "veio") map[equipe].veio++
      if (lead.status === "nao" && !lead.remarcado) map[equipe].nao++
      if (lead.remarcado) map[equipe].remarcados++
      if (lead.venda_fechada) map[equipe].vendas++
    })

    return Object.values(map).sort((a: any, b: any) => (b.qualificados + b.agendei) - (a.qualificados + a.agendei))
  }, [qualificados, allLeads, leadsAtivos, remarcadosOutraSemana, activeRange])

  // Conversao Qualifiquei -> Agendei por vendedor
  const conversaoQualAgendei = useMemo(() => {
    const map: Record<string, { nome: string; foto: string | null; equipe: string; qualificados: number; agendei: number; taxa: number }> = {}

    // Qualificados
    qualificados.forEach((q: any) => {
      const vendedor = normalizeVendedorNome(q.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = { nome: vendedor, foto: getFotoVendedor(vendedor), equipe: q.equipe || "Sem equipe", qualificados: 0, agendei: 0, taxa: 0 }
      }
      map[vendedor].qualificados++
    })

    // Agendei - usa allLeads para pegar todos incluindo remarcados
    allLeads.forEach((lead: any) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const vendedor = normalizeVendedorNome(lead.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = { nome: vendedor, foto: lead.foto_responsavel || getFotoVendedor(vendedor), equipe: lead.equipe || "Sem equipe", qualificados: 0, agendei: 0, taxa: 0 }
      }
      map[vendedor].agendei++
    })

    // Calcula taxa
    Object.values(map).forEach(v => {
      v.taxa = v.qualificados > 0 ? Math.round((v.agendei / v.qualificados) * 100) : 0
    })

    return Object.values(map).filter(v => v.qualificados > 0 || v.agendei > 0).sort((a, b) => b.taxa - a.taxa)
  }, [qualificados, allLeads, activeRange])

  // Conversao por equipe
  const conversaoPorEquipe = useMemo(() => {
    const map: Record<string, { nome: string; qualificados: number; agendei: number; taxa: number }> = {}

    // Qualificados
    qualificados.forEach((q: any) => {
      const equipe = q.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { nome: equipe, qualificados: 0, agendei: 0, taxa: 0 }
      }
      map[equipe].qualificados++
    })

    // Agendei - usa allLeads para pegar todos incluindo remarcados
    allLeads.forEach((lead: any) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const equipe = lead.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { nome: equipe, qualificados: 0, agendei: 0, taxa: 0 }
      }
      map[equipe].agendei++
    })

    // Calcula taxa
    Object.values(map).forEach(e => {
      e.taxa = e.qualificados > 0 ? Math.round((e.agendei / e.qualificados) * 100) : 0
    })

    return Object.values(map).filter(e => e.qualificados > 0 || e.agendei > 0).sort((a, b) => b.taxa - a.taxa)
  }, [qualificados, allLeads, activeRange])

  // Atendentes
  const atendenteStats = useMemo(() => {
    const map: Record<string, { nome: string; atendidos: number; vendas: number }> = {}

    leadsAtivos.forEach((lead: any) => {
      if (lead.atendente && lead.status === "veio") {
        if (!map[lead.atendente]) {
          map[lead.atendente] = { nome: lead.atendente, atendidos: 0, vendas: 0 }
        }
        map[lead.atendente].atendidos++
        if (lead.venda_fechada) map[lead.atendente].vendas++
      }
    })

    return Object.values(map).sort((a, b) => b.atendidos - a.atendidos)
  }, [leadsAtivos])

  // Origem dos leads
  const origemData = useMemo(() => {
    const map: Record<string, number> = {}
    leadsAtivos.forEach((lead: any) => {
      const origem = lead.origem || "Nao informada"
      map[origem] = (map[origem] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [leadsAtivos])

  const COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"]

  // Copiar relatorio para clipboard
  const handleCopyReport = async () => {
    setCopying(true)
    try {
      const dayLabel = selectedDay 
        ? weekDays.find(d => formatDateForDB(d.date) === selectedDay)?.dayName || selectedDay
        : "Semana Toda"

      let report = `*LR MULTIMARCAS - RELATORIO ${dayLabel.toUpperCase()}*\n`
      report += `_${new Date().toLocaleDateString("pt-BR")}_\n\n`

      report += `*RESUMO GERAL*\n`
      report += `Qualificados: ${qualificados.length}\n`
      report += `Agendei: ${agendeiPorVendedor.reduce((acc, v) => acc + v.agendei, 0)}\n`
      report += `Marcados: ${stats.total}\n`
      report += `Veio: ${stats.veio} | Faltou: ${stats.nao}\n`
      report += `Vendas: ${stats.vendas}\n`
      report += `Taxa Presenca: ${stats.taxaPresenca}% | Conversao: ${stats.taxaConversao}%\n\n`

      report += `*QUALIFIQUEI POR VENDEDOR*\n`
      qualifiqueiPorVendedor.forEach(v => {
        report += `${v.nome}: ${v.qualificados}\n`
      })
      report += `\n`

      report += `*AGENDEI POR VENDEDOR*\n`
      agendeiPorVendedor.forEach(v => {
        report += `${v.nome}: ${v.agendei}\n`
      })
      report += `\n`

      report += `*RESULTADOS POR VENDEDOR*\n`
      resultadosPorVendedor.forEach((v: any) => {
        const conv = v.veio > 0 ? Math.round((v.vendas / v.veio) * 100) : 0
        report += `${v.nome}: M${v.marcados} V${v.veio} F${v.nao} $${v.vendas} (${conv}%)\n`
      })

      await navigator.clipboard.writeText(report)
      alert("Relatorio copiado! Cole no WhatsApp.")
    } catch (error) {
      console.error("Erro ao copiar:", error)
      alert("Erro ao copiar. Tente novamente.")
    } finally {
      setCopying(false)
    }
  }

  const weekLabel = `${weekDays[0].dayNumber}/${weekDays[0].date.getMonth() + 1} - ${weekDays[weekDays.length - 1].dayNumber}/${weekDays[weekDays.length - 1].date.getMonth() + 1}`

  return (
    <div className="min-h-screen bg-[#050a15] text-white overflow-x-hidden">
      {/* Fundo animado */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-emerald-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 backdrop-blur-xl bg-black/20 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-4">
              <Image
                src="/images/logo-lr.png"
                alt="LR Multimarcas"
                width={160}
                height={52}
                className="h-[48px] w-auto object-contain"
              />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Dashboard Executivo
                </h1>
                <p className="text-xs text-white/40">{weekLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/vendedores"
                className="px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 text-violet-400 text-sm font-medium transition-all"
              >
                Lista Vendedores
              </Link>
              <Link
                href="/dashboard/piores"
                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-all"
              >
                Piores
              </Link>
              <button
                onClick={handleCopyReport}
                disabled={copying}
                className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium transition-all disabled:opacity-50"
              >
                {copying ? "Copiando..." : "Copiar Relatorio"}
              </button>
              <Link
                href="/"
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-all"
              >
                Voltar ao Quadro
              </Link>
            </div>
          </div>
        </header>

        {/* Filtros */}
        <div className="px-6 py-4 max-w-[1600px] mx-auto">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Modo de filtro */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
              <button
                onClick={() => { setFilterMode("semana"); setSelectedDay(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filterMode === "semana"
                    ? "bg-[#d4af37] text-black"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                Semana Toda
              </button>
              <button
                onClick={() => setFilterMode("dia")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filterMode === "dia"
                    ? "bg-violet-500 text-white"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                Por Dia
              </button>
              <button
                onClick={() => setFilterMode("custom")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  filterMode === "custom"
                    ? "bg-cyan-500 text-white"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Periodo
              </button>
            </div>

            {/* Seletor de dias (quando filtro por dia) */}
            {filterMode === "dia" && (
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => {
                  const dayStr = formatDateForDB(day.date)
                  return (
                    <button
                      key={dayStr}
                      onClick={() => setSelectedDay(dayStr)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedDay === dayStr
                          ? "bg-violet-500 text-white"
                          : day.isToday
                          ? "bg-violet-500/20 border border-violet-500/30 text-violet-400"
                          : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {day.dayName} {day.dayNumber}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Seletor de periodo customizado */}
            {filterMode === "custom" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-white/50">De:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-white/50">Ate:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10 mb-6">
            {[
              { id: "produtividade", label: "Qualifiquei & Agendei" },
              { id: "resultados", label: "Marcados & Resultados" },
              { id: "funil", label: "Funil por Equipe" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-[2px] ${
                  activeTab === tab.id
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteudo das Tabs */}
        <div className="px-6 pb-8 max-w-[1600px] mx-auto">
          {/* Tab: Produtividade (Qualifiquei & Agendei) */}
          {activeTab === "produtividade" && (
            <div className="space-y-6">
              {/* Cards resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-5">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Qualificados</p>
                  <p className="text-4xl font-bold text-cyan-400">{qualificados.length}</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500/15 to-violet-600/5 border border-violet-500/20 rounded-2xl p-5">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Agendei</p>
                  <p className="text-4xl font-bold text-violet-400">{agendeiPorVendedor.reduce((acc, v) => acc + v.agendei, 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Top Vendedor</p>
                  <p className="text-lg font-bold text-emerald-400 truncate">{agendeiPorVendedor[0]?.nome || "-"}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Top Equipe</p>
                  <p className="text-lg font-bold text-amber-400 truncate">{agendeiPorVendedor[0]?.equipe || "-"}</p>
                </div>
              </div>

              {/* Tabelas lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Qualifiquei por Vendedor */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4">Qualifiquei por Vendedor</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {qualifiqueiPorVendedor.length === 0 ? (
                      <p className="text-white/40 text-sm">Nenhum lead qualificado no periodo</p>
                    ) : (
                      qualifiqueiPorVendedor.map((v, idx) => (
                        <div key={v.nome} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                          <span className="text-lg font-bold text-white/30 w-6">{idx + 1}</span>
                          {v.foto ? (
                            <img src={v.foto} alt={v.nome} className="w-10 h-10 rounded-full object-cover object-top border border-cyan-500/30" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                              {v.nome.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{v.nome}</p>
                            <p className="text-xs text-white/40">{v.equipe}</p>
                          </div>
                          <span className="text-2xl font-bold text-cyan-400">{v.qualificados}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Agendei por Vendedor */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-violet-400 mb-4">Agendei por Vendedor</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {agendeiPorVendedor.length === 0 ? (
                      <p className="text-white/40 text-sm">Nenhum lead agendado no periodo</p>
                    ) : (
                      agendeiPorVendedor.map((v, idx) => (
                        <div key={v.nome} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                          <span className="text-lg font-bold text-white/30 w-6">{idx + 1}</span>
                          {v.foto ? (
                            <img src={v.foto} alt={v.nome} className="w-10 h-10 rounded-full object-cover object-top border border-violet-500/30" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                              {v.nome.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{v.nome}</p>
                            <p className="text-xs text-white/40">{v.equipe}</p>
                          </div>
                          <span className="text-2xl font-bold text-violet-400">{v.agendei}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Grafico de barras comparativo */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Comparativo Qualifiquei vs Agendei</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={agendeiPorVendedor.slice(0, 10).map(v => ({
                      name: v.nome.split(" ")[0],
                      Agendei: v.agendei,
                      Qualificados: qualifiqueiPorVendedor.find(q => q.nome === v.nome)?.qualificados || 0,
                    }))}
                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" style={{ fontSize: "12px" }} />
                    <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: "12px" }} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                    <Legend />
                    <Bar dataKey="Qualificados" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Agendei" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Ranking de Conversao Qualifiquei -> Agendei */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Por Vendedor */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-emerald-400 mb-4">Conversao Qualifiquei → Agendei (Vendedor)</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {conversaoQualAgendei.length === 0 ? (
                      <p className="text-white/40 text-sm">Sem dados de conversao</p>
                    ) : (
                      conversaoQualAgendei.map((v, idx) => (
                        <div key={v.nome} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                          <span className="text-lg font-bold text-white/30 w-6">{idx + 1}</span>
                          {v.foto ? (
                            <img src={v.foto} alt={v.nome} className="w-10 h-10 rounded-full object-cover object-top border border-emerald-500/30" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                              {v.nome.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{v.nome}</p>
                            <p className="text-xs text-white/40">{v.qualificados} qual → {v.agendei} agendei</p>
                          </div>
                          <span className={`text-2xl font-bold ${v.taxa >= 70 ? "text-emerald-400" : v.taxa >= 40 ? "text-amber-400" : "text-red-400"}`}>
                            {v.taxa}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Por Equipe */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-amber-400 mb-4">Conversao Qualifiquei → Agendei (Equipe)</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {conversaoPorEquipe.length === 0 ? (
                      <p className="text-white/40 text-sm">Sem dados de conversao</p>
                    ) : (
                      conversaoPorEquipe.map((e, idx) => (
                        <div key={e.nome} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                          <span className="text-lg font-bold text-white/30 w-6">{idx + 1}</span>
                          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                            {e.nome.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{e.nome}</p>
                            <p className="text-xs text-white/40">{e.qualificados} qual → {e.agendei} agendei</p>
                          </div>
                          <span className={`text-2xl font-bold ${e.taxa >= 70 ? "text-emerald-400" : e.taxa >= 40 ? "text-amber-400" : "text-red-400"}`}>
                            {e.taxa}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Resultados (Marcados, Veio, Faltou) */}
          {activeTab === "resultados" && (
            <div className="space-y-6">
              {/* Cards resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className="bg-gradient-to-br from-[#d4af37]/15 to-[#d4af37]/5 border border-[#d4af37]/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Marcados</p>
                  <p className="text-3xl font-bold text-[#d4af37]">{stats.total}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Veio</p>
                  <p className="text-3xl font-bold text-emerald-400">{stats.veio}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500/15 to-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Faltou</p>
                  <p className="text-3xl font-bold text-red-400">{stats.nao}</p>
                </div>
                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Pendentes</p>
                  <p className="text-3xl font-bold text-white/70">{stats.pendentes}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Presenca</p>
                  <p className="text-3xl font-bold text-blue-400">{stats.taxaPresenca}%</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Vendas</p>
                  <p className="text-3xl font-bold text-emerald-400">{stats.vendas}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Conversao</p>
                  <p className="text-3xl font-bold text-amber-400">{stats.taxaConversao}%</p>
                </div>
              </div>

              {/* Tabela de resultados por vendedor */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 overflow-x-auto">
                <h3 className="text-lg font-semibold text-[#d4af37] mb-4">Resultados por Vendedor</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-2 text-white/50 font-medium">Vendedor</th>
                      <th className="text-center py-3 px-2 text-[#d4af37] font-medium">Marcados</th>
                      <th className="text-center py-3 px-2 text-emerald-400 font-medium">Veio</th>
                      <th className="text-center py-3 px-2 text-red-400 font-medium">Faltou</th>
                      <th className="text-center py-3 px-2 text-emerald-400 font-medium">Vendas</th>
                      <th className="text-center py-3 px-2 text-white/50 font-medium">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosPorVendedor.map((v: any) => {
                      const conv = v.veio > 0 ? Math.round((v.vendas / v.veio) * 100) : 0
                      return (
                        <tr key={v.nome} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              {v.foto ? (
                                <img src={v.foto} alt={v.nome} className="w-8 h-8 rounded-full object-cover object-top" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] text-sm font-bold">
                                  {v.nome.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-white">{v.nome}</p>
                                <p className="text-xs text-white/40">{v.equipe}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2 text-[#d4af37] font-semibold">{v.marcados}</td>
                          <td className="text-center py-3 px-2 text-emerald-400 font-semibold">{v.veio}</td>
                          <td className="text-center py-3 px-2 text-red-400 font-semibold">{v.nao}</td>
                          <td className="text-center py-3 px-2 text-emerald-400 font-semibold">{v.vendas}</td>
                          <td className="text-center py-3 px-2 text-white/70 font-semibold">{conv}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Atendentes e Origem */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Atendentes */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-emerald-400 mb-4">Atendentes (Conversao)</h3>
                  <div className="space-y-3">
                    {atendenteStats.length === 0 ? (
                      <p className="text-white/40 text-sm">Nenhum atendimento registrado</p>
                    ) : (
                      atendenteStats.map((a) => {
                        const conv = a.atendidos > 0 ? Math.round((a.vendas / a.atendidos) * 100) : 0
                        return (
                          <div key={a.nome} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                            <span className="font-medium text-white">{a.nome}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-white/50 text-sm">Atendeu: {a.atendidos}</span>
                              <span className="text-emerald-400 font-bold">Vendas: {a.vendas}</span>
                              <span className="text-amber-400 font-bold">{conv}%</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Origens Marcados e Vendas */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-violet-400 mb-4">Origem dos Leads</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Origens Marcados */}
                    <div>
                      <p className="text-sm text-[#d4af37] mb-2 font-medium">Marcados</p>
                      <div className="space-y-1 max-h-[180px] overflow-y-auto">
                        {origensMarcados.marcados.length === 0 ? (
                          <p className="text-white/30 text-xs">Sem dados</p>
                        ) : (
                          origensMarcados.marcados.map(([origem, qtd]) => (
                            <div key={origem} className="flex items-center justify-between text-sm">
                              <span className="text-white/60 truncate">{origem}</span>
                              <span className="text-[#d4af37] font-semibold">{qtd}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {/* Origens Vendas */}
                    <div>
                      <p className="text-sm text-emerald-400 mb-2 font-medium">Vendas</p>
                      <div className="space-y-1 max-h-[180px] overflow-y-auto">
                        {origensMarcados.vendas.length === 0 ? (
                          <p className="text-white/30 text-xs">Sem vendas</p>
                        ) : (
                          origensMarcados.vendas.map(([origem, qtd]) => (
                            <div key={origem} className="flex items-center justify-between text-sm">
                              <span className="text-white/60 truncate">{origem}</span>
                              <span className="text-emerald-400 font-semibold">{qtd}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Funil por Equipe */}
          {activeTab === "funil" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Funil de Conversao por Equipe</h3>

              {funilPorEquipe.length === 0 ? (
                <p className="text-white/40">Nenhum dado disponivel</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {funilPorEquipe.map((equipe: any) => {
                    const taxaQualAgendei = equipe.qualificados > 0 ? Math.round((equipe.agendei / equipe.qualificados) * 100) : 0
                    const taxaMarcados = equipe.agendei > 0 ? Math.round((equipe.marcados / equipe.agendei) * 100) : 0
                    const taxaPresenca = equipe.marcados > 0 ? Math.round((equipe.veio / equipe.marcados) * 100) : 0
                    const taxaNoShow = equipe.marcados > 0 ? Math.round((equipe.nao / equipe.marcados) * 100) : 0
                    const maxValue = Math.max(equipe.qualificados, equipe.agendei, equipe.marcados, equipe.veio, 1)

                    return (
                      <div key={equipe.equipe} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                        <h4 className="text-lg font-bold text-[#d4af37] mb-6 text-center">{equipe.equipe}</h4>

                        {/* Funil simples em linhas horizontais */}
                        <div className="space-y-4">
                          {/* Qualificados */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-cyan-300">QUALIFICADOS</span>
                              <span className="text-2xl font-bold text-cyan-400">{equipe.qualificados}</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400" style={{ width: "100%" }}></div>
                            </div>
                          </div>

                          {/* Agendei */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-violet-300">AGENDEI</span>
                              <span className="text-sm text-violet-400">{taxaQualAgendei}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400" style={{ width: equipe.qualificados > 0 ? `${(equipe.agendei / equipe.qualificados) * 100}%` : "0%" }}></div>
                              </div>
                              <span className="text-2xl font-bold text-violet-400 min-w-fit">{equipe.agendei}</span>
                            </div>
                          </div>

                          {/* Marcados */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-[#d4af37]/80">MARCADOS</span>
                              <span className="text-sm text-[#d4af37]/60">{equipe.agendei > 0 ? Math.round((equipe.marcados / equipe.agendei) * 100) : 0}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#d4af37] to-yellow-400" style={{ width: equipe.agendei > 0 ? `${(equipe.marcados / equipe.agendei) * 100}%` : "0%" }}></div>
                              </div>
                              <span className="text-2xl font-bold text-[#d4af37] min-w-fit">{equipe.marcados}</span>
                            </div>
                          </div>

                          {/* Vieram */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-emerald-300">VIERAM</span>
                              <span className="text-sm text-emerald-400">{taxaPresenca}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: equipe.marcados > 0 ? `${(equipe.veio / equipe.marcados) * 100}%` : "0%" }}></div>
                              </div>
                              <span className="text-2xl font-bold text-emerald-400 min-w-fit">{equipe.veio}</span>
                            </div>
                          </div>
                        </div>

                        {/* Resumo final */}
                        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <p className="text-[10px] text-white/50 uppercase">No-Show</p>
                            <p className="text-xl font-bold text-red-400">{equipe.nao}</p>
                          </div>
                          {(equipe.remarcados || 0) > 0 && (
                            <div className="text-center">
                              <p className="text-[10px] text-white/50 uppercase">Remarcados</p>
                              <p className="text-xl font-bold text-orange-400">{equipe.remarcados}</p>
                            </div>
                          )}
                          {equipe.vendas > 0 && (
                            <div className="text-center">
                              <p className="text-[10px] text-white/50 uppercase">Vendas</p>
                              <p className="text-xl font-bold text-emerald-400">{equipe.vendas}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
