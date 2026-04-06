"use client"

import { Lead, WeekDay } from "@/lib/types"
import { LeadCard } from "./lead-card"
import { formatDateForDB } from "@/lib/date-utils"

interface DayColumnProps {
  day: WeekDay
  leads: Lead[]
  onUpdateStatus: (id: string, status: "veio" | "nao" | "pending" | "remarcou") => void
  onDelete: (id: string) => void
  onEdit: (lead: Lead) => void
  onSync: (id: string) => void
  onRemoveRemarcado: (id: string) => void
}

export function DayColumn({ day, leads, onUpdateStatus, onDelete, onEdit, onSync, onRemoveRemarcado }: DayColumnProps) {
  const dayLeads = leads
    .filter((lead) => lead.data === formatDateForDB(day.date))
    .sort((a, b) => a.hora.localeCompare(b.hora))

  const isToday = day.isToday

  return (
    <div
      className={`bg-[rgba(12,12,12,0.35)] backdrop-blur-[2px] border rounded-2xl p-3 min-h-[140px] transition-all ${
        isToday 
          ? "border-[rgba(212,175,55,0.6)] shadow-[0_0_0_1px_rgba(212,175,55,0.15)_inset,0_4px_24px_rgba(212,175,55,0.1)]" 
          : "border-[rgba(212,175,55,0.2)] hover:border-[rgba(212,175,55,0.4)]"
      }`}
    >
      {/* Day header */}
      <div className="mb-2.5 pb-2 border-b border-[rgba(212,175,55,0.1)]">
        <div className="flex items-start justify-between">
          <div>
            <p className={`font-serif text-[24px] font-bold leading-none tracking-tight ${
              isToday ? "text-[#d4af37]" : "text-[#f5f0e8]"
            }`}>
              {day.dayNumber}
            </p>
            <p className="text-[9px] text-[#8a8070] uppercase tracking-wider mt-0.5">
              {day.dayName}
            </p>
          </div>
          
          {/* Count badge */}
          <span className="text-[10px] bg-[rgba(212,175,55,0.08)] text-[#d4af37] px-2 py-0.5 rounded-md border border-[rgba(212,175,55,0.1)] mt-1">
            {dayLeads.length}
          </span>
        </div>
      </div>

      {/* Leads */}
      <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
        {dayLeads.length === 0 ? (
          <p className="text-[10px] text-[#2a2820] text-center py-5 italic">
            sem reuniões
          </p>
        ) : (
          dayLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onUpdateStatus={onUpdateStatus}
              onDelete={onDelete}
              onEdit={onEdit}
              onSync={onSync}
              onRemoveRemarcado={onRemoveRemarcado}
            />
          ))
        )}
      </div>
    </div>
  )
}
