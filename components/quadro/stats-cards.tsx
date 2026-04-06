"use client"

import { Users, UserCheck, UserX, Clock } from "lucide-react"
import { Stats } from "@/lib/types"

interface StatsCardsProps {
  stats: Stats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total",
      value: stats.total,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Vieram",
      value: stats.veio,
      icon: UserCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Não vieram",
      value: stats.nao,
      icon: UserX,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      label: "Pendentes",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-8 py-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50"
        >
          <div className={`p-3 rounded-lg ${card.bg}`}>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
