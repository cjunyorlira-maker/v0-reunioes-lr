import { NextRequest, NextResponse } from "next/server"

// ID do campo customizado de data de qualificação no Kommo
const CAMPO_DATA_QUALIFICACAO = 1026046

// API para buscar leads qualificados da semana pelo campo 1026046
// Busca todos os leads do pipeline e filtra localmente pelo campo de data
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
    // Busca todos os leads do pipeline com campos customizados
    const url = `https://${subdomain}.kommo.com/api/v4/leads?filter[pipeline_id]=7012299&with=custom_fields_values&limit=250`

    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[v0] Erro Kommo:", response.status, err.substring(0, 200))
      return NextResponse.json({ error: "Erro na API do Kommo", detail: err }, { status: response.status })
    }

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

    // Processa e filtra os leads pelo campo 1026046 (data de qualificação)
    const formatted: any[] = []

    for (const lead of leads) {
      const customFields: any[] = lead.custom_fields_values || []

      // Extrai a data de qualificação do campo customizado
      const campoQualificacao = customFields.find((f: any) => f.field_id === CAMPO_DATA_QUALIFICACAO)
      if (!campoQualificacao) continue // Ignora leads sem o campo preenchido

      const dataQualificacaoTimestamp = campoQualificacao.values?.[0]?.value
      if (!dataQualificacaoTimestamp) continue

      const dataQualificacao = new Date(dataQualificacaoTimestamp * 1000).toISOString().split("T")[0]

      // Filtra pelo range de datas se fornecido
      if (startDate && dataQualificacao < startDate) continue
      if (endDate && dataQualificacao > endDate) continue

      formatted.push({
        id: lead.id,
        nome: lead.name,
        responsavel_id: lead.responsible_user_id,
        responsavel: null, // Não busca responsible_user para economizar chamadas
        pipeline_id: lead.pipeline_id,
        status_id: lead.status_id,
        criado_em: new Date(lead.created_at * 1000).toISOString(),
        atualizado_em: new Date(lead.updated_at * 1000).toISOString(),
        data_qualificacao: dataQualificacao,
      })
    }

    return NextResponse.json({
      total: formatted.length,
      leads: formatted,
    })
  } catch (error) {
    console.error("[v0] Erro ao buscar leads por etapa:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
