import { useMemo } from "react"
import { PlugaEvento } from "@/hooks/use-pluga-eventos"

interface DashboardMetricsProps {
  eventos: PlugaEvento[]
  dateRange: { start: string; end: string }
}

export default function DashboardMetrics({ eventos, dateRange }: DashboardMetricsProps) {
  const metrics = useMemo(() => {
    const qualificados = eventos.filter(e => e.tipo === "qualificado").length
    const agendei = eventos.filter(e => e.tipo === "agendei").length
    const marcados = eventos.filter(e => e.tipo === "marcado").length
    const vendas = eventos.filter(e => e.tipo === "venda_fechada").length

    // Taxa de conversão: quantos "agendei" vieram do total de "qualificados"
    const conversaoTaxa = qualificados > 0 ? Math.round((agendei / qualificados) * 100) : 0

    return { qualificados, agendei, marcados, vendas, conversaoTaxa }
  }, [eventos])

  const MetricCard = ({ title, value, unit, color }: { title: string; value: number; unit: string; color: string }) => (
    <div className={`bg-gradient-to-br ${color} rounded-lg p-6 border border-[rgba(212,175,55,0.2)]`}>
      <p className="text-[13px] text-[#8a8070] uppercase tracking-wide mb-2">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-white">{value}</span>
        <span className="text-[14px] text-[#8a8070]">{unit}</span>
      </div>
    </div>
  )

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-[#f5f0e8] mb-4">Métricas do Período</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Qualificados"
          value={metrics.qualificados}
          unit="leads"
          color="from-[#1a3a52] to-[#0f2942]"
        />
        <MetricCard
          title="Agendei"
          value={metrics.agendei}
          unit="agendamentos"
          color="from-[#2a3a1a] to-[#1a2a0f]"
        />
        <MetricCard
          title="Marcados"
          value={metrics.marcados}
          unit="reuniões"
          color="from-[#3a2a1a] to-[#2a1a0f]"
        />
        <MetricCard
          title="Vendas"
          value={metrics.vendas}
          unit="fechadas"
          color="from-[#3a1a2a] to-[#2a0f1a]"
        />
        <MetricCard
          title="Conversão"
          value={metrics.conversaoTaxa}
          unit="%"
          color="from-[#2a3a3a] to-[#1a2a2a]"
        />
      </div>
    </div>
  )
}
