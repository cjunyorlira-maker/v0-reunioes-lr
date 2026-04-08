import { useMemo } from "react"
import { PlugaEvento } from "@/hooks/use-pluga-eventos"

interface EquipePerformanceProps {
  eventos: PlugaEvento[]
}

interface EquipeStats {
  nome: string
  qualificados: number
  agendei: number
  marcados: number
  vendas: number
  taxa_conversao: number
}

export default function EquipePerformance({ eventos }: EquipePerformanceProps) {
  const equipes = useMemo(() => {
    const stats: Record<string, EquipeStats> = {}

    eventos.forEach(e => {
      if (!e.equipe) return
      if (!stats[e.equipe]) {
        stats[e.equipe] = {
          nome: e.equipe,
          qualificados: 0,
          agendei: 0,
          marcados: 0,
          vendas: 0,
          taxa_conversao: 0,
        }
      }

      if (e.tipo === "qualificado") stats[e.equipe].qualificados++
      if (e.tipo === "agendei") stats[e.equipe].agendei++
      if (e.tipo === "marcado") stats[e.equipe].marcados++
      if (e.tipo === "venda_fechada") stats[e.equipe].vendas++
    })

    // Calcula taxa de conversão
    Object.values(stats).forEach(e => {
      e.taxa_conversao = e.qualificados > 0 ? Math.round((e.agendei / e.qualificados) * 100) : 0
    })

    return Object.values(stats).sort((a, b) => b.agendei - a.agendei)
  }, [eventos])

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-[#f5f0e8] mb-4">Performance por Equipe</h3>
      <div className="bg-[#0f1429] rounded-lg border border-[rgba(212,175,55,0.1)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(212,175,55,0.1)]">
              <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Equipe</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Qualificados</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Agendei</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Marcados</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Vendas</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Taxa %</th>
            </tr>
          </thead>
          <tbody>
            {equipes.map((e, idx) => (
              <tr key={idx} className="border-b border-[rgba(212,175,55,0.05)] hover:bg-[rgba(212,175,55,0.05)] transition-colors">
                <td className="px-6 py-4 text-[14px] font-medium text-[#f5f0e8]">{e.nome}</td>
                <td className="px-6 py-4 text-right text-[14px] font-semibold text-[#d4af37]">{e.qualificados}</td>
                <td className="px-6 py-4 text-right text-[14px] font-semibold text-[#4ade80]">{e.agendei}</td>
                <td className="px-6 py-4 text-right text-[14px] font-semibold text-[#60a5fa]">{e.marcados}</td>
                <td className="px-6 py-4 text-right text-[14px] font-semibold text-[#f97316]">{e.vendas}</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold bg-[rgba(74,222,128,0.1)] text-[#4ade80]">
                    {e.taxa_conversao}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
