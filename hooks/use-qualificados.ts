import useSWR from "swr"

export interface LeadQualificado {
  id: number
  nome: string
  responsavel: string | null
  responsavel_id: number
  criado_em: string
  atualizado_em: string
  data_qualificacao: string | null // Campo customizado ID 1026046
}

interface QualificadosData {
  total: number
  leads: LeadQualificado[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Hook para buscar leads qualificados da semana pelo campo 1026046
// O campo é preenchido automaticamente quando o lead chega na etapa "Vendendo Reunião"
export function useQualificados(dateRange?: { start: string; end: string }) {
  const key = dateRange
    ? `/api/kommo/leads-by-stage?startDate=${dateRange.start}&endDate=${dateRange.end}`
    : null

  const { data, error, isLoading, mutate } = useSWR<QualificadosData>(
    key,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  )

  const qualificadosSemana = data?.leads || []

  return {
    qualificadosSemana,
    totalSemana: qualificadosSemana.length,
    isLoading,
    error,
    mutate,
  }
}
