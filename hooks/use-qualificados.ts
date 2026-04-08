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

// Hook para buscar leads qualificados da semana
// Agora busca da tabela pluga_eventos (preenchida via webhook do Pluga)
export function useQualificados(dateRange?: { start: string; end: string }) {
  // Busca eventos do Pluga (nova fonte de dados)
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

  // Combina os dois resultados removendo duplicados pelo nome
  const plugaLeads = plugaData?.leads || []
  const kommoLeads = kommoData?.leads || []
  
  // Usa Map para remover duplicados (nome como chave)
  const combinedMap = new Map<string, LeadQualificado>()
  
  // Primeiro adiciona do Pluga (prioridade)
  for (const lead of plugaLeads) {
    const key = lead.nome?.toLowerCase().trim() || lead.id.toString()
    combinedMap.set(key, lead)
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
