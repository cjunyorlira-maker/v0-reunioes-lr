"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Metricas {
  qualificados: number
  agendados: number
  conversao_qualificado_agendado: number
  por_origem: Record<string, any>
  por_status: Record<string, number>
  por_vendedor: Record<string, any>
  por_equipe: Record<string, any>
  vendas: number
  conversao_agendado_venda: number
}

export function MetricsDashboard() {
  const [periodo, setPeriodo] = useState<"dia" | "semana">("dia")
  const [filtroVendedor, setFiltroVendedor] = useState<string>("")
  const [filtroEquipe, setFiltroEquipe] = useState<string>("")
  const [filtroOrigem, setFiltroOrigem] = useState<string>("")

  const params = new URLSearchParams()
  params.set("periodo", periodo)
  if (filtroVendedor) params.set("vendedor", filtroVendedor)
  if (filtroEquipe) params.set("equipe", filtroEquipe)
  if (filtroOrigem) params.set("origem", filtroOrigem)

  const { data, isLoading } = useSWR<{ metricas: Metricas }>(`/api/dashboard/metrics?${params}`)
  const metricas = data?.metricas

  if (isLoading) {
    return <div className="p-8 text-center">Carregando métricas...</div>
  }

  if (!metricas) {
    return <div className="p-8 text-center text-red-500">Erro ao carregar métricas</div>
  }

  return (
    <div className="space-y-6 p-6">
      {/* Controles */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          <Button
            variant={periodo === "dia" ? "default" : "outline"}
            onClick={() => setPeriodo("dia")}
            size="sm"
          >
            Hoje
          </Button>
          <Button
            variant={periodo === "semana" ? "default" : "outline"}
            onClick={() => setPeriodo("semana")}
            size="sm"
          >
            Semana
          </Button>
        </div>

        <input
          type="text"
          placeholder="Filtrar por vendedor..."
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
          className="rounded border px-3 py-1 text-sm"
        />
        <input
          type="text"
          placeholder="Filtrar por equipe..."
          value={filtroEquipe}
          onChange={(e) => setFiltroEquipe(e.target.value)}
          className="rounded border px-3 py-1 text-sm"
        />
        <input
          type="text"
          placeholder="Filtrar por origem..."
          value={filtroOrigem}
          onChange={(e) => setFiltroOrigem(e.target.value)}
          className="rounded border px-3 py-1 text-sm"
        />
      </div>

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Qualificados</div>
          <div className="text-3xl font-bold">{metricas.qualificados}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Agendados</div>
          <div className="text-3xl font-bold">{metricas.agendados}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Conversão Q→A</div>
          <div className="text-3xl font-bold">{metricas.conversao_qualificado_agendado.toFixed(1)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Vendas</div>
          <div className="text-3xl font-bold">{metricas.vendas}</div>
        </Card>
      </div>

      {/* Status dos leads */}
      <Card className="p-4">
        <h3 className="mb-4 font-bold">Por Status</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Badge variant="outline">Pendente</Badge>
            <div className="text-2xl font-bold">{metricas.por_status.pending}</div>
          </div>
          <div>
            <Badge variant="outline" className="bg-green-50">Veio</Badge>
            <div className="text-2xl font-bold">{metricas.por_status.veio}</div>
          </div>
          <div>
            <Badge variant="outline" className="bg-red-50">Não veio</Badge>
            <div className="text-2xl font-bold">{metricas.por_status.nao}</div>
          </div>
        </div>
      </Card>

      {/* Por origem */}
      {Object.keys(metricas.por_origem).length > 0 && (
        <Card className="p-4">
          <h3 className="mb-4 font-bold">Por Origem</h3>
          <div className="space-y-3">
            {Object.entries(metricas.por_origem).map(([origem, dados]: [string, any]) => (
              <div key={origem} className="flex items-center justify-between rounded bg-gray-50 p-3">
                <div>
                  <div className="font-semibold">{origem}</div>
                  <div className="text-sm text-gray-600">
                    Total: {dados.total} | Q: {dados.qualificados} | A: {dados.agendados} | V: {dados.venda}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Por vendedor */}
      {Object.keys(metricas.por_vendedor).length > 0 && (
        <Card className="p-4">
          <h3 className="mb-4 font-bold">Performance por Vendedor</h3>
          <div className="space-y-3">
            {Object.entries(metricas.por_vendedor).map(([vendedor, dados]: [string, any]) => (
              <div key={vendedor} className="flex items-center justify-between rounded bg-gray-50 p-3">
                <div>
                  <div className="font-semibold">{vendedor}</div>
                  <div className="text-sm text-gray-600">
                    Q: {dados.qualificados} | A: {dados.agendados} | V: {dados.veio}/{dados.nao} | Vendas: {dados.venda}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{dados.conversao_qualificado_agendado.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">Conv. Q→A</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Por equipe */}
      {Object.keys(metricas.por_equipe).length > 0 && (
        <Card className="p-4">
          <h3 className="mb-4 font-bold">Performance por Equipe</h3>
          <div className="space-y-3">
            {Object.entries(metricas.por_equipe).map(([equipe, dados]: [string, any]) => (
              <div key={equipe} className="flex items-center justify-between rounded bg-gray-50 p-3">
                <div>
                  <div className="font-semibold">{equipe}</div>
                  <div className="text-sm text-gray-600">
                    Q: {dados.qualificados} | A: {dados.agendados} | V: {dados.veio}/{dados.nao} | Vendas: {dados.venda}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{dados.conversao_qualificado_agendado.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">Conv. Q→A</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
