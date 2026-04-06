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
  if (t.includes("cam")) return "bg-amber-100 text-amber-700 border-amber-200"
  if (t.includes("casa")) return "bg-emerald-100 text-emerald-700 border-emerald-200"
  return "bg-sky-100 text-sky-700 border-sky-200"
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
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#d4af37]/50 hover:shadow-lg transition-all cursor-pointer group"
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
              className="w-11 h-11 rounded-full object-cover border-2 border-[#d4af37]/30 flex-shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#d4af37]/10 border-2 border-[#d4af37]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[16px] text-[#d4af37] font-semibold">
                {lead.responsavel?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {/* Status + Time row */}
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${statusDot}`} />
              <span className="text-[11px] text-gray-500 font-medium">
                {formatTimeDisplay(lead.hora)}
              </span>
              {lead.remarcado && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveRemarcado?.(lead.id)
                  }}
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 border border-purple-200 hover:bg-purple-200"
                >
                  REMARCADO
                </button>
              )}
            </div>
            
            {/* Client name */}
            <h3 className="text-[14px] font-semibold text-gray-900 leading-tight truncate" title={lead.nome}>
              {lead.nome}
            </h3>
            
            {/* Responsavel */}
            <p className="text-[12px] text-[#b8960c] font-medium truncate" title={lead.responsavel}>
              {lead.responsavel}
            </p>
            
            {/* Equipe */}
            {lead.equipe && lead.equipe !== "Sem equipe" && (
              <p className="text-[10px] text-gray-500 truncate mt-0.5">{lead.equipe}</p>
            )}
          </div>
        </div>
        
        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.tipo_reuniao && (
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${
              lead.tipo_reuniao.toLowerCase().includes("online") 
                ? "bg-violet-100 text-violet-600 border-violet-200"
                : "bg-pink-100 text-pink-600 border-pink-200"
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
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-sky-100 text-sky-600 border border-sky-200">
              Atendente: {lead.atendente}
            </span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-3.5 pb-3 pt-1 bg-gray-50" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5 mb-1.5">
          <button
            onClick={() => onUpdateStatus(lead.id, "veio")}
            className="flex-1 text-[11px] py-2 rounded-lg border border-emerald-300 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 font-semibold transition-colors"
          >
            Veio
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "nao")}
            className="flex-1 text-[11px] py-2 rounded-lg border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 font-semibold transition-colors"
          >
            Faltou
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "remarcou")}
            className="flex-1 text-[11px] py-2 rounded-lg border border-purple-300 text-purple-600 bg-purple-50 hover:bg-purple-100 font-semibold transition-colors"
          >
            Remarcar
          </button>
        </div>
        {onSync && (
          <button
            onClick={() => onSync(lead.id)}
            className="w-full text-[10px] py-1.5 rounded-lg border border-[#d4af37]/30 text-[#b8960c] hover:bg-[#d4af37]/10 font-medium transition-colors"
          >
            Sincronizar com Kommo
          </button>
        )}
      </div>
    </div>
  )
}
