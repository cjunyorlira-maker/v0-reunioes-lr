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
  return "bg-blue-500/10 text-blue-400 border-blue-500/20"
}

export function LeadCard({ lead, onUpdateStatus, onDelete, onEdit, onSync, onRemoveRemarcado }: LeadCardProps) {
  const statusDot = 
    lead.status === "veio" 
      ? "bg-emerald-400"
      : lead.status === "nao"
        ? "bg-red-400"
        : "bg-white/20"

  return (
    <div 
      className="bg-[#161616] border border-white/[0.06] rounded-lg overflow-hidden hover:border-white/[0.12] hover:bg-[#1a1a1a] transition-all cursor-pointer group"
      onClick={() => onEdit(lead)}
    >
      <div className="p-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Status dot */}
            <div className={`w-2 h-2 rounded-full ${statusDot}`} />
            
            {/* Time */}
            <span className="text-[11px] text-white/50 font-medium">
              {formatTimeDisplay(lead.hora)}
            </span>
            
            {/* Remarcado badge */}
            {lead.remarcado && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveRemarcado?.(lead.id)
                }}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20 hover:bg-purple-500/25"
              >
                REMARCADO
              </button>
            )}
          </div>
          
          {/* Photo */}
          {lead.foto_responsavel ? (
            <img 
              src={lead.foto_responsavel} 
              alt={lead.responsavel}
              className="w-7 h-7 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
              <span className="text-[10px] text-white/40 font-medium">
                {lead.responsavel?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}
        </div>
        
        {/* Client name */}
        <h3 className="text-[13px] font-medium text-white/90 leading-tight mb-1 truncate" title={lead.nome}>
          {lead.nome}
        </h3>
        
        {/* Responsavel */}
        <p className="text-[11px] text-[#a78bfa] truncate" title={lead.responsavel}>
          {lead.responsavel}
        </p>
        
        {/* Equipe */}
        {lead.equipe && lead.equipe !== "Sem equipe" && (
          <p className="text-[10px] text-white/30 truncate mt-0.5">{lead.equipe}</p>
        )}
        
        {/* Tags row */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {lead.tipo_reuniao && (
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
              lead.tipo_reuniao.toLowerCase().includes("online") 
                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                : "bg-pink-500/10 text-pink-400 border-pink-500/20"
            }`}>
              {lead.tipo_reuniao}
            </span>
          )}
          
          {lead.tipo && (
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${getTipoClass(lead.tipo)}`}>
              {lead.tipo}
            </span>
          )}
          
          {lead.atendente && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {lead.atendente}
            </span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-3 pb-3 pt-1 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onUpdateStatus(lead.id, "veio")}
          className="flex-1 text-[10px] py-1.5 rounded border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 font-medium transition-colors"
        >
          Veio
        </button>
        <button
          onClick={() => onUpdateStatus(lead.id, "nao")}
          className="flex-1 text-[10px] py-1.5 rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 font-medium transition-colors"
        >
          Faltou
        </button>
        <button
          onClick={() => onUpdateStatus(lead.id, "remarcou")}
          className="flex-1 text-[10px] py-1.5 rounded border border-purple-500/20 text-purple-400 hover:bg-purple-500/10 font-medium transition-colors"
        >
          Remarcar
        </button>
      </div>
    </div>
  )
}
