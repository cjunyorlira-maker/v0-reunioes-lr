"use client"

import { Stats } from "@/lib/types"

interface Top1Person {
  nome: string
  total: number
  foto?: string
}

interface StatsCardsProps {
  stats: Stats
  top1Agendei?: Top1Person | null
  top1Veio?: Top1Person | null
}

export function StatsCards({ stats, top1Agendei, top1Veio }: StatsCardsProps) {
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

  const TopCard = ({ person, label, color, glow }: { person: Top1Person; label: string; color: string; glow: string }) => (
    <div 
      className="group relative flex flex-col items-center justify-center gap-2 px-5 py-4 min-w-fit rounded-2xl backdrop-blur-md border transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-slide-up overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${glow} 0%, rgba(255,255,255,0.02) 100%)`,
        borderColor: color === "text-[#d4af37]" ? "rgba(212,175,55,0.3)" : color === "text-emerald-400" ? "rgba(16,185,129,0.3)" : "rgba(14,165,233,0.3)",
      }}
    >
      {/* Glow on hover */}
      <div 
        className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10"
        style={{ background: glow }}
      />
      
      {/* Troféu */}
      <div className="text-2xl" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
        🏆
      </div>

      {/* Foto grande */}
      <div className="relative">
        {person.foto ? (
          <img
            src={person.foto}
            alt={person.nome}
            className="w-16 h-16 rounded-full object-cover object-top border-2 transition-all duration-300 group-hover:scale-110 shadow-lg"
            style={{
              borderColor: color === "text-[#d4af37]" ? "rgba(212,175,55,0.6)" : "rgba(16,185,129,0.6)",
              boxShadow: `0 0 20px ${glow}`,
            }}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 font-bold text-xl"
            style={{
              background: color === "text-[#d4af37]" ? "rgba(212,175,55,0.15)" : "rgba(16,185,129,0.15)",
              borderColor: color === "text-[#d4af37]" ? "rgba(212,175,55,0.4)" : "rgba(16,185,129,0.4)",
              color: color === "text-[#d4af37]" ? "#d4af37" : "#10b981",
            }}
          >
            {person.nome.charAt(0)}
          </div>
        )}
        {/* Badge TOP 1 */}
        <span 
          className="absolute -top-2 -right-2 text-[10px] font-black px-2 py-1 rounded-full leading-none text-white shadow-lg"
          style={{ background: color === "text-[#d4af37]" ? "#d4af37" : "#10b981" }}
        >
          TOP 1
        </span>
      </div>

      {/* Info */}
      <div className="text-center">
        <span className="text-[9px] font-black uppercase tracking-widest block mb-1" style={{ color: color === "text-[#d4af37]" ? "#d4af37" : "#10b981" }}>
          {label}
        </span>
        <span className="text-sm font-bold text-[#f5f0e8] block leading-tight line-clamp-2">{person.nome}</span>
        <span className={`text-xs font-semibold mt-1 ${color}`}>{person.total} {label === "Top Agendei" ? "agendados" : "vieram"}</span>
      </div>
    </div>
  )

  return (
    <div className="flex gap-3 px-4 md:px-6 mb-6 overflow-x-auto pb-2">
      {/* Stats Cards */}
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="group relative flex items-center gap-3 backdrop-blur-md border rounded-2xl px-5 py-4 min-w-fit transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-slide-up overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${card.glow} 0%, rgba(255,255,255,0.02) 100%)`,
            borderColor: card.border,
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'backwards',
          }}
        >
          {/* Glow on hover */}
          <div 
            className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10"
            style={{ background: card.glow }}
          />
          
          {/* Icon */}
          <div 
            className="relative w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{
              background: card.bg,
              boxShadow: `0 4px 15px ${card.glow}`,
            }}
          >
            <span className={`text-lg font-black ${card.color}`}>{card.value}</span>
          </div>
          
          {/* Label */}
          <span className="text-xs text-[#8a8070] font-semibold uppercase tracking-wider">{card.label}</span>
        </div>
      ))}

      {/* Separator */}
      {(top1Agendei || top1Veio) && (
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent mx-2 flex-shrink-0" />
      )}

      {/* TOP 1 Cards */}
      {top1Agendei && (
        <TopCard 
          person={top1Agendei} 
          label="Top Agendei" 
          color="text-[#d4af37]" 
          glow="rgba(212,175,55,0.2)"
        />
      )}

      {top1Veio && (
        <TopCard 
          person={top1Veio} 
          label="Top Veio" 
          color="text-emerald-400" 
          glow="rgba(16,185,129,0.2)"
        />
      )}
    </div>
  )
}
