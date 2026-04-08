"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import useSWR from "swr"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { getFotoVendedor, normalizeVendedorNome } from "@/lib/vendedor-fotos"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [sendingReport, setSendingReport] = useState(false)

  // Função para enviar relatório via WhatsApp
  const handleSendWhatsAppReport = async () => {
    setSendingReport(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const response = await fetch(`/api/relatorio/whatsapp?date=${selectedDay || today}`)
      const data = await response.json()
      
      if (data.whatsappLink) {
        window.open(data.whatsappLink, "_blank")
      }
    } catch (error) {
      console.error("Erro ao gerar relatório:", error)
    } finally {
      setSendingReport(false)
    }
  }

  // Dias da semana
  const weekDays = useMemo(() => getWeekDays(), [])

  // Date range baseado no filtro
  const dateRange = useMemo(() => {
    const today = new Date()

    if (timeRange === "day" && selectedDay) {
      return { start: selectedDay, end: selectedDay }
    }

    if (timeRange === "week") {
      return {
        start: formatDateForDB(weekDays[0].date),
        end: formatDateForDB(weekDays[weekDays.length - 1].date),
      }
    }

    // month
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return {
      start: formatDateForDB(firstDay),
      end: formatDateForDB(lastDay),
    }
  }, [selectedDay, timeRange, weekDays])

  // Busca leads (reuniões marcadas)
  const { data: leadsData } = useSWR(
    `/api/leads?startDate=${dateRange.start}&endDate=${dateRange.end}`,
    fetcher,
    { refreshInterval: 30 * 1000 }
  )

  // Busca eventos qualificados do Pluga
  const { data: plugaData } = useSWR(
    `/api/pluga/eventos?tipo=qualificado&startDate=${dateRange.start}&endDate=${dateRange.end}`,
    fetcher,
    { refreshInterval: 30 * 1000 }
  )

  const leads = leadsData?.leads || []
  const qualificados = plugaData?.leads || []

  // Estatísticas por vendedor
  const vendedorStats = useMemo(() => {
    const stats: Record<string, any> = {}

    // Processa leads (Marcados, Veio, Faltou, Vendas)
    leads.forEach((lead: any) => {
      const vendedor = normalizeVendedorNome(lead.responsavel || "Não informado")
      if (!stats[vendedor]) {
        stats[vendedor] = {
          nome: vendedor,
          foto: lead.foto_responsavel || getFotoVendedor(vendedor),
          equipe: lead.equipe || "Sem equipe",
          qualificados: 0,
          agendados: 0,
          marcados: 0,
          veio: 0,
          faltou: 0,
          vendas: 0,
          retornos: 0,
        }
      }
      
      stats[vendedor].marcados++
      
      if (lead.status === "veio") {
        stats[vendedor].veio++
      } else if (lead.status === "nao") {
        stats[vendedor].faltou++
      }

      if (lead.venda_fechada) stats[vendedor].vendas++
      if (lead.retorno) stats[vendedor].retornos++

      // Agendei = leads criados no período
      if (lead.created_at) {
        const createdDate = lead.created_at.split("T")[0]
        if (createdDate >= dateRange.start && createdDate <= dateRange.end) {
          stats[vendedor].agendados++
        }
      }
    })

    // Processa qualificados
    qualificados.forEach((evt: any) => {
      const vendedor = normalizeVendedorNome(evt.vendedor || evt.responsavel || "Não informado")
      if (!stats[vendedor]) {
        stats[vendedor] = {
          nome: vendedor,
          foto: getFotoVendedor(vendedor),
          equipe: evt.equipe || "Sem equipe",
          qualificados: 0,
          agendados: 0,
          marcados: 0,
          veio: 0,
          faltou: 0,
          vendas: 0,
          retornos: 0,
        }
      }
      stats[vendedor].qualificados++
    })

    return Object.values(stats).sort((a: any, b: any) => {
      const scoreA = a.qualificados + a.agendados + a.vendas
      const scoreB = b.qualificados + b.agendados + b.vendas
      return scoreB - scoreA
    })
  }, [leads, qualificados, dateRange])

  // Totais
  const totals = useMemo(() => {
    return vendedorStats.reduce((acc: any, v: any) => ({
      qualificados: acc.qualificados + v.qualificados,
      agendados: acc.agendados + v.agendados,
      marcados: acc.marcados + v.marcados,
      veio: acc.veio + v.veio,
      faltou: acc.faltou + v.faltou,
      vendas: acc.vendas + v.vendas,
      retornos: acc.retornos + v.retornos,
    }), { qualificados: 0, agendados: 0, marcados: 0, veio: 0, faltou: 0, vendas: 0, retornos: 0 })
  }, [vendedorStats])

  // Dados para gráficos
  const chartData = useMemo(() => {
    return vendedorStats.slice(0, 8).map((v: any) => ({
      name: v.nome.split(" ")[0],
      Qualif: v.qualificados,
      Agendei: v.agendados,
      Vendas: v.vendas,
    }))
  }, [vendedorStats])

  // Dados para pie chart de atendimento
  const pieData = [
    { name: "Veio", value: totals.veio, color: "#10b981" },
    { name: "Faltou", value: totals.faltou, color: "#ef4444" },
    { name: "Pendente", value: Math.max(0, totals.marcados - totals.veio - totals.faltou), color: "#6b7280" },
  ]

  // Conversão
  const taxaConversao = totals.veio > 0 ? Math.round((totals.vendas / totals.veio) * 100) : 0
  const taxaComparecimento = totals.marcados > 0 ? Math.round((totals.veio / totals.marcados) * 100) : 0

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Fundo animado */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-4">
              <Image 
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LOGO%20LR%20DOURADA-uCybcklIGJqbgpXIb5c8M32rOJfZ8e.png"
                alt="LR Multimarcas"
                width={48}
                height={48}
                className="rounded-lg"
              />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Dashboard Executivo
                </h1>
                <p className="text-xs text-white/40">LR Multimarcas - Performance em Tempo Real</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSendWhatsAppReport}
                disabled={sendingReport}
                className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {sendingReport ? "Gerando..." : "Enviar WhatsApp"}
              </button>
              <a 
                href="/quadro" 
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-all hover:border-cyan-500/50 flex items-center gap-2"
              >
                <span>&#8592;</span> Voltar ao Quadro
              </a>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="max-w-[1600px] mx-auto px-6 py-6">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex gap-2">
              {(["day", "week", "month"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setTimeRange(range)
                    if (range !== "day") setSelectedDay(null)
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    timeRange === range
                      ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/30"
                      : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {range === "day" ? "Por Dia" : range === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>

            {/* Seletor de dia */}
            {timeRange === "day" && (
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => {
                  const dayStr = formatDateForDB(day.date)
                  return (
                    <button
                      key={dayStr}
                      onClick={() => setSelectedDay(dayStr)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedDay === dayStr
                          ? "bg-violet-500 text-white"
                          : day.isToday
                          ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                          : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {day.dayName} {day.dayNumber}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Horário atual */}
            <div className="ml-auto text-right">
              <p className="text-2xl font-mono text-cyan-400">
                {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-xs text-white/40">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <MetricCard label="Qualificados" value={totals.qualificados} color="cyan" icon="Q" />
            <MetricCard label="Agendei" value={totals.agendados} color="violet" icon="A" />
            <MetricCard label="Marcados" value={totals.marcados} color="amber" icon="M" />
            <MetricCard label="Veio" value={totals.veio} color="emerald" icon="V" />
            <MetricCard label="Faltou" value={totals.faltou} color="red" icon="F" />
            <MetricCard label="Vendas" value={totals.vendas} color="emerald" icon="$" />
            <MetricCard label="Retornos" value={totals.retornos} color="blue" icon="R" />
          </div>

          {/* Taxas de Conversão */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/50 text-sm">Taxa de Comparecimento</p>
                  <p className="text-4xl font-bold text-emerald-400 mt-1">{taxaComparecimento}%</p>
                </div>
                <div className="w-20 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={25} outerRadius={35} dataKey="value" strokeWidth={0}>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-white/30 text-xs mt-2">{totals.veio} compareceram de {totals.marcados} marcados</p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/50 text-sm">Taxa de Conversão</p>
                  <p className="text-4xl font-bold text-cyan-400 mt-1">{taxaConversao}%</p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-cyan-500/30 flex items-center justify-center">
                  <span className="text-cyan-400 text-lg font-bold">{totals.vendas}</span>
                </div>
              </div>
              <p className="text-white/30 text-xs mt-2">{totals.vendas} vendas de {totals.veio} atendimentos</p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Gráfico de Barras */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <h2 className="text-white font-semibold mb-4 text-sm">Performance por Vendedor</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" style={{ fontSize: "11px" }} />
                  <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: "11px" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(0,0,0,0.9)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: "8px", fontSize: "12px" }} 
                  />
                  <Bar dataKey="Qualif" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Agendei" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Vendas" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda e resumo */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <h2 className="text-white font-semibold mb-4 text-sm">Resumo do Período</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-cyan-500"></div>
                    <span className="text-white/70 text-sm">Qualificados</span>
                  </div>
                  <span className="text-cyan-400 font-semibold">{totals.qualificados}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-violet-500"></div>
                    <span className="text-white/70 text-sm">Agendamentos</span>
                  </div>
                  <span className="text-violet-400 font-semibold">{totals.agendados}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500"></div>
                    <span className="text-white/70 text-sm">Reuniões Marcadas</span>
                  </div>
                  <span className="text-amber-400 font-semibold">{totals.marcados}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <span className="text-white/70 text-sm">Atendimentos</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">{totals.veio}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <span className="text-white/70 text-sm">Vendas Fechadas</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">{totals.vendas}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Vendedores */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 backdrop-blur-sm overflow-x-auto">
            <h2 className="text-white font-semibold mb-4 text-sm">Detalhamento por Vendedor</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-3 text-white/50 font-medium">Vendedor</th>
                  <th className="text-center py-3 px-2 text-cyan-400/80 font-medium">Qualif.</th>
                  <th className="text-center py-3 px-2 text-violet-400/80 font-medium">Agendei</th>
                  <th className="text-center py-3 px-2 text-amber-400/80 font-medium">Marcados</th>
                  <th className="text-center py-3 px-2 text-emerald-400/80 font-medium">Veio</th>
                  <th className="text-center py-3 px-2 text-red-400/80 font-medium">Faltou</th>
                  <th className="text-center py-3 px-2 text-emerald-400/80 font-medium">Vendas</th>
                  <th className="text-center py-3 px-2 text-white/50 font-medium">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {vendedorStats.map((v: any) => {
                  const conv = v.veio > 0 ? Math.round((v.vendas / v.veio) * 100) : 0
                  return (
                    <tr key={v.nome} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {v.foto ? (
                            <img src={v.foto} alt={v.nome} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                              {v.nome.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium text-sm">{v.nome}</p>
                            <p className="text-white/40 text-xs">{v.equipe}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-block bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-xs font-semibold min-w-[28px]">
                          {v.qualificados}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-block bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded text-xs font-semibold min-w-[28px]">
                          {v.agendados}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-block bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-semibold min-w-[28px]">
                          {v.marcados}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-block bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-semibold min-w-[28px]">
                          {v.veio}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-block bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-semibold min-w-[28px]">
                          {v.faltou}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-block bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-semibold min-w-[28px]">
                          {v.vendas}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-white/60 text-xs">{conv}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}

// Componente de Card de Métrica
function MetricCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const colorClasses: Record<string, string> = {
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    red: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-400",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400",
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4 backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/40 text-xs uppercase tracking-wider">{label}</span>
        <span className={`text-lg font-bold opacity-30`}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${colorClasses[color].split(" ").pop()}`}>{value}</p>
    </div>
  )
}
