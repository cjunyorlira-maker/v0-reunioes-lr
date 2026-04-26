"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Lock, Phone, PhoneOff, PhoneIncoming, PhoneOutgoing, Clock, 
  ArrowLeft, TrendingUp, Users, Play, Pause, Loader2, 
  ChevronRight, Star, BarChart3, XCircle, CheckCircle, FileAudio
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Ligacao {
  id: string
  callid: string
  ramal: string
  vendedor: string
  equipe: string
  telefone_cliente: string
  direcao: string
  duracao_segundos: number
  status: string
  tipo_origem: string | null
  audio_url_original: string
  audio_url: string | null
  transcricao: string | null
  analise_ia: any
  score_geral: number | null
  resumo: string | null
  kommo_lead_id: string | null
  enviado_kommo: boolean
  data_ligacao: string
  processado_em: string | null
  created_at: string
}

interface Stats {
  geral: {
    total: number
    atendidas: number
    nao_atendidas: number
    tempo_total_segundos: number
    analisadas: number
    pendentes_analise: number
  }
  porVendedor: Array<{
    vendedor: string
    equipe: string
    total: number
    atendidas: number
    nao_atendidas: number
    tempo_total_segundos: number
    analisadas: number
    score_medio: number | null
  }>
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
  if (hours > 0) {
    return `${hours}h ${mins}min`
  }
  return `${mins}min`
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
  const [filtroStatus, setFiltroStatus] = useState<string>("all")
  const [filtroEquipe, setFiltroEquipe] = useState<string>("all")
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    const savedEquipe = localStorage.getItem("ligacoes_equipe")
    if (savedEquipe) {
      setEquipe(savedEquipe)
      setIsAuthenticated(true)
    }
  }, [])

  const fetchLigacoes = useCallback(async () => {
    setLoadingLigacoes(true)
    try {
      const equipeParam = equipe === "Admin" ? (filtroEquipe !== "all" ? filtroEquipe : "all") : equipe
      const res = await fetch(`/api/ligacoes?equipe=${equipeParam}&status=${filtroStatus}`)
      const data = await res.json()
      if (data.ligacoes) {
        setLigacoes(data.ligacoes)
      }
    } catch (err) {
      console.error("Erro ao carregar ligações:", err)
    } finally {
      setLoadingLigacoes(false)
    }
  }, [equipe, filtroStatus, filtroEquipe])

  const fetchStats = useCallback(async () => {
    try {
      const equipeParam = equipe === "Admin" ? (filtroEquipe !== "all" ? filtroEquipe : "all") : equipe
      const res = await fetch(`/api/ligacoes/stats?equipe=${equipeParam}`)
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error("Erro ao carregar stats:", err)
    }
  }, [equipe, filtroEquipe])

  useEffect(() => {
    if (!isAuthenticated || !equipe) return
    
    fetchLigacoes()
    fetchStats()
    
    // Subscribe para atualizações em tempo real
    const supabase = createClient()
    const channel = supabase
      .channel('ligacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ligacoes'
        },
        () => {
          fetchLigacoes()
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated, equipe, fetchLigacoes, fetchStats])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/atendimentos/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipe, senha }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erro ao autenticar")
        return
      }

      localStorage.setItem("ligacoes_equipe", equipe)
      setIsAuthenticated(true)
    } catch (err) {
      setError("Erro ao conectar com o servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("ligacoes_equipe")
    setIsAuthenticated(false)
    setEquipe("")
    setSenha("")
    setLigacoes([])
    setStats(null)
    if (audioRef) {
      audioRef.pause()
      setAudioRef(null)
    }
    setPlayingId(null)
  }

  const handleProcessar = async (ligacaoId: string) => {
    setProcessandoId(ligacaoId)
    try {
      const res = await fetch(`/api/ligacoes/${ligacaoId}/processar`, {
        method: "POST",
      })
      const data = await res.json()
      
      if (!res.ok) {
        alert(`Erro: ${data.error}`)
        return
      }

      // Atualiza a lista
      fetchLigacoes()
      fetchStats()
    } catch (err) {
      alert("Erro ao processar ligação")
    } finally {
      setProcessandoId(null)
    }
  }

  const handlePlayPause = (ligacao: Ligacao) => {
    const audioUrl = ligacao.audio_url || ligacao.audio_url_original
    
    if (playingId === ligacao.id && audioRef) {
      audioRef.pause()
      setPlayingId(null)
      return
    }

    if (audioRef) {
      audioRef.pause()
    }

    const audio = new Audio(audioUrl)
    audio.play()
    audio.onended = () => setPlayingId(null)
    setAudioRef(audio)
    setPlayingId(ligacao.id)
  }

  const equipeColors = EQUIPE_COLORS[equipe] || EQUIPE_COLORS["Admin"]

  // Tela de Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.45) saturate(1.3)" }}
        >
          <source src="/videos/login-bg.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

        <div className="relative z-10 w-full max-w-sm mx-4">
          <div className="relative rounded-3xl overflow-hidden" style={{ background: "transparent" }}>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />

            <div className="px-8 pt-8 pb-8">
              <div className="flex flex-col items-center mb-8">
                <div className="relative w-44 h-44 mb-2">
                  <div
                    className="absolute inset-0 blur-3xl opacity-30"
                    style={{ background: "radial-gradient(circle, #d4af37 0%, transparent 65%)" }}
                  />
                  <img
                    src="/logo-lr-gold.png"
                    alt="LR Multimarcas"
                    className="relative w-full h-full object-contain"
                    style={{ filter: "drop-shadow(0 0 24px rgba(212,175,55,0.5))" }}
                  />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight text-center drop-shadow-lg">
                  Central de Ligacoes
                </h1>
                <p className="text-white/60 text-xs mt-1 font-medium tracking-wide drop-shadow">
                  Analise e acompanhe as ligacoes da equipe
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#d4af37]/80 uppercase tracking-[0.15em]">
                    Equipe
                  </label>
                  <Select value={equipe} onValueChange={setEquipe}>
                    <SelectTrigger
                      className="h-13 rounded-xl border text-white transition-all duration-200"
                      style={{
                        background: "rgba(0,0,0,0.25)",
                        backdropFilter: "blur(12px)",
                        borderColor: equipe ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.2)",
                      }}
                    >
                      <SelectValue placeholder="Selecione sua equipe" />
                    </SelectTrigger>
                    <SelectContent
                      className="rounded-xl border-white/10"
                      style={{ background: "rgba(10,8,4,0.95)", backdropFilter: "blur(24px)" }}
                    >
                      {EQUIPES.map((eq) => (
                        <SelectItem
                          key={eq}
                          value={eq}
                          className="text-white hover:bg-white/8 rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center gap-3 py-0.5">
                            <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${EQUIPE_COLORS[eq]?.gradient || "from-gray-500 to-gray-600"}`} />
                            <span className="font-medium">{eq}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#d4af37]/80 uppercase tracking-[0.15em]">
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="* * * *"
                      maxLength={4}
                      className="h-13 rounded-xl text-white text-center text-xl tracking-[0.5em] font-bold placeholder:text-white/30 transition-all duration-200 border"
                      style={{
                        background: "rgba(0,0,0,0.25)",
                        backdropFilter: "blur(12px)",
                        borderColor: senha.length > 0 ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.2)",
                      }}
                    />
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/25 py-3 px-4 rounded-xl">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={!equipe || senha.length !== 4 || loading}
                    className="relative w-full h-14 rounded-xl text-base font-black tracking-wide transition-all duration-300 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, #c9a227 0%, #f5d742 50%, #c9a227 100%)",
                      boxShadow: (!equipe || senha.length !== 4 || loading) ? "none" : "0 0 30px rgba(212,175,55,0.5), 0 4px 20px rgba(0,0,0,0.4)",
                      color: "#0a0800",
                    }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black/80 rounded-full animate-spin" />
                        <span>Conectando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>Acessar Central</span>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Phone className="w-5 h-5 text-amber-400" />
                  Central de Ligacoes
                </h1>
                <p className="text-sm text-white/50">Equipe {equipe}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {equipe === "Admin" && (
                <Select value={filtroEquipe} onValueChange={setFiltroEquipe}>
                  <SelectTrigger className="w-40 bg-white/5 border-white/10">
                    <SelectValue placeholder="Todas equipes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas equipes</SelectItem>
                    {EQUIPES.filter(e => e !== "Admin").map(eq => (
                      <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-36 bg-white/5 border-white/10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="atendida">Atendidas</SelectItem>
                  <SelectItem value="nao_atendida">Nao Atendidas</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleLogout} className="border-white/10 hover:bg-white/10">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
                <Phone className="w-4 h-4" />
                Total
              </div>
              <div className="text-2xl font-bold">{stats.geral.total}</div>
            </div>

            <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                <CheckCircle className="w-4 h-4" />
                Atendidas
              </div>
              <div className="text-2xl font-bold text-emerald-400">{stats.geral.atendidas}</div>
            </div>

            <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
                <PhoneOff className="w-4 h-4" />
                Nao Atendidas
              </div>
              <div className="text-2xl font-bold text-red-400">{stats.geral.nao_atendidas}</div>
            </div>

            <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Tempo Total
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {formatTotalDuration(stats.geral.tempo_total_segundos)}
              </div>
            </div>

            <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                <Star className="w-4 h-4" />
                Analisadas
              </div>
              <div className="text-2xl font-bold text-amber-400">{stats.geral.analisadas}</div>
            </div>

            <div className="bg-purple-500/10 rounded-2xl p-4 border border-purple-500/20">
              <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                <FileAudio className="w-4 h-4" />
                Pendentes
              </div>
              <div className="text-2xl font-bold text-purple-400">{stats.geral.pendentes_analise}</div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Ligacoes */}
      <div className="container mx-auto px-4 pb-8">
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              Ligacoes Recentes
              {loadingLigacoes && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
            </h2>
          </div>

          <div className="divide-y divide-white/5">
            {ligacoes.length === 0 ? (
              <div className="p-8 text-center text-white/50">
                Nenhuma ligacao encontrada
              </div>
            ) : (
              ligacoes.map((lig) => (
                <div key={lig.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Icone de direcao */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      lig.direcao === "saida" 
                        ? "bg-blue-500/20 text-blue-400" 
                        : "bg-green-500/20 text-green-400"
                    }`}>
                      {lig.direcao === "saida" ? (
                        <PhoneOutgoing className="w-5 h-5" />
                      ) : (
                        <PhoneIncoming className="w-5 h-5" />
                      )}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{lig.vendedor || "Desconhecido"}</span>
                        <Badge variant="outline" className="text-xs">
                          {lig.equipe}
                        </Badge>
                        {lig.status === "atendida" ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Atendida
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            Nao Atendida
                          </Badge>
                        )}
                        {lig.score_geral && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            Score: {lig.score_geral}/10
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-white/50 mt-1">
                        <span>{lig.telefone_cliente}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDuration(lig.duracao_segundos)}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(lig.data_ligacao).toLocaleString("pt-BR")}</span>
                      </div>
                      {lig.resumo && (
                        <p className="text-sm text-white/70 mt-2 line-clamp-2">{lig.resumo}</p>
                      )}
                    </div>

                    {/* Acoes */}
                    <div className="flex items-center gap-2">
                      {/* Botao Play/Pause */}
                      {(lig.audio_url || lig.audio_url_original) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full hover:bg-white/10"
                          onClick={() => handlePlayPause(lig)}
                        >
                          {playingId === lig.id ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                        </Button>
                      )}

                      {/* Botao Analisar */}
                      {lig.status === "atendida" && !lig.transcricao && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          disabled={processandoId === lig.id}
                          onClick={() => handleProcessar(lig.id)}
                        >
                          {processandoId === lig.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Analisando...
                            </>
                          ) : (
                            <>
                              <Star className="w-4 h-4 mr-2" />
                              Analisar
                            </>
                          )}
                        </Button>
                      )}

                      {lig.transcricao && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Analisada
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
