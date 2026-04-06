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
      className={`w-[320px] flex-shrink-0 bg-[rgba(12,12,12,0.5)] backdrop-blur-sm border rounded-2xl p-4 min-h-[500px] transition-all ${
        isToday 
          ? "border-[rgba(212,175,55,0.6)] shadow-[0_0_20px_rgba(212,175,55,0.1)]" 
          : "border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.3)]"
      }`}
    >
      {/* Day header */}
      <div className="mb-4 pb-3 border-b border-[rgba(212,175,55,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              isToday 
                ? "bg-gradient-to-br from-[#d4af37] to-[#b8960c] shadow-lg" 
                : "bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.15)]"
            }`}>
              <span className={`font-serif text-[28px] font-bold leading-none ${
                isToday ? "text-[#080808]" : "text-[#d4af37]"
              }`}>
                {day.dayNumber}
              </span>
            </div>
            <div>
              <p className={`text-[13px] font-medium uppercase tracking-wide ${
                isToday ? "text-[#d4af37]" : "text-[#8a8070]"
              }`}>
                {day.dayName}
              </p>
              {isToday && (
                <span className="text-[10px] text-[#4ade80] font-semibold uppercase tracking-wider">
                  Hoje
                </span>
              )}
            </div>
          </div>
          
          {/* Count badge */}
          <div className={`px-3 py-1.5 rounded-lg ${
            dayLeads.length > 0 
              ? "bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)]" 
              : "bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]"
          }`}>
            <span className={`text-[18px] font-bold ${dayLeads.length > 0 ? "text-[#d4af37]" : "text-[#3a3a3a]"}`}>
              {dayLeads.length}
            </span>
            <span className="text-[10px] text-[#8a8070] ml-1">reuniões</span>
          </div>
        </div>
      </div>

      {/* Leads */}
      <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {dayLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex items-center justify-center mb-3">
              <span className="text-[20px] text-[#2a2a2a]">📅</span>
            </div>
            <p className="text-[12px] text-[#3a3a3a]">
              Nenhuma reunião agendada
            </p>
          </div>
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
