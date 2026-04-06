import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Etapas do Kommo
const ETAPA_REMARCADOS = 102225923
const ETAPA_CONFIRMAR_REUNIAO = 67567420
const ETAPA_REUNIAO_CONFIRMADA = 58498483

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    const { lead_id, kommo_lead_id, nome } = await request.json()
    
    const token = process.env.KOMMO_ACCESS_TOKEN
    const subdomain = process.env.KOMMO_SUBDOMAIN
    
    if (!token || !subdomain) {
      return NextResponse.json(
        { error: "Configuração do Kommo não encontrada" },
        { status: 500 }
      )
    }
    
    // Busca o lead no Kommo
    let kommoLeadData = null
    let foundLeadId = kommo_lead_id
    
    // Se tem kommo_lead_id, busca direto
    if (kommo_lead_id && !isNaN(Number(kommo_lead_id))) {
      const response = await fetch(
        `https://${subdomain}.kommo.com/api/v4/leads/${kommo_lead_id}?with=contacts`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      )
      
      if (response.ok) {
        kommoLeadData = await response.json()
      }
    }
    
    // Se não encontrou, busca pelo nome
    if (!kommoLeadData && nome) {
      const searchResponse = await fetch(
        `https://${subdomain}.kommo.com/api/v4/leads?query=${encodeURIComponent(nome)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      )
      
      if (searchResponse.ok && searchResponse.status !== 204) {
        const searchText = await searchResponse.text()
        if (searchText) {
          const searchData = JSON.parse(searchText)
          if (searchData._embedded?.leads?.length > 0) {
            // Pega o lead mais recente
            const leads = searchData._embedded.leads
            kommoLeadData = leads.reduce((prev: { id: number }, curr: { id: number }) => 
              curr.id > prev.id ? curr : prev
            , leads[0])
            foundLeadId = kommoLeadData.id
          }
        }
      }
    }
    
    if (!kommoLeadData) {
      return NextResponse.json(
        { error: "Lead não encontrado no Kommo" },
        { status: 404 }
      )
    }
    
    // Busca dados completos do lead
    const leadDetailsResponse = await fetch(
      `https://${subdomain}.kommo.com/api/v4/leads/${foundLeadId}?with=contacts`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    )
    
    if (!leadDetailsResponse.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar detalhes do lead" },
        { status: 500 }
      )
    }
    
    const leadDetails = await leadDetailsResponse.json()
    
    // Verifica se é remarcado
    const isRemarcado = leadDetails.status_id === ETAPA_REMARCADOS
    
    // Busca dados do responsável
    let responsavelNome = "Não informado"
    let responsavelId = null
    let fotoResponsavel = null
    let equipe = "Sem equipe"
    
    if (leadDetails.responsible_user_id) {
      const userResponse = await fetch(
        `https://${subdomain}.kommo.com/api/v4/users/${leadDetails.responsible_user_id}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      )
      
      if (userResponse.ok) {
        const user = await userResponse.json()
        responsavelNome = user.name || "Não informado"
        responsavelId = user.id?.toString() || null
        fotoResponsavel = user.avatar || null
        equipe = user._embedded?.groups?.[0]?.name || user.group?.name || "Sem equipe"
      }
    }
    
    // Busca campos personalizados
    let tipoReuniao = null
    let dataReuniao = null
    let horaReuniao = null
    let origem = null
    
    const customFields = leadDetails.custom_fields_values || []
    const CAMPO_TIPO_REUNIAO_ID = 1026810
    const CAMPO_DATA_REUNIAO_ID = 1025159
    const CAMPO_ORIGEM_ID = 797344
    
    console.log("[v0] Custom fields do lead:", JSON.stringify(customFields, null, 2))
    
    for (const field of customFields) {
      const fieldId = field.field_id
      const value = field.values?.[0]?.value
      
      // Tipo de reunião (online/presencial)
      if (fieldId === CAMPO_TIPO_REUNIAO_ID) {
        tipoReuniao = field.values?.[0]?.enum || value || null
      }
      
      // Origem do lead - campo de seleção
      if (fieldId === CAMPO_ORIGEM_ID) {
        console.log("[v0] Campo origem encontrado:", JSON.stringify(field, null, 2))
        origem = field.values?.[0]?.enum || field.values?.[0]?.value || null
      }
      
      // Data da reunião - campo específico ID 1025159
      if (fieldId === CAMPO_DATA_REUNIAO_ID) {
        if (value && typeof value === "number") {
          // Timestamp Unix - converte para data
          const date = new Date(value * 1000)
          dataReuniao = date.toISOString().split("T")[0]
        } else if (value && typeof value === "string" && value.match(/\d{4}-\d{2}-\d{2}/)) {
          dataReuniao = value.split("T")[0]
        }
      }
    }
    
    // Prepara dados para atualizar
    const updateData: Record<string, unknown> = {
      kommo_lead_id: foundLeadId?.toString(),
      responsavel: responsavelNome,
      responsavel_id: responsavelId,
      foto_responsavel: fotoResponsavel,
      equipe: equipe,
      tipo_reuniao: tipoReuniao,
      remarcado: isRemarcado,
      origem: origem,
    }
    
    // Se for remarcado, reseta o status para pending
    if (isRemarcado) {
      updateData.status = "pending"
    }
    
    // Se encontrou nova data, atualiza
    if (dataReuniao) {
      updateData.data = dataReuniao
    }
    
    if (horaReuniao) {
      updateData.hora = horaReuniao
    }
    
    // Atualiza o lead no banco
    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", lead_id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const changes = []
    if (dataReuniao) changes.push(`data: ${dataReuniao}`)
    if (isRemarcado) changes.push("status: remarcado")
    if (responsavelNome !== "Não informado") changes.push(`responsável: ${responsavelNome}`)
    
    return NextResponse.json({
      success: true,
      message: isRemarcado 
        ? `Lead atualizado como remarcado! ${changes.length > 0 ? `(${changes.join(", ")})` : ""}`
        : `Lead sincronizado! ${changes.length > 0 ? `(${changes.join(", ")})` : ""}`,
      lead: data,
      novaData: dataReuniao,
      kommoData: {
        status_id: leadDetails.status_id,
        responsavel: responsavelNome,
        equipe: equipe,
        isRemarcado,
      }
    })
    
  } catch (error) {
    console.error("Erro ao sincronizar lead:", error)
    return NextResponse.json(
      { error: "Erro interno ao sincronizar lead" },
      { status: 500 }
    )
  }
}
