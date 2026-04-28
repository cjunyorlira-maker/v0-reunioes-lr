"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Phone, PhoneCall, PhoneMissed, PhoneOff, Clock, Calendar, ExternalLink,
  Play, Pause, Filter, RefreshCw, Trophy, TrendingUp, Users, Flame,
  Snowflake, AlertTriangle, CheckCircle2, XCircle, FileText,
} from "lucide-react"

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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [equipe, setEquipe] = useState("")
  const [senha, setSenha] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  
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
    if (isAuthenticated) {
      carregarStats()
      carregarLigacoes()
    }
  }, [isAuthenticated, carregarStats, carregarLigacoes])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    try {
      const res = await fetch("/api/auth/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipe, senha }),
      })
      
      if (res.ok) {
        setIsAuthenticated(true)
      } else {
        setError("Senha incorreta")
      }
    } catch {
      setError("Erro ao autenticar")
    } finally {
      setLoading(false)
    }
  }

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/50 backdrop-blur border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-center">📞 Dashboard de Ligações</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Select value={equipe} onValueChange={setEquipe}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione sua equipe" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="password"
                placeholder="Senha da equipe"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !equipe || !senha}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">📞 Dashboard de Ligações</h1>
            <p className="text-slate-400 mt-1">Análise completa de produtividade — {equipe}</p>
          </div>
          <Button onClick={() => { carregarStats(); carregarLigacoes() }} variant="outline" className="border-slate-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <Card className="bg-slate-900/50 backdrop-blur border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5" />
                <span className="font-semibold">Período:</span>
              </div>
              <Tabs value={periodo} onValueChange={setPeriodo} className="flex-1">
                <TabsList className="bg-slate-800">
                  <TabsTrigger value="hoje">Hoje</TabsTrigger>
                  <TabsTrigger value="semana">Esta semana</TabsTrigger>
                  <TabsTrigger value="mes">Este mês</TabsTrigger>
                  <TabsTrigger value="custom">Personalizado</TabsTrigger>
                </TabsList>
              </Tabs>
              {periodo === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dataInicioCustom.split("T")[0]}
                    onChange={(e) => setDataInicioCustom(new Date(e.target.value).toISOString())}
                    className="bg-slate-800 border-slate-700 text-white w-40"
                  />
                  <span className="text-slate-400">até</span>
                  <Input
                    type="date"
                    value={dataFimCustom.split("T")[0]}
                    onChange={(e) => setDataFimCustom(new Date(e.target.value + "T23:59:59").toISOString())}
                    className="bg-slate-800 border-slate-700 text-white w-40"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="bg-slate-900/50 backdrop-blur border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Phone className="w-8 h-8 text-blue-400" />
                  <div className="text-right">
                    <p className="text-3xl font-bold text-white">{stats.geral.total}</p>
                    <p className="text-xs text-slate-400">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-950/30 backdrop-blur border-green-800/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <PhoneCall className="w-8 h-8 text-green-400" />
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-300">{stats.geral.atendidas}</p>
                    <p className="text-xs text-green-200/70">Atendidas ({stats.geral.taxa_atendimento}%)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-950/30 backdrop-blur border-orange-800/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <PhoneMissed className="w-8 h-8 text-orange-400" />
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-300">{stats.geral.nao_atendidas}</p>
                    <p className="text-xs text-orange-200/70">Tentativas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-950/30 backdrop-blur border-purple-800/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Clock className="w-8 h-8 text-purple-400" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-300">{formatTotalDuration(stats.geral.tempo_real_fala_segundos)}</p>
                    <p className="text-xs text-purple-200/70">Tempo de fala real</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-950/30 backdrop-blur border-blue-800/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Calendar className="w-8 h-8 text-blue-400" />
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-300">{stats.geral.reunioes_marcadas}</p>
                    <p className="text-xs text-blue-200/70">Reuniões</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-red-950/30 backdrop-blur border-red-800/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Flame className="w-8 h-8 text-red-400" />
                  <div className="text-right">
                    <p className="text-3xl font-bold text-red-300">{stats.geral.leads_viavel_alta}</p>
                    <p className="text-xs text-red-200/70">Leads quentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {stats && stats.porEquipe.length > 0 && (
          <Card className="bg-slate-900/50 backdrop-blur border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Ranking de Equipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.porEquipe.slice(0, 8).map((eq, idx) => {
                  const colors = EQUIPE_COLORS[eq.equipe] || EQUIPE_COLORS["Admin"]
                  return (
                    <div key={eq.equipe} className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${colors.gradient} bg-opacity-10`}>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`}</span>
                        <div>
                          <p className="font-bold text-white">{eq.equipe}</p>
                          <p className="text-xs text-white/70">{eq.vendedores_count} vendedores</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-6 text-right">
                        <div>
                          <p className="text-lg font-bold text-white">{formatTotalDuration(eq.tempo_real_fala_segundos)}</p>
                          <p className="text-xs text-white/70">Tempo fala</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{eq.atendidas}</p>
                          <p className="text-xs text-white/70">Atendidas</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{eq.taxa_atendimento}%</p>
                          <p className="text-xs text-white/70">Taxa atend.</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{eq.score_vendedor_medio || "—"}</p>
                          <p className="text-xs text-white/70">Score méd.</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-900/50 backdrop-blur border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Performance por Vendedor
            </CardTitle>
            <Select value={filtroEquipe} onValueChange={setFiltroEquipe}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas equipes</SelectItem>
                {EQUIPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-800">
                    <th className="pb-2">Vendedor</th>
                    <th className="pb-2">Equipe</th>
                    <th className="pb-2 text-center">Atendidas</th>
                    <th className="pb-2 text-center">Tentativas</th>
                    <th className="pb-2 text-center">Taxa</th>
                    <th className="pb-2 text-center">Tempo Fala</th>
                    <th className="pb-2 text-center">Médio/Atend.</th>
                    <th className="pb-2 text-center">Score Vend.</th>
                    <th className="pb-2 text-center">Score Lead</th>
                    <th className="pb-2 text-center">Reuniões</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.porVendedor.map((v) => {
                    const colors = EQUIPE_COLORS[v.equipe] || EQUIPE_COLORS["Admin"]
                    return (
                      <tr key={v.vendedor} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-2 text-white font-medium">{v.vendedor}</td>
                        <td className="py-2">
                          <Badge className={`bg-gradient-to-r ${colors.gradient} text-white border-0`}>
                            {v.equipe}
                          </Badge>
                        </td>
                        <td className="py-2 text-center text-green-400 font-bold">{v.atendidas}</td>
                        <td className="py-2 text-center text-orange-400">{v.nao_atendidas}</td>
                        <td className="py-2 text-center text-white">{v.taxa_atendimento}%</td>
                        <td className="py-2 text-center text-purple-300 font-bold">{formatTotalDuration(v.tempo_real_fala_segundos)}</td>
                        <td className="py-2 text-center text-slate-300">{formatDuration(v.tempo_medio_fala_segundos)}</td>
                        <td className="py-2 text-center">
                          <span className={`font-bold ${(v.score_vendedor_medio || 0) >= 70 ? 'text-green-400' : (v.score_vendedor_medio || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {v.score_vendedor_medio ?? "—"}
                          </span>
                        </td>
                        <td className="py-2 text-center text-slate-300">{v.score_lead_medio ?? "—"}</td>
                        <td className="py-2 text-center text-blue-400 font-bold">{v.reunioes_marcadas}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 backdrop-blur border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-white">📞 Ligações ({ligacoes.length})</CardTitle>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="atendida">Atendidas</SelectItem>
                  <SelectItem value="nao_atendida">Não atendidas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                  <SelectItem value="caixa_postal">Caixa postal</SelectItem>
                  <SelectItem value="ocupado">Ocupado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLigacoes ? (
              <p className="text-slate-400 text-center py-8">Carregando...</p>
            ) : ligacoes.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhuma ligação no período</p>
            ) : (
              <div className="space-y-2">
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
                    <div key={lig.id} className="bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 rounded-lg p-4 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge className={statusInfo.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                            <Badge className={`bg-gradient-to-r ${colorEquipe.gradient} text-white border-0`}>
                              {lig.equipe}
                            </Badge>
                            {viabBadge && ViabIcon && (
                              <Badge className={`${viabBadge.color}`}>
                                <ViabIcon className="w-3 h-3 mr-1" />
                                {viabBadge.label}
                              </Badge>
                            )}
                            {reuniaoMarcada && (
                              <Badge className="text-blue-400 bg-blue-500/10 border-blue-500/30">
                                <Calendar className="w-3 h-3 mr-1" />
                                Reunião marcada
                              </Badge>
                            )}
                            {scoreV !== null && scoreV !== undefined && (
                              <Badge className={`${scoreV >= 70 ? 'text-green-400 bg-green-500/10 border-green-500/30' : scoreV >= 50 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30'}`}>
                                Score {scoreV}
                              </Badge>
                            )}
                          </div>
                          <div className="text-white">
                            <span className="font-bold">{lig.vendedor}</span>
                            <span className="text-slate-400"> → </span>
                            <span className="text-cyan-300">{lig.telefone_cliente}</span>
                            <span className="text-slate-400"> • </span>
                            <span className="text-slate-300">{formatDuration(lig.duracao_segundos || 0)}</span>
                            <span className="text-slate-400"> • </span>
                            <span className="text-slate-400 text-xs">{new Date(lig.data_ligacao).toLocaleString("pt-BR")}</span>
                          </div>
                          {lig.resumo && (
                            <p className="text-slate-300 text-sm mt-2 line-clamp-2">{lig.resumo}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {lig.audio_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePlayPause(lig)}
                              className="border-slate-700"
                            >
                              {playingId === lig.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          )}
                          {lig.kommo_lead_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="border-slate-700"
                            >
                              <a
                                href={`https://crm2lrmultimarcascom.kommo.com/leads/detail/${lig.kommo_lead_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Kommo
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
