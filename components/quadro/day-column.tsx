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
      className={`group relative w-[280px] flex-shrink-0 backdrop-blur-xl border rounded-2xl p-4 min-h-[420px] transition-all duration-500 hover:-translate-y-1 ${
        isToday 
          ? "bg-gradient-to-b from-[rgba(212,175,55,0.08)] to-[rgba(10,10,10,0.9)] border-[rgba(212,175,55,0.4)] shadow-[0_0_40px_rgba(212,175,55,0.15)]" 
          : "bg-gradient-to-b from-white/[0.04] to-white/[0.01] border-white/10 hover:border-[rgba(212,175,55,0.3)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
      }`}
    >
      {/* Glow effect for today */}
      {isToday && (
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[rgba(212,175,55,0.3)] to-transparent opacity-50 blur-sm -z-10" />
      )}
      
      {/* Day header */}
      <div className={`flex items-center justify-between mb-4 p-3 rounded-xl -mx-1 transition-all duration-300 ${
        isToday 
          ? "bg-gradient-to-r from-[rgba(212,175,55,0.2)] via-[rgba(212,175,55,0.1)] to-transparent" 
          : "bg-gradient-to-r from-[rgba(255,255,255,0.05)] to-transparent group-hover:from-[rgba(255,255,255,0.08)]"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-[20px] font-black transition-all duration-300 group-hover:scale-105 ${
            isToday 
              ? "bg-gradient-to-br from-[#d4af37] to-[#b8960c] text-[#0a0a0a] shadow-[0_4px_20px_rgba(212,175,55,0.5)]" 
              : "bg-[rgba(255,255,255,0.06)] text-[#f5f0e8] group-hover:bg-[rgba(255,255,255,0.1)]"
          }`}>
            {day.dayNumber}
            {isToday && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 to-transparent" />
            )}
          </div>
          <div>
            <p className={`text-[14px] font-bold uppercase tracking-wider transition-colors duration-300 ${isToday ? "text-[#d4af37]" : "text-[#f5f0e8] group-hover:text-[#d4af37]"}`}>
              {day.dayName}
            </p>
            {isToday && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Hoje
              </span>
            )}
          </div>
        </div>
        
        {/* Counts */}
        <div className="flex flex-col items-end gap-1.5">
          <div className={`px-3 py-1 rounded-lg transition-all duration-300 ${
            dayLeads.length > 0 
              ? "bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.25)] shadow-[0_0_15px_rgba(212,175,55,0.1)]" 
              : "bg-[rgba(255,255,255,0.03)] border border-white/5"
          }`}>
            <span className={`text-[13px] font-bold ${dayLeads.length > 0 ? "text-[#d4af37]" : "text-[#3a3a3a]"}`}>
              {dayLeads.length} marc.
            </span>
          </div>
          {naoVieram > 0 && (
            <div className="px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <span className="text-[12px] font-bold text-red-400">
                {naoVieram} faltou
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Leads */}
      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 scroll-smooth">
        {dayLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <span className="text-2xl opacity-30">📅</span>
            </div>
            <p className="text-[12px] text-[#4a4a4a] font-medium">Sem reuniões</p>
          </div>
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
                <div className="h-px mx-2 mt-3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
