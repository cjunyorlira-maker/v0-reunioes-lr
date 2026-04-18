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
  if (t.includes("casa") || t.includes("imóvel") || t.includes("imovel")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  return "bg-sky-500/10 text-sky-400 border-sky-500/20"
}

export function LeadCard({ lead, onUpdateStatus, onDelete, onEdit, onSync, onRemoveRemarcado, onVendaFechada, onRetorno }: LeadCardProps) {
  const statusDot = 
    lead.status === "veio" 
      ? "bg-emerald-400"
      : lead.status === "nao"
        ? "bg-red-400"
        : "bg-[#d4af37]/40"

  const fotoUrl = lead.foto_responsavel || getFotoVendedor(lead.responsavel || "")

  return (
    <div 
      className="group bg-[#1a1a1f] border border-white/10 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-[rgba(212,175,55,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
      onClick={() => onEdit(lead)}
    >
      <div className="p-4 relative">
        {/* Botao X para excluir - aparece no hover */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm("Tem certeza que deseja deletar este lead?")) {
              onDelete(lead.id)
            }
          }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-all duration-300"
          title="Excluir lead"
        >
          x
        </button>
        
        {/* Header com foto e info */}
        <div className="flex items-start gap-4 mb-4">
          {/* Foto grande */}
          {fotoUrl ? (
            <img 
              src={fotoUrl} 
              alt={lead.responsavel}
              className="w-16 h-16 rounded-full object-cover object-top border-2 border-[rgba(212,175,55,0.4)] flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[rgba(212,175,55,0.1)] border-2 border-[rgba(212,175,55,0.4)] flex items-center justify-center flex-shrink-0">
              <span className="text-2xl text-[#d4af37] font-semibold">
                {lead.responsavel?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0 pt-1">
            {/* Status dot + Hora */}
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
              <span className="text-sm text-[#8a8070] font-medium">
                {formatTimeDisplay(lead.hora)}
              </span>
            </div>
            
            {/* Nome do cliente - caixa alta */}
            <h3 className="text-lg font-bold text-[#f5f0e8] leading-tight truncate uppercase" title={lead.nome}>
              {lead.nome}
            </h3>
            
            {/* Responsavel - amarelo dourado */}
            <p className="text-sm text-[#d4af37] font-semibold truncate" title={lead.responsavel}>
              {lead.responsavel}
            </p>
            
            {/* Equipe */}
            {lead.equipe && lead.equipe !== "Sem equipe" && (
              <p className="text-xs text-[#8a8070] truncate mt-0.5">{lead.equipe}</p>
            )}
          </div>
        </div>
        
        {/* Tags row */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {lead.tipo_reuniao && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-lg border ${
              lead.tipo_reuniao.toLowerCase().includes("online") 
                ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                : "bg-pink-500/15 text-pink-400 border-pink-500/30"
            }`}>
              {lead.tipo_reuniao}
            </span>
          )}
          
          {lead.tipo && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-lg border ${getTipoClass(lead.tipo)}`}>
              {lead.tipo.toUpperCase()}
            </span>
          )}
          
          {lead.atendente && (
            <span className="text-xs font-medium px-3 py-1 rounded-lg bg-white/5 text-[#a8a090] border border-white/10">
              Atendente: {lead.atendente}
            </span>
          )}

          {/* Tags de status */}
          {lead.remarcado && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemoveRemarcado?.(lead.id)
              }}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-[rgba(243,190,255,0.1)] text-[#f3beff] border border-[rgba(243,190,255,0.2)] hover:bg-[rgba(243,190,255,0.2)]"
            >
              REMARCADO
            </button>
          )}
          {lead.venda_fechada && (
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              VENDA FECHADA
            </span>
          )}
          {lead.retorno && (
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
              RETORNO
            </span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        {/* Primeira linha: Veio, Faltou, Remarcar, Kommo */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => onUpdateStatus(lead.id, "veio")}
            className="flex-1 text-sm py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold transition-all duration-300"
          >
            Veio
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "nao")}
            className="flex-1 text-sm py-2.5 rounded-xl border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 font-semibold transition-all duration-300"
          >
            Faltou
          </button>
          <button
            onClick={() => onUpdateStatus(lead.id, "remarcou")}
            className="flex-1 text-sm py-2.5 rounded-xl border border-[rgba(243,190,255,0.3)] text-[#f3beff] bg-[rgba(243,190,255,0.1)] hover:bg-[rgba(243,190,255,0.2)] font-semibold transition-all duration-300"
          >
            Remarcar
          </button>
          {/* Botao Kommo */}
          {lead.kommo_lead_id && (
            <a
              href={`https://lrmultimarcas.kommo.com/leads/detail/${lead.kommo_lead_id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-12 h-10 rounded-xl border border-violet-500/40 bg-violet-500/20 hover:bg-violet-500/30 flex items-center justify-center transition-all duration-300"
              title="Abrir no Kommo"
            >
              <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
              </svg>
            </a>
          )}
        </div>
        
        {/* Segunda linha: Venda Fechada, Marcar Retorno (quando veio) */}
        {lead.status === "veio" && (
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => onVendaFechada?.(lead.id)}
              className="flex-1 text-sm py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold transition-all duration-300"
            >
              Venda Fechada
            </button>
            <button
              onClick={() => onRetorno?.(lead.id)}
              className="flex-1 text-sm py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold transition-all duration-300"
            >
              Marcar Retorno
            </button>
          </div>
        )}

        {/* Botao Sync - canto inferior direito */}
        {onSync && (
          <div className="flex justify-end">
            <button
              onClick={() => onSync(lead.id)}
              className="w-10 h-10 rounded-full border border-[rgba(212,175,55,0.3)] text-[#d4af37] bg-transparent hover:bg-[rgba(212,175,55,0.1)] flex items-center justify-center transition-all duration-300"
              title="Sincronizar com Kommo"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
