"use client"

import { Lead } from "@/lib/types"
import { formatTimeDisplay } from "@/lib/date-utils"
import { getFotoVendedor } from "@/lib/vendedor-fotos"

interface LeadCardProps {
  lead: Lead
  onUpdateStatus: (id: string, status: "veio" | "nao" | "pending" | "remarcou") => void
  onDelete: (id: string) => void
  onEdit: (lead: Lead) => void
  onSync?: (id: string) => void
  onRemoveRemarcado?: (id: string) => void
  onVendaFechada?: (id: string) => void
  onRetorno?: (id: string) => void
}

function getTipoClass(tipo: string) {
  const t = (tipo || "").toLowerCase()
  if (t.includes("cam")) return "bg-gradient-to-r from-amber-500/15 to-amber-500/8 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(217,119,6,0.15)]"
  if (t.includes("casa")) return "bg-gradient-to-r from-emerald-500/15 to-emerald-500/8 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
  return "bg-gradient-to-r from-sky-500/15 to-sky-500/8 text-sky-400 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]"
}

export function LeadCard({ lead, onUpdateStatus, onDelete, onEdit, onSync, onRemoveRemarcado, onVendaFechada, onRetorno }: LeadCardProps) {
  const statusDot = 
    lead.status === "veio" 
      ? "bg-emerald-400"
      : lead.status === "nao"
        ? "bg-red-400"
        : "bg-[#d4af37]/40"

  return (
    <div 
      className="group relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden cursor-pointer transition-all duration-400 hover:scale-[1.02] hover:-translate-y-1 hover:border-[rgba(212,175,55,0.4)] hover:shadow-[0_15px_50px_rgba(0,0,0,0.4),0_0_30px_rgba(212,175,55,0.15)]"
      onClick={() => onEdit(lead)}
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#d4af37]/0 via-[#d4af37]/0 to-[#d4af37]/0 group-hover:from-[#d4af37]/20 group-hover:via-transparent group-hover:to-[#d4af37]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10" />
      
      <div className="p-4 relative">
        {/* Botão para remover tag de venda fechada */}
        {lead.venda_fechada && onVendaFechada && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onVendaFechada(lead.id)
            }}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500/15 text-blue-400 hover:bg-blue-500/30 flex items-center justify-center text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
            title="Remover tag de Venda Fechada"
          >
            ×
          </button>
        )}
        {/* Botão para excluir */}
        {!lead.venda_fechada && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm("Tem certeza que deseja deletar este lead?")) {
                onDelete(lead.id)
              }
            }}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/30 flex items-center justify-center text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
            title="Excluir lead"
          >
            ×
          </button>
        )}
        
        {/* Header com foto e info */}
        <div className="flex items-start gap-3 mb-3">
          {/* Foto */}
          {(() => {
            const fotoUrl = lead.foto_responsavel || getFotoVendedor(lead.responsavel || "")
            return fotoUrl ? (
              <img 
                src={fotoUrl} 
                alt={lead.responsavel}
                className="w-12 h-12 rounded-full object-cover object-top border-2 border-[rgba(212,175,55,0.3)] flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)] border-2 border-[rgba(212,175,55,0.3)] flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                <span className="text-[16px] text-[#d4af37] font-bold">
                  {lead.responsavel?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
            )
          })()}
          
          <div className="flex-1 min-w-0">
            {/* Status + Time row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className={`w-2.5 h-2.5 rounded-full ${statusDot} shadow-lg`} />
              <span className="text-[11px] text-[#8a8070] font-medium">
                {formatTimeDisplay(lead.hora)}
              </span>
              {lead.remarcado && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveRemarcado?.(lead.id)
                  }}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-gradient-to-r from-[rgba(243,190,255,0.15)] to-[rgba(243,190,255,0.08)] text-[#f3beff] border border-[rgba(243,190,255,0.3)] hover:border-[rgba(243,190,255,0.5)] hover:bg-[rgba(243,190,255,0.25)] transition-all duration-300 hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(243,190,255,0.1)]"
                  title="Remover remarcado"
                >
                  REMARCADO
                </button>
              )}
              {lead.venda_fechada && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-gradient-to-r from-emerald-500/15 to-emerald-500/8 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                  VENDA FECHADA
                </span>
              )}
              {lead.retorno && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-gradient-to-r from-cyan-500/15 to-cyan-500/8 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.1)]">
                  RETORNO
                </span>
              )}
            </div>
            
            {/* Client name */}
            <h3 className="text-[14px] font-bold text-[#f5f0e8] leading-tight truncate transition-colors duration-300 group-hover:text-[#d4af37]" title={lead.nome}>
              {lead.nome}
            </h3>
            
            {/* Responsavel */}
            <p className="text-[12px] text-[#d4af37] font-semibold truncate transition-colors duration-300 group-hover:text-[#fbbf24]" title={lead.responsavel}>
              {lead.responsavel}
            </p>
            
            {/* Equipe */}
            {lead.equipe && lead.equipe !== "Sem equipe" && (
              <p className="text-[10px] text-[#8a8070] truncate mt-1 transition-colors duration-300 group-hover:text-[#a8947c]">{lead.equipe}</p>
            )}
          </div>
        </div>
        
        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {lead.tipo_reuniao && (
            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all duration-300 ${
              lead.tipo_reuniao.toLowerCase().includes("online") 
                ? "bg-gradient-to-r from-violet-500/15 to-violet-500/8 text-violet-400 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]"
                : "bg-gradient-to-r from-pink-500/15 to-pink-500/8 text-pink-400 border-pink-500/30 shadow-[0_0_10px_rgba(244,114,182,0.15)]"
            }`}>
              {lead.tipo_reuniao}
            </span>
          )}
          
          {lead.tipo && (
            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all duration-300 ${getTipoClass(lead.tipo)} shadow-[0_0_10px_rgba(0,0,0,0.2)]`}>
              {lead.tipo}
            </span>
          )}
          
          {lead.atendente && (
            <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500/15 to-sky-500/8 text-sky-400 border border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]">
              Atendente: {lead.atendente}
            </span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-4 pb-3 pt-0 border-t border-white/5 bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5">
          <button
            onClick={() => onUpdateStatus(lead.id, "veio")}
            className="flex-1 text-[10px] py-2.5 rounded-lg border border-emerald-500/30 text-emerald-400 bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 hover:from-emerald-500/20 hover:to-emerald-500/10 font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            ✓ Veio
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "nao")}
            className="flex-1 text-[10px] py-2.5 rounded-lg border border-red-500/30 text-red-400 bg-gradient-to-b from-red-500/10 to-red-500/5 hover:from-red-500/20 hover:to-red-500/10 font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          >
            ✗ Faltou
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "remarcou")}
            className="flex-1 text-[10px] py-2.5 rounded-lg border border-[rgba(243,190,255,0.3)] text-[#f3beff] bg-gradient-to-b from-[rgba(243,190,255,0.1)] to-[rgba(243,190,255,0.05)] hover:from-[rgba(243,190,255,0.15)] hover:to-[rgba(243,190,255,0.1)] font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(243,190,255,0.2)]"
          >
            Remarcar
          </button>
        </div>
        
        {/* Pending button */}
        <button
          onClick={() => onUpdateStatus(lead.id, "pending")}
          className="w-full text-[10px] py-2.5 rounded-lg border border-[rgba(212,175,55,0.3)] text-[#d4af37] bg-gradient-to-b from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)] hover:from-[rgba(212,175,55,0.15)] hover:to-[rgba(212,175,55,0.1)] font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        >
          ⏰ Pendente
        </button>
      </div>
    </div>
  )
}
