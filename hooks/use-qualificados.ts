import useSWR from "swr"

export interface LeadQualificado {
  id: number | string
  nome: string
  responsavel: string | null
  responsavel_id: number | null
  equipe?: string | null
  origem?: string | null
  criado_em: string
  atualizado_em: string
  data_qualificacao: string | null
}

interface QualificadosData {
  total: number
  leads: LeadQualificado[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Hook para buscar leads qualificados
// Filtra por data_evento (data da qualificação) - pode ser dia específico ou semana toda
export function useQualificados(dateRange?: { start: string; end: string }) {
  // Busca eventos do Pluga filtrando pela data de qualificação
  const plugaKey = dateRange
    ? `/api/pluga/eventos?tipo=qualificado&startDate=${dateRange.start}&endDate=${dateRange.end}`
    : null

  const { data: plugaData, error: plugaError, isLoading: plugaLoading, mutate: plugaMutate } = useSWR<QualificadosData>(
    plugaKey,
    fetcher,
    { refreshInterval: 30 * 1000 } // Atualiza a cada 30 segundos
  )

  // Também busca do Kommo como fallback
  const kommoKey = dateRange
    ? `/api/kommo/leads-by-stage?startDate=${dateRange.start}&endDate=${dateRange.end}`
    : null

  const { data: kommoData, error: kommoError, isLoading: kommoLoading } = useSWR<QualificadosData>(
    kommoKey,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  )

  // Combina os dois resultados removendo duplicados pelo lead_id
  const plugaLeads = plugaData?.leads || []
  const kommoLeads = kommoData?.leads || []
  
  // Usa Map para remover duplicados (id como chave - mais preciso que nome)
  const combinedMap = new Map<string | number, LeadQualificado>()
  
  // Primeiro adiciona do Pluga (prioridade)
  for (const lead of plugaLeads) {
    combinedMap.set(lead.id, lead)
  }
  
  // Depois adiciona do Kommo (só se não existir pelo id)
  for (const lead of kommoLeads) {
    if (!combinedMap.has(lead.id)) {
      combinedMap.set(lead.id, lead)
    }
  }

  const qualificadosSemana = Array.from(combinedMap.values())

  return {
    qualificadosSemana,
    totalSemana: qualificadosSemana.length,
    isLoading: plugaLoading || kommoLoading,
    error: plugaError || kommoError,
    mutate: plugaMutate,
  }
}
  
  // Depois adiciona do Kommo (só se não existir)
  for (const lead of kommoLeads) {
    const key = lead.nome?.toLowerCase().trim() || lead.id.toString()
    if (!combinedMap.has(key)) {
      combinedMap.set(key, lead)
    }
  }

  const qualificadosSemana = Array.from(combinedMap.values())

  return {
    qualificadosSemana,
    totalSemana: qualificadosSemana.length,
    isLoading: plugaLoading || kommoLoading,
    error: plugaError || kommoError,
    mutate: plugaMutate,
  }
}
