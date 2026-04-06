import { NextRequest, NextResponse } from "next/server"

// IDs das etapas no Kommo
const ETAPAS = {
  veio: 69799508,       // Etapa "Vieram"
  nao: 69799504,        // Etapa "Não vieram"
  remarcou: 102225923,  // Etapa "Remarcados"
}

// Etapas permitidas para mover leads
const ETAPAS_PERMITIDAS = [
  67567420,   // Confirmar reunião
  58498483,   // Reunião confirmada
  102225923,  // Remarcados
]
const PIPELINE_ID = 7012299

export async function POST(request: NextRequest) {
  try {
    const { kommo_id, kommo_lead_id, status, nome, responsavel_id, atendente } = await request.json()
    
    // ID do campo "Atendente" no Kommo
    const CAMPO_ATENDENTE_ID = 1026812

    if (!status || !["veio", "nao", "remarcou"].includes(status)) {
      return NextResponse.json(
        { error: "status deve ser 'veio', 'nao' ou 'remarcou'" },
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

    // Prioriza kommo_lead_id (ID numérico do lead), depois kommo_id (se for numérico)
    let leadId: number | null = null
    let foundResponsibleUserId: number | null = null
    
    if (kommo_lead_id && !isNaN(Number(kommo_lead_id))) {
      leadId = Number(kommo_lead_id)
    } else if (kommo_id && !isNaN(Number(kommo_id))) {
      leadId = Number(kommo_id)
    }

    // Se não tem ID numérico válido, busca o lead pelo nome no Kommo
    if (!leadId) {
      if (!nome) {
        return NextResponse.json(
          { error: "kommo_id ou nome é obrigatório" },
          { status: 400 }
        )
      }

      // Busca o lead pelo nome, filtrando pelas etapas permitidas
      const statusFilters = ETAPAS_PERMITIDAS.map((statusId, i) => 
        `filter[statuses][${i}][pipeline_id]=${PIPELINE_ID}&filter[statuses][${i}][status_id]=${statusId}`
      ).join("&")
      
      const searchResponse = await fetch(
        `https://${subdomain}.kommo.com/api/v4/leads?query=${encodeURIComponent(nome)}&${statusFilters}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (searchResponse.ok && searchResponse.status !== 204) {
        const text = await searchResponse.text()
        if (text) {
          const searchData = JSON.parse(text)
          if (searchData._embedded?.leads?.length > 0) {
            // Pega o lead mais recente (maior ID) na etapa correta
            const leads = searchData._embedded.leads
            const latestLead = leads.reduce((prev: { id: number; responsible_user_id?: number }, curr: { id: number; responsible_user_id?: number }) => 
              curr.id > prev.id ? curr : prev
            , leads[0])
            leadId = latestLead.id
            foundResponsibleUserId = latestLead.responsible_user_id || null
          }
        }
      }
      
      // Se não encontrou na etapa "Confirmar reunião", busca sem filtro
      if (!leadId) {
        const fallbackResponse = await fetch(
          `https://${subdomain}.kommo.com/api/v4/leads?query=${encodeURIComponent(nome)}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )

        if (!fallbackResponse.ok || fallbackResponse.status === 204) {
          return NextResponse.json(
            { error: `Lead "${nome}" não encontrado no Kommo` },
            { status: 404 }
          )
        }

        const fallbackText = await fallbackResponse.text()
        if (!fallbackText) {
          return NextResponse.json(
            { error: `Lead "${nome}" não encontrado no Kommo` },
            { status: 404 }
          )
        }
        
        const fallbackData = JSON.parse(fallbackText)
        
        if (!fallbackData._embedded?.leads?.length) {
          return NextResponse.json(
            { error: `Lead "${nome}" não encontrado no Kommo` },
            { status: 404 }
          )
        }

        // Pega o lead mais recente (maior ID)
        const leads = fallbackData._embedded.leads
        const latestLead = leads.reduce((prev: { id: number; responsible_user_id?: number }, curr: { id: number; responsible_user_id?: number }) => 
          curr.id > prev.id ? curr : prev
        , leads[0])
        leadId = latestLead.id
        foundResponsibleUserId = latestLead.responsible_user_id || null
      }
    }
    
    // Usa o responsible_user_id encontrado na busca, se não foi passado
    const finalResponsibleUserId = responsavel_id || foundResponsibleUserId

    // Validação final: leadId deve ser um número
    if (!leadId || isNaN(Number(leadId))) {
      return NextResponse.json(
        { error: `Não foi possível encontrar o ID numérico do lead "${nome}"` },
        { status: 404 }
      )
    }

    const statusId = ETAPAS[status as keyof typeof ETAPAS]
    
    // Prepara os dados para atualizar
    const updateData: { 
      status_id: number
      responsible_user_id?: number
      custom_fields_values?: Array<{ field_id: number; values: Array<{ value: string }> }>
    } = {
      status_id: statusId,
    }
    
    // Se tiver responsible_user_id, adiciona (necessário para etapa "Vieram")
    if (finalResponsibleUserId && !isNaN(Number(finalResponsibleUserId))) {
      updateData.responsible_user_id = Number(finalResponsibleUserId)
    }
    
    // Se for "veio" e tiver atendente, adiciona ao campo personalizado 1026812
    if (status === "veio" && atendente) {
      updateData.custom_fields_values = [
        {
          field_id: CAMPO_ATENDENTE_ID,
          values: [{ value: atendente }]
        }
      ]
    }

    // Faz a requisição PATCH para a API do Kommo
    const response = await fetch(
      `https://${subdomain}.kommo.com/api/v4/leads/${leadId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
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

    const etapaNomes = {
      veio: "Vieram",
      nao: "Não vieram",
      remarcou: "Remarcados"
    }
    
    return NextResponse.json({
      success: true,
      message: `Lead movido para etapa "${etapaNomes[status as keyof typeof etapaNomes]}"`,
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
