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
      className="bg-[rgba(20,20,20,0.4)] backdrop-blur-[2px] border border-[rgba(212,175,55,0.2)] rounded-[10px] overflow-hidden hover:border-[rgba(212,175,55,0.4)] hover:-translate-y-0.5 transition-all cursor-pointer"
      onClick={() => onEdit(lead)}
    >
      {/* Header com foto maior e tipo de reunião */}
      <div className="flex items-start gap-3 p-3 pb-2">
        {/* Foto do responsável - maior e na lateral */}
        {lead.foto_responsavel ? (
          <img 
            src={lead.foto_responsavel} 
            alt={lead.responsavel}
            className="w-14 h-14 rounded-full object-cover border-2 border-[rgba(212,175,55,0.3)] flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#2a2820] border-2 border-[rgba(212,175,55,0.3)] flex items-center justify-center flex-shrink-0">
            <span className="text-[20px] text-[#d4af37] font-semibold">
              {lead.responsavel?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
        )}
        
        {/* Info principal */}
        <div className="flex-1 min-w-0">
          {/* Badge Remarcado - clicável para remover */}
          {lead.remarcado && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemoveRemarcado?.(lead.id)
              }}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(243,190,255,0.15)] text-[#f3beff] border border-[rgba(243,190,255,0.3)] mb-1 hover:bg-[rgba(243,190,255,0.25)] transition-all cursor-pointer"
              title="Clique para remover tag"
            >
              REMARCADO
              <span className="text-[8px] opacity-60">×</span>
            </button>
          )}
          
          {/* Nome do cliente */}
          <p className="text-[16px] font-semibold text-[#f5f0e8] truncate leading-tight" title={lead.nome}>
            {lead.nome}
          </p>
          
          {/* Responsável e Equipe */}
          <p className="text-[14px] text-[#d4af37] truncate" title={lead.responsavel}>
            {lead.responsavel}
          </p>
          {lead.equipe && lead.equipe !== "Sem equipe" && (
            <p className="text-[12px] text-[#8a8070] truncate" title={lead.equipe}>
              {lead.equipe}
            </p>
          )}
          {/* Atendente */}
          {lead.atendente && (
            <p className="text-[12px] text-[#60a5fa] truncate mt-0.5" title={`Atendente: ${lead.atendente}`}>
              Atend: {lead.atendente}
            </p>
          )}
        </div>
        
        {/* Status indicator */}
        {statusIcon && (
          <span className={`text-[16px] font-bold ${lead.status === "veio" ? "text-[#4ade80]" : "text-[#f87171]"}`}>
            {statusIcon}
          </span>
        )}
      </div>
      
      {/* Stripe de status */}
      <div className={`h-0.5 ${stripeClass}`} />
      
      {/* Conteúdo inferior */}
      <div className="p-3 pt-2">
        {/* Hora + Tags */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[13px] text-[#8a8070] font-medium">
            {formatTimeDisplay(lead.hora)}
          </span>
          
          {/* Tipo de reunião (Online/Presencial) */}
          {lead.tipo_reuniao && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border ${
              lead.tipo_reuniao.toLowerCase().includes("online") 
                ? "bg-[rgba(139,92,246,0.08)] text-[#8b5cf6] border-[rgba(139,92,246,0.2)]"
                : "bg-[rgba(236,72,153,0.08)] text-[#ec4899] border-[rgba(236,72,153,0.2)]"
            }`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {lead.tipo_reuniao}
            </span>
          )}
          
          {/* Tipo do bem */}
          {lead.tipo && (
            <span className={`text-[11px] font-medium px-2 py-1 rounded-full border ${getTipoClass(lead.tipo)}`}>
              {lead.tipo}
            </span>
          )}
        </div>
      
      {/* Actions */}
        <div className="flex gap-1.5 pt-2 border-t border-[rgba(212,175,55,0.1)]" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onUpdateStatus(lead.id, "veio")}
            className="flex-1 text-[12px] py-1.5 px-1 rounded-lg border border-[rgba(74,222,128,0.2)] text-[#4ade80] bg-transparent hover:bg-[rgba(74,222,128,0.1)] font-semibold transition-all"
          >
            Veio
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "nao")}
            className="flex-1 text-[12px] py-1.5 px-1 rounded-lg border border-[rgba(248,113,113,0.2)] text-[#f87171] bg-transparent hover:bg-[rgba(248,113,113,0.1)] font-semibold transition-all"
          >
            Faltou
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "remarcou")}
            className="flex-1 text-[12px] py-1.5 px-1 rounded-lg border border-[rgba(243,190,255,0.2)] text-[#f3beff] bg-transparent hover:bg-[rgba(243,190,255,0.1)] font-semibold transition-all"
          >
            Remarcou
          </button>
          {onSync && (
            <button
              onClick={() => onSync(lead.id)}
              className="w-[28px] text-[12px] py-1.5 rounded-lg border border-[rgba(96,165,250,0.2)] text-[#60a5fa] bg-transparent hover:bg-[rgba(96,165,250,0.1)] font-semibold transition-all"
              title="Sincronizar com Kommo"
            >
              ↻
            </button>
          )}
          <button
            onClick={() => onDelete(lead.id)}
            className="w-[28px] text-[14px] py-1.5 rounded-lg border border-[rgba(212,175,55,0.1)] text-[#8a8070] bg-transparent hover:bg-[rgba(248,113,113,0.1)] hover:text-[#f87171] hover:border-[rgba(248,113,113,0.2)] transition-all"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
