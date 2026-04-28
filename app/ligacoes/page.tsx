"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Phone, PhoneCall, PhoneMissed, PhoneOff, Clock, Calendar, ExternalLink,
  Play, Pause, RefreshCw, Trophy, TrendingUp, Users, Flame,
  Snowflake, XCircle, ArrowLeft,
} from "lucide-react"
import Link from "next/link"

interface Ligacao {
  id: string
  callid: string
  ramal: string
  vendedor: string
  equipe: string
  telefone_cliente: string
  duracao_segundos: number
  status: string
  tipo_origem: string | null
  audio_url: string | null
  transcricao: string | null
  analise_ia: any
  score_geral: number | null
  resumo: string | null
  kommo_lead_id: string | null
  data_ligacao: string
  processado_em: string | null
}

interface VendedorStats {
  vendedor: string
  equipe: string
  total: number
  atendidas: number
  nao_atendidas: number
  taxa_atendimento: number
  tempo_total_chamadas_segundos: number
  tempo_real_fala_segundos: number
  tempo_medio_fala_segundos: number
  analisadas: number
  score_vendedor_medio: number | null
  score_lead_medio: number | null
  reunioes_marcadas: number
  leads_viavel_alta: number
  leads_inviaveis: number
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

interface Stats {
  geral: {
    total: number
    atendidas: number
    nao_atendidas: number
    canceladas: number
    caixa_postal: number
    ocupado: number
    tempo_total_chamadas_segundos: number
    tempo_real_fala_segundos: number
    taxa_atendimento: number
    analisadas: number
    pendentes_analise: number
    reunioes_marcadas: number
    leads_viavel_alta: number
    leads_inviaveis: number
  }
  porEquipe: EquipeStats[]
  porVendedor: VendedorStats[]
}

const EQUIPES = ["Elite", "Guerreiros", "Gladiadores", "Samurais", "Legado", "Lobos", "TDM", "Admin"]

const EQUIPE_COLORS: Record<string, { gradient: string; glow: string }> = {
  "Elite": { gradient: "from-amber-500 to-yellow-600", glow: "rgba(245,158,11,0.3)" },
  "Guerreiros": { gradient: "from-red-500 to-orange-600", glow: "rgba(239,68,68,0.3)" },
  "Gladiadores": { gradient: "from-purple-500 to-pink-600", glow: "rgba(168,85,247,0.3)" },
  "Samurais": { gradient: "from-blue-500 to-cyan-600", glow: "rgba(59,130,246,0.3)" },
  "Legado": { gradient: "from-emerald-500 to-teal-600", glow: "rgba(16,185,129,0.3)" },
  "Lobos": { gradient: "from-slate-500 to-zinc-600", glow: "rgba(100,116,139,0.3)" },
  "TDM": { gradient: "from-indigo-500 to-violet-600", glow: "rgba(99,102,241,0.3)" },
  "Admin": { gradient: "from-gray-500 to-gray-600", glow: "rgba(107,114,128,0.3)" },
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatTotalDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}min`
  return `${mins}min`
}

function getDateRange(periodo: string): { dataInicio: string; dataFim: string } {
  const now = new Date()
  const dataFim = now.toISOString()
  let dataInicio = ""

  if (periodo === "hoje") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    dataInicio = start.toISOString()
  } else if (periodo === "semana") {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
    dataInicio = start.toISOString()
  } else if (periodo === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
    dataInicio = start.toISOString()
  }

  return { dataInicio, dataFim }
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string; icon: any }> = {
    "atendida": { label: "Atendida", color: "bg-green-500/20 text-green-300 border-green-500/30", icon: PhoneCall },
    "nao_atendida": { label: "Não atendida", color: "bg-orange-500/20 text-orange-300 border-orange-500/30", icon: PhoneMissed },
    "cancelada": { label: "Cancelada", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: PhoneOff },
    "caixa_postal": { label: "Caixa postal", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Phone },
    "ocupado": { label: "Ocupado", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", icon: Phone },
    "numero_errado": { label: "Nº errado", color: "bg-pink-500/20 text-pink-300 border-pink-500/30", icon: XCircle },
    "fora_area": { label: "Fora área", color: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: PhoneOff },
  }
  return map[status] || { label: status, color: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: Phone }
}

function getViabilidadeBadge(viabilidade: string | undefined) {
  if (!viabilidade) return null
  const map: Record<string, { label: string; color: string; icon: any }> = {
    "alta": { label: "Alta", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: Flame },
    "media": { label: "Média", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", icon: TrendingUp },
    "baixa": { label: "Baixa", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: Snowflake },
    "inviavel": { label: "Inviável", color: "text-gray-400 bg-gray-500/10 border-gray-500/30", icon: XCircle },
  }
  return map[viabilidade] || null
}

export default function LigacoesPage() {
  const [ligacoes, setLigacoes] = useState<Ligacao[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingLigacoes, setLoadingLigacoes] = useState(false)
  
  const [periodo, setPeriodo] = useState<string>("hoje")
  const [dataInicioCustom, setDataInicioCustom] = useState("")
  const [dataFimCustom, setDataFimCustom] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<string>("all")
  const [filtroEquipe, setFiltroEquipe] = useState<string>("all")
  const [filtroVendedor, setFiltroVendedor] = useState<string>("all")
  
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)

  const buildDateParams = () => {
    if (periodo === "custom") {
      return { dataInicio: dataInicioCustom, dataFim: dataFimCustom }
    }
    return getDateRange(periodo)
  }

  const carregarStats = useCallback(async () => {
    try {
      const { dataInicio, dataFim } = buildDateParams()
      const params = new URLSearchParams()
      if (filtroEquipe !== "all") params.append("equipe", filtroEquipe)
      if (dataInicio) params.append("dataInicio", dataInicio)
      if (dataFim) params.append("dataFim", dataFim)
      
      const res = await fetch(`/api/ligacoes/stats?${params}`)
      const data = await res.json()
      if (res.ok) setStats(data)
    } catch (err) {
      console.error("Erro stats:", err)
    }
  }, [periodo, dataInicioCustom, dataFimCustom, filtroEquipe])

  const carregarLigacoes = useCallback(async () => {
    setLoadingLigacoes(true)
    try {
      const { dataInicio, dataFim } = buildDateParams()
      const params = new URLSearchParams()
      if (filtroStatus !== "all") params.append("status", filtroStatus)
      if (filtroEquipe !== "all") params.append("equipe", filtroEquipe)
      if (filtroVendedor !== "all") params.append("vendedor", filtroVendedor)
      if (dataInicio) params.append("dataInicio", dataInicio)
      if (dataFim) params.append("dataFim", dataFim)
      
      const res = await fetch(`/api/ligacoes?${params}`)
      const data = await res.json()
      if (res.ok) setLigacoes(data.ligacoes || [])
    } catch (err) {
      console.error("Erro ligações:", err)
    } finally {
      setLoadingLigacoes(false)
    }
  }, [filtroStatus, filtroEquipe, filtroVendedor, periodo, dataInicioCustom, dataFimCustom])

  useEffect(() => {
    carregarStats()
    carregarLigacoes()
  }, [carregarStats, carregarLigacoes])

  const handlePlayPause = (ligacao: Ligacao) => {
    if (!ligacao.audio_url) return
    
    if (playingId === ligacao.id && audioRef) {
      audioRef.pause()
      setPlayingId(null)
      return
    }
    
    if (audioRef) audioRef.pause()
    
    const audio = new Audio(ligacao.audio_url)
    audio.play()
    audio.onended = () => setPlayingId(null)
    
    setAudioRef(audio)
    setPlayingId(ligacao.id)
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Video de fundo */}
      <video
        key="ligacoes-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{ filter: "brightness(0.35) saturate(1.2)", backgroundColor: "#000" }}
      >
        <source src="/videos/atendimentos-bg.mp4" type="video/mp4" />
      </video>

      {/* Overlay escuro para profundidade */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70 z-[1] pointer-events-none" />

      {/* Conteudo */}
      <div className="relative z-10">
        {/* Header Premium - Transparente com Glassmorphism */}
        <header className="sticky top-0 z-50 backdrop-blur-2xl bg-black/40 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <button
                    className="group relative w-10 h-10 rounded-xl overflow-hidden transition-all duration-300"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ArrowLeft className="w-5 h-5 text-white/60 group-hover:text-white absolute inset-0 m-auto transition-colors" />
                  </button>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white">Dashboard de Ligacoes</h1>
                    <p className="text-xs text-white/50">Analise completa de produtividade</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { carregarStats(); carregarLigacoes() }}
                className="group relative h-10 px-4 rounded-xl overflow-hidden transition-all duration-300 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <RefreshCw className="w-4 h-4 text-white/70 group-hover:text-white relative z-10 transition-colors" />
                <span className="text-white/70 group-hover:text-white text-sm font-medium relative z-10 transition-colors">Atualizar</span>
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Filtro de Periodo - Card Glassmorphism */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-white/80">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold text-sm">Periodo:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: "hoje", label: "Hoje" },
                  { value: "semana", label: "Esta semana" },
                  { value: "mes", label: "Este mes" },
                  { value: "custom", label: "Personalizado" },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriodo(p.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      periodo === p.value
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {periodo === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dataInicioCustom.split("T")[0]}
                    onChange={(e) => setDataInicioCustom(new Date(e.target.value).toISOString())}
                    className="bg-black/30 border-white/10 text-white w-36 rounded-xl"
                  />
                  <span className="text-white/40">ate</span>
                  <Input
                    type="date"
                    value={dataFimCustom.split("T")[0]}
                    onChange={(e) => setDataFimCustom(new Date(e.target.value + "T23:59:59").toISOString())}
                    className="bg-black/30 border-white/10 text-white w-36 rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards - Glassmorphism */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { icon: Phone, value: stats.geral.total, label: "Total", color: "cyan", glow: "rgba(34,211,238,0.2)" },
                { icon: PhoneCall, value: stats.geral.atendidas, label: `Atendidas (${stats.geral.taxa_atendimento}%)`, color: "emerald", glow: "rgba(16,185,129,0.2)" },
                { icon: PhoneMissed, value: stats.geral.nao_atendidas, label: "Tentativas", color: "orange", glow: "rgba(249,115,22,0.2)" },
                { icon: Clock, value: formatTotalDuration(stats.geral.tempo_real_fala_segundos), label: "Tempo de fala", color: "purple", glow: "rgba(168,85,247,0.2)" },
                { icon: Calendar, value: stats.geral.reunioes_marcadas, label: "Reunioes", color: "blue", glow: "rgba(59,130,246,0.2)" },
                { icon: Flame, value: stats.geral.leads_viavel_alta, label: "Leads quentes", color: "red", glow: "rgba(239,68,68,0.2)" },
              ].map((stat, idx) => {
                const Icon = stat.icon
                const colorMap: Record<string, string> = {
                  cyan: "from-cyan-500 to-cyan-600",
                  emerald: "from-emerald-500 to-emerald-600",
                  orange: "from-orange-500 to-orange-600",
                  purple: "from-purple-500 to-purple-600",
                  blue: "from-blue-500 to-blue-600",
                  red: "from-red-500 to-red-600",
                }
                const textColorMap: Record<string, string> = {
                  cyan: "text-cyan-300",
                  emerald: "text-emerald-300",
                  orange: "text-orange-300",
                  purple: "text-purple-300",
                  blue: "text-blue-300",
                  red: "text-red-300",
                }
                return (
                  <div
                    key={idx}
                    className="rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                      backdropFilter: "blur(20px)",
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3), 0 0 40px ${stat.glow}`,
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[stat.color]} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${textColorMap[stat.color]}`}>{stat.value}</p>
                        <p className="text-xs text-white/50">{stat.label}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ranking de Equipes - Glassmorphism */}
          {stats && stats.porEquipe.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                backdropFilter: "blur(20px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-white font-bold">Ranking de Equipes</h2>
              </div>
              <div className="p-4 space-y-2">
                {stats.porEquipe.slice(0, 8).map((eq, idx) => {
                  const colors = EQUIPE_COLORS[eq.equipe] || EQUIPE_COLORS["Admin"]
                  return (
                    <div
                      key={eq.equipe}
                      className="flex items-center justify-between p-3 rounded-xl transition-all duration-300 hover:bg-white/5"
                      style={{
                        background: `linear-gradient(90deg, rgba(255,255,255,0.03) 0%, transparent 100%)`,
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl w-8">{idx === 0 ? "1" : idx === 1 ? "2" : idx === 2 ? "3" : `${idx + 1}`}</span>
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors.gradient}`} />
                        <div>
                          <p className="font-bold text-white">{eq.equipe}</p>
                          <p className="text-xs text-white/50">{eq.vendedores_count} vendedores</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-6 text-right">
                        <div>
                          <p className="text-lg font-bold text-purple-300">{formatTotalDuration(eq.tempo_real_fala_segundos)}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">Tempo fala</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-300">{eq.atendidas}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">Atendidas</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-cyan-300">{eq.taxa_atendimento}%</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">Taxa</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-yellow-300">{eq.score_vendedor_medio || "-"}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">Score</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Performance por Vendedor - Glassmorphism */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-white font-bold">Performance por Vendedor</h2>
              </div>
              <Select value={filtroEquipe} onValueChange={setFiltroEquipe}>
                <SelectTrigger className="w-40 bg-black/30 border-white/10 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all">Todas equipes</SelectItem>
                  {EQUIPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/40 text-[10px] uppercase tracking-wider border-b border-white/10">
                    <th className="pb-3 font-medium">Vendedor</th>
                    <th className="pb-3 font-medium">Equipe</th>
                    <th className="pb-3 font-medium text-center">Atendidas</th>
                    <th className="pb-3 font-medium text-center">Tentativas</th>
                    <th className="pb-3 font-medium text-center">Taxa</th>
                    <th className="pb-3 font-medium text-center">Tempo Fala</th>
                    <th className="pb-3 font-medium text-center">Medio/At.</th>
                    <th className="pb-3 font-medium text-center">Score V.</th>
                    <th className="pb-3 font-medium text-center">Score L.</th>
                    <th className="pb-3 font-medium text-center">Reunioes</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.porVendedor.map((v) => {
                    const colors = EQUIPE_COLORS[v.equipe] || EQUIPE_COLORS["Admin"]
                    return (
                      <tr key={v.vendedor} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 text-white font-medium">{v.vendedor}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${colors.gradient} text-white`}>
                            {v.equipe}
                          </span>
                        </td>
                        <td className="py-3 text-center text-emerald-400 font-bold">{v.atendidas}</td>
                        <td className="py-3 text-center text-orange-400">{v.nao_atendidas}</td>
                        <td className="py-3 text-center text-white">{v.taxa_atendimento}%</td>
                        <td className="py-3 text-center text-purple-300 font-bold">{formatTotalDuration(v.tempo_real_fala_segundos)}</td>
                        <td className="py-3 text-center text-white/60">{formatDuration(v.tempo_medio_fala_segundos)}</td>
                        <td className="py-3 text-center">
                          <span className={`font-bold ${(v.score_vendedor_medio || 0) >= 70 ? 'text-emerald-400' : (v.score_vendedor_medio || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {v.score_vendedor_medio ?? "-"}
                          </span>
                        </td>
                        <td className="py-3 text-center text-white/60">{v.score_lead_medio ?? "-"}</td>
                        <td className="py-3 text-center text-blue-400 font-bold">{v.reunioes_marcadas}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lista de Ligacoes - Glassmorphism */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-white font-bold">Ligacoes ({ligacoes.length})</h2>
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-40 bg-black/30 border-white/10 text-white rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="atendida">Atendidas</SelectItem>
                  <SelectItem value="nao_atendida">Nao atendidas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                  <SelectItem value="caixa_postal">Caixa postal</SelectItem>
                  <SelectItem value="ocupado">Ocupado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4">
              {loadingLigacoes ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              ) : ligacoes.length === 0 ? (
                <p className="text-white/40 text-center py-12">Nenhuma ligacao no periodo</p>
              ) : (
                <div className="space-y-3">
                  {ligacoes.slice(0, 100).map((lig) => {
                    const statusInfo = getStatusBadge(lig.status)
                    const StatusIcon = statusInfo.icon
                    const viab = lig.analise_ia?.perfil_lead?.viabilidade
                    const viabBadge = getViabilidadeBadge(viab)
                    const ViabIcon = viabBadge?.icon
                    const reuniaoMarcada = lig.analise_ia?.reuniao?.marcou
                    const colorEquipe = EQUIPE_COLORS[lig.equipe] || EQUIPE_COLORS["Admin"]
                    const scoreV = lig.analise_ia?.score_vendedor || lig.score_geral
                    
                    return (
                      <div
                        key={lig.id}
                        className="rounded-xl p-4 transition-all duration-300 hover:bg-white/5"
                        style={{
                          background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusInfo.label}
                              </span>
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${colorEquipe.gradient} text-white`}>
                                {lig.equipe}
                              </span>
                              {viabBadge && ViabIcon && (
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${viabBadge.color}`}>
                                  <ViabIcon className="w-3 h-3" />
                                  {viabBadge.label}
                                </span>
                              )}
                              {reuniaoMarcada && (
                                <span className="px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 text-blue-400 bg-blue-500/10 border border-blue-500/30">
                                  <Calendar className="w-3 h-3" />
                                  Reuniao
                                </span>
                              )}
                              {scoreV !== null && scoreV !== undefined && (
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${scoreV >= 70 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : scoreV >= 50 ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>
                                  Score {scoreV}
                                </span>
                              )}
                            </div>
                            <div className="text-white">
                              <span className="font-bold">{lig.vendedor}</span>
                              <span className="text-white/30 mx-2">→</span>
                              <span className="text-cyan-300">{lig.telefone_cliente}</span>
                              <span className="text-white/20 mx-2">|</span>
                              <span className="text-white/60">{formatDuration(lig.duracao_segundos || 0)}</span>
                              <span className="text-white/20 mx-2">|</span>
                              <span className="text-white/40 text-xs">{new Date(lig.data_ligacao).toLocaleString("pt-BR")}</span>
                            </div>
                            {lig.resumo && (
                              <p className="text-white/50 text-sm mt-2 line-clamp-2">{lig.resumo}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {lig.audio_url && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePlayPause(lig) }}
                                className="group relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 overflow-hidden"
                                style={{
                                  background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.3)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                {playingId === lig.id ? (
                                  <Pause className="w-4 h-4 text-white/70 group-hover:text-white relative z-10" />
                                ) : (
                                  <Play className="w-4 h-4 text-white/70 group-hover:text-white relative z-10" />
                                )}
                              </button>
                            )}
                            {lig.kommo_lead_id && (
                              <a
                                href={`https://crm2lrmultimarcascom.kommo.com/leads/detail/${lig.kommo_lead_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="group relative h-9 px-3 rounded-xl flex items-center gap-2 transition-all duration-300 overflow-hidden"
                                style={{
                                  background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.3)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <ExternalLink className="w-4 h-4 text-white/70 group-hover:text-white relative z-10" />
                                <span className="text-white/70 group-hover:text-white text-xs font-medium relative z-10">Kommo</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
