import { NextRequest, NextResponse } from "next/server"

// IDs das etapas no Kommo
const ETAPAS = {
  veio: 69799508,      // Etapa "Vieram"
  nao: 69799504,       // Etapa "Não vieram"
}

export async function POST(request: NextRequest) {
  try {
    const { kommo_id, kommo_lead_id, status, nome } = await request.json()

    if (!status || !["veio", "nao"].includes(status)) {
      return NextResponse.json(
        { error: "status deve ser 'veio' ou 'nao'" },
        { status: 400 }
      )
    }

    const token = process.env.KOMMO_ACCESS_TOKEN
    const subdomain = process.env.KOMMO_SUBDOMAIN

    if (!token || !subdomain) {
      return NextResponse.json(
        { error: "Configuração do Kommo não encontrada" },
        { status: 500 }
      )
    }

    // Prioriza kommo_lead_id (ID numérico do lead), depois kommo_id
    let leadId = kommo_lead_id || kommo_id

    // Se não tem ID numérico válido, busca o lead pelo nome no Kommo
    if (!leadId || isNaN(Number(leadId))) {
      if (!nome) {
        return NextResponse.json(
          { error: "kommo_id ou nome é obrigatório" },
          { status: 400 }
        )
      }

      // Busca o lead pelo nome
      const searchResponse = await fetch(
        `https://${subdomain}.kommo.com/api/v4/leads?query=${encodeURIComponent(nome)}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text()
        console.error("[Kommo Search Error]", searchResponse.status, errorText)
        return NextResponse.json(
          { error: "Erro ao buscar lead no Kommo", details: errorText },
          { status: searchResponse.status }
        )
      }

      const searchData = await searchResponse.json()
      
      if (!searchData._embedded?.leads?.length) {
        return NextResponse.json(
          { error: `Lead "${nome}" não encontrado no Kommo` },
          { status: 404 }
        )
      }

      // Pega o primeiro lead encontrado
      leadId = searchData._embedded.leads[0].id
    }

    const statusId = ETAPAS[status as keyof typeof ETAPAS]

    // Faz a requisição PATCH para a API do Kommo
    const response = await fetch(
      `https://${subdomain}.kommo.com/api/v4/leads/${leadId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status_id: statusId,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Kommo API Error]", response.status, errorText)
      return NextResponse.json(
        { error: "Erro ao atualizar lead no Kommo", details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: `Lead movido para etapa "${status === "veio" ? "Vieram" : "Não vieram"}"`,
      leadId,
      data,
    })
  } catch (error) {
    console.error("[Kommo API Error]", error)
    return NextResponse.json(
      { error: "Erro interno ao processar requisição" },
      { status: 500 }
    )
  }
}
