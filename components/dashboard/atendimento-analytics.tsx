import { useMemo } from "react"
import { PlugaEvento } from "@/hooks/use-pluga-eventos"

interface AtendimentoAnalyticsProps {
  eventos: PlugaEvento[]
}

interface AtendimenteStats {
  nome: string
  atendimentos: number
  vendas: number
  taxa_fechamento: number
}

export default function AtendimentoAnalytics({ eventos }: AtendimentoAnalyticsProps) {
  const atendentes = useMemo(() => {
    // Nota: No seu sistema atual, "atendente" vem do leads via campo "atendente"
    // Aqui vamos usar o vendedor como atendente para demonstração
    // Ajuste conforme sua lógica de negócio
    
    const stats: Record<string, AtendimenteStats> = {}

    eventos.forEach(e => {
      if (!e.vendedor) return
      if (!stats[e.vendedor]) {
        stats[e.vendedor] = {
          nome: e.vendedor,
          atendimentos: 0,
          vendas: 0,
          taxa_fechamento: 0,
        }
      }

      if (e.tipo === "veio" || e.tipo === "marcado") stats[e.vendedor].atendimentos++
      if (e.tipo === "venda_fechada") stats[e.vendedor].vendas++
    })

    // Calcula taxa de fechamento
    Object.values(stats).forEach(a => {
      a.taxa_fechamento = a.atendimentos > 0 ? Math.round((a.vendas / a.atendimentos) * 100) : 0
    })

    return Object.values(stats).sort((a, b) => b.vendas - a.vendas)
  }, [eventos])

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-[#f5f0e8] mb-4">Performance de Fechamentos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {atendentes.map((a, idx) => (
          <div key={idx} className="bg-[#0f1429] rounded-lg border border-[rgba(212,175,55,0.1)] p-4">
            <div className="mb-4">
              <h4 className="text-[14px] font-semibold text-[#d4af37]">{a.nome}</h4>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[12px] text-[#8a8070]">Atendimentos</span>
                  <span className="text-[14px] font-bold text-[#60a5fa]">{a.atendimentos}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[12px] text-[#8a8070]">Vendas</span>
                  <span className="text-[14px] font-bold text-[#f97316]">{a.vendas}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-[rgba(212,175,55,0.1)]">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-[#8a8070]">Taxa de Fechamento</span>
                  <span className="inline-block px-2 py-1 rounded text-[12px] font-bold bg-[rgba(249,115,22,0.1)] text-[#f97316]">
                    {a.taxa_fechamento}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
