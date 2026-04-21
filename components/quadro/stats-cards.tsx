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
  const { data } = useSWR<{ vendas: VendaRow[] }>(
    "/api/vendas",
    (url: string) => fetch(url).then((res) => res.json()),
    { refreshInterval: 60000 }
  )

  const top1VendedorMes = useMemo((): Top1Venda | null => {
    const vendas = data?.vendas || []
    if (vendas.length === 0) {
      // Fallback - Nicolas Moraes é TOP 1 com R$ 791.564 (2 vendas)
      return { nome: "Nicolas Moraes", valor: 791564, vendas: 2, foto: getFotoVendedor("Nicolas Moraes") }
    }
    const byVendedor: Record<string, { valor: number; total: number }> = {}
    vendas.forEach((v) => {
      const nome = v.responsavel || "Sem nome"
      if (!byVendedor[nome]) byVendedor[nome] = { valor: 0, total: 0 }
      byVendedor[nome].valor += Number(v.valor_venda)
      byVendedor[nome].total++
    })
    const sorted = Object.entries(byVendedor).sort((a, b) => b[1].valor - a[1].valor)
    if (sorted.length === 0) return null
    const [nome, info] = sorted[0]
    return { nome, valor: info.valor, vendas: info.total, foto: getFotoVendedor(nome) }
  }, [data])

  const equipeLogos: Record<string, string> = {
    "TDM": "/equipes/tdm.jpg",
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
    // TDM (Turma dos Milhões)
    "Kleinver Seabra": "TDM",
    "Emily Machado": "TDM",
    "Emily": "TDM",
    "Amanda Souza": "TDM",
    "Amanda": "TDM",
    "Bianca Isabela": "TDM",
    "Bianca": "TDM",
    "João Lucas": "TDM",
    "Joao Lucas": "TDM",
    "Ana Beatriz": "TDM",
    "Ana": "TDM",
    "Willy Santana": "TDM",
    "Willy": "TDM",
    // Admin (não conta para ranking)
    "Livia Rafaela": "Admin",
    "Integração Dashboard": "Admin",
    "Grupo Lr Multimarcas": "Admin",
  }

  const top1EquipeMes = useMemo((): Top1Venda | null => {
    const vendas = data?.vendas || []

    if (vendas.length === 0) {
      // Fallback - TDM é TOP 1 com R$ 2.084.261 (4 vendas)
      return { nome: "TDM", valor: 2084261, vendas: 4, foto: "/equipes/tdm.jpg" }
    }

    const byEquipe: Record<string, { valor: number; total: number }> = {}
    vendas.forEach((v) => {
      const equipe = vendedorEquipe[v.responsavel] || "Outro"
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
        {/* Glass background with gradient border - mais transparente */}
        <div 
          className="absolute inset-0 rounded-2xl backdrop-blur-2xl transition-all duration-500"
          style={{
            background: `linear-gradient(145deg, ${glow.replace('0.3', '0.08')} 0%, transparent 50%, ${glow.replace('0.3', '0.05')} 100%)`,
            border: `1px solid ${borderColor.replace('0.4', '0.25')}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
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
      <div className="group relative flex items-center gap-4 px-5 py-4 min-w-fit rounded-2xl backdrop-blur-xl transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden cursor-default">
        <div
          className="absolute inset-0 rounded-2xl backdrop-blur-2xl transition-all duration-500"
          style={{
            background: `linear-gradient(145deg, ${glow.replace('0.3', '0.08')} 0%, transparent 50%, ${glow.replace('0.3', '0.05')} 100%)`,
            border: `1px solid ${borderColor}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
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
        {top1VendedorMes && (
          <TopCardVenda
            venda={top1VendedorMes}
            label="Top Vendas Mes"
            primaryColor="#a78bfa"
            glow="rgba(167,139,250,0.3)"
            badgeGradient="linear-gradient(135deg, #a78bfa, #c4b5fd)"
          />
        )}

        {top1EquipeMes && (
          <TopCardVenda
            venda={top1EquipeMes}
            label="Top Equipe Mes"
            primaryColor="#fb923c"
            glow="rgba(251,146,60,0.3)"
            badgeGradient="linear-gradient(135deg, #fb923c, #fdba74)"
          />
        )}

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

      {/* Linha 2: Total, Vieram, Faltaram, Pendentes — grid 2x2 no mobile, flex no desktop */}
      <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:gap-4 md:overflow-x-auto pb-1">
        {cards.map((card) => (
          <div
            key={card.label}
            className="group relative flex items-center gap-3 px-4 py-3.5 md:px-5 rounded-2xl cursor-default transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden"
          >
            <div 
              className="absolute inset-0 rounded-2xl backdrop-blur-2xl transition-all duration-500"
              style={{
                background: `linear-gradient(135deg, ${card.glow.replace('0.3', '0.05')} 0%, transparent 50%, ${card.glow.replace('0.3', '0.03')} 100%)`,
                border: `1px solid ${card.glow.replace('0.3', '0.15')}`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
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
      </div>
    </div>
  )
}
