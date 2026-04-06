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
      className={`w-[260px] flex-shrink-0 bg-[#111] border rounded-lg p-3 min-h-[400px] ${
        isToday 
          ? "border-[#a78bfa]/40 ring-1 ring-[#a78bfa]/20" 
          : "border-white/[0.06] hover:border-white/[0.1]"
      }`}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-md flex items-center justify-center text-[18px] font-semibold ${
            isToday 
              ? "bg-[#a78bfa] text-black" 
              : "bg-white/[0.04] text-white/70"
          }`}>
            {day.dayNumber}
          </div>
          <div>
            <p className={`text-[12px] font-medium ${isToday ? "text-[#a78bfa]" : "text-white/50"}`}>
              {day.dayName}
            </p>
            {isToday && (
              <span className="text-[10px] text-emerald-400 font-medium">Hoje</span>
            )}
          </div>
        </div>
        
        {/* Count */}
        <span className={`text-[11px] font-medium px-2 py-1 rounded ${
          dayLeads.length > 0 
            ? "bg-white/[0.06] text-white/70" 
            : "text-white/20"
        }`}>
          {dayLeads.length}
        </span>
      </div>

      {/* Leads */}
      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        {dayLeads.length === 0 ? (
          <p className="text-[11px] text-white/20 text-center py-8">
            Sem reuniões
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
