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
      color: "text-[#d4af37]",
      bg: "bg-[rgba(212,175,55,0.1)]",
      border: "border-[rgba(212,175,55,0.2)]",
    },
    {
      label: "Vieram",
      value: stats.veio,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Faltaram",
      value: stats.nao,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      label: "Pendentes",
      value: stats.pending,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
  ]

  return (
    <div className="flex gap-2.5 px-4 md:px-6 mb-4 overflow-x-auto">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`flex items-center gap-3 bg-white/[0.04] backdrop-blur-sm border ${card.border} rounded-xl px-4 py-3 min-w-fit`}
        >
          <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
            <span className={`text-[18px] font-bold ${card.color}`}>{card.value}</span>
          </div>
          <span className="text-[11px] text-[#8a8070] font-semibold uppercase tracking-wide">{card.label}</span>
        </div>
      ))}
    </div>
  )
}
