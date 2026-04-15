"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import useSWR from "swr"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome, getVendedorGenero } from "@/lib/vendedor-fotos"
import { Trophy, Flag, Target, ArrowLeft, Calendar } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Metas
const META_AGENDEI_DIA = 5
const META_QUALIFICADOS_DIA = 10
const META_AGENDEI_SEMANA = META_AGENDEI_DIA * 6
const META_QUALIFICADOS_SEMANA = META_QUALIFICADOS_DIA * 6

type ViewMode = "dia" | "semana"
type RaceType = "agendei" | "qualificados"

// Componente do carro realista
function RaceCar({ 
  foto, 
  nome, 
  genero, 
  progresso,
  position 
}: { 
  foto?: string
  nome: string
  genero: "M" | "F"
  progresso: number
  position: number
}) {
  const isWinner = progresso >= 100
  const carColor = genero === "F" ? "pink" : "blue"
  
  return (
    <div 
      className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-20"
      style={{ left: `calc(${Math.min(progresso, 92)}% - 30px)` }}
    >
      {/* Container do carro */}
      <div className="relative">
        {/* Fumaca do escapamento */}
        {progresso > 0 && progresso < 100 && (
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-400/60 to-transparent animate-pulse blur-sm"
              style={{ animationDuration: "0.3s" }}
            />
            <div 
              className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-300/40 to-transparent animate-pulse blur-md"
              style={{ animationDuration: "0.5s", animationDelay: "0.1s" }}
            />
            <div 
              className="w-5 h-5 rounded-full bg-gradient-to-r from-gray-200/30 to-transparent animate-pulse blur-lg"
              style={{ animationDuration: "0.7s", animationDelay: "0.2s" }}
            />
          </div>
        )}

        {/* Reflexo do carro */}
        <div 
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full blur-md opacity-40 ${
            carColor === "pink" ? "bg-pink-500" : "bg-blue-500"
          }`}
        />

        {/* Carro SVG realista */}
        <svg 
          width="70" 
          height="35" 
          viewBox="0 0 70 35" 
          className="drop-shadow-2xl"
          style={{ filter: isWinner ? "drop-shadow(0 0 10px gold)" : undefined }}
        >
          {/* Sombra do carro */}
          <ellipse cx="35" cy="33" rx="28" ry="3" fill="rgba(0,0,0,0.3)" />
          
          {/* Corpo do carro */}
          <path 
            d={`M 8 22 
                Q 8 18, 12 16 
                L 18 16 
                Q 22 10, 30 8 
                L 45 8 
                Q 55 10, 58 16 
                L 62 16 
                Q 66 18, 66 22 
                L 66 25 
                Q 66 27, 64 28 
                L 10 28 
                Q 8 27, 8 25 
                Z`}
            fill={carColor === "pink" ? "url(#pinkGradient)" : "url(#blueGradient)"}
            stroke={carColor === "pink" ? "#ec4899" : "#3b82f6"}
            strokeWidth="1"
          />
          
          {/* Gradientes */}
          <defs>
            <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#be185d" />
            </linearGradient>
            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="windowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          
          {/* Janelas */}
          <path 
            d="M 20 16 Q 24 11, 30 10 L 44 10 Q 52 11, 55 16 Z"
            fill="url(#windowGradient)"
            stroke="#475569"
            strokeWidth="0.5"
          />
          
          {/* Divisao das janelas */}
          <line x1="37" y1="10" x2="37" y2="16" stroke="#475569" strokeWidth="1" />
          
          {/* Farol traseiro */}
          <rect x="8" y="19" width="3" height="4" rx="1" fill="#ef4444" opacity="0.9" />
          <rect x="8.5" y="19.5" width="2" height="1.5" rx="0.5" fill="#fca5a5" />
          
          {/* Farol dianteiro */}
          <rect x="63" y="19" width="3" height="4" rx="1" fill="#fef08a" opacity="0.9" />
          <rect x="63.5" y="19.5" width="2" height="1.5" rx="0.5" fill="#fef9c3" />
          
          {/* Detalhe lateral */}
          <path 
            d="M 12 22 L 62 22" 
            stroke={carColor === "pink" ? "#fce7f3" : "#dbeafe"} 
            strokeWidth="1.5"
            opacity="0.6"
          />
          
          {/* Roda traseira */}
          <circle cx="18" cy="27" r="6" fill="#1f2937" />
          <circle cx="18" cy="27" r="5" fill="#374151" />
          <circle cx="18" cy="27" r="3" fill="#6b7280" />
          <circle cx="18" cy="27" r="1.5" fill="#9ca3af" />
          {/* Aro da roda */}
          <circle cx="18" cy="27" r="4.5" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          
          {/* Roda dianteira */}
          <circle cx="56" cy="27" r="6" fill="#1f2937" />
          <circle cx="56" cy="27" r="5" fill="#374151" />
          <circle cx="56" cy="27" r="3" fill="#6b7280" />
          <circle cx="56" cy="27" r="1.5" fill="#9ca3af" />
          {/* Aro da roda */}
          <circle cx="56" cy="27" r="4.5" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          
          {/* Numero do carro */}
          <circle cx="37" cy="20" r="5" fill="white" opacity="0.9" />
          <text x="37" y="23" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1f2937">
            {position}
          </text>
        </svg>

        {/* Foto do piloto acima do carro */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
          {foto ? (
            <img 
              src={foto} 
              alt={nome}
              className={`w-7 h-7 rounded-full object-cover border-2 shadow-lg ${
                carColor === "pink" ? "border-pink-400" : "border-blue-400"
              }`}
            />
          ) : (
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg ${
              carColor === "pink" ? "bg-pink-500 border-2 border-pink-400" : "bg-blue-500 border-2 border-blue-400"
            }`}>
              {nome.charAt(0)}
            </div>
          )}
        </div>

        {/* Efeito de velocidade */}
        {progresso > 20 && progresso < 100 && (
          <>
            <div 
              className="absolute top-1/2 -translate-y-1/2 -left-8 w-6 h-[2px] bg-gradient-to-l from-white/40 to-transparent"
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 mt-2 -left-10 w-8 h-[1px] bg-gradient-to-l from-white/20 to-transparent"
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 -mt-2 -left-6 w-4 h-[1px] bg-gradient-to-l from-white/30 to-transparent"
            />
          </>
        )}
      </div>
    </div>
  )
}

export default function CorridaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("dia")
  const [raceType, setRaceType] = useState<RaceType>("qualificados")
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date()
    return formatDateForDB(today)
  })

  const weekDays = useMemo(() => getWeekDays(), [])
  const dateRange = useMemo(() => ({
    start: formatDateForDB(weekDays[0].date),
    end: formatDateForDB(weekDays[weekDays.length - 1].date),
  }), [weekDays])

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
      .filter(v => v.valor > 0 || viewMode === "semana")
      .sort((a, b) => b.progresso - a.progresso)
  }, [vendedoresData, viewMode, raceType])

  const meta = viewMode === "dia" 
    ? (raceType === "agendei" ? META_AGENDEI_DIA : META_QUALIFICADOS_DIA)
    : (raceType === "agendei" ? META_AGENDEI_SEMANA : META_QUALIFICADOS_SEMANA)

  const weekLabel = `${weekDays[0].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} - ${weekDays[weekDays.length - 1].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Fundo estilo asfalto */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#0f0f1a] to-[#0a0a0f]" />
        {/* Textura de asfalto */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-xl bg-black/60 sticky top-0 z-40">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 md:py-4 max-w-[1600px] mx-auto gap-3">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-red-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <Trophy size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                    Grand Prix LR
                  </h1>
                  <p className="text-xs text-white/50">{weekLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setRaceType("qualificados")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    raceType === "qualificados" 
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" 
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
                      ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg" 
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Calendar size={14} className="inline mr-1" />
                  Agendei
                </button>
              </div>

              <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setViewMode("dia")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === "dia" 
                      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg" 
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Dia
                </button>
                <button
                  onClick={() => setViewMode("semana")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === "semana" 
                      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg" 
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
                    {day.dayName.slice(0, 3)} {day.date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Meta info */}
        <div className="px-4 md:px-6 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/30 shadow-lg">
              <Flag size={20} className="text-red-400" />
              <div>
                <span className="text-xs text-white/60 block">META DA CORRIDA</span>
                <span className="text-2xl font-bold text-white">{meta}</span>
                <span className="text-xs text-white/50 ml-1">{raceType === "qualificados" ? "qualificados" : "agendados"}</span>
              </div>
            </div>
          </div>

          {/* Pistas de corrida */}
          <div className="space-y-4">
            {sortedVendedores.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <Trophy size={40} className="text-white/20" />
                </div>
                <p className="text-white/40">Aguardando pilotos...</p>
              </div>
            ) : (
              sortedVendedores.map((vendedor, index) => (
                <div 
                  key={vendedor.nome}
                  className="relative"
                >
                  {/* Container da pista */}
                  <div className="flex items-center gap-3">
                    {/* Posicao e nome */}
                    <div className="w-36 md:w-48 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
                          index === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black" :
                          index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-black" :
                          index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-700 text-white" :
                          "bg-white/10 text-white/60"
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white/90 truncate max-w-[100px] md:max-w-[140px]">
                            {vendedor.nome}
                          </p>
                          <p className={`text-xs font-bold ${
                            vendedor.progresso >= 100 ? "text-emerald-400" :
                            vendedor.progresso >= 50 ? "text-yellow-400" :
                            "text-red-400"
                          }`}>
                            {vendedor.valor}/{vendedor.meta}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pista */}
                    <div className="flex-1 relative h-20 md:h-24">
                      {/* Asfalto da pista */}
                      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-900 to-gray-800 rounded-xl overflow-hidden border border-white/5">
                        {/* Faixas laterais vermelhas/brancas */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-[repeating-linear-gradient(90deg,#ef4444_0px,#ef4444_20px,white_20px,white_40px)]" />
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-[repeating-linear-gradient(90deg,white_0px,white_20px,#ef4444_20px,#ef4444_40px)]" />
                        
                        {/* Linha central tracejada */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-[3px]" style={{
                          background: "repeating-linear-gradient(90deg, white 0px, white 30px, transparent 30px, transparent 60px)"
                        }} />
                        
                        {/* Marcacoes de distancia */}
                        {[25, 50, 75].map((pct) => (
                          <div 
                            key={pct}
                            className="absolute top-2 bottom-2 w-[2px] bg-white/20"
                            style={{ left: `${pct}%` }}
                          />
                        ))}

                        {/* Linha de chegada quadriculada */}
                        <div className="absolute right-0 top-2 bottom-2 w-6 bg-[repeating-conic-gradient(white_0deg_90deg,black_90deg_180deg)] bg-[length:8px_8px]" />
                      </div>

                      {/* Carro */}
                      <RaceCar 
                        foto={vendedor.foto}
                        nome={vendedor.nome}
                        genero={vendedor.genero}
                        progresso={vendedor.progresso}
                        position={index + 1}
                      />

                      {/* Badge de meta */}
                      {vendedor.progresso >= 100 && (
                        <div className="absolute top-0 right-8 -translate-y-1/2 px-2 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-[10px] font-bold text-white shadow-lg animate-bounce">
                          CHEGOU!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Legenda */}
          <div className="flex justify-center gap-8 mt-10 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <svg width="40" height="20" viewBox="0 0 70 35">
                <path 
                  d="M 8 22 Q 8 18, 12 16 L 18 16 Q 22 10, 30 8 L 45 8 Q 55 10, 58 16 L 62 16 Q 66 18, 66 22 L 66 25 Q 66 27, 64 28 L 10 28 Q 8 27, 8 25 Z"
                  fill="url(#pinkGradientLegend)"
                />
                <defs>
                  <linearGradient id="pinkGradientLegend" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="100%" stopColor="#be185d" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-sm text-white/60">Pilotas</span>
            </div>
            <div className="flex items-center gap-3">
              <svg width="40" height="20" viewBox="0 0 70 35">
                <path 
                  d="M 8 22 Q 8 18, 12 16 L 18 16 Q 22 10, 30 8 L 45 8 Q 55 10, 58 16 L 62 16 Q 66 18, 66 22 L 66 25 Q 66 27, 64 28 L 10 28 Q 8 27, 8 25 Z"
                  fill="url(#blueGradientLegend)"
                />
                <defs>
                  <linearGradient id="blueGradientLegend" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-sm text-white/60">Pilotos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
