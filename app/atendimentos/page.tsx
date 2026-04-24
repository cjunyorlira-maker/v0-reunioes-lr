"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Lock, Mic, Play, CheckCircle, XCircle, Clock, FileText, ArrowLeft, 
  Zap, TrendingUp, Users, DollarSign, AlertTriangle, Calendar,
  ChevronRight, Star, BarChart3, Target
} from "lucide-react"
import { AtendimentoCard } from "@/components/atendimentos/atendimento-card"
import Link from "next/link"

interface Atendimento {
  id: string
  lead_id: number
  kommo_id: string
  nome_lead: string
  responsavel: string
  equipe: string
  audio_url: string | null
  duracao_segundos: number | null
  transcricao_completa: string | null
  resumo: string | null
  motivo_nao_fechamento: string | null
  score_geral: number | null
  score_abordagem: number | null
  score_financiamento: number | null
  score_consorcio: number | null
  score_fechamento: number | null
  pontos_positivos: string[] | null
  pontos_criticos: string[] | null
  feedback_coaching: string | null
  // Novos campos do prompt expandido
  situacao_financeira: {
    tinha_entrada: boolean | null
    impeditivo_principal: string | null
    perfil_mapeado: boolean | null
  } | null
  garantiu_contemplacao: boolean | null
  usou_prova_social: {
    reclame_aqui: boolean | null
    site_empresa: boolean | null
    referencias_clientes: boolean | null
  } | null
  tecnicas_fechamento: {
    tentou_fechar: boolean | null
    quantidade_tentativas: number | null
    tecnicas_usadas: string[] | null
    resultado: string | null
  } | null
  proximo_passo_sugerido: string | null
  objecoes_cliente: Array<{
    objecao: string
    resposta_vendedor: string
    eficaz: boolean
  }> | null
  status: string
  fechou: boolean
  is_benchmark: boolean
  data_atendimento: string
  created_at: string
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

// Categorias de motivos de nao fechamento para o Kanban
const MOTIVOS_CATEGORIAS = [
  { id: "financeiro", label: "Financeiro", icon: DollarSign, color: "from-red-500 to-rose-600" },
  { id: "timing", label: "Timing", icon: Calendar, color: "from-amber-500 to-orange-600" },
  { id: "concorrencia", label: "Concorrencia", icon: Users, color: "from-purple-500 to-violet-600" },
  { id: "indecisao", label: "Indecisao", icon: AlertTriangle, color: "from-yellow-500 to-amber-600" },
  { id: "outros", label: "Outros", icon: FileText, color: "from-slate-500 to-zinc-600" },
]

export default function AtendimentosPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [equipe, setEquipe] = useState("")
  const [senha, setSenha] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [loadingAtendimentos, setLoadingAtendimentos] = useState(false)
  const [activeTab, setActiveTab] = useState<"atendimentos" | "relatorio">("atendimentos")
  const [filtroEquipe, setFiltroEquipe] = useState<string>("all")

  useEffect(() => {
    const savedEquipe = localStorage.getItem("atendimentos_equipe")
    if (savedEquipe) {
      setEquipe(savedEquipe)
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && equipe) {
      fetchAtendimentos()
    }
  }, [isAuthenticated, equipe])

  const fetchAtendimentos = async () => {
    setLoadingAtendimentos(true)
    try {
      // Admin tem acesso a todas as equipes
      const url = equipe === "Admin" 
        ? "/api/atendimentos?equipe=all" 
        : `/api/atendimentos?equipe=${equipe}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.atendimentos) {
        setAtendimentos(data.atendimentos)
      }
    } catch (err) {
      console.error("Erro ao carregar atendimentos:", err)
    } finally {
      setLoadingAtendimentos(false)
    }
  }

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

      localStorage.setItem("atendimentos_equipe", equipe)
      setIsAuthenticated(true)
    } catch (err) {
      setError("Erro ao conectar com o servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("atendimentos_equipe")
    setIsAuthenticated(false)
    setEquipe("")
    setSenha("")
    setAtendimentos([])
  }

  // Filtra atendimentos por equipe quando Admin seleciona uma equipe especifica
  const atendimentosFiltrados = useMemo(() => {
    if (equipe !== "Admin" || filtroEquipe === "all") return atendimentos
    return atendimentos.filter(a => a.equipe === filtroEquipe)
  }, [atendimentos, equipe, filtroEquipe])

  // Agrupa motivos de nao fechamento por categoria (usa lista filtrada para Admin)
  const motivosPorCategoria = useMemo(() => {
    const naoFechados = atendimentosFiltrados.filter(a => a.status === "concluido" && !a.fechou && a.motivo_nao_fechamento)
    const categorized: Record<string, Atendimento[]> = {
      financeiro: [],
      timing: [],
      concorrencia: [],
      indecisao: [],
      outros: [],
    }

    naoFechados.forEach(a => {
      const motivo = (a.motivo_nao_fechamento || "").toLowerCase()
      if (motivo.includes("preco") || motivo.includes("valor") || motivo.includes("caro") || motivo.includes("financ") || motivo.includes("dinheiro") || motivo.includes("parcela")) {
        categorized.financeiro.push(a)
      } else if (motivo.includes("tempo") || motivo.includes("depois") || motivo.includes("pensar") || motivo.includes("agora") || motivo.includes("momento")) {
        categorized.timing.push(a)
      } else if (motivo.includes("concorr") || motivo.includes("outra") || motivo.includes("banco") || motivo.includes("proposta")) {
        categorized.concorrencia.push(a)
      } else if (motivo.includes("decid") || motivo.includes("duvida") || motivo.includes("certeza") || motivo.includes("avaliar")) {
        categorized.indecisao.push(a)
      } else {
        categorized.outros.push(a)
      }
    })

    return categorized
  }, [atendimentosFiltrados])

  // Stats (usando lista filtrada)
  const aguardando = atendimentosFiltrados.filter((a) => a.status === "aguardando")
  const processando = atendimentosFiltrados.filter((a) => a.status === "processando" || a.status === "gravando")
  const concluidos = atendimentosFiltrados.filter((a) => a.status === "concluido")
  const fechados = concluidos.filter((a) => a.fechou)
  const naoFechados = concluidos.filter((a) => !a.fechou)
  const taxaConversao = concluidos.length > 0 ? ((fechados.length / concluidos.length) * 100).toFixed(1) : "0"
  const mediaScore = concluidos.filter(a => a.score_geral).reduce((acc, a) => acc + (a.score_geral || 0), 0) / (concluidos.filter(a => a.score_geral).length || 1)

  const equipeColors = EQUIPE_COLORS[equipe] || EQUIPE_COLORS["Admin"]

  // Tela de Login com video de fundo e efeito vidro premium
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-black">

        {/* Video de fundo */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105"
          style={{ filter: "brightness(0.6) saturate(1.2)" }}
        >
          <source src="/videos/login-bg.mp4" type="video/mp4" />
        </video>

        {/* Overlay gradiente cinematico */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/30 via-transparent to-purple-950/30" />
        
        {/* Efeito de brilho central */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-cyan-500/10 via-transparent to-transparent blur-3xl" />

        {/* Login Card com efeito vidro premium */}
        <div className="relative z-10 w-full max-w-md mx-4">
          {/* Glow atras do card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30 rounded-3xl blur-xl opacity-60 animate-pulse" />
          
          <div
            className="relative backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl overflow-hidden"
            style={{ 
              background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
            }}
          >
            {/* Linha de brilho no topo */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            
            {/* Reflexo de luz */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/5 to-transparent rounded-t-3xl" />

            {/* Header */}
            <div className="relative text-center mb-8">
              {/* Icone com glow animado */}
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl blur-lg opacity-60 animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-2xl border border-white/20">
                  <Zap className="w-10 h-10 text-white drop-shadow-lg" />
                </div>
              </div>
              
              <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                Central de Atendimentos
              </h1>
              <p className="text-white/60 text-sm font-medium">
                Acesse com as credenciais da sua equipe
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="relative space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-widest">
                  Equipe
                </label>
                <Select value={equipe} onValueChange={setEquipe}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 backdrop-blur-sm">
                    <SelectValue placeholder="Selecione sua equipe" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 backdrop-blur-xl border-white/20 rounded-xl shadow-2xl">
                    {EQUIPES.map((eq) => (
                      <SelectItem 
                        key={eq} 
                        value={eq} 
                        className="text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 py-1">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${EQUIPE_COLORS[eq]?.gradient || "from-gray-500 to-gray-600"} shadow-lg`} />
                          <span className="font-medium">{eq}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-widest">
                  Senha
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/50 to-purple-500/50 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur" />
                  <Input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="****"
                    maxLength={4}
                    className="relative h-14 bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.6em] font-bold placeholder:text-white/20 placeholder:tracking-[0.6em] rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 backdrop-blur-sm"
                  />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 py-3 px-4 rounded-xl animate-shake backdrop-blur-sm">
                  <XCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Botao com efeito neon */}
              <div className="relative group pt-2">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-xl opacity-70 group-hover:opacity-100 blur-md transition-all duration-500 group-hover:blur-lg" />
                <Button
                  type="submit"
                  disabled={!equipe || senha.length !== 4 || loading}
                  className="relative w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-500 text-white shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Conectando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span>Acessar Central</span>
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  )}
                </Button>
              </div>
            </form>

            {/* Voltar com efeito glass */}
            <div className="relative mt-6 pt-6 border-t border-white/10">
              <Link href="/">
                <Button 
                  variant="ghost" 
                  className="w-full h-12 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Quadro de Leads
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Particulas flutuantes decorativas */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/60 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // Tela Principal
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Gradient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[128px] opacity-20"
          style={{ background: `linear-gradient(135deg, ${equipeColors.glow}, transparent)` }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[128px] opacity-10"
          style={{ background: `linear-gradient(135deg, ${equipeColors.glow}, transparent)` }}
        />
      </div>

      {/* Header Premium */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-black/50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${equipeColors.gradient} flex items-center justify-center shadow-lg`}>
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Central de Atendimentos</h1>
                  <p className="text-xs text-white/50">Equipe {equipe}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("atendimentos")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "atendimentos" 
                    ? "bg-white/10 text-white" 
                    : "text-white/50 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Atendimentos
                </div>
              </button>
              <button
                onClick={() => setActiveTab("relatorio")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "relatorio" 
                    ? "bg-white/10 text-white" 
                    : "text-white/50 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Relatorio
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Filtro por equipe - apenas para Admin */}
              {equipe === "Admin" && (
                <Select value={filtroEquipe} onValueChange={setFiltroEquipe}>
                  <SelectTrigger className="w-40 h-9 bg-white/5 border-white/10 text-white rounded-xl text-sm">
                    <SelectValue placeholder="Todas equipes" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a24] border-white/10 rounded-xl">
                    <SelectItem value="all" className="text-white hover:bg-white/10">
                      Todas equipes
                    </SelectItem>
                    {EQUIPES.filter(eq => eq !== "Admin").map((eq) => (
                      <SelectItem 
                        key={eq} 
                        value={eq} 
                        className="text-white hover:bg-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${EQUIPE_COLORS[eq]?.gradient}`} />
                          {eq}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                onClick={fetchAtendimentos}
                variant="outline"
                size="sm"
                className="border-white/10 text-white hover:bg-white/5 rounded-xl"
              >
                Atualizar
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards Premium */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Aguardando", value: aguardando.length, icon: Clock, color: "from-amber-500 to-orange-600", glow: "rgba(245,158,11,0.2)" },
            { label: "Gravando", value: processando.length, icon: Mic, color: "from-blue-500 to-cyan-600", glow: "rgba(59,130,246,0.2)" },
            { label: "Fechados", value: fechados.length, icon: CheckCircle, color: "from-emerald-500 to-teal-600", glow: "rgba(16,185,129,0.2)" },
            { label: "Nao Fechados", value: naoFechados.length, icon: XCircle, color: "from-red-500 to-rose-600", glow: "rgba(239,68,68,0.2)" },
            { label: "Conversao", value: `${taxaConversao}%`, icon: Target, color: "from-violet-500 to-purple-600", glow: "rgba(139,92,246,0.2)" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl p-4 transition-all duration-500 hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${stat.glow} 0%, transparent 100%)`,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activeTab === "atendimentos" ? (
          /* Lista de Atendimentos */
          loadingAtendimentos ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-white/50">Carregando atendimentos...</p>
              </div>
            </div>
          ) : atendimentosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                <FileText className="w-12 h-12 text-white/20" />
              </div>
              <p className="text-white/50 text-lg">Nenhum atendimento encontrado</p>
              <p className="text-white/30 text-sm mt-2">
                Quando um lead for marcado como Veio, aparecera aqui
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Aguardando */}
              {aguardando.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Aguardando Gravacao</h2>
                    <Badge className="bg-amber-500/20 text-amber-400 border-0">{aguardando.length}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {aguardando.map((atendimento) => (
                      <AtendimentoCard key={atendimento.id} atendimento={atendimento} onUpdate={fetchAtendimentos} />
                    ))}
                  </div>
                </div>
              )}

              {/* Em Processamento */}
              {processando.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600">
                      <Mic className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Em Gravacao/Processamento</h2>
                    <Badge className="bg-blue-500/20 text-blue-400 border-0">{processando.length}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {processando.map((atendimento) => (
                      <AtendimentoCard key={atendimento.id} atendimento={atendimento} onUpdate={fetchAtendimentos} />
                    ))}
                  </div>
                </div>
              )}

              {/* Concluidos */}
              {concluidos.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Concluidos</h2>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">{concluidos.length}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {concluidos.map((atendimento) => (
                      <AtendimentoCard key={atendimento.id} atendimento={atendimento} onUpdate={fetchAtendimentos} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Relatorio Kanban - Motivos de Nao Fechamento */
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Motivos de Nao Fechamento</h2>
                <p className="text-xs text-white/50">Analise dos leads que nao fecharam</p>
              </div>
            </div>

            {/* Score Medio */}
            {concluidos.filter(a => a.score_geral).length > 0 && (
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white/50 text-sm">Score Medio de Atendimento</p>
                      <p className="text-3xl font-black text-white">{mediaScore.toFixed(1)}<span className="text-lg text-white/50">/10</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-sm">Total Analisados</p>
                    <p className="text-2xl font-bold text-white">{concluidos.filter(a => a.score_geral).length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Kanban de Motivos */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {MOTIVOS_CATEGORIAS.map((categoria) => {
                const itens = motivosPorCategoria[categoria.id] || []
                return (
                  <div 
                    key={categoria.id}
                    className="flex flex-col rounded-2xl overflow-hidden bg-white/5 border border-white/10"
                  >
                    {/* Header da Coluna */}
                    <div className={`p-4 bg-gradient-to-r ${categoria.color}`}>
                      <div className="flex items-center gap-2">
                        <categoria.icon className="w-5 h-5 text-white" />
                        <span className="font-bold text-white">{categoria.label}</span>
                        <Badge className="ml-auto bg-white/20 text-white border-0 text-xs">
                          {itens.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Cards da Coluna */}
                    <div className="flex-1 p-3 space-y-3 max-h-[500px] overflow-y-auto">
                      {itens.length === 0 ? (
                        <div className="text-center py-8 text-white/30 text-sm">
                          Nenhum lead
                        </div>
                      ) : (
                        itens.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
                          >
                            <p className="font-semibold text-white text-sm truncate">{item.nome_lead}</p>
                            <p className="text-xs text-white/50 mt-1">{item.responsavel}</p>
                            {item.score_geral && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full bg-gradient-to-r ${
                                      item.score_geral >= 7 ? "from-emerald-500 to-teal-500" :
                                      item.score_geral >= 5 ? "from-amber-500 to-orange-500" :
                                      "from-red-500 to-rose-500"
                                    }`}
                                    style={{ width: `${(item.score_geral / 10) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-white/70 font-semibold">{item.score_geral}</span>
                              </div>
                            )}
                            {item.motivo_nao_fechamento && (
                              <p className="text-[10px] text-white/40 mt-2 line-clamp-2">
                                {item.motivo_nao_fechamento}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
