"use client"

import { Lead } from "@/lib/types"
import { formatTimeDisplay } from "@/lib/date-utils"

interface LeadCardProps {
  lead: Lead
  onUpdateStatus: (id: string, status: "veio" | "nao" | "pending" | "remarcou") => void
  onDelete: (id: string) => void
  onEdit: (lead: Lead) => void
  onSync?: (id: string) => void
  onRemoveRemarcado?: (id: string) => void
}

function getTipoClass(tipo: string) {
  const t = (tipo || "").toLowerCase()
  if (t.includes("cam")) return "bg-amber-500/10 text-amber-400 border-amber-500/20"
  if (t.includes("casa")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  return "bg-sky-500/10 text-sky-400 border-sky-500/20"
}

export function LeadCard({ lead, onUpdateStatus, onDelete, onEdit, onSync, onRemoveRemarcado }: LeadCardProps) {
  const statusDot = 
    lead.status === "veio" 
      ? "bg-emerald-400"
      : lead.status === "nao"
        ? "bg-red-400"
        : "bg-[#d4af37]/40"

  return (
    <div 
      className="bg-[#131313] border border-[rgba(212,175,55,0.1)] rounded-xl overflow-hidden hover:border-[rgba(212,175,55,0.25)] transition-all cursor-pointer group"
      onClick={() => onEdit(lead)}
    >
      <div className="p-3.5">
        {/* Header with photo and info */}
        <div className="flex items-start gap-3 mb-2">
          {/* Photo - Larger */}
          {lead.foto_responsavel ? (
            <img 
              src={lead.foto_responsavel} 
              alt={lead.responsavel}
              className="w-11 h-11 rounded-full object-cover border-2 border-[rgba(212,175,55,0.2)] flex-shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[rgba(212,175,55,0.08)] border-2 border-[rgba(212,175,55,0.2)] flex items-center justify-center flex-shrink-0">
              <span className="text-[16px] text-[#d4af37] font-semibold">
                {lead.responsavel?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {/* Status + Time row */}
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${statusDot}`} />
              <span className="text-[11px] text-[#8a8070] font-medium">
                {formatTimeDisplay(lead.hora)}
              </span>
              {lead.remarcado && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveRemarcado?.(lead.id)
                  }}
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[rgba(243,190,255,0.1)] text-[#f3beff] border border-[rgba(243,190,255,0.2)] hover:bg-[rgba(243,190,255,0.2)]"
                >
                  REMARCADO
                </button>
              )}
            </div>
            
            {/* Client name */}
            <h3 className="text-[14px] font-semibold text-[#f5f0e8] leading-tight truncate" title={lead.nome}>
              {lead.nome}
            </h3>
            
            {/* Responsavel */}
            <p className="text-[12px] text-[#d4af37] font-medium truncate" title={lead.responsavel}>
              {lead.responsavel}
            </p>
            
            {/* Equipe */}
            {lead.equipe && lead.equipe !== "Sem equipe" && (
              <p className="text-[10px] text-[#8a8070] truncate mt-0.5">{lead.equipe}</p>
            )}
          </div>
        </div>
        
        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.tipo_reuniao && (
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${
              lead.tipo_reuniao.toLowerCase().includes("online") 
                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                : "bg-pink-500/10 text-pink-400 border-pink-500/20"
            }`}>
              {lead.tipo_reuniao}
            </span>
          )}
          
          {lead.tipo && (
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${getTipoClass(lead.tipo)}`}>
              {lead.tipo}
            </span>
          )}
          
          {lead.atendente && (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {lead.atendente}
            </span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-3.5 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5 mb-1.5">
          <button
            onClick={() => onUpdateStatus(lead.id, "veio")}
            className="flex-1 text-[11px] py-2 rounded-lg border border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 font-semibold transition-colors"
          >
            Veio
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "nao")}
            className="flex-1 text-[11px] py-2 rounded-lg border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/15 font-semibold transition-colors"
          >
            Faltou
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "remarcou")}
            className="flex-1 text-[11px] py-2 rounded-lg border border-[rgba(243,190,255,0.2)] text-[#f3beff] bg-[rgba(243,190,255,0.05)] hover:bg-[rgba(243,190,255,0.15)] font-semibold transition-colors"
          >
            Remarcar
          </button>
        </div>
        {onSync && (
          <button
            onClick={() => onSync(lead.id)}
            className="w-full text-[10px] py-1.5 rounded-lg border border-[rgba(212,175,55,0.15)] text-[#d4af37]/70 hover:text-[#d4af37] hover:bg-[rgba(212,175,55,0.08)] font-medium transition-colors"
          >
            Sincronizar com Kommo
          </button>
        )}
      </div>
    </div>
  )
}
