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

// Hook para buscar leads na etapa "Vendendo Reunião" do Kommo
// Passe o pipeline_id e status_id da etapa no Kommo
export function useQualificados(pipelineId?: string, statusId?: string, dateRange?: { start: string; end: string }) {
  const enabled = !!pipelineId && !!statusId

  const { data, error, isLoading, mutate } = useSWR<QualificadosData>(
    enabled
      ? `/api/kommo/leads-by-stage?pipeline_id=${pipelineId}&status_id=${statusId}`
      : null,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 } // atualiza a cada 5 min
  )

  const todosLeads = data?.leads || []

  // Filtra pelos qualificados dentro da semana atual (pelo campo data_qualificacao)
  const qualificadosSemana = dateRange
    ? todosLeads.filter(l => {
        if (!l.data_qualificacao) return false
        return l.data_qualificacao >= dateRange.start && l.data_qualificacao <= dateRange.end
      })
    : todosLeads

  return {
    qualificados: todosLeads,          // todos na etapa
    qualificadosSemana,                // qualificados nesta semana (pelo campo customizado)
    total: todosLeads.length,
    totalSemana: qualificadosSemana.length,
    isLoading,
    error,
    mutate,
  }
}
