import { useMemo } from "react"
import { PlugaEvento } from "@/hooks/use-pluga-eventos"
import { getFotoVendedor } from "@/lib/vendedor-fotos"

interface VendedorPerformanceProps {
  eventos: PlugaEvento[]
}

interface VendedorStats {
  nome: string
  foto: string | null
  qualificados: number
  agendei: number
  marcados: number
  vendas: number
  taxa_conversao: number
}

export default function VendedorPerformance({ eventos }: VendedorPerformanceProps) {
  const vendedores = useMemo(() => {
    const stats: Record<string, VendedorStats> = {}

    eventos.forEach(e => {
      if (!e.vendedor) return
      if (!stats[e.vendedor]) {
        stats[e.vendedor] = {
          nome: e.vendedor,
          foto: getFotoVendedor(e.vendedor),
          qualificados: 0,
          agendei: 0,
          marcados: 0,
          vendas: 0,
          taxa_conversao: 0,
        }
      }

      if (e.tipo === "qualificado") stats[e.vendedor].qualificados++
      if (e.tipo === "agendei") stats[e.vendedor].agendei++
      if (e.tipo === "marcado") stats[e.vendedor].marcados++
      if (e.tipo === "venda_fechada") stats[e.vendedor].vendas++
    })

    // Calcula taxa de conversão
    Object.values(stats).forEach(v => {
      v.taxa_conversao = v.qualificados > 0 ? Math.round((v.agendei / v.qualificados) * 100) : 0
    })

    return Object.values(stats).sort((a, b) => b.agendei - a.agendei)
  }, [eventos])

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-[#f5f0e8] mb-4">Performance por Vendedor</h3>
      <div className="bg-[#0f1429] rounded-lg border border-[rgba(212,175,55,0.1)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(212,175,55,0.1)]">
              <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Vendedor</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Qualificados</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Agendei</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Marcados</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Vendas</th>
              <th className="text-right px-6 py-3 text-[12px] font-semibold text-[#8a8070] uppercase">Taxa %</th>
            </tr>
          </thead>
          <tbody>
            {vendedores.map((v, idx) => (
              <tr key={idx} className="border-b border-[rgba(212,175,55,0.05)] hover:bg-[rgba(212,175,55,0.05)] transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  {v.foto ? (
                    <img src={v.foto} alt={v.nome} className="w-8 h-8 rounded-full object-cover object-top" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[rgba(212,175,55,0.15)] flex items-center justify-center text-[10px] text-[#d4af37] font-semibold">
                      {v.nome.charAt(0)}
                    </div>
                  )}
                  <span className="text-[14px] font-medium text-[#f5f0e8]">{v.nome}</span>
                </td>
                <td className="px-6 py-4 text-right text-[14px] font-semibold text-[#d4af37]">{v.qualificados}</td>
                <td className="px-6 py-4 text-right text-[14px] font-semibold text-[#4ade80]">{v.agendei}</td>
                <td className="px-6 py-4 text-right text-[14px] font-semibold text-[#60a5fa]">{v.marcados}</td>
                <td className="px-6 py-4 text-right text-[14px] font-semibold text-[#f97316]">{v.vendas}</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold bg-[rgba(74,222,128,0.1)] text-[#4ade80]">
                    {v.taxa_conversao}%
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
