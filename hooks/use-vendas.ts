"use client"

import useSWR from "swr"
import { useMemo } from "react"

export interface Venda {
  id: number
  kommo_id: string
  nome_lead: string
  valor_venda: number
  responsavel: string
  atendente: string
  origem: string
  tags?: string
  avaliacao?: string
  data_venda: string
  observacao?: string
}

export function useVendas() {
  const { data, isLoading, error, mutate } = useSWR<Venda[]>(
    "/api/vendas",
    (url) => fetch(url).then((res) => res.json()),
    { refreshInterval: 30000 }
  )

  const vendas = data || []

  // TOP 1 Vendedor (maior quantidade de vendas)
  const top1Vendedor = useMemo(() => {
    if (vendas.length === 0) return null
    const byVendedor: Record<string, { total: number; valor: number }> = {}
    
    vendas.forEach((venda) => {
      if (!byVendedor[venda.responsavel]) {
        byVendedor[venda.responsavel] = { total: 0, valor: 0 }
      }
      byVendedor[venda.responsavel].total++
      byVendedor[venda.responsavel].valor += venda.valor_venda
    })

    const sorted = Object.entries(byVendedor).sort((a, b) => b[1].total - a[1].total)
    if (sorted.length === 0) return null

    return {
      nome: sorted[0][0],
      vendas: sorted[0][1].total,
      valor: sorted[0][1].valor,
    }
  }, [vendas])

  // TOP 1 Equipe (LR Multimarcas com total de vendas)
  const top1Equipe = useMemo(() => {
    if (vendas.length === 0) return null
    
    const total = vendas.length
    const valor = vendas.reduce((acc, v) => acc + v.valor_venda, 0)

    return {
      nome: "LR Multimarcas",
      vendas: total,
      valor: valor,
    }
  }, [vendas])

  // Ranking de vendedores
  const rankingVendedores = useMemo(() => {
    if (vendas.length === 0) return []
    const byVendedor: Record<string, { total: number; valor: number }> = {}
    
    vendas.forEach((venda) => {
      if (!byVendedor[venda.responsavel]) {
        byVendedor[venda.responsavel] = { total: 0, valor: 0 }
      }
      byVendedor[venda.responsavel].total++
      byVendedor[venda.responsavel].valor += venda.valor_venda
    })

    return Object.entries(byVendedor)
      .map(([nome, data]) => ({ nome, vendas: data.total, valor: data.valor }))
      .sort((a, b) => b.vendas - a.vendas || b.valor - a.valor)
  }, [vendas])

  return {
    vendas,
    top1Vendedor,
    top1Equipe,
    rankingVendedores,
    isLoading,
    error,
    mutate,
  }
}
