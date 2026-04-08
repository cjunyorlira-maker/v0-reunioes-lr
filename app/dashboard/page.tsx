"use client"

import { useState, useMemo } from "react"
import { usePlugaEventos } from "@/hooks/use-pluga-eventos"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import DashboardMetrics from "@/components/dashboard/metrics"
import VendedorPerformance from "@/components/dashboard/vendedor-performance"
import EquipePerformance from "@/components/dashboard/equipe-performance"
import ConversaoAnalytics from "@/components/dashboard/conversao-analytics"
import AtendimentoAnalytics from "@/components/dashboard/atendimento-analytics"

export default function DashboardPage() {
  // Filtro por dia — null = semana toda
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month">("week")

  // Dias da semana para os botões do filtro
  const weekDays = useMemo(() => getWeekDays(), [])

  // Define o range efetivo baseado no período
  const dateRange = useMemo(() => {
    const today = new Date()

    if (selectedPeriod === "day" && selectedDay) {
      return { start: selectedDay, end: selectedDay }
    }

    if (selectedPeriod === "week") {
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
  }, [selectedDay, selectedPeriod, weekDays])

  // Busca eventos do Pluga
  const { eventos, isLoading } = usePlugaEventos(dateRange)

  return (
    <div className="min-h-screen bg-[#0a0e27] text-[#f5f0e8]">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-[#0f1429] border-r border-[rgba(212,175,55,0.1)] p-6 flex flex-col">
        <div className="mb-12">
          <h1 className="text-2xl font-bold text-[#d4af37]">Dashboard</h1>
          <p className="text-[12px] text-[#8a8070] mt-1">Métricas de Vendas</p>
        </div>

        <nav className="space-y-3 flex-1">
          <a href="/quadro" className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#8a8070] hover:bg-[rgba(212,175,55,0.08)] hover:text-[#d4af37] transition-colors">
            <span>📊</span> Quadro
          </a>
          <div className="px-4 py-2 rounded-lg bg-[rgba(212,175,55,0.15)] text-[#d4af37] font-medium flex items-center gap-3">
            <span>📈</span> Dashboard
          </div>
          <a href="/settings" className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#8a8070] hover:bg-[rgba(212,175,55,0.08)] hover:text-[#d4af37] transition-colors">
            <span>⚙️</span> Configurações
          </a>
        </nav>

        <div className="pt-6 border-t border-[rgba(212,175,55,0.1)] text-[12px] text-[#8a8070]">
          <p>Última atualização:</p>
          <p className="text-[#d4af37] font-medium">{new Date().toLocaleTimeString("pt-BR")}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#f5f0e8] mb-4">Relatório de Performance</h2>

          {/* Filtro por Período */}
          <div className="flex gap-3 mb-6">
            {(["day", "week", "month"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? "bg-[#d4af37] text-black"
                    : "bg-[rgba(212,175,55,0.08)] text-[#d4af37] hover:bg-[rgba(212,175,55,0.15)]"
                }`}
              >
                {period === "day" ? "Dia" : period === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>

          {/* Filtro por Dia (só aparece se "day" selecionado) */}
          {selectedPeriod === "day" && (
            <div className="flex flex-wrap gap-2 mb-6">
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
                        ? "bg-transparent text-violet-400 border-violet-500/40"
                        : "bg-transparent text-[#8a8070] border-[rgba(255,255,255,0.08)]"
                    }`}
                  >
                    {day.dayName} {day.dayNumber}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12 text-[#8a8070]">
            Carregando dados...
          </div>
        )}

        {/* Métricas Principais */}
        {!isLoading && <DashboardMetrics eventos={eventos} dateRange={dateRange} />}

        {/* Performance por Vendedor */}
        {!isLoading && <VendedorPerformance eventos={eventos} />}

        {/* Performance por Equipe */}
        {!isLoading && <EquipePerformance eventos={eventos} />}

        {/* Análise de Conversão */}
        {!isLoading && <ConversaoAnalytics eventos={eventos} />}

        {/* Análise de Atendimento */}
        {!isLoading && <AtendimentoAnalytics eventos={eventos} />}
      </div>
    </div>
  )
}
