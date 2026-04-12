import useSWR from "swr"

export interface LeadQualificado {
  id: number | string
  kommo_id?: string | null
  nome: string
  responsavel: string | null
  responsavel_id: number | null
  equipe?: string | null
  origem?: string | null
  criado_em: string
  data_qualificacao: string | null
}

interface QualificadosData {
  total: number
  leads: LeadQualificado[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Hook para buscar leads qualificados usando a tabela leads (campo data_qualificacao)
export function useQualificados(dateRange?: { start: string; end: string }) {
  // Busca da nova API que usa a tabela leads com data_qualificacao
  const apiKey = dateRange
    ? `/api/leads/qualificados?startDate=${dateRange.start}&endDate=${dateRange.end}`
    : `/api/leads/qualificados`

  const { data, error, isLoading, mutate } = useSWR<QualificadosData>(
    apiKey,
    fetcher,
    { refreshInterval: 30 * 1000 } // Atualiza a cada 30 segundos
  )

  const qualificadosSemana = data?.leads || []

  return {
    qualificadosSemana,
    totalSemana: data?.total || 0,
    isLoading,
    error,
    mutate,
  }
}
