import useSWR from "swr"

interface LeadQualificado {
  id: number
  nome: string
  responsavel: string | null
  responsavel_id: number
  criado_em: string
  atualizado_em: string
}

interface QualificadosData {
  total: number
  leads: LeadQualificado[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Hook para buscar leads na etapa "Vendendo Reunião" do Kommo
// Passe o pipeline_id e status_id da etapa no Kommo
export function useQualificados(pipelineId?: string, statusId?: string) {
  const enabled = !!pipelineId && !!statusId

  const { data, error, isLoading, mutate } = useSWR<QualificadosData>(
    enabled
      ? `/api/kommo/leads-by-stage?pipeline_id=${pipelineId}&status_id=${statusId}`
      : null,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 } // atualiza a cada 5 min
  )

  return {
    qualificados: data?.leads || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  }
}
