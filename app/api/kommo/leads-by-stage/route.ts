import { NextRequest, NextResponse } from "next/server"

// ID do campo customizado de data de qualificação no Kommo
const CAMPO_DATA_QUALIFICACAO = 1026046

// API para buscar leads qualificados da semana pelo campo 1026046
// O campo é preenchido automaticamente quando o lead chega na etapa "Vendendo Reunião"
// Uso: GET /api/kommo/leads-by-stage?startDate=2026-04-06&endDate=2026-04-12
export async function GET(req: NextRequest) {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN

  if (!token || !subdomain) {
    return NextResponse.json({ error: "Kommo não configurado" }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  try {
    // Converte as datas para timestamps Unix (início e fim do dia)
    const startTs = startDate ? Math.floor(new Date(startDate + "T00:00:00-03:00").getTime() / 1000) : null
    const endTs = endDate ? Math.floor(new Date(endDate + "T23:59:59-03:00").getTime() / 1000) : null

    // Filtra por pipeline e pelo campo customizado de data de qualificação
    // filter[custom_fields][1026046][from] e [to] filtram pelo valor do campo
    let filterQuery = `filter[pipeline_id]=7012299&with=responsible_user&limit=250`
    if (startTs) filterQuery += `&filter[custom_fields_values][${CAMPO_DATA_QUALIFICACAO}][from]=${startTs}`
    if (endTs) filterQuery += `&filter[custom_fields_values][${CAMPO_DATA_QUALIFICACAO}][to]=${endTs}`

    const url = `https://${subdomain}.kommo.com/api/v4/leads?${filterQuery}`

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
