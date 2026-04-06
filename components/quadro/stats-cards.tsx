"use client"

import { Stats } from "@/lib/types"

interface StatsCardsProps {
  stats: Stats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total da semana",
      value: stats.total,
      stripeClass: "bg-gradient-to-r from-[#b8960c] to-[#f0d060]",
      valueClass: "text-[#d4af37]",
    },
    {
      label: "Vieram",
      value: stats.veio,
      stripeClass: "bg-[#4ade80]",
      valueClass: "text-[#4ade80]",
    },
    {
      label: "Não vieram",
      value: stats.nao,
      stripeClass: "bg-[#f87171]",
      valueClass: "text-[#f87171]",
    },
    {
      label: "Pendentes",
      value: stats.pending,
      stripeClass: "bg-[#fbbf24]",
      valueClass: "text-[#fbbf24]",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-8 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative overflow-hidden bg-[rgba(18,18,18,0.6)] backdrop-blur-sm border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 hover:border-[rgba(212,175,55,0.2)] transition-all group"
        >
          {/* Stripe no topo */}
          <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${card.stripeClass}`} />
          
          {/* Glow effect */}
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-8 blur-xl opacity-20 ${card.stripeClass}`} />
          
          <p className="text-[11px] text-[#6a6a6a] uppercase tracking-wider font-medium mb-2">
            {card.label}
          </p>
          <p className={`font-serif text-[40px] font-bold leading-none tracking-tight ${card.valueClass}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  )
}
