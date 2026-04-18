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
  onVendaFechada?: (id: string) => void
  onRetorno?: (id: string) => void
}

export function DayColumn({ day, leads, onUpdateStatus, onDelete, onEdit, onSync, onRemoveRemarcado, onVendaFechada, onRetorno }: DayColumnProps) {
  const dayLeads = leads
    .filter((lead) => lead.data === formatDateForDB(day.date))
    .sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"))

  const naoVieram = dayLeads.filter((lead) => lead.status === "nao").length
  const isToday = day.isToday

  return (
    <div
      className={`w-[280px] flex-shrink-0 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-md border rounded-xl p-3.5 min-h-[420px] ${
        isToday 
          ? "border-[rgba(212,175,55,0.4)] shadow-[0_0_25px_rgba(212,175,55,0.2)]" 
          : "border-white/10 hover:border-[rgba(212,175,55,0.25)]"
      }`}
    >
      {/* Day header */}
      <div className={`flex items-center justify-between mb-3 p-2.5 rounded-lg -mx-1 ${
        isToday 
          ? "bg-gradient-to-r from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)]" 
          : "bg-gradient-to-r from-[rgba(255,255,255,0.06)] to-transparent"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[18px] font-extrabold ${
            isToday 
              ? "bg-gradient-to-br from-[#d4af37] to-[#b8960c] text-[#0a0a0a]" 
              : "bg-[rgba(255,255,255,0.08)] text-[#f5f0e8]"
          }`}>
            {day.dayNumber}
          </div>
          <div>
            <p className={`text-[13px] font-bold uppercase tracking-wider ${isToday ? "text-[#d4af37]" : "text-[#f5f0e8]"}`}>
              {day.dayName}
            </p>
            {isToday && (
              <span className="text-[10px] text-emerald-400 font-bold">Hoje</span>
            )}
          </div>
        </div>
        
        {/* Counts */}
        <div className="flex flex-col items-end gap-1">
          <div className={`px-2.5 py-0.5 rounded-lg ${
            dayLeads.length > 0 
              ? "bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.2)]" 
              : "bg-[rgba(255,255,255,0.03)]"
          }`}>
            <span className={`text-[13px] font-bold ${dayLeads.length > 0 ? "text-[#d4af37]" : "text-[#3a3a3a]"}`}>
              {dayLeads.length} marc.
            </span>
          </div>
          {naoVieram > 0 && (
            <div className="px-2.5 py-0.5 rounded-lg bg-red-500/15 border border-red-500/25">
              <span className="text-[12px] font-bold text-red-400">
                {naoVieram} faltou
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Leads */}
      <div className="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
        {dayLeads.length === 0 ? (
          <p className="text-[11px] text-[#3a3a3a] text-center py-10">
            Sem reuniões
          </p>
        ) : (
          dayLeads.map((lead, index) => (
            <div key={lead.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <LeadCard
                lead={lead}
                onUpdateStatus={onUpdateStatus}
                onDelete={onDelete}
                onEdit={onEdit}
                onSync={onSync}
                onRemoveRemarcado={onRemoveRemarcado}
                onVendaFechada={onVendaFechada}
                onRetorno={onRetorno}
              />
              {index < dayLeads.length - 1 && (
                <div className="h-px mx-2 mt-2.5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
