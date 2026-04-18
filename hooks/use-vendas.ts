import useSWR from "swr"

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

interface VendasStats {
  totalVendas: number
  valorTotal: number
  top1Vendedor: { nome: string; total: number; valor: number } | null
  top1PorValor: { nome: string; total: number; valor: number } | null
  rankingVendedores: Array<{ nome: string; total: number; valor: number }>
  rankingOrigens: Array<{ nome: string; total: number; valor: number }>
  avaliacoes: { Excelente: number; Bom: number; [key: string]: number }
}

export function useVendas() {
  const { data, isLoading, error, mutate } = useSWR<{ vendas: Venda[]; stats: VendasStats }>(
    "/api/vendas",
    (url) => fetch(url).then((res) => res.json()),
    { refreshInterval: 30000 }
  )

  return {
    vendas: data?.vendas || [],
    stats: data?.stats,
    isLoading,
    error,
    mutate,
  }
}
