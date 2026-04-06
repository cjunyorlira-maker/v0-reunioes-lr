import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

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
      // Tenta parsear como JSON se possível
      try {
        obj[key] = JSON.parse(value)
      } catch {
        obj[key] = value
      }
    })
    return obj
  }
  
  // Tenta JSON como fallback
  try {
    return await request.json()
  } catch {
    const text = await request.text()
    return { raw: text }
  }
}

// Webhook endpoint para integração com Make.com / Kommo / Pluga
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    const body = await parseBody(request)
    
    console.log("[v0] Webhook received:", JSON.stringify(body, null, 2))
    
    // Função para extrair data e hora de um campo combinado (ex: "2025-04-10 14:30" ou "10/04/2025 14:30")
    const parseDateTime = (dateTimeStr: string) => {
      if (!dateTimeStr) return { data: null, hora: null }
      
      // Remove espaços extras
      const str = dateTimeStr.trim()
      
      // Tenta diferentes formatos
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
      
      // Se não conseguiu parsear, retorna como está
      return { data: str.split(/[\sT]/)[0], hora: str.split(/[\sT]/)[1] || "09:00" }
    }
    
    // Suporte para formato nativo do Kommo (leads[status][0][id], etc)
    let kommoLead = null
    if (body.leads) {
      // Kommo envia em formato: leads[status][0], leads[add][0], leads[update][0]
      const leadsData = body.leads
      kommoLead = leadsData.status?.[0] || leadsData.add?.[0] || leadsData.update?.[0]
    }
    
    // Verifica se veio campo combinado de data/hora
    const dataHoraCombinada = body.data_hora || body.datetime || body.data_reuniao || body.meeting_datetime
    let dataFinal = body.data || body.date || body.meeting_date
    let horaFinal = body.hora || body.time || body.meeting_time
    
    if (dataHoraCombinada) {
      const parsed = parseDateTime(dataHoraCombinada)
      dataFinal = parsed.data
      horaFinal = parsed.hora
    }
    
    // Suporte para diferentes formatos de payload do Make/Kommo/Pluga
    const leadData = {
      nome: body.nome || body.name || body.lead_name || body.contact_name || kommoLead?.name,
      data: dataFinal || (kommoLead ? new Date().toISOString().split("T")[0] : null),
      hora: horaFinal || "09:00",
      responsavel: body.responsavel || body.responsible || body.assigned_to || body.user_name || body.atendente || kommoLead?.responsible_user_id?.toString() || "Não informado",
      tipo: body.tipo || body.type || "",
      kommo_id: body.kommo_id || body.lead_id || body.id?.toString() || body.atendente_id || kommoLead?.id?.toString(),
      status: body.status || "pending",
    }
    
    console.log("[v0] Parsed lead data:", JSON.stringify(leadData, null, 2))
    
    // Validação básica - apenas nome é obrigatório
    if (!leadData.nome) {
      console.log("[v0] Validation failed - nome missing")
      return NextResponse.json(
        { 
          error: "Campo 'nome' é obrigatório",
          received: leadData,
          rawBody: body
        },
        { status: 400 }
      )
    }
    
    // Define valores padrão para campos faltantes
    if (!leadData.data) {
      leadData.data = new Date().toISOString().split("T")[0]
    }
    if (!leadData.hora) {
      leadData.hora = "09:00"
    }
    if (!leadData.responsavel) {
      leadData.responsavel = "Não informado"
    }
    
    // Verifica se já existe lead com mesmo kommo_id (evita duplicatas)
    if (leadData.kommo_id) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("kommo_id", leadData.kommo_id)
        .single()
      
      if (existing) {
        // Atualiza lead existente
        const { data, error } = await supabase
          .from("leads")
          .update(leadData)
          .eq("kommo_id", leadData.kommo_id)
          .select()
          .single()
        
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        
        return NextResponse.json({ 
          success: true, 
          action: "updated",
          lead: data 
        })
      }
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
      requiredFields: ["nome", "data", "hora", "responsavel"],
      optionalFields: ["tipo", "kommo_id", "status"]
    }
  })
}
