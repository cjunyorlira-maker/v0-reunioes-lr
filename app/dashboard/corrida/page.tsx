"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome, getVendedorGenero } from "@/lib/vendedor-fotos"
import { Trophy, Flag, Zap, Target, ArrowLeft, Calendar } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Metas
const META_AGENDEI_DIA = 5
const META_QUALIFICADOS_DIA = 10
const META_AGENDEI_SEMANA = META_AGENDEI_DIA * 6 // 30
const META_QUALIFICADOS_SEMANA = META_QUALIFICADOS_DIA * 6 // 60

type ViewMode = "dia" | "semana"
type RaceType = "agendei" | "qualificados"

export default function CorridaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("dia")
  const [raceType, setRaceType] = useState<RaceType>("qualificados")
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date()
    return formatDateForDB(today)
  })

  // Dias da semana
  const weekDays = useMemo(() => getWeekDays(), [])
  const dateRange = useMemo(() => ({
    start: formatDateForDB(weekDays[0].date),
    end: formatDateForDB(weekDays[weekDays.length - 1].date),
  }), [weekDays])

  // Busca dados
  const { data: leadsData } = useSWR(
    `/api/leads?startDate=${dateRange.start}&endDate=${dateRange.end}`,
    fetcher,
    { refreshInterval: 10000 }
  )

  const { data: qualificadosData } = useSWR(
    `/api/leads/qualificados?startDate=${dateRange.start}&endDate=${dateRange.end}`,
    fetcher,
    { refreshInterval: 10000 }
  )

  const leads = leadsData || []
  const qualificados = qualificadosData?.leads || []

  // Calcular dados dos vendedores
  const vendedoresData = useMemo(() => {
    const map: Record<string, {
      nome: string
      foto: string | undefined
      genero: "M" | "F"
      agendeiDia: number
      agendeiSemana: number
      qualificadosDia: number
      qualificadosSemana: number
    }> = {}

    // Contar agendei (leads com data_agendei)
    leads.forEach((lead: any) => {
      if (!lead.data_agendei || !lead.responsavel) return
      const vendedor = normalizeVendedorNome(lead.responsavel)
      
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: getFotoVendedor(vendedor),
          genero: getVendedorGenero(vendedor),
          agendeiDia: 0,
          agendeiSemana: 0,
          qualificadosDia: 0,
          qualificadosSemana: 0,
        }
      }
      
      map[vendedor].agendeiSemana++
      if (lead.data_agendei === selectedDay) {
        map[vendedor].agendeiDia++
      }
    })

    // Contar qualificados
    qualificados.forEach((q: any) => {
      if (!q.responsavel) return
      const vendedor = normalizeVendedorNome(q.responsavel)
      
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: getFotoVendedor(vendedor),
          genero: getVendedorGenero(vendedor),
          agendeiDia: 0,
          agendeiSemana: 0,
          qualificadosDia: 0,
          qualificadosSemana: 0,
        }
      }
      
      map[vendedor].qualificadosSemana++
      if (q.data_qualificacao === selectedDay) {
        map[vendedor].qualificadosDia++
      }
    })

    return Object.values(map)
  }, [leads, qualificados, selectedDay])

  // Ordenar por desempenho
  const sortedVendedores = useMemo(() => {
    const meta = viewMode === "dia" 
      ? (raceType === "agendei" ? META_AGENDEI_DIA : META_QUALIFICADOS_DIA)
      : (raceType === "agendei" ? META_AGENDEI_SEMANA : META_QUALIFICADOS_SEMANA)

    return [...vendedoresData]
      .map(v => {
        const valor = viewMode === "dia"
          ? (raceType === "agendei" ? v.agendeiDia : v.qualificadosDia)
          : (raceType === "agendei" ? v.agendeiSemana : v.qualificadosSemana)
        const progresso = Math.min((valor / meta) * 100, 100)
        return { ...v, valor, progresso, meta }
      })
      .filter(v => v.valor > 0 || viewMode === "semana") // No dia, mostra so quem tem algo
      .sort((a, b) => b.progresso - a.progresso)
  }, [vendedoresData, viewMode, raceType])

  const meta = viewMode === "dia" 
    ? (raceType === "agendei" ? META_AGENDEI_DIA : META_QUALIFICADOS_DIA)
    : (raceType === "agendei" ? META_AGENDEI_SEMANA : META_QUALIFICADOS_SEMANA)

  const weekLabel = `${weekDays[0].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} - ${weekDays[weekDays.length - 1].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Fundo com pista */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.9)_0%,rgba(10,10,20,0.95)_100%)]" />
        {/* Linhas da pista */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(10)].map((_, i) => (
            <div 
              key={i} 
              className="absolute h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{ 
                top: `${10 + i * 10}%`, 
                left: 0, 
                right: 0,
                animation: `pulse ${2 + i * 0.2}s ease-in-out infinite`
              }}
            />
          ))}
        </div>
        {/* Linha de chegada */}
        <div className="absolute right-8 top-0 bottom-0 w-4 bg-[repeating-linear-gradient(0deg,white_0px,white_20px,black_20px,black_40px)] opacity-30" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-xl bg-black/40 sticky top-0 z-40">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 md:py-4 max-w-[1600px] mx-auto gap-3">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                  <Trophy size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    Corrida dos Vendedores
                  </h1>
                  <p className="text-xs text-white/50">{weekLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tipo de corrida */}
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setRaceType("qualificados")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    raceType === "qualificados" 
                      ? "bg-cyan-500 text-white" 
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Target size={14} className="inline mr-1" />
                  Qualificados
                </button>
                <button
                  onClick={() => setRaceType("agendei")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    raceType === "agendei" 
                      ? "bg-violet-500 text-white" 
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Calendar size={14} className="inline mr-1" />
                  Agendei
                </button>
              </div>

              {/* Modo de visualizacao */}
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("dia")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === "dia" 
                      ? "bg-emerald-500 text-white" 
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Dia
                </button>
                <button
                  onClick={() => setViewMode("semana")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === "semana" 
                      ? "bg-emerald-500 text-white" 
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Semana
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Seletor de dia */}
        {viewMode === "dia" && (
          <div className="px-4 md:px-6 py-4 max-w-[1600px] mx-auto">
            <div className="flex flex-wrap gap-2 justify-center">
              {weekDays.map((day) => {
                const dateStr = formatDateForDB(day.date)
                const isSelected = dateStr === selectedDay
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(dateStr)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-orange-500/30"
                        : day.isToday
                        ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                        : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {day.name.slice(0, 3)} {day.date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Meta info */}
        <div className="px-4 md:px-6 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
              <Flag size={18} className="text-yellow-400" />
              <span className="text-sm text-white/80">Meta:</span>
              <span className="text-lg font-bold text-yellow-400">{meta}</span>
              <span className="text-xs text-white/50">{raceType === "qualificados" ? "qualificados" : "agendados"}/{viewMode}</span>
            </div>
          </div>

          {/* Pista de corrida */}
          <div className="space-y-3">
            {sortedVendedores.length === 0 ? (
              <div className="text-center py-12 text-white/50">
                <Zap size={48} className="mx-auto mb-4 opacity-30" />
                <p>Nenhum vendedor com dados ainda</p>
              </div>
            ) : (
              sortedVendedores.map((vendedor, index) => (
                <div 
                  key={vendedor.nome}
                  className="relative bg-gradient-to-r from-white/5 to-transparent rounded-2xl p-3 md:p-4 border border-white/10 overflow-hidden"
                >
                  {/* Posicao */}
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? "bg-yellow-500 text-black" :
                    index === 1 ? "bg-gray-300 text-black" :
                    index === 2 ? "bg-orange-600 text-white" :
                    "bg-white/10 text-white/60"
                  }`}>
                    {index + 1}
                  </div>

                  {/* Pista */}
                  <div className="ml-12 md:ml-14">
                    {/* Info do vendedor */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-white/90 truncate max-w-[120px] md:max-w-none">
                        {vendedor.nome}
                      </span>
                      <span className={`text-lg font-bold ${
                        vendedor.progresso >= 100 ? "text-emerald-400" :
                        vendedor.progresso >= 50 ? "text-yellow-400" :
                        "text-red-400"
                      }`}>
                        {vendedor.valor}/{vendedor.meta}
                      </span>
                      {vendedor.progresso >= 100 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          META!
                        </span>
                      )}
                    </div>

                    {/* Barra de progresso / Pista */}
                    <div className="relative h-12 md:h-14 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl overflow-hidden border border-white/5">
                      {/* Linhas da pista */}
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-[2px] bg-white/10 mx-4" style={{ background: "repeating-linear-gradient(90deg, white 0px, white 10px, transparent 10px, transparent 20px)" }} />
                      </div>

                      {/* Progresso */}
                      <div 
                        className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${
                          vendedor.genero === "F" 
                            ? "bg-gradient-to-r from-pink-600/40 to-pink-500/40" 
                            : "bg-gradient-to-r from-blue-600/40 to-blue-500/40"
                        }`}
                        style={{ width: `${vendedor.progresso}%` }}
                      />

                      {/* Carro */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
                        style={{ left: `calc(${Math.min(vendedor.progresso, 95)}% - 20px)` }}
                      >
                        <div className={`relative w-14 h-10 md:w-16 md:h-12 rounded-lg ${
                          vendedor.genero === "F" 
                            ? "bg-gradient-to-r from-pink-500 to-pink-400" 
                            : "bg-gradient-to-r from-blue-500 to-blue-400"
                        } shadow-lg flex items-center justify-center overflow-hidden border-2 ${
                          vendedor.genero === "F" ? "border-pink-300" : "border-blue-300"
                        }`}>
                          {/* Foto do vendedor */}
                          {vendedor.foto ? (
                            <img 
                              src={vendedor.foto} 
                              alt={vendedor.nome}
                              className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-white/50"
                            />
                          ) : (
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                              {vendedor.nome.charAt(0)}
                            </div>
                          )}
                          {/* Rodas */}
                          <div className="absolute -bottom-1 left-1 w-3 h-3 rounded-full bg-gray-800 border border-gray-600" />
                          <div className="absolute -bottom-1 right-1 w-3 h-3 rounded-full bg-gray-800 border border-gray-600" />
                        </div>
                        {/* Fumaca se em movimento */}
                        {vendedor.progresso > 0 && vendedor.progresso < 100 && (
                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-50">
                            <div className="w-2 h-2 rounded-full bg-white/30 animate-ping" style={{ animationDuration: "0.5s" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-ping" style={{ animationDuration: "0.7s" }} />
                          </div>
                        )}
                      </div>

                      {/* Linha de chegada */}
                      <div className="absolute right-0 inset-y-0 w-4 bg-[repeating-linear-gradient(0deg,white_0px,white_6px,black_6px,black_12px)] opacity-50" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Legenda */}
          <div className="flex justify-center gap-6 mt-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded bg-gradient-to-r from-pink-500 to-pink-400 border border-pink-300" />
              <span className="text-xs text-white/60">Mulheres</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded bg-gradient-to-r from-blue-500 to-blue-400 border border-blue-300" />
              <span className="text-xs text-white/60">Homens</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
