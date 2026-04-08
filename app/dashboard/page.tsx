"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome } from "@/lib/vendedor-fotos"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type TabType = "produtividade" | "resultados" | "funil"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("produtividade")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)

  // Dias da semana
  const weekDays = useMemo(() => getWeekDays(), [])
  const dateRange = useMemo(() => ({
    start: formatDateForDB(weekDays[0].date),
    end: formatDateForDB(weekDays[weekDays.length - 1].date),
  }), [weekDays])

  const activeRange = useMemo(() => {
    if (!selectedDay) return dateRange
    return { start: selectedDay, end: selectedDay }
  }, [selectedDay, dateRange])

  // Busca dados
  const { data: leadsData } = useSWR(
    `/api/leads?startDate=${dateRange.start}&endDate=${dateRange.end}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: qualificadosData } = useSWR(
    `/api/pluga/eventos?tipo=qualificado&startDate=${activeRange.start}&endDate=${activeRange.end}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const leads = leadsData || []
  const qualificados = qualificadosData?.leads || []

  // Leads filtrados pelo range ativo
  const leadsAtivos = useMemo(() => {
    return leads.filter((l: any) => l.data >= activeRange.start && l.data <= activeRange.end)
  }, [leads, activeRange])

  // Estatisticas gerais
  const stats = useMemo(() => {
    const veio = leadsAtivos.filter((l: any) => l.status === "veio").length
    const nao = leadsAtivos.filter((l: any) => l.status === "nao").length
    const vendas = leadsAtivos.filter((l: any) => l.venda_fechada).length
    const retornos = leadsAtivos.filter((l: any) => l.retorno).length

    return {
      total: leadsAtivos.length,
      veio,
      nao,
      vendas,
      retornos,
      pendentes: leadsAtivos.length - veio - nao,
      taxaPresenca: (veio + nao) > 0 ? Math.round((veio / (veio + nao)) * 100) : 0,
      taxaConversao: veio > 0 ? Math.round((vendas / veio) * 100) : 0,
    }
  }, [leadsAtivos])

  // Agendei por vendedor (leads criados no periodo)
  const agendeiPorVendedor = useMemo(() => {
    const map: Record<string, { nome: string; foto: string | null; equipe: string; agendei: number }> = {}

    leads.forEach((lead: any) => {
      const createdDate = lead.created_at?.split("T")[0]
      if (!createdDate) return
      if (createdDate < activeRange.start || createdDate > activeRange.end) return

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
  }, [leads, activeRange])

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

  // Resultados por vendedor (marcados, veio, faltou, vendas)
  const resultadosPorVendedor = useMemo(() => {
    const map: Record<string, any> = {}

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
          vendas: 0,
          retornos: 0,
        }
      }
      map[vendedor].marcados++
      if (lead.status === "veio") map[vendedor].veio++
      if (lead.status === "nao") map[vendedor].nao++
      if (lead.venda_fechada) map[vendedor].vendas++
      if (lead.retorno) map[vendedor].retornos++
    })

    return Object.values(map).sort((a: any, b: any) => b.marcados - a.marcados)
  }, [leadsAtivos])

  // Funil por equipe
  const funilPorEquipe = useMemo(() => {
    const map: Record<string, any> = {}

    // Qualificados por equipe
    qualificados.forEach((q: any) => {
      const equipe = q.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { equipe, qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, vendas: 0 }
      }
      map[equipe].qualificados++
    })

    // Agendei por equipe
    leads.forEach((lead: any) => {
      const createdDate = lead.created_at?.split("T")[0]
      if (!createdDate) return
      if (createdDate < activeRange.start || createdDate > activeRange.end) return

      const equipe = lead.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { equipe, qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, vendas: 0 }
      }
      map[equipe].agendei++
    })

    // Resultados por equipe
    leadsAtivos.forEach((lead: any) => {
      const equipe = lead.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { equipe, qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, vendas: 0 }
      }
      map[equipe].marcados++
      if (lead.status === "veio") map[equipe].veio++
      if (lead.status === "nao") map[equipe].nao++
      if (lead.venda_fechada) map[equipe].vendas++
    })

    return Object.values(map).sort((a: any, b: any) => (b.qualificados + b.agendei) - (a.qualificados + a.agendei))
  }, [qualificados, leads, leadsAtivos, activeRange])

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
      report += `Vendas: ${stats.vendas} | Retornos: ${stats.retornos}\n`
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
            <button
              onClick={() => setSelectedDay(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedDay === null
                  ? "bg-[#d4af37] text-black"
                  : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              Semana Toda
            </button>
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
                <div className="bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Retornos</p>
                  <p className="text-3xl font-bold text-cyan-400">{stats.retornos}</p>
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
                      <th className="text-center py-3 px-2 text-cyan-400 font-medium">Retornos</th>
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
                          <td className="text-center py-3 px-2 text-cyan-400 font-semibold">{v.retornos}</td>
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

                {/* Origem */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-violet-400 mb-4">Origem dos Leads</h3>
                  {origemData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={origemData.slice(0, 6)}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name.substring(0, 10)} ${(percent * 100).toFixed(0)}%`}
                        >
                          {origemData.slice(0, 6).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-white/40 text-sm">Sem dados de origem</p>
                  )}
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
                funilPorEquipe.map((equipe: any) => {
                  const taxaQualAgendei = equipe.qualificados > 0 ? Math.round((equipe.agendei / equipe.qualificados) * 100) : 0
                  const taxaPresenca = (equipe.veio + equipe.nao) > 0 ? Math.round((equipe.veio / (equipe.veio + equipe.nao)) * 100) : 0
                  const taxaConversao = equipe.veio > 0 ? Math.round((equipe.vendas / equipe.veio) * 100) : 0

                  return (
                    <div key={equipe.equipe} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                      <h4 className="text-lg font-bold text-[#d4af37] mb-6">{equipe.equipe}</h4>

                      {/* Funil visual */}
                      <div className="flex items-end justify-center gap-4 mb-6">
                        <div className="text-center">
                          <div className="w-28 h-24 bg-gradient-to-b from-cyan-500/30 to-cyan-500/10 rounded-t-3xl flex items-center justify-center border-t-4 border-cyan-500">
                            <span className="text-3xl font-bold text-cyan-400">{equipe.qualificados}</span>
                          </div>
                          <p className="text-xs text-white/50 mt-2">Qualificados</p>
                        </div>
                        <div className="text-white/30 text-2xl pb-8">&#8594;</div>
                        <div className="text-center">
                          <div className="w-24 h-20 bg-gradient-to-b from-violet-500/30 to-violet-500/10 rounded-t-2xl flex items-center justify-center border-t-4 border-violet-500">
                            <span className="text-2xl font-bold text-violet-400">{equipe.agendei}</span>
                          </div>
                          <p className="text-xs text-white/50 mt-2">Agendei</p>
                          <p className="text-[10px] text-violet-400">{taxaQualAgendei}%</p>
                        </div>
                        <div className="text-white/30 text-2xl pb-8">&#8594;</div>
                        <div className="text-center">
                          <div className="w-20 h-16 bg-gradient-to-b from-[#d4af37]/30 to-[#d4af37]/10 rounded-t-xl flex items-center justify-center border-t-4 border-[#d4af37]">
                            <span className="text-xl font-bold text-[#d4af37]">{equipe.marcados}</span>
                          </div>
                          <p className="text-xs text-white/50 mt-2">Marcados</p>
                        </div>
                        <div className="text-white/30 text-2xl pb-8">&#8594;</div>
                        <div className="text-center">
                          <div className="w-16 h-14 bg-gradient-to-b from-emerald-500/30 to-emerald-500/10 rounded-t-lg flex items-center justify-center border-t-4 border-emerald-500">
                            <span className="text-lg font-bold text-emerald-400">{equipe.veio}</span>
                          </div>
                          <p className="text-xs text-white/50 mt-2">Veio</p>
                          <p className="text-[10px] text-emerald-400">{taxaPresenca}%</p>
                        </div>
                        <div className="text-white/30 text-2xl pb-8">&#8594;</div>
                        <div className="text-center">
                          <div className="w-14 h-12 bg-gradient-to-b from-emerald-500/50 to-emerald-500/20 rounded-t flex items-center justify-center border-t-4 border-emerald-400">
                            <span className="text-lg font-bold text-emerald-300">{equipe.vendas}</span>
                          </div>
                          <p className="text-xs text-white/50 mt-2">Vendas</p>
                          <p className="text-[10px] text-emerald-300">{taxaConversao}%</p>
                        </div>
                      </div>

                      {/* Faltou separado */}
                      <div className="flex justify-center">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-6 py-3 text-center">
                          <p className="text-xs text-white/50">Faltou</p>
                          <p className="text-2xl font-bold text-red-400">{equipe.nao}</p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
