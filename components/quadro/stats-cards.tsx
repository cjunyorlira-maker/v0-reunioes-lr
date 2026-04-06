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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 px-4 md:px-6 mb-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative overflow-hidden bg-[rgba(12,12,12,0.35)] backdrop-blur-[2px] border border-[rgba(212,175,55,0.2)] rounded-2xl p-4 hover:border-[rgba(212,175,55,0.4)] transition-all"
        >
          {/* Stripe no topo */}
          <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl ${card.stripeClass}`} />
          
          <p className="text-[10px] text-[#8a8070] uppercase tracking-wider font-medium mb-1.5">
            {card.label}
          </p>
          <p className={`font-serif text-[32px] font-bold leading-none tracking-tight ${card.valueClass}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  )
}
