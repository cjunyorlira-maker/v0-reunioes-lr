import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Função para buscar dados do usuário no Kommo
async function getKommoUser(userId: string | number) {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN
  
  if (!token || !subdomain) return null
  
  try {
    const response = await fetch(
      `https://${subdomain}.kommo.com/api/v4/users/${userId}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    )
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error("Erro ao buscar usuário Kommo:", error)
  }
  
  return null
}

// Função para buscar dados do grupo/equipe no Kommo
async function getKommoGroups() {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN
  
  if (!token || !subdomain) return []
  
  try {
    const response = await fetch(
      `https://${subdomain}.kommo.com/api/v4/users?with=group`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      return data._embedded?.users || []
    }
  } catch (error) {
    console.error("Erro ao buscar grupos Kommo:", error)
  }
  
  return []
}

// Função para buscar detalhes do lead no Kommo
async function getKommoLeadDetails(leadId: string | number) {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN
  
  if (!token || !subdomain) return null
  
  try {
    const response = await fetch(
      `https://${subdomain}.kommo.com/api/v4/leads/${leadId}?with=contacts`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    )
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error("Erro ao buscar lead Kommo:", error)
  }
  
  return null
}

// Função para extrair campo personalizado do Kommo
function getCustomFieldValue(customFields: Array<{ field_id: number; values: Array<{ value: string }> }>, fieldId: number) {
  const field = customFields?.find(f => f.field_id === fieldId)
  return field?.values?.[0]?.value || null
}

// Função para parsear body dependendo do content-type
async function parseBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || ""
  
  if (contentType.includes("application/json")) {
    return await request.json()
  }
  
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text()
    const params = new URLSearchParams(text)
    const obj: Record<string, unknown> = {}
    params.forEach((value, key) => {
      try {
        obj[key] = JSON.parse(value)
      } catch {
        obj[key] = value
      }
    })
    return obj
  }
  
  try {
    return await request.json()
  } catch {
    const text = await request.text()
    return { raw: text }
  }
}

// Função para extrair data e hora de um campo combinado
const parseDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return { data: null, hora: null }
  
  const str = dateTimeStr.trim()
  
  // Formato ISO: "2025-04-10T14:30:00" ou "2025-04-10 14:30"
  let match = str.match(/(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/)
  if (match) {
    return { data: match[1], hora: match[2] }
  }
  
  // Formato BR: "10/04/2025 14:30"
  match = str.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/)
  if (match) {
    return { data: `${match[3]}-${match[2]}-${match[1]}`, hora: match[4] }
  }
  
  // Formato BR sem hora: "10/04/2025"
  match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match) {
    return { data: `${match[3]}-${match[2]}-${match[1]}`, hora: "09:00" }
  }
  
  return { data: str.split(/[\sT]/)[0], hora: str.split(/[\sT]/)[1] || "09:00" }
}

// Etapas permitidas no Kommo
const ETAPAS_PERMITIDAS = [
  67567420,   // Confirmar reunião
  58498483,   // Reunião confirmada
  102225923,  // Remarcados
]
const ETAPA_REMARCADOS = 102225923
const PIPELINE_ID = 7012299

// Webhook endpoint para integração com Kommo / Make / Pluga
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    const body = await parseBody(request)
    
    // Suporte para formato nativo do Kommo (leads[status][0][id], etc)
    let kommoLead = null
    let kommoLeadId: string | null = null
    let statusId: number | null = null
    
    if (body.leads) {
      const leadsData = body.leads
      kommoLead = leadsData.status?.[0] || leadsData.add?.[0] || leadsData.update?.[0]
      kommoLeadId = kommoLead?.id?.toString() || null
      statusId = kommoLead?.status_id || null
      
      // Se veio do Kommo nativo, só processa se for de uma etapa permitida
      if (statusId && !ETAPAS_PERMITIDAS.includes(statusId)) {
        return NextResponse.json({ 
          success: true, 
          action: "ignored",
          reason: `Lead não está em uma etapa permitida (status_id: ${statusId})` 
        })
      }
    }
    
    // Busca dados completos via API do Kommo
    let responsavelNome = "Não informado"
    let responsavelId: string | null = null
    let fotoResponsavel: string | null = null
    let equipe = "Sem equipe"
    let tipoReuniao: string | null = null
    let dataReuniao: string | null = null
    let horaReuniao: string | null = null
    
    // Se não temos o ID do lead mas temos o nome, busca pelo nome no Kommo
    const nomeLead = body.nome || body.name || body.lead_name || body.contact_name || kommoLead?.name
    
    if (!kommoLeadId && nomeLead && process.env.KOMMO_ACCESS_TOKEN && process.env.KOMMO_SUBDOMAIN) {
      try {
        // Busca leads com esse nome, filtrando pelas etapas permitidas
        const statusFilters = ETAPAS_PERMITIDAS.map((statusId, i) => 
          `filter[statuses][${i}][pipeline_id]=${PIPELINE_ID}&filter[statuses][${i}][status_id]=${statusId}`
        ).join("&")
        
        const searchResponse = await fetch(
          `https://${process.env.KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads?query=${encodeURIComponent(nomeLead)}&${statusFilters}`,
          {
            headers: {
              "Authorization": `Bearer ${process.env.KOMMO_ACCESS_TOKEN}`,
            },
          }
        )
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          if (searchData._embedded?.leads?.length > 0) {
            // Pega o lead mais recente (maior ID) na etapa correta
            const leads = searchData._embedded.leads
            const latestLead = leads.reduce((prev: { id: number }, curr: { id: number }) => 
              curr.id > prev.id ? curr : prev
            , leads[0])
            kommoLeadId = latestLead.id?.toString()
          }
        }
        
        // Se não encontrou na etapa, busca sem filtro e pega o mais recente
        if (!kommoLeadId) {
          const fallbackResponse = await fetch(
            `https://${process.env.KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads?query=${encodeURIComponent(nomeLead)}`,
            {
              headers: {
                "Authorization": `Bearer ${process.env.KOMMO_ACCESS_TOKEN}`,
              },
            }
          )
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            if (fallbackData._embedded?.leads?.length > 0) {
              const leads = fallbackData._embedded.leads
              const latestLead = leads.reduce((prev: { id: number }, curr: { id: number }) => 
                curr.id > prev.id ? curr : prev
              , leads[0])
              kommoLeadId = latestLead.id?.toString()
            }
          }
        }
      } catch (error) {
        console.error("Erro ao buscar lead por nome:", error)
      }
    }
    
    if (kommoLeadId && process.env.KOMMO_ACCESS_TOKEN) {
      // Busca detalhes do lead
      const leadDetails = await getKommoLeadDetails(kommoLeadId)
      
      if (leadDetails) {
        // Busca usuário responsável
        const responsibleUserId = leadDetails.responsible_user_id
        if (responsibleUserId) {
          // Busca todos os usuários com grupos
          const users = await getKommoGroups()
          const user = users.find((u: { id: number }) => u.id === responsibleUserId)
          
          if (user) {
            responsavelNome = user.name || "Não informado"
            responsavelId = user.id?.toString() || null
            fotoResponsavel = user.avatar || null // URL da foto do avatar
            equipe = user._embedded?.groups?.[0]?.name || user.group?.name || "Sem equipe"
          }
        }
        
        // Busca campos personalizados (data/hora da reunião, tipo de reunião)
        const customFields = leadDetails.custom_fields_values || []
        
        // ID do campo tipo de reunião no Kommo
        const CAMPO_TIPO_REUNIAO_ID = 1026810
        
        for (const field of customFields) {
          const value = field.values?.[0]?.value
          const fieldId = field.field_id
          
          // Busca tipo de reunião pelo ID específico do campo
          if (fieldId === CAMPO_TIPO_REUNIAO_ID) {
            // Pode ser enum (select) ou valor direto
            tipoReuniao = field.values?.[0]?.enum || value || null
          }
          
          // Se parece com data/hora
          if (value && typeof value === "string") {
            if (value.match(/\d{4}-\d{2}-\d{2}/) || value.match(/\d{2}\/\d{2}\/\d{4}/)) {
              const parsed = parseDateTime(value)
              if (parsed.data) {
                dataReuniao = parsed.data
                horaReuniao = parsed.hora
              }
            }
          }
        }
      }
    }
    
    // Verifica se veio campo combinado de data/hora via Pluga/Make
    const dataHoraCombinada = body.data_hora || body.datetime || body.data_reuniao || body.meeting_datetime
    let dataFinal = body.data || body.date || body.meeting_date || dataReuniao
    let horaFinal = body.hora || body.time || body.meeting_time || horaReuniao
    
    if (dataHoraCombinada) {
      const parsed = parseDateTime(dataHoraCombinada)
      dataFinal = parsed.data
      horaFinal = parsed.hora
    }
    
    // Verifica se o lead veio da etapa "Remarcados"
    const isRemarcado = statusId === ETAPA_REMARCADOS
    
    // Monta dados do lead
    const leadData = {
      nome: body.nome || body.name || body.lead_name || body.contact_name || kommoLead?.name,
      data: dataFinal || new Date().toISOString().split("T")[0],
      hora: horaFinal || "09:00",
      responsavel: responsavelNome !== "Não informado" ? responsavelNome : (body.responsavel || body.responsible || "Não informado"),
      responsavel_id: responsavelId,
      foto_responsavel: fotoResponsavel,
      tipo: body.tipo || body.type || "",
      tipo_reuniao: tipoReuniao || body.tipo_reuniao || body.modalidade || null,
      kommo_id: body.kommo_id || body.atendente || null,
      kommo_lead_id: kommoLeadId || body.lead_id || body.id?.toString() || null,
      equipe: equipe !== "Sem equipe" ? equipe : (body.equipe || "Sem equipe"),
      remarcado: isRemarcado,
      status: body.status || "pending",
    }
    
    // Validação básica - apenas nome é obrigatório
    if (!leadData.nome) {
      return NextResponse.json(
        { 
          error: "Campo 'nome' é obrigatório",
          received: leadData,
          rawBody: body
        },
        { status: 400 }
      )
    }
    
    // Verifica se já existe lead com mesmo kommo_lead_id
    let existingLead = null
    
    if (leadData.kommo_lead_id) {
      const { data: byKommoId } = await supabase
        .from("leads")
        .select("*")
        .eq("kommo_lead_id", leadData.kommo_lead_id)
        .single()
      
      existingLead = byKommoId
    }
    
    // Se não encontrou por kommo_lead_id, busca por nome (para leads que não vieram e agora remarcaram)
    if (!existingLead && leadData.nome) {
      const { data: byNome } = await supabase
        .from("leads")
        .select("*")
        .eq("nome", leadData.nome)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      
      existingLead = byNome
    }
    
    // Se encontrou lead existente, atualiza
    if (existingLead) {
      // Se for remarcado, reseta o status para pending
      const updateData = {
        ...leadData,
        status: isRemarcado ? "pending" : leadData.status,
        remarcado: isRemarcado ? true : existingLead.remarcado,
      }
      
      const { data, error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", existingLead.id)
        .select()
        .single()
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        action: isRemarcado ? "remarked" : "updated",
        message: isRemarcado ? "Lead atualizado como remarcado" : "Lead existente atualizado",
        lead: data 
      })
    }
    
    // Cria novo lead
    const { data, error } = await supabase
      .from("leads")
      .insert(leadData)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      action: "created",
      lead: data 
    }, { status: 201 })
    
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar se o webhook está funcionando
export async function GET() {
  return NextResponse.json({ 
    status: "ok",
    message: "Webhook endpoint ativo",
    usage: {
      method: "POST",
      contentType: "application/json",
      requiredFields: ["nome"],
      optionalFields: ["data", "hora", "responsavel", "tipo", "kommo_id", "kommo_lead_id", "equipe", "status"]
    }
  })
}
