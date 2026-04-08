"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import useSWR from "swr"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week")

  // Busca dados dos eventos do Pluga
  const { data: plugaData } = useSWR(
    `/api/pluga/eventos?tipo=qualificado&limit=1000`,
    fetcher,
    { refreshInterval: 30 * 1000 }
  )

  // Eventos qualificados
  const eventos = plugaData?.leads || []

  // Calcula estatísticas por vendedor
  const vendedorStats = useMemo(() => {
    const stats: Record<string, any> = {}

    eventos.forEach((evt: any) => {
      const vendedor = evt.vendedor || "Não informado"
      if (!stats[vendedor]) {
        stats[vendedor] = {
          nome: vendedor,
          equipe: evt.equipe || "Sem equipe",
          qualificados: 0,
        }
      }
      stats[vendedor].qualificados++
    })

    return Object.values(stats).sort((a: any, b: any) => b.qualificados - a.qualificados)
  }, [eventos])

  // Dados para gráfico
  const chartData = useMemo(() => {
    return vendedorStats.slice(0, 10).map((v: any) => ({
      name: v.nome.split(" ")[0],
      Qualificados: v.qualificados,
    }))
  }, [vendedorStats])

  // Totais
  const totals = {
    totalQualificados: eventos.length,
    topVendedor: vendedorStats[0]?.nome || "-",
    topEquipe: vendedorStats[0]?.equipe || "-",
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Fundo animado com gradientes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/4 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto w-full">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                LR MULTIMARCAS
              </h1>
              <p className="text-xs text-white/40 mt-1">Performance Dashboard</p>
            </div>
            <Link 
              href="/quadro" 
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-all hover:border-cyan-500/50"
            >
              ← Voltar ao Quadro
            </Link>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="max-w-7xl mx-auto px-8 py-8">
          {/* Filtros */}
          <div className="flex gap-3 mb-8">
            {(["day", "week", "month"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  timeRange === range
                    ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/30"
                    : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                }`}
              >
                {range === "day" ? "Hoje" : range === "week" ? "Esta Semana" : "Este Mês"}
              </button>
            ))}
          </div>

          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-cyan-500/10 via-black to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-cyan-500/40 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/50 text-sm uppercase tracking-wider font-medium">Qualificados</p>
                  <p className="text-5xl font-bold text-cyan-400 mt-3">{totals.totalQualificados}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center text-2xl">📊</div>
              </div>
              <p className="text-white/40 text-xs">Leads na etapa de qualificação</p>
            </div>

            <div className="bg-gradient-to-br from-violet-500/10 via-black to-purple-500/10 border border-violet-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-violet-500/40 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/50 text-sm uppercase tracking-wider font-medium">Top Vendedor</p>
                  <p className="text-xl font-bold text-violet-400 mt-3 truncate">{totals.topVendedor}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center text-2xl">🏆</div>
              </div>
              <p className="text-white/40 text-xs">Maior produtividade</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/10 via-black to-green-500/10 border border-emerald-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-emerald-500/40 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/50 text-sm uppercase tracking-wider font-medium">Equipe Destaque</p>
                  <p className="text-xl font-bold text-emerald-400 mt-3 truncate">{totals.topEquipe}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center text-2xl">👥</div>
              </div>
              <p className="text-white/40 text-xs">Melhor performance</p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Gráfico de Barras */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-white font-semibold mb-6 text-lg flex items-center gap-2">
                <span>📈</span> Top Vendedores - Qualificados
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" style={{ fontSize: "12px" }} />
                  <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: "12px" }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "rgba(0,0,0,0.8)", 
                      border: "1px solid rgba(6,182,212,0.3)",
                      borderRadius: "8px"
                    }} 
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar dataKey="Qualificados" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribuição por Equipe */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-white font-semibold mb-6 text-lg flex items-center gap-2">
                <span>👥</span> Distribuição por Equipe
              </h2>
              <div className="space-y-4">
                {vendedorStats.slice(0, 6).map((v: any, idx: number) => {
                  const maxQualificados = Math.max(...vendedorStats.map((s: any) => s.qualificados), 1)
                  const percentage = (v.qualificados / maxQualificados) * 100
                  const colors = ["bg-cyan-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-blue-500"]
                  
                  return (
                    <div key={v.nome} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/80 font-medium truncate">{v.equipe}</span>
                        <span className={`${colors[idx]} text-white font-bold text-sm px-2 py-1 rounded`}>
                          {v.qualificados}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[idx]} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tabela Detalhada */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm overflow-x-auto">
            <h2 className="text-white font-semibold mb-6 text-lg flex items-center gap-2">
              <span>📋</span> Performance Detalhada por Vendedor
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-white/60 font-medium">Vendedor</th>
                  <th className="text-left py-4 px-4 text-white/60 font-medium">Equipe</th>
                  <th className="text-center py-4 px-4 text-cyan-400/80 font-medium">Qualificados</th>
                  <th className="text-center py-4 px-4 text-white/60 font-medium">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {vendedorStats.map((v: any) => (
                  <tr key={v.nome} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4 text-white font-medium">{v.nome}</td>
                    <td className="py-4 px-4 text-white/60 text-sm">{v.equipe}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-block bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-lg font-semibold">
                        {v.qualificados}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-white/60">
                      {((v.qualificados / (totals.totalQualificados || 1)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}
