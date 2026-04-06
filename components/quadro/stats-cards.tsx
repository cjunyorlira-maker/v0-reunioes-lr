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
      color: "text-[#a78bfa]",
      bg: "bg-[#a78bfa]/10",
    },
    {
      label: "Vieram",
      value: stats.veio,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Faltaram",
      value: stats.nao,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      label: "Pendentes",
      value: stats.pending,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ]

  return (
    <div className="flex gap-2 px-4 md:px-6 mb-4 overflow-x-auto">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 bg-[#111] border border-white/[0.06] rounded-lg px-4 py-2.5 min-w-fit"
        >
          <div className={`w-8 h-8 rounded-md ${card.bg} flex items-center justify-center`}>
            <span className={`text-[14px] font-bold ${card.color}`}>{card.value}</span>
          </div>
          <span className="text-[11px] text-white/40 font-medium">{card.label}</span>
        </div>
      ))}
    </div>
  )
}
