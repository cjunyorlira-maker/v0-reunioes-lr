"use client"

import { Lead } from "@/lib/types"
import { formatTimeDisplay } from "@/lib/date-utils"

interface LeadCardProps {
  lead: Lead
  onUpdateStatus: (id: string, status: "veio" | "nao" | "pending") => void
  onDelete: (id: string) => void
}

function getTipoClass(tipo: string) {
  const t = (tipo || "").toLowerCase()
  if (t.includes("cam")) return "bg-[rgba(251,191,36,0.08)] text-[#fbbf24] border-[rgba(251,191,36,0.2)]"
  if (t.includes("casa")) return "bg-[rgba(74,222,128,0.08)] text-[#4ade80] border-[rgba(74,222,128,0.2)]"
  return "bg-[rgba(96,165,250,0.08)] text-[#60a5fa] border-[rgba(96,165,250,0.2)]"
}

export function LeadCard({ lead, onUpdateStatus, onDelete }: LeadCardProps) {
  const stripeClass = 
    lead.status === "veio" 
      ? "bg-gradient-to-r from-[#4ade80] to-[rgba(74,222,128,0.2)]"
      : lead.status === "nao"
        ? "bg-gradient-to-r from-[#f87171] to-[rgba(248,113,113,0.2)]"
        : "bg-[#2a2820]"
  
  const statusIcon = lead.status === "veio" ? "✓" : lead.status === "nao" ? "✗" : ""

  return (
    <div className="bg-[#191919] border border-[rgba(212,175,55,0.1)] rounded-[10px] p-2.5 hover:border-[rgba(212,175,55,0.25)] hover:-translate-y-0.5 transition-all">
      {/* Stripe */}
      <div className={`h-0.5 rounded-sm mb-2 ${stripeClass}`} />
      
      {/* Nome */}
      <p className="text-[12px] font-medium text-[#f5f0e8] truncate mb-1" title={lead.nome}>
        {lead.nome}
      </p>
      
      {/* Hora + Kommo dot + Status icon */}
      <div className="flex items-center gap-1 text-[10px] text-[#8a8070] mb-0.5">
        <span>{formatTimeDisplay(lead.hora)}</span>
        {lead.kommo_id && (
          <span className="w-[5px] h-[5px] rounded-full bg-[#d4af37]" />
        )}
        {statusIcon && (
          <span className="ml-auto text-[10px] opacity-60">{statusIcon}</span>
        )}
      </div>
      
      {/* Responsável */}
      <p className="text-[10px] text-[#8a8070] truncate mb-1.5">
        {lead.responsavel}
      </p>
      
      {/* Tipo pill */}
      <span className={`inline-block text-[9px] font-medium px-2 py-0.5 rounded-full border tracking-wide ${getTipoClass(lead.tipo)}`}>
        {lead.tipo}
      </span>
      
      {/* Actions */}
      <div className="flex gap-1 mt-2 pt-1.5 border-t border-[rgba(212,175,55,0.1)]">
        <button
          onClick={() => onUpdateStatus(lead.id, "veio")}
          className="flex-1 text-[9px] py-1 px-0.5 rounded-md border border-[rgba(74,222,128,0.2)] text-[#4ade80] bg-transparent hover:bg-[rgba(74,222,128,0.08)] font-medium transition-all"
        >
          Veio
        </button>
        <button
          onClick={() => onUpdateStatus(lead.id, "nao")}
          className="flex-1 text-[9px] py-1 px-0.5 rounded-md border border-[rgba(248,113,113,0.2)] text-[#f87171] bg-transparent hover:bg-[rgba(248,113,113,0.08)] font-medium transition-all"
        >
          Não veio
        </button>
        <button
          onClick={() => onDelete(lead.id)}
          className="w-[22px] text-[12px] py-1 rounded-md border border-[rgba(212,175,55,0.1)] text-[#8a8070] bg-transparent hover:bg-[rgba(248,113,113,0.08)] hover:text-[#f87171] hover:border-[rgba(248,113,113,0.2)] transition-all"
        >
          ×
        </button>
      </div>
    </div>
  )
}
