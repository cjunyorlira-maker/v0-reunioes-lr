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
  total_vendas: number
  total_valor: number
  por_responsavel: Array<{
    responsavel: string
    total: number
    valor: number
  }>
  por_origem: Array<{
    origem: string
    total: number
    valor: number
  }>
  por_avaliacao: Array<{
    avaliacao: string
    total: number
  }>
}

export function useVendas() {
  const { data: vendas, isLoading, error, mutate } = useSWR<Venda[]>(
    "/api/vendas",
    (url) => fetch(url).then((res) => res.json()),
    { refreshInterval: 30000 }
  )

  const { data: stats } = useSWR<VendasStats>(
    "/api/vendas?stats=true",
    (url) => fetch(url).then((res) => res.json()),
    { refreshInterval: 30000 }
  )

  return {
    vendas: vendas || [],
    stats,
    isLoading,
    error,
    mutate,
  }
}
