"use client"

import useSWR from "swr"
import { useMemo } from "react"
import { Stats } from "@/lib/types"
import { getFotoVendedor } from "@/lib/vendedor-fotos"

interface Top1Person {
  nome: string
  total: number
  foto?: string
}

interface Top1Venda {
  nome: string
  valor: number
  vendas: number
  foto?: string
}

interface StatsCardsProps {
  stats: Stats
  top1Agendei?: Top1Person | null
  top1Veio?: Top1Person | null
}

interface VendaRow {
  responsavel: string
  valor_venda: number
}

export function StatsCards({ stats, top1Agendei, top1Veio }: StatsCardsProps) {
  const { data, error } = useSWR<{ vendas: VendaRow[] }>(
    "/api/vendas",
    (url: string) => fetch(url, { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    }).then((res) => res.json()).catch(() => ({ vendas: [] })),
    { 
      refreshInterval: 10000, 
      revalidateOnFocus: true,
      dedupingInterval: 0, // Desabilita deduplicação para sempre buscar dados novos
    }
  )

  const top3VendedoresMes = useMemo((): Top1Venda[] => {
    const vendas = data?.vendas || []
    if (vendas.length === 0) return []
    const byVendedor: Record<string, { valor: number; total: number }> = {}
    vendas.forEach((v) => {
      const nome = v.responsavel || "Sem nome"
      if (!byVendedor[nome]) byVendedor[nome] = { valor: 0, total: 0 }
      byVendedor[nome].valor += Number(v.valor_venda)
      byVendedor[nome].total++
    })
    return Object.entries(byVendedor)
      .sort((a, b) => b[1].valor - a[1].valor)
      .slice(0, 3)
      .map(([nome, info]) => ({ nome, valor: info.valor, vendas: info.total, foto: getFotoVendedor(nome) }))
  }, [data])

  const top1VendedorMes = top3VendedoresMes[0] ?? null

  const equipeLogos: Record<string, string> = {
    "TDM": "/equipes/tdm.jpg",
    "Legado": "/equipes/legado.jpg",
    "Guerreiros": "/equipes/guerreiros.jpg",
  }

  const vendedorEquipe: Record<string, string> = {
    // Elite
    "Yuri Ryan Pereira": "Elite",
    "Yuri Pereira": "Elite",
    // Guerreiros
    "Gisely Leal": "Guerreiros",
    "Rafaella Antunes": "Guerreiros",
    "Rafaella": "Guerreiros",
    "Lidiane Fonseca": "Guerreiros",
    "Lidiane": "Guerreiros",
    // Gladiadores
    "Alexia Cunha": "Gladiadores",
    "Alexia": "Gladiadores",
    "Nathan Caue": "Gladiadores",
    "Nathan Cauê": "Gladiadores",
    // Samurais
    "Leonardo Freitas": "Samurais",
    "João Victor": "Samurais",
    "Joao Victor": "Samurais",
    "Luiz Miguel": "Samurais",
    // SuperNova
    "Bárbara Rossato": "SuperNova",
    "Barbara Rossato": "SuperNova",
    "Bárbara": "SuperNova",
    "Barbara": "SuperNova",
    // Energy
    "Willy Santana": "Energy",
    "Willy": "Energy",
    // Legado
    "Janaina Dantas": "Legado",
    "Janaína Dantas": "Legado",
    "Brayan": "Legado",
    "Brayan Bertolai": "Legado",
    "Nicolas Moraes": "Legado",
    "Gabrielly Pereira": "Legado",
    "Gabrielly": "Legado",
    // Lobos
    "Alex Negreiros": "Lobos",
    "Lucas Dionisio": "Lobos",
    "Lucas Dionísio": "Lobos",
    "Ana Gabrielly": "Lobos",
    "Isabelly Ribeiro": "Lobos",
    "Isabelly": "Lobos",
    // TDM (Turma dos Milhões) - Klaiver, Emily, Amanda, Bianca, Ana Beatriz, João Lucas
    "Kleinver Seabra": "TDM",
    "Klaiver": "TDM",
    "Emily Machado": "TDM",
    "Emily": "TDM",
    "Amanda Souza": "TDM",
    "Amanda": "TDM",
    "Bianca Isabela": "TDM",
    "Bianca da Silva": "TDM",
    "Bianca": "TDM",
    "João Lucas": "TDM",
    "Joao Lucas": "TDM",
    "Ana Beatriz": "TDM",
    "Ana": "TDM",
    // Admin (não conta para ranking)
    "Livia Rafaela": "Admin",
    "Integração Dashboard": "Admin",
    "Grupo Lr Multimarcas": "Admin",
  }

  // META da quinzena: começa em R$ 5.000.000, sobe para R$ 10.000.000 quando batida
  const META_BASE = 5_000_000
  const META_NOVA = 10_000_000

  const totalVendidoMes = useMemo(() => {
    const vendas = data?.vendas || []
    const total = vendas.reduce((acc, v) => acc + Number(v.valor_venda), 0)
    console.log("[v0] StatsCards - vendas recebidas:", vendas.length, "total:", total)
    return total
  }, [data])

  // Define a meta dinâmica: se já bateu 5M, meta vira 10M
  const META_QUINZENA = totalVendidoMes >= META_BASE ? META_NOVA : META_BASE

  const restanteMeta = Math.max(0, META_QUINZENA - totalVendidoMes)
  const percentualMeta = Math.min(100, Math.round((totalVendidoMes / META_QUINZENA) * 100))
  const metaBatida = totalVendidoMes >= META_QUINZENA

  const top1EquipeMes = useMemo((): Top1Venda | null => {
    const vendas = data?.vendas || []

    if (vendas.length === 0) {
      // Fallback enquanto sincroniza
      return { nome: "Carregando...", valor: 0, vendas: 0, foto: undefined }
    }

    const byEquipe: Record<string, { valor: number; total: number }> = {}
    vendas.forEach((v) => {
      const equipe = vendedorEquipe[v.responsavel] || "Outro"
      // Ignora Admin e Outro para o ranking
      if (equipe === "Admin" || equipe === "Outro") return
      if (!byEquipe[equipe]) byEquipe[equipe] = { valor: 0, total: 0 }
      byEquipe[equipe].valor += Number(v.valor_venda)
      byEquipe[equipe].total++
    })

    const sorted = Object.entries(byEquipe).sort((a, b) => b[1].valor - a[1].valor)
    if (sorted.length === 0) return null
    const [nome, info] = sorted[0]
    return {
      nome,
      valor: info.valor,
      vendas: info.total,
      foto: equipeLogos[nome] || undefined,
    }
  }, [data])
  const cards = [
    {
      label: "Total",
      value: stats.total,
      color: "text-[#d4af37]",
      bg: "bg-[rgba(212,175,55,0.1)]",
      border: "border-[rgba(212,175,55,0.2)]",
      glow: "rgba(212,175,55,0.3)",
    },
    {
      label: "Vieram",
      value: stats.veio,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      glow: "rgba(16,185,129,0.3)",
    },
    {
      label: "Faltaram",
      value: stats.nao,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      glow: "rgba(239,68,68,0.3)",
    },
    {
      label: "Pendentes",
      value: stats.pending,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      glow: "rgba(245,158,11,0.3)",
    },
  ]

  const fotoObjectPosition: Record<string, string> = {
    "Ana Beatriz": "object-top -top-6",
  }

  const TopCard = ({ person, label, color, glow }: { person: Top1Person; label: string; color: string; glow: string }) => {
    const isGold = color === "text-[#d4af37]"
    const primaryColor = isGold ? "#d4af37" : "#10b981"
    const borderColor = isGold ? "rgba(212,175,55,0.4)" : "rgba(16,185,129,0.4)"
    const objectPos = fotoObjectPosition[person.nome] || "object-top"
    
    return (
      <div 
        className="group relative flex items-center gap-4 px-5 py-4 min-w-fit rounded-2xl backdrop-blur-xl transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden cursor-default"
      >
        {/* Glass background - transparente */}
        <div 
          className="absolute inset-0 rounded-2xl backdrop-blur-sm transition-all duration-500"
          style={{
            background: "rgba(0,0,0,0.12)",
            border: `1px solid ${borderColor.replace('0.4', '0.15')}`,
          }}
        />
        
        {/* Animated outer glow */}
        <div 
          className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl -z-10"
          style={{ background: `radial-gradient(ellipse at center, ${glow}, transparent 70%)` }}
        />
        
        {/* Rotating shimmer on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
          <div 
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
          />
        </div>
        
        {/* Trophy with pulse animation */}
        <div className="relative z-10 flex flex-col items-center">
          <div 
            className="text-3xl transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12"
            style={{ 
              filter: `drop-shadow(0 0 12px ${glow}) drop-shadow(0 0 20px ${glow.replace('0.3', '0.5')})`,
            }}
          >
            🏆
          </div>
        </div>

        {/* Foto grande com borda animada */}
        <div className="relative z-10">
          <div 
            className="absolute -inset-1 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 blur-sm"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, transparent, ${primaryColor})` }}
          />
          {person.foto ? (
            <img
              src={person.foto}
              alt={person.nome}
              className={`relative w-14 h-14 rounded-full ${objectPos} border-2 transition-all duration-500 group-hover:scale-110`}
              style={{
                borderColor: primaryColor,
                boxShadow: `0 0 25px ${glow}, 0 4px 15px rgba(0,0,0,0.3)`,
              }}
            />
          ) : (
            <div
              className="relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500 group-hover:scale-110 font-black text-xl"
              style={{
                background: `linear-gradient(135deg, ${glow.replace('0.3', '0.2')}, ${glow.replace('0.3', '0.1')})`,
                borderColor: primaryColor,
                color: primaryColor,
                boxShadow: `0 0 25px ${glow}`,
              }}
            >
              {person.nome.charAt(0)}
            </div>
          )}
          {/* Badge TOP 1 com pulse */}
          <span 
            className="absolute -top-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none text-black shadow-lg transition-transform duration-300 group-hover:scale-110"
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor}, ${isGold ? '#f5d742' : '#34d399'})`,
              boxShadow: `0 2px 10px ${glow}`,
            }}
          >
            TOP 1
          </span>
        </div>

        {/* Info com animacoes */}
        <div className="relative z-10 flex flex-col min-w-0">
          <span 
            className="text-[9px] font-black uppercase tracking-widest mb-0.5 transition-all duration-300"
            style={{ color: primaryColor, textShadow: `0 0 20px ${glow}` }}
          >
            {label}
          </span>
          <span className="text-sm font-bold text-white truncate max-w-[120px] transition-colors duration-300 group-hover:text-white">
            {person.nome}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span 
              className="text-lg font-black transition-all duration-300 group-hover:scale-110"
              style={{ color: primaryColor, textShadow: `0 0 15px ${glow}` }}
            >
              {person.total}
            </span>
            <span className="text-[10px] text-white/50 font-semibold">
              {label.includes("Agendei") ? "agendei" : "vieram"}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const TopCardVenda = ({ venda, label, primaryColor, glow, badgeGradient }: {
    venda: Top1Venda
    label: string
    primaryColor: string
    glow: string
    badgeGradient: string
  }) => {
    const borderColor = `${glow.slice(0, -4)}0.25)`
    const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(venda.valor)

    return (
      <div className="group relative flex items-center gap-4 px-5 py-4 min-w-fit rounded-2xl backdrop-blur-sm transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden cursor-default">
        <div
          className="absolute inset-0 rounded-2xl transition-all duration-500"
          style={{
            background: "rgba(0,0,0,0.12)",
            border: `1px solid ${borderColor}`,
          }}
        />
        <div
          className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl -z-10"
          style={{ background: `radial-gradient(ellipse at center, ${glow}, transparent 70%)` }}
        />
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
          <div
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
          />
        </div>

        {/* Trofeu */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className="text-3xl transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12"
            style={{ filter: `drop-shadow(0 0 12px ${glow}) drop-shadow(0 0 20px ${glow.replace('0.3', '0.5')})` }}
          >
            🏆
          </div>
        </div>

        {/* Foto */}
        <div className="relative z-10">
          <div
            className="absolute -inset-1 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 blur-sm"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, transparent, ${primaryColor})` }}
          />
          {venda.foto ? (
            <img
              src={venda.foto}
              alt={venda.nome}
              className="relative w-14 h-14 rounded-full object-cover object-top border-2 transition-all duration-500 group-hover:scale-110"
              style={{ borderColor: primaryColor, boxShadow: `0 0 25px ${glow}, 0 4px 15px rgba(0,0,0,0.3)` }}
            />
          ) : (
            <div
              className="relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500 group-hover:scale-110 font-black text-xl"
              style={{
                background: `linear-gradient(135deg, ${glow.replace('0.3', '0.2')}, ${glow.replace('0.3', '0.1')})`,
                borderColor: primaryColor,
                color: primaryColor,
                boxShadow: `0 0 25px ${glow}`,
              }}
            >
              {venda.nome.charAt(0)}
            </div>
          )}
          <span
            className="absolute -top-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none text-black shadow-lg transition-transform duration-300 group-hover:scale-110"
            style={{ background: badgeGradient, boxShadow: `0 2px 10px ${glow}` }}
          >
            TOP 1
          </span>
        </div>

        {/* Info */}
        <div className="relative z-10 flex flex-col min-w-0">
          <span
            className="text-[9px] font-black uppercase tracking-widest mb-0.5 transition-all duration-300"
            style={{ color: primaryColor, textShadow: `0 0 20px ${glow}` }}
          >
            {label}
          </span>
          <span className="text-sm font-bold text-white truncate max-w-[130px]">
            {venda.nome}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="text-base font-black transition-all duration-300 group-hover:scale-110"
              style={{ color: primaryColor, textShadow: `0 0 15px ${glow}` }}
            >
              {formatted}
            </span>
          </div>
          <span className="text-[10px] text-white/40 mt-0.5">{venda.vendas} {venda.vendas === 1 ? "venda" : "vendas"}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 px-4 md:px-6 mb-6">
      {/* Linha 1: TOP Vendas, TOP Equipe, TOP Agendei, TOP Veio */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        {/* TOP 3 Vendedores do Mes */}
        {top3VendedoresMes.length > 0 && (() => {
          const config = [
            { label: "Top 1 Vendas", primaryColor: "#f5d742", glow: "rgba(245,215,66,0.35)", badgeGradient: "linear-gradient(135deg, #d4af37, #f5d742)", troféu: "🥇" },
            { label: "Top 2 Vendas", primaryColor: "#cbd5e1", glow: "rgba(203,213,225,0.3)", badgeGradient: "linear-gradient(135deg, #94a3b8, #cbd5e1)", troféu: "🥈" },
            { label: "Top 3 Vendas", primaryColor: "#fb923c", glow: "rgba(251,146,60,0.3)", badgeGradient: "linear-gradient(135deg, #c2410c, #fb923c)", troféu: "🥉" },
          ]
          return top3VendedoresMes.map((venda, i) => {
            const { label, primaryColor, glow, badgeGradient, troféu } = config[i]
            const borderColor = `${glow.slice(0, -4)}0.25)`
            const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(venda.valor)
            return (
              <div key={venda.nome} className="group relative flex items-center gap-4 px-5 py-4 min-w-fit rounded-2xl backdrop-blur-sm transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden cursor-default">
                <div className="absolute inset-0 rounded-2xl transition-all duration-500" style={{ background: "rgba(0,0,0,0.12)", border: `1px solid ${borderColor}` }} />
                <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl -z-10" style={{ background: `radial-gradient(ellipse at center, ${glow}, transparent 70%)` }} />
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
                </div>
                {/* Medalha */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="text-3xl transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12" style={{ filter: `drop-shadow(0 0 12px ${glow})` }}>
                    {troféu}
                  </div>
                </div>
                {/* Foto */}
                <div className="relative z-10">
                  <div className="absolute -inset-1 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 blur-sm" style={{ background: `linear-gradient(135deg, ${primaryColor}, transparent, ${primaryColor})` }} />
                  {venda.foto ? (
                    <img src={venda.foto} alt={venda.nome} className="relative w-14 h-14 rounded-full object-cover object-top border-2 transition-all duration-500 group-hover:scale-110" style={{ borderColor: primaryColor, boxShadow: `0 0 25px ${glow}, 0 4px 15px rgba(0,0,0,0.3)` }} />
                  ) : (
                    <div className="relative w-14 h-14 rounded-full border-2 flex items-center justify-center font-black text-xl transition-all duration-500 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${glow.replace('0.3', '0.2')}, ${glow.replace('0.3', '0.1')})`, borderColor: primaryColor, color: primaryColor, boxShadow: `0 0 25px ${glow}` }}>
                      {venda.nome.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -top-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none text-black shadow-lg" style={{ background: badgeGradient, boxShadow: `0 2px 10px ${glow}` }}>
                    TOP {i + 1}
                  </span>
                </div>
                {/* Info */}
                <div className="relative z-10 flex flex-col min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: primaryColor, textShadow: `0 0 20px ${glow}` }}>{label}</span>
                  <span className="text-sm font-bold text-white truncate max-w-[130px]">{venda.nome}</span>
                  <span className="text-base font-black mt-1 transition-all duration-300 group-hover:scale-110 inline-block" style={{ color: primaryColor, textShadow: `0 0 15px ${glow}` }}>{formatted}</span>
                  <span className="text-[10px] text-white/40 mt-0.5">{venda.vendas} {venda.vendas === 1 ? "venda" : "vendas"}</span>
                </div>
              </div>
            )
          })
        })()}

        {top1EquipeMes && (
          <TopCardVenda
            venda={top1EquipeMes}
            label="Top Equipe Mes"
            primaryColor="#fb923c"
            glow="rgba(251,146,60,0.3)"
            badgeGradient="linear-gradient(135deg, #fb923c, #fdba74)"
          />
        )}

        {/* Card META da quinzena */}
        <div className="group relative flex flex-col justify-center gap-2 px-5 py-4 rounded-2xl backdrop-blur-sm transition-all duration-500 ease-out hover:scale-[1.02] overflow-hidden cursor-default min-w-[220px]"
          style={{
            background: "rgba(0,0,0,0.12)",
            border: metaBatida ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(212,175,55,0.2)",
          }}
        >
          {/* Glow hover */}
          <div
            className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl -z-10"
            style={{ background: metaBatida ? "radial-gradient(ellipse at center, rgba(16,185,129,0.25), transparent 70%)" : "radial-gradient(ellipse at center, rgba(212,175,55,0.25), transparent 70%)" }}
          />

          {/* Header */}
          <div className="flex items-center justify-between">
            <span
              className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
              style={{ color: metaBatida ? "#34d399" : "#f5d742" }}
            >
              💣 {metaBatida ? "Meta Batida!" : "Meta Quinzena"}
            </span>
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{
                background: metaBatida ? "rgba(16,185,129,0.25)" : "rgba(212,175,55,0.25)",
                color: metaBatida ? "#34d399" : "#f5d742",
              }}
            >
              {percentualMeta}%
            </span>
          </div>

          {/* Valor restante */}
          <div className="flex flex-col">
            <span className="text-[10px] text-white/60 font-semibold">
              {metaBatida ? "Total vendido" : "Faltam"}
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-lg font-black leading-tight"
                style={{
                  color: metaBatida ? "#34d399" : "#f5d742",
                  textShadow: metaBatida ? "0 0 20px rgba(16,185,129,0.8)" : "0 0 20px rgba(245,215,66,0.6)",
                }}
              >
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(
                  metaBatida ? totalVendidoMes : restanteMeta
                )}
              </span>
              <span className="text-2xl animate-pulse">✨</span>
            </div>
            <span className="text-[9px] text-white/50 mt-0.5 font-medium">
              Meta: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(META_QUINZENA)}
            </span>
          </div>

          {/* Barra de progresso */}
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${percentualMeta}%`,
                background: metaBatida
                  ? "linear-gradient(90deg, #10b981, #34d399)"
                  : percentualMeta >= 60
                    ? "linear-gradient(90deg, #d4af37, #f5d742)"
                    : "linear-gradient(90deg, #ef4444, #f97316)",
                boxShadow: metaBatida ? "0 0 8px rgba(16,185,129,0.6)" : "0 0 8px rgba(212,175,55,0.4)",
              }}
            />
          </div>
        </div>

        {(top1VendedorMes || top1EquipeMes) && (top1Agendei || top1Veio) && (
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent flex-shrink-0" />
        )}

        {top1Agendei && (
          <TopCard 
            person={top1Agendei} 
            label="Top Agendei Semana" 
            color="text-[#d4af37]" 
            glow="rgba(212,175,55,0.3)"
          />
        )}

        {top1Veio && (
          <TopCard 
            person={top1Veio} 
            label="Top Veio Semana" 
            color="text-emerald-400" 
            glow="rgba(16,185,129,0.3)"
          />
        )}
      </div>

      {/* Linha 2: Total, Vieram, Faltaram, Pendentes + Vendido Produção */}
      <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:gap-4 md:overflow-x-auto pb-1">
        {cards.map((card) => (
          <div
            key={card.label}
            className="group relative flex items-center gap-3 px-4 py-3.5 md:px-5 rounded-2xl cursor-default transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden"
          >
            <div 
              className="absolute inset-0 rounded-2xl backdrop-blur-sm transition-all duration-500"
              style={{
                background: "rgba(0,0,0,0.12)",
                border: `1px solid ${card.glow.replace('0.3', '0.1')}`,
              }}
            />
            <div 
              className="absolute -inset-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-md -z-10"
              style={{ background: `linear-gradient(135deg, ${card.glow}, transparent, ${card.glow})` }}
            />
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
              <div 
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
              />
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center min-w-[40px]">
              <span 
                className={`text-2xl md:text-3xl font-black ${card.color} transition-all duration-500 group-hover:scale-110`}
                style={{ 
                  textShadow: `0 0 30px ${card.glow}, 0 0 60px ${card.glow.replace('0.3', '0.2')}`,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                }}
              >
                {card.value}
              </span>
            </div>
            <div className="relative z-10 flex flex-col">
              <span className="text-[10px] md:text-[11px] text-white/50 font-bold uppercase tracking-widest transition-colors duration-300 group-hover:text-white/70">
                {card.label}
              </span>
              <div 
                className="h-0.5 w-0 group-hover:w-full mt-1 rounded-full transition-all duration-500 ease-out"
                style={{ background: `linear-gradient(90deg, ${card.glow}, transparent)` }}
              />
            </div>
          </div>
        ))}

        {/* Separador */}
        <div className="hidden md:block w-px h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent flex-shrink-0 mx-4" />

        {/* Card Vendido Produção */}
        <div className="col-span-2 md:col-span-1 group relative flex items-center gap-4 px-5 py-4 rounded-2xl cursor-default transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden">
          <div 
            className="absolute inset-0 rounded-2xl backdrop-blur-sm transition-all duration-500"
            style={{
              background: "rgba(0,0,0,0.12)",
              border: "1px solid rgba(16,185,129,0.15)",
            }}
          />
          <div 
            className="absolute -inset-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-md -z-10"
            style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.3), transparent, rgba(16,185,129,0.3))" }}
          />
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
            <div 
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
            />
          </div>
          <div className="relative z-10 flex flex-col">
            <span className="text-[10px] md:text-[11px] text-white/50 font-bold uppercase tracking-widest transition-colors duration-300 group-hover:text-white/70">
              Vendido Produção
            </span>
            <span 
              className="text-2xl md:text-3xl font-black text-emerald-400 transition-all duration-500 group-hover:scale-105"
              style={{ 
                textShadow: "0 0 30px rgba(16,185,129,0.3), 0 0 60px rgba(16,185,129,0.2)",
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            >
              {totalVendidoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            {/* Frase de motivação dentro do card até atingir 4 milhões */}
            {totalVendidoMes < 4000000 && (
              <p className="text-[11px] md:text-[13px] font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent mt-2 animate-pulse"
                style={{
                  textShadow: "0 0 20px rgba(34,211,238,0.2), 0 0 30px rgba(16,185,129,0.2)",
                  filter: 'drop-shadow(0 1px 4px rgba(16,185,129,0.15))',
                }}
              >
                Papo de estampa de Camisa
              </p>
            )}
            <div 
              className="h-0.5 w-0 group-hover:w-full mt-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.5), transparent)" }}
            />
          </div>
        </div>
      </div>

      {/* Frase de motivação até atingir 4 milhões - removida daqui */}
    </div>
  )
}
