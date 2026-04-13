"use client"

import { useMemo } from "react"
import { Lead } from "@/lib/types"
import { LeadQualificado } from "@/hooks/use-qualificados"

interface EquipePerformanceProps {
  qualificados: LeadQualificado[]
  leads: Lead[]
}

interface EquipeStats {
  nome: string
  qualificados: number
  agendei: number
  taxa_conversao: number
}

export default function EquipePerformance({ qualificados = [], leads = [] }: EquipePerformanceProps) {
  if (!qualificados?.length && !leads?.length) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-[#f5f0e8] mb-4">Funil de Conversão por Equipe</h3>
        <p className="text-[13px] text-[#8a8070]">Nenhum dado disponível</p>
      </div>
    )
  }

  const equipes = useMemo(() => {
    const stats: Record<string, EquipeStats> = {}

    // Conta qualificados por equipe
    (Array.isArray(qualificados) ? qualificados : []).forEach(q => {
      if (!q?.equipe) return
      if (!stats[q.equipe]) {
        stats[q.equipe] = {
          nome: q.equipe,
          qualificados: 0,
          agendei: 0,
          taxa_conversao: 0,
        }
      }
      stats[q.equipe].qualificados++
    })

    // Conta agendados por equipe
    (Array.isArray(leads) ? leads : []).forEach(l => {
      // Só conta leads que têm data_agendei (entraram em "Confirmar Reunião")
      if (!l?.data_agendei) return
      const equipe = l.equipe || "Sem equipe"
      if (!stats[equipe]) {
        stats[equipe] = {
          nome: equipe,
          qualificados: 0,
          agendei: 0,
          taxa_conversao: 0,
        }
      }
      stats[equipe].agendei++
    })

    // Calcula taxa de conversão
    Object.values(stats).forEach(e => {
      e.taxa_conversao = e.qualificados > 0 ? Math.round((e.agendei / e.qualificados) * 100) : 0
    })

    return Object.values(stats).sort((a, b) => b.agendei - a.agendei)
  }, [qualificados, leads])

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-[#f5f0e8] mb-4">Funil de Conversão por Equipe</h3>
      <div className="bg-[#0f1429] rounded-lg border border-[rgba(212,175,55,0.1)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(212,175,55,0.1)]">
              <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Equipe</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Qualificados</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Agendados</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Taxa %</th>
            </tr>
          </thead>
          <tbody>
            {equipes.map((e, idx) => (
              <tr key={idx} className="border-b border-[rgba(212,175,55,0.05)] hover:bg-[rgba(212,175,55,0.05)] transition-colors">
                <td className="px-6 py-4 text-[14px] font-medium text-[#f5f0e8]">{e.nome}</td>
                <td className="px-6 py-4 text-right text-[14px] font-semibold text-[#d4af37]">{e.qualificados}</td>
                <td className="px-6 py-4 text-right text-[14px] font-semibold text-[#4ade80]">{e.agendei}</td>
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
