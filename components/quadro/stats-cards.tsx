"use client"

import { Stats } from "@/lib/types"

interface StatsCardsProps {
  stats: Stats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total",
      value: stats.total,
      gradient: "from-[#d4af37] to-[#c9a227]",
      glowColor: "rgba(212,175,55,0.4)",
      iconBg: "linear-gradient(135deg, #d4af37, #c9a227)",
    },
    {
      label: "Vieram",
      value: stats.veio,
      gradient: "from-emerald-400 to-green-500",
      glowColor: "rgba(16,185,129,0.4)",
      iconBg: "linear-gradient(135deg, #10b981, #22c55e)",
    },
    {
      label: "Faltaram",
      value: stats.nao,
      gradient: "from-red-400 to-rose-500",
      glowColor: "rgba(239,68,68,0.4)",
      iconBg: "linear-gradient(135deg, #ef4444, #f43f5e)",
    },
    {
      label: "Pendentes",
      value: stats.pending,
      gradient: "from-amber-400 to-orange-500",
      glowColor: "rgba(245,158,11,0.4)",
      iconBg: "linear-gradient(135deg, #f59e0b, #f97316)",
    },
  ]

  return (
    <div className="flex gap-3 px-4 md:px-6 mb-5 overflow-x-auto pb-2">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="group relative flex items-center gap-3 glass-card rounded-2xl px-5 py-4 min-w-fit cursor-default transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-slide-up"
          style={{ 
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'backwards'
          }}
        >
          {/* Glow effect on hover */}
          <div 
            className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
            style={{ background: card.glowColor }}
          />
          
          {/* Icon container */}
          <div 
            className="relative w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ 
              background: card.iconBg,
              boxShadow: `0 4px 20px ${card.glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)`
            }}
          >
            <span className="text-[20px] font-black text-white drop-shadow-lg">{card.value}</span>
          </div>
          
          {/* Label */}
          <div className="relative">
            <span className={`text-[11px] text-white/40 font-semibold uppercase tracking-wider block`}>
              {card.label}
            </span>
            <span className={`text-lg font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
              {card.value} leads
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
