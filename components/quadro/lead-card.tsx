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
  if (t.includes("cam")) return "bg-amber-500/10 text-amber-400 border-amber-500/20"
  if (t.includes("casa")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  return "bg-sky-500/10 text-sky-400 border-sky-500/20"
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
      className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-[rgba(212,175,55,0.3)] hover:from-white/[0.1] hover:to-white/[0.05] transition-all cursor-pointer group"
      onClick={() => onEdit(lead)}
    >
      <div className="p-3.5 relative">
        {/* Botão X para remover a tag de venda fechada quando estiver marcado */}
        {lead.venda_fechada && onVendaFechada && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onVendaFechada(lead.id)
            }}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center text-[12px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remover tag de Venda Fechada"
          >
            x
          </button>
        )}
        {/* Botão X para excluir (só aparece se não estiver marcado como venda fechada) */}
        {!lead.venda_fechada && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm("Tem certeza que deseja deletar este lead?")) {
                onDelete(lead.id)
              }
            }}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center text-[12px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            title="Excluir lead (com confirmação)"
          >
            x
          </button>
        )}
        
        {/* Header with photo and info */}
        <div className="flex items-start gap-3 mb-2">
          {/* Photo - Larger */}
          {(() => {
            const fotoUrl = lead.foto_responsavel || getFotoVendedor(lead.responsavel || "")
            return fotoUrl ? (
              <img 
                src={fotoUrl} 
                alt={lead.responsavel}
                className="w-11 h-11 rounded-full object-cover object-top border-2 border-[rgba(212,175,55,0.2)] flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[rgba(212,175,55,0.08)] border-2 border-[rgba(212,175,55,0.2)] flex items-center justify-center flex-shrink-0">
                <span className="text-[16px] text-[#d4af37] font-semibold">
                  {lead.responsavel?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
            )
          })()}
          
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
              {lead.venda_fechada && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  VENDA FECHADA
                </span>
              )}
              {lead.retorno && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                  RETORNO
                </span>
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
              Atendente: {lead.atendente}
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
        {/* Botões de Venda Fechada e Retorno - sempre disponíveis se status for "veio" */}
        {lead.status === "veio" && (
          <div className="flex gap-1.5 mb-1.5">
            {lead.venda_fechada && onVendaFechada && (
              <button
                onClick={() => onVendaFechada(lead.id)}
                className="flex-1 text-[10px] py-1.5 rounded-lg border border-emerald-500/20 text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 font-semibold transition-colors"
              >
                ✓ Venda Fechada
              </button>
            )}
            {!lead.venda_fechada && onVendaFechada && (
              <button
                onClick={() => onVendaFechada(lead.id)}
                className="flex-1 text-[10px] py-1.5 rounded-lg border border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 font-semibold transition-colors"
              >
                Venda Fechada
              </button>
            )}
            {lead.retorno && onRetorno && (
              <button
                onClick={() => onRetorno(lead.id)}
                className="flex-1 text-[10px] py-1.5 rounded-lg border border-cyan-500/20 text-cyan-400 bg-cyan-500/15 hover:bg-cyan-500/25 font-semibold transition-colors"
              >
                ✓ Retorno
              </button>
            )}
            {!lead.retorno && onRetorno && (
              <button
                onClick={() => onRetorno(lead.id)}
                className="flex-1 text-[10px] py-1.5 rounded-lg border border-cyan-500/20 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/15 font-semibold transition-colors"
              >
                Marcar Retorno
              </button>
            )}
          </div>
        )}
        {onSync && (
          <button
            onClick={() => onSync(lead.id)}
            className="w-7 h-7 rounded-lg border border-[rgba(212,175,55,0.15)] text-[#d4af37]/70 hover:text-[#d4af37] hover:bg-[rgba(212,175,55,0.08)] flex items-center justify-center transition-colors ml-auto"
            title="Sincronizar com Kommo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
