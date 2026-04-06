"use client"

import { Lead, WeekDay } from "@/lib/types"
import { LeadCard } from "./lead-card"
import { formatDateForDB } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface DayColumnProps {
  day: WeekDay
  leads: Lead[]
  onUpdateStatus: (id: string, status: "veio" | "nao" | "pending") => void
  onDelete: (id: string) => void
}

export function DayColumn({ day, leads, onUpdateStatus, onDelete }: DayColumnProps) {
  const dayLeads = leads.filter(
    (lead) => lead.data === formatDateForDB(day.date)
  )

  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] md:min-w-0",
        day.isToday && "bg-primary/5 rounded-xl"
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center py-4 border-b border-border/50",
          day.isToday && "border-primary/30"
        )}
      >
        <span className="text-sm text-muted-foreground">{day.dayName}</span>
        <span
          className={cn(
            "text-2xl font-bold",
            day.isToday ? "text-primary" : "text-foreground"
          )}
        >
          {day.dayNumber}
        </span>
        <span className="text-xs text-muted-foreground">{day.month}</span>
        {day.isToday && (
          <span className="mt-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
            Hoje
          </span>
        )}
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-360px)]">
        {dayLeads.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhuma reunião
          </p>
        ) : (
          dayLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onUpdateStatus={onUpdateStatus}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {dayLeads.length > 0 && (
        <div className="p-3 border-t border-border/50 text-center">
          <span className="text-sm text-muted-foreground">
            {dayLeads.length} {dayLeads.length === 1 ? "reunião" : "reuniões"}
          </span>
        </div>
      )}
    </div>
  )
}
