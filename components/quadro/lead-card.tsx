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
  if (t.includes("cam")) return "bg-[rgba(251,191,36,0.08)] text-[#fbbf24] border-[rgba(251,191,36,0.2)]"
  if (t.includes("casa")) return "bg-[rgba(74,222,128,0.08)] text-[#4ade80] border-[rgba(74,222,128,0.2)]"
  return "bg-[rgba(96,165,250,0.08)] text-[#60a5fa] border-[rgba(96,165,250,0.2)]"
}

export function LeadCard({ lead, onUpdateStatus, onDelete, onEdit, onSync, onRemoveRemarcado }: LeadCardProps) {
  const stripeClass = 
    lead.status === "veio" 
      ? "bg-gradient-to-r from-[#4ade80] to-[rgba(74,222,128,0.2)]"
      : lead.status === "nao"
        ? "bg-gradient-to-r from-[#f87171] to-[rgba(248,113,113,0.2)]"
        : "bg-[#2a2820]"
  
  const statusIcon = lead.status === "veio" ? "✓" : lead.status === "nao" ? "✗" : ""

  return (
    <div 
      className="bg-[rgba(18,18,18,0.8)] backdrop-blur-sm border border-[rgba(212,175,55,0.12)] rounded-xl overflow-hidden hover:border-[rgba(212,175,55,0.3)] hover:shadow-lg hover:shadow-[rgba(212,175,55,0.05)] transition-all cursor-pointer group"
      onClick={() => onEdit(lead)}
    >
      {/* Status bar no topo */}
      <div className={`h-1 ${stripeClass}`} />
      
      {/* Header com foto e info */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Foto do responsável */}
          {lead.foto_responsavel ? (
            <img 
              src={lead.foto_responsavel} 
              alt={lead.responsavel}
              className="w-16 h-16 rounded-xl object-cover border-2 border-[rgba(212,175,55,0.2)] flex-shrink-0 group-hover:border-[rgba(212,175,55,0.4)] transition-all"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border-2 border-[rgba(212,175,55,0.2)] flex items-center justify-center flex-shrink-0">
              <span className="text-[24px] text-[#d4af37] font-bold">
                {lead.responsavel?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}
          
          {/* Info principal */}
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* Badge Remarcado */}
              {lead.remarcado && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveRemarcado?.(lead.id)
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-[rgba(243,190,255,0.1)] text-[#f3beff] border border-[rgba(243,190,255,0.2)] hover:bg-[rgba(243,190,255,0.2)] transition-all"
                  title="Clique para remover"
                >
                  REMARCADO
                  <span className="text-[8px] opacity-60">×</span>
                </button>
              )}
              
              {/* Hora */}
              <span className="text-[12px] text-[#d4af37] font-semibold bg-[rgba(212,175,55,0.08)] px-2 py-1 rounded-md">
                {formatTimeDisplay(lead.hora)}
              </span>
              
              {/* Status icon */}
              {statusIcon && (
                <span className={`text-[14px] font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                  lead.status === "veio" 
                    ? "bg-[rgba(74,222,128,0.15)] text-[#4ade80]" 
                    : "bg-[rgba(248,113,113,0.15)] text-[#f87171]"
                }`}>
                  {statusIcon}
                </span>
              )}
            </div>
            
            {/* Nome do cliente */}
            <h3 className="text-[18px] font-bold text-[#f5f0e8] leading-tight mb-1" title={lead.nome}>
              {lead.nome}
            </h3>
            
            {/* Responsável */}
            <p className="text-[14px] text-[#d4af37] font-medium" title={lead.responsavel}>
              {lead.responsavel}
            </p>
            
            {/* Equipe */}
            {lead.equipe && lead.equipe !== "Sem equipe" && (
              <p className="text-[12px] text-[#6a6a6a] mt-0.5" title={lead.equipe}>
                {lead.equipe}
              </p>
            )}
          </div>
        </div>
        
        {/* Tags */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Tipo de reunião */}
          {lead.tipo_reuniao && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border ${
              lead.tipo_reuniao.toLowerCase().includes("online") 
                ? "bg-[rgba(139,92,246,0.08)] text-[#a78bfa] border-[rgba(139,92,246,0.2)]"
                : "bg-[rgba(236,72,153,0.08)] text-[#f472b6] border-[rgba(236,72,153,0.2)]"
            }`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {lead.tipo_reuniao}
            </span>
          )}
          
          {/* Tipo do bem */}
          {lead.tipo && (
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border ${getTipoClass(lead.tipo)}`}>
              {lead.tipo}
            </span>
          )}
          
          {/* Atendente */}
          {lead.atendente && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[rgba(96,165,250,0.08)] text-[#60a5fa] border border-[rgba(96,165,250,0.2)]">
              {lead.atendente}
            </span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-4 pb-4 pt-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateStatus(lead.id, "veio")}
            className="flex-1 text-[13px] py-2.5 px-2 rounded-lg border border-[rgba(74,222,128,0.2)] text-[#4ade80] bg-[rgba(74,222,128,0.05)] hover:bg-[rgba(74,222,128,0.15)] font-semibold transition-all"
          >
            Veio
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "nao")}
            className="flex-1 text-[13px] py-2.5 px-2 rounded-lg border border-[rgba(248,113,113,0.2)] text-[#f87171] bg-[rgba(248,113,113,0.05)] hover:bg-[rgba(248,113,113,0.15)] font-semibold transition-all"
          >
            Faltou
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "remarcou")}
            className="flex-1 text-[13px] py-2.5 px-2 rounded-lg border border-[rgba(243,190,255,0.2)] text-[#f3beff] bg-[rgba(243,190,255,0.05)] hover:bg-[rgba(243,190,255,0.15)] font-semibold transition-all"
          >
            Remarcou
          </button>
        </div>
        
        <div className="flex gap-2 mt-2">
          {onSync && (
            <button
              onClick={() => onSync(lead.id)}
              className="flex-1 text-[11px] py-2 rounded-lg border border-[rgba(96,165,250,0.15)] text-[#60a5fa] bg-transparent hover:bg-[rgba(96,165,250,0.1)] font-medium transition-all"
              title="Sincronizar com Kommo"
            >
              ↻ Sincronizar
            </button>
          )}
          <button
            onClick={() => onDelete(lead.id)}
            className="flex-1 text-[11px] py-2 rounded-lg border border-[rgba(248,113,113,0.15)] text-[#8a8070] bg-transparent hover:bg-[rgba(248,113,113,0.1)] hover:text-[#f87171] font-medium transition-all"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  )
}
