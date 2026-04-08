import { useMemo } from "react"
import { PlugaEvento } from "@/hooks/use-pluga-eventos"

interface ConversaoAnalyticsProps {
  eventos: PlugaEvento[]
}

export default function ConversaoAnalytics({ eventos }: ConversaoAnalyticsProps) {
  const conversao = useMemo(() => {
    const vieram = eventos.filter(e => e.tipo === "veio").length
    const naoVieram = eventos.filter(e => e.tipo === "nao_veio").length
    const total = vieram + naoVieram
    const taxaVeio = total > 0 ? Math.round((vieram / total) * 100) : 0

    return { vieram, naoVieram, total, taxaVeio }
  }, [eventos])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Conversão Geral */}
      <div className="bg-[#0f1429] rounded-lg border border-[rgba(212,175,55,0.1)] p-6">
        <h3 className="text-lg font-semibold text-[#f5f0e8] mb-6">Comparecimento</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[14px] font-medium text-[#f5f0e8]">Vieram</span>
              <span className="text-[16px] font-bold text-[#4ade80]">{conversao.vieram}</span>
            </div>
            <div className="w-full bg-[rgba(212,175,55,0.08)] rounded-full h-2">
              <div 
                className="bg-[#4ade80] h-2 rounded-full transition-all"
                style={{ width: `${conversao.taxaVeio}%` }}
              />
            </div>
            <p className="text-[12px] text-[#8a8070] mt-1">{conversao.taxaVeio}% de presença</p>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[14px] font-medium text-[#f5f0e8]">Não Vieram</span>
              <span className="text-[16px] font-bold text-[#ef4444]">{conversao.naoVieram}</span>
            </div>
            <div className="w-full bg-[rgba(212,175,55,0.08)] rounded-full h-2">
              <div 
                className="bg-[#ef4444] h-2 rounded-full transition-all"
                style={{ width: `${100 - conversao.taxaVeio}%` }}
              />
            </div>
            <p className="text-[12px] text-[#8a8070] mt-1">{100 - conversao.taxaVeio}% de ausências</p>
          </div>
        </div>
      </div>

      {/* Conversão por Origem */}
      <div className="bg-[#0f1429] rounded-lg border border-[rgba(212,175,55,0.1)] p-6">
        <h3 className="text-lg font-semibold text-[#f5f0e8] mb-6">Origem dos Leads</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-[rgba(212,175,55,0.05)] rounded-lg">
            <span className="text-[14px] font-medium text-[#f5f0e8]">Total de Eventos</span>
            <span className="text-[16px] font-bold text-[#d4af37]">{eventos.length}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[rgba(212,175,55,0.05)] rounded-lg">
            <span className="text-[14px] font-medium text-[#f5f0e8]">Período Completo</span>
            <span className="text-[16px] font-bold text-[#60a5fa]">{eventos.length > 0 ? "Ativo" : "Sem dados"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
