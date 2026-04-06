"use client"

import { Lead } from "@/lib/types"
import { formatTimeDisplay } from "@/lib/date-utils"

interface NextWeekPreviewProps {
  leads: Lead[]
  onNavigateToWeek: () => void
}

export function NextWeekPreview({ leads, onNavigateToWeek }: NextWeekPreviewProps) {
  if (leads.length === 0) return null

  // Agrupa leads por dia
  const leadsByDay = leads.reduce((acc, lead) => {
    const date = lead.data
    if (!acc[date]) acc[date] = []
    acc[date].push(lead)
    return acc
  }, {} as Record<string, Lead[]>)

  // Formata data para exibição
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
  }

  return (
    <div className="mx-4 md:mx-6 mb-6 p-4 bg-white/[0.04] backdrop-blur-sm border border-[rgba(212,175,55,0.15)] rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-[13px] font-semibold text-[#f5f0e8]">
            Próxima Semana
          </h3>
          <span className="text-[11px] text-[#8a8070] bg-[rgba(212,175,55,0.1)] px-2 py-0.5 rounded-md">
            {leads.length} reuniões
          </span>
        </div>
        <button
          onClick={onNavigateToWeek}
          className="text-[11px] text-[#d4af37] hover:text-[#f5f0e8] font-medium transition-colors"
        >
          Ver semana completa →
        </button>
      </div>

      {/* Lista compacta de leads */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Object.entries(leadsByDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(0, 5)
          .map(([date, dayLeads]) => (
            <div key={date} className="flex-shrink-0 min-w-[200px]">
              <p className="text-[10px] text-[#d4af37] font-semibold uppercase tracking-wider mb-2">
                {formatDate(date)}
              </p>
              <div className="space-y-1.5">
                {dayLeads.slice(0, 3).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center gap-2 p-2 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.04)]"
                  >
                    {lead.foto_responsavel ? (
                      <img
                        src={lead.foto_responsavel}
                        alt={lead.responsavel}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[rgba(212,175,55,0.15)] flex items-center justify-center">
                        <span className="text-[9px] text-[#d4af37] font-semibold">
                          {lead.responsavel?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#f5f0e8] font-medium truncate">{lead.nome}</p>
                      <p className="text-[9px] text-[#d4af37]">{lead.responsavel}</p>
                      <p className="text-[9px] text-[#8a8070]">
                        {formatTimeDisplay(lead.hora)} {lead.equipe && lead.equipe !== "Sem equipe" && `• ${lead.equipe}`}
                      </p>
                    </div>
                  </div>
                ))}
                {dayLeads.length > 3 && (
                  <p className="text-[9px] text-[#8a8070] text-center">
                    +{dayLeads.length - 3} mais
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
