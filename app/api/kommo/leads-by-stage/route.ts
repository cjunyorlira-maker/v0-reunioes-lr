import { NextRequest, NextResponse } from "next/server"

// API para buscar leads de uma etapa específica do Kommo
// Uso: GET /api/kommo/leads-by-stage?pipeline_id=7012299&status_id=12345678
export async function GET(req: NextRequest) {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN

  if (!token || !subdomain) {
    return NextResponse.json({ error: "Kommo não configurado" }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const pipelineId = searchParams.get("pipeline_id")
  const statusId = searchParams.get("status_id")

  if (!statusId) {
    return NextResponse.json({ error: "status_id é obrigatório" }, { status: 400 })
  }

  try {
    // Monta o filtro por etapa (pipeline + status)
    let filterQuery = ""
    if (pipelineId) {
      filterQuery = `filter[statuses][0][pipeline_id]=${pipelineId}&filter[statuses][0][status_id]=${statusId}`
    } else {
      filterQuery = `filter[statuses][0][status_id]=${statusId}`
    }

    // Busca leads com dados do contato e usuário responsável
    const url = `https://${subdomain}.kommo.com/api/v4/leads?${filterQuery}&with=contacts,responsible_user&limit=250`
    
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: "Erro na API do Kommo", detail: err }, { status: response.status })
    }

    // Kommo retorna 204 ou corpo vazio quando não há leads na etapa
    const text = await response.text()
    if (!text || text.trim() === "") {
      return NextResponse.json({ total: 0, leads: [] })
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.error("[v0] Resposta inválida do Kommo:", text.substring(0, 200))
      return NextResponse.json({ total: 0, leads: [] })
    }

    const leads = data._embedded?.leads || []

    // ID do campo customizado de data de qualificação no Kommo
    const CAMPO_DATA_QUALIFICACAO = 1026046

    // Formata os dados retornados
    const formatted = leads.map((lead: any) => {
      const customFields: any[] = lead.custom_fields_values || []

      // Extrai a data de qualificação do campo customizado
      const campoQualificacao = customFields.find((f: any) => f.field_id === CAMPO_DATA_QUALIFICACAO)
      const dataQualificacaoTimestamp = campoQualificacao?.values?.[0]?.value
      const dataQualificacao = dataQualificacaoTimestamp
        ? new Date(dataQualificacaoTimestamp * 1000).toISOString().split("T")[0]
        : null

      return {
        id: lead.id,
        nome: lead.name,
        responsavel_id: lead.responsible_user_id,
        responsavel: lead._embedded?.responsible_user?.name || null,
        pipeline_id: lead.pipeline_id,
        status_id: lead.status_id,
        criado_em: new Date(lead.created_at * 1000).toISOString(),
        atualizado_em: new Date(lead.updated_at * 1000).toISOString(),
        data_qualificacao: dataQualificacao,
      }
    })

    return NextResponse.json({
      total: formatted.length,
      leads: formatted,
    })
  } catch (error) {
    console.error("[v0] Erro ao buscar leads por etapa:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
