"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Lock, Mic, CheckCircle, XCircle, Clock, FileText, ArrowLeft, 
  TrendingUp, Users, AlertTriangle, DollarSign, Calendar,
  ChevronRight, ChevronLeft, Star, BarChart3, Target, Tag, ChevronDown
} from "lucide-react"
import { AtendimentoCard } from "@/components/atendimentos/atendimento-card"
import { CentralDecisao } from "@/components/atendimentos/central-decisao"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getPeriodoProducaoAtual } from "@/lib/periodo-producao"

interface Atendimento {
  id: string
  lead_id: number
  kommo_id: string
  nome_lead: string
  responsavel: string
  atendente: string
  equipe: string
  audio_url: string | null
  duracao_segundos: number | null
  transcricao_completa: string | null
  resumo: string | null
  motivo_nao_fechamento: string | null
  etiqueta: string | null
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
  atendimento_original_id?: string | null
  retorno_audio_url?: string | null
  retorno_transcricao?: string | null
  retorno_resumo?: string | null
  retorno_fechou?: boolean | null
  retorno_data?: string | null
  gravando?: boolean
  gravando_por?: string | null
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

// Etiquetas Financeiras (perfil do cliente)
const ETIQUETAS_FINANCEIRO = [
  { id: "sem_entrada", label: "Sem entrada", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { id: "vai_levantar_entrada", label: "Vai levantar entrada", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { id: "parcela", label: "Parcela", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { id: "sem_perfil", label: "Sem perfil", color: "bg-red-700/20 text-red-300 border-red-700/30" },
]

// Etiquetas de Motivo (razao do nao fechamento)
const ETIQUETAS_PESSOAL = [
  { id: "sem_tomador_decisao", label: "Sem o tomador de decisao", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  { id: "vai_pensar", label: "Vai pensar", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "tem_entrada_analisando", label: "Tem entrada/Analisando", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { id: "concorrencia", label: "Concorrencia", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { id: "nao_quer_consorcio", label: "Nao quer consorcio", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  { id: "experiencia_ruim", label: "Experiencia ruim c/ consorcio", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { id: "nao_gostou_atendimento", label: "Nao gostou do atendimento", color: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30" },
  { id: "indecisao", label: "Indecisao", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { id: "faltou_gas_vendedor", label: "Faltou gas do vendedor", color: "bg-red-400/20 text-red-300 border-red-400/30" },
  { id: "cpf_consultado", label: "CPF consultado", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
]

// Todas etiquetas juntas para busca rapida
const TODAS_ETIQUETAS = [...ETIQUETAS_FINANCEIRO, ...ETIQUETAS_PESSOAL]

// Categorias do Kanban de relatorios
const MOTIVOS_CATEGORIAS = [
  { id: "financeiro", label: "Financeiro", icon: DollarSign, color: "from-red-500 to-rose-600", etiquetas: ETIQUETAS_FINANCEIRO.map(e => e.id) },
  { id: "pessoal", label: "Pessoal", icon: Users, color: "from-amber-500 to-orange-600", etiquetas: ["sem_tomador_decisao", "vai_pensar", "tem_entrada_analisando", "indecisao", "faltou_gas_vendedor"] },
  { id: "concorrencia", label: "Concorrencia", icon: Target, color: "from-purple-500 to-violet-600", etiquetas: ["concorrencia"] },
  { id: "consorcio", label: "Consorcio", icon: AlertTriangle, color: "from-pink-500 to-rose-600", etiquetas: ["nao_quer_consorcio", "experiencia_ruim", "nao_gostou_atendimento"] },
  { id: "outros", label: "Outros", icon: FileText, color: "from-slate-500 to-zinc-600", etiquetas: ["cpf_consultado"] },
]

// Classifica etiqueta automaticamente pelo motivo do nao fechamento
function classificarEtiqueta(motivo: string, analise: any): string {
  if (!motivo) return "outros"
  const m = motivo.toLowerCase()

  if (analise?.situacao_financeira?.tinha_entrada === false) return "sem_entrada"
  if (m.includes("entrada") && m.includes("levantar")) return "vai_levantar_entrada"
  if (m.includes("parcela") || m.includes("prestacao") || m.includes("mensalidade")) return "parcela"
  if (m.includes("sem perfil") || m.includes("nao tem perfil") || m.includes("nao qualif")) return "sem_perfil"
  if (m.includes("conjuge") || m.includes("esposa") || m.includes("marido") || m.includes("socio") || m.includes("tomador") || m.includes("decisao")) return "sem_tomador_decisao"
  if (m.includes("pensar") || m.includes("refletir") || m.includes("analisa") || m.includes("decidir") || m.includes("prazo")) return "vai_pensar"
  if (m.includes("concorr") || m.includes("outra empresa") || m.includes("banco") || m.includes("proposta") || m.includes("outra opcao")) return "concorrencia"
  if (m.includes("nao quer consorcio") || m.includes("nao gosta consorcio") || m.includes("prefere financ")) return "nao_quer_consorcio"
  if (m.includes("experiencia ruim") || m.includes("ja fez consorcio") || m.includes("contempla") || m.includes("nao foi contemplado")) return "experiencia_ruim"
  if (m.includes("atendimento") || m.includes("vendedor") || m.includes("nao gostou")) return "nao_gostou_atendimento"
  if (m.includes("indeci") || m.includes("duvida") || m.includes("nao tem certeza")) return "indecisao"
  if (m.includes("gas") || m.includes("nao tentou") || m.includes("nao fechou") || m.includes("faltou")) return "faltou_gas_vendedor"
  if (m.includes("cpf") || m.includes("score") || m.includes("negativado") || m.includes("consulta")) return "cpf_consultado"

  return "indecisao"
}

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
  const [filtroPeriodo, setFiltroPeriodo] = useState<"hoje" | "semana" | "producao">("producao")
  const [semanaOffset, setSemanaOffset] = useState(0) // 0 = semana atual, -1 = anterior, etc

  useEffect(() => {
    const savedEquipe = localStorage.getItem("atendimentos_equipe")
    if (savedEquipe) {
      setEquipe(savedEquipe)
      setIsAuthenticated(true)
    }
  }, [])

  const fetchAtendimentos = useCallback(async () => {
    setLoadingAtendimentos(true)
    try {
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
  }, [equipe])

  // Fetch inicial e subscribe para realtime
  useEffect(() => {
    if (!isAuthenticated || !equipe) return
    
    fetchAtendimentos()
    
    // Subscribe para atualizacoes em tempo real
    const supabase = createClient()
    const channel = supabase
      .channel('atendimentos-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atendimentos'
        },
        (payload) => {
          // Quando qualquer mudanca ocorrer, atualiza a lista
          fetchAtendimentos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated, equipe, fetchAtendimentos])

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

  // Calcula intervalo de datas para o filtro de periodo
  const intervaloPeriodo = useMemo(() => {
    const hoje = new Date()
    const hojeStr = hoje.toISOString().split("T")[0]

    if (filtroPeriodo === "hoje") {
      return { inicio: hojeStr, fim: hojeStr, label: `Hoje — ${hoje.toLocaleDateString("pt-BR")}` }
    }

    if (filtroPeriodo === "semana") {
      // Semana comeca no domingo (getDay() === 0)
      const diaDaSemana = hoje.getDay() // 0=dom, 1=seg, ... 6=sab
      const domingo = new Date(hoje)
      domingo.setDate(hoje.getDate() - diaDaSemana + semanaOffset * 7)
      const sabado = new Date(domingo)
      sabado.setDate(domingo.getDate() + 6)

      const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      const isAtual = semanaOffset === 0
      const label = isAtual
        ? `Semana atual — ${fmt(domingo)} a ${fmt(sabado)}`
        : semanaOffset === -1
          ? `Semana passada — ${fmt(domingo)} a ${fmt(sabado)}`
          : `${fmt(domingo)} a ${fmt(sabado)}`

      return {
        inicio: domingo.toISOString().split("T")[0],
        fim: sabado.toISOString().split("T")[0],
        label,
      }
    }

    // producao
    const periodo = getPeriodoProducaoAtual()
    return {
      inicio: periodo.inicio,
      fim: periodo.fim,
      label: `Producao ${periodo.mesReferencia} — ${periodo.inicio.split("-").reverse().join("/")} a ${periodo.fim.split("-").reverse().join("/")}`,
    }
  }, [filtroPeriodo, semanaOffset])

  // Filtra atendimentos por equipe e por periodo
  const atendimentosFiltrados = useMemo(() => {
    let lista = atendimentos

    // Filtro de equipe (Admin)
    if (equipe === "Admin" && filtroEquipe !== "all") {
      lista = lista.filter(a => a.equipe === filtroEquipe)
    }

    // Filtro de periodo — aplica apenas nos concluidos (fechados/nao fechados)
    // Aguardando e Gravando sao sempre mostrados (sao ativos)
    lista = lista.filter(a => {
      if (a.status === "aguardando" || a.status === "falha_audio" || a.status === "gravando" || a.status === "processando") return true
      const dataAtend = (a.data_atendimento || a.created_at || "").split("T")[0]
      return dataAtend >= intervaloPeriodo.inicio && dataAtend <= intervaloPeriodo.fim
    })

    return lista
  }, [atendimentos, equipe, filtroEquipe, intervaloPeriodo])

  // Agrupa motivos de nao fechamento por categoria usando as novas etiquetas
  const motivosPorCategoria = useMemo(() => {
    const naoFechados = atendimentosFiltrados.filter(a => a.status === "concluido" && !a.fechou)
    const categorized: Record<string, Atendimento[]> = {
      financeiro: [],
      pessoal: [],
      concorrencia: [],
      consorcio: [],
      outros: [],
    }

    naoFechados.forEach(a => {
      // Usa a etiqueta ja salva, ou classifica automaticamente pelo motivo
      const etiqueta = a.etiqueta || (a.motivo_nao_fechamento ? classificarEtiqueta(a.motivo_nao_fechamento, a) : "outros")
      const categoria = MOTIVOS_CATEGORIAS.find(c => c.etiquetas.includes(etiqueta))
      const chave = categoria?.id || "outros"
      categorized[chave]?.push({ ...a, etiqueta: a.etiqueta || etiqueta })
    })

    return categorized
  }, [atendimentosFiltrados])

  // Stats (usando lista filtrada)
  const aguardando = atendimentosFiltrados.filter((a) => a.status === "aguardando" || a.status === "falha_audio")
  const processando = atendimentosFiltrados.filter((a) => a.status === "processando" || a.status === "gravando")
  const concluidos = atendimentosFiltrados.filter((a) => a.status === "concluido")
  const fechados = concluidos.filter((a) => a.fechou)
  const naoFechados = concluidos.filter((a) => !a.fechou)
  const taxaConversao = concluidos.length > 0 ? ((fechados.length / concluidos.length) * 100).toFixed(1) : "0"
  const mediaScore = concluidos.filter(a => a.score_geral).reduce((acc, a) => acc + (a.score_geral || 0), 0) / (concluidos.filter(a => a.score_geral).length || 1)

  const equipeColors = EQUIPE_COLORS[equipe] || EQUIPE_COLORS["Admin"]

  // Tela de Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-black">

        {/* Video de fundo - login */}
        <video
          key="login-video"
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

        {/* Overlay escuro nas bordas para profundidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

        {/* Card central - totalmente transparente */}
        <div className="relative z-10 w-full max-w-sm mx-4">

          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: "transparent",
              backdropFilter: "none",
            }}
          >
            {/* Linha dourada no topo */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />

            <div className="px-8 pt-8 pb-8">
              {/* Logo nova */}
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
                  Central de Atendimentos
                </h1>
                <p className="text-white/60 text-xs mt-1 font-medium tracking-wide drop-shadow">
                  Acesse com as credenciais da sua equipe
                </p>
              </div>

              {/* Form */}
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
                      placeholder="• • • •"
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

                {/* Botao principal - dourado e solido */}
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

              {/* Voltar */}
              <div className="mt-5 pt-5 border-t border-white/8">
                <Link href="/">
                  <Button
                    variant="ghost"
                    className="w-full h-10 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-xl transition-all duration-200 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Quadro de Leads
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    )
  }

  // Tela Principal
  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Video de fundo MP4 - atendimentos */}
      <video
        key="atendimentos-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{ filter: "brightness(0.40) saturate(1.3)", backgroundColor: "#000" }}
      >
        <source src="/videos/atendimentos-bg.mp4" type="video/mp4" />
      </video>

      {/* Overlay escuro para profundidade */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60 z-[1] pointer-events-none" />

      {/* Conteudo com transparencia */}
      <div className="relative z-10">

      {/* Header Premium - Transparente */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-black/40 border-b border-white/10">
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
              {/* Filtro por periodo */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                  {([
                    { key: "hoje", label: "Hoje" },
                    { key: "semana", label: "Semana" },
                    { key: "producao", label: "Producao" },
                  ] as const).map(op => (
                    <button
                      key={op.key}
                      onClick={() => { setFiltroPeriodo(op.key); if (op.key !== "semana") setSemanaOffset(0) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        filtroPeriodo === op.key
                          ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30"
                          : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>

                {/* Navegacao de semana — aparece apenas quando "semana" esta selecionado */}
                {filtroPeriodo === "semana" && (
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                    <button
                      onClick={() => setSemanaOffset(o => o - 1)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-semibold text-white/70 px-1 min-w-[80px] text-center">
                      {semanaOffset === 0 ? "Esta semana" : semanaOffset === -1 ? "Semana passada" : semanaOffset < 0 ? `${Math.abs(semanaOffset)}s atras` : `+${semanaOffset}s`}
                    </span>
                    <button
                      onClick={() => setSemanaOffset(o => o + 1)}
                      disabled={semanaOffset >= 0}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {semanaOffset !== 0 && (
                      <button
                        onClick={() => setSemanaOffset(0)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[#d4af37]/15 text-[#d4af37] hover:bg-[#d4af37]/25 transition-all"
                      >
                        Atual
                      </button>
                    )}
                  </div>
                )}
              </div>

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

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
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

        {/* Label do periodo ativo */}
        <div className="flex items-center gap-2 mb-4 -mt-4">
          <Calendar className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[11px] text-white/30">{intervaloPeriodo.label}</span>
        </div>

        {activeTab === "atendimentos" ? (
          /* Lista de Atendimentos em Colunas Kanban */
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-[calc(100vh-280px)]">

              {/* Coluna 1: Aguardando */}
              <div className="flex flex-col min-h-0 rounded-2xl overflow-hidden border border-white/5" style={{ background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }}>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 bg-amber-500/10 flex-shrink-0">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                    <Clock className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h2 className="text-xs font-bold text-white flex-1">Aguardando</h2>
                  <Badge className="bg-amber-500/30 text-amber-400 border-0 text-[10px]">{aguardando.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {aguardando.length === 0 ? (
                    <p className="text-[11px] text-white/20 text-center py-8">Nenhum aguardando</p>
                  ) : (
                    aguardando.map(atendimento => (
                      <AtendimentoCard key={atendimento.id} atendimento={atendimento} userEquipe={equipe} userName={equipe} onUpdate={fetchAtendimentos} />
                    ))
                  )}
                </div>
              </div>

              {/* Coluna 2: Gravando */}
              <div className="flex flex-col min-h-0 rounded-2xl overflow-hidden border border-white/5" style={{ background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }}>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 bg-blue-500/10 flex-shrink-0">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 animate-pulse">
                    <Mic className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h2 className="text-xs font-bold text-white flex-1">Gravando</h2>
                  <Badge className="bg-blue-500/30 text-blue-400 border-0 text-[10px]">{processando.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {processando.length === 0 ? (
                    <p className="text-[11px] text-white/20 text-center py-8">Nenhum gravando</p>
                  ) : (
                    processando.map(atendimento => (
                      <AtendimentoCard key={atendimento.id} atendimento={atendimento} userEquipe={equipe} userName={equipe} onUpdate={fetchAtendimentos} />
                    ))
                  )}
                </div>
              </div>

              {/* Coluna 3: Nao Fechados */}
              <div className="flex flex-col min-h-0 rounded-2xl overflow-hidden border border-white/5" style={{ background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }}>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 bg-red-500/10 flex-shrink-0">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
                    <XCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h2 className="text-xs font-bold text-white flex-1">Nao Fechados</h2>
                  <Badge className="bg-red-500/30 text-red-400 border-0 text-[10px]">{naoFechados.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {naoFechados.length === 0 ? (
                    <p className="text-[11px] text-white/20 text-center py-8">Nenhum nao fechado</p>
                  ) : (
                    naoFechados.map(atendimento => (
                      <AtendimentoCard key={atendimento.id} atendimento={atendimento} userEquipe={equipe} userName={equipe} onUpdate={fetchAtendimentos} />
                    ))
                  )}
                </div>
              </div>

              {/* Coluna 4: Fechados */}
              <div className="flex flex-col min-h-0 rounded-2xl overflow-hidden border border-white/5" style={{ background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }}>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 bg-emerald-500/10 flex-shrink-0">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h2 className="text-xs font-bold text-white flex-1">Fechados</h2>
                  <Badge className="bg-emerald-500/30 text-emerald-400 border-0 text-[10px]">{fechados.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {fechados.length === 0 ? (
                    <p className="text-[11px] text-white/20 text-center py-8">Nenhum fechado</p>
                  ) : (
                    fechados.map(atendimento => (
                      <AtendimentoCard key={atendimento.id} atendimento={atendimento} userEquipe={equipe} userName={equipe} onUpdate={fetchAtendimentos} />
                    ))
                  )}
                </div>
              </div>

            </div>
          )
        ) : (
          /* Relatorio - Central de Decisao */
          <div>
            <CentralDecisao atendimentos={atendimentosFiltrados} />
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
