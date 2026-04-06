import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Webhook endpoint para integração com Make.com / Kommo
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    const body = await request.json()
    
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
    
    // Verifica se veio campo combinado de data/hora
    const dataHoraCombinada = body.data_hora || body.datetime || body.data_reuniao || body.meeting_datetime
    let dataFinal = body.data || body.date || body.meeting_date
    let horaFinal = body.hora || body.time || body.meeting_time
    
    if (dataHoraCombinada) {
      const parsed = parseDateTime(dataHoraCombinada)
      dataFinal = parsed.data
      horaFinal = parsed.hora
    }
    
    // Suporte para diferentes formatos de payload do Make/Kommo
    const leadData = {
      nome: body.nome || body.name || body.lead_name || body.contact_name,
      data: dataFinal,
      hora: horaFinal,
      responsavel: body.responsavel || body.responsible || body.assigned_to || body.user_name || body.atendente,
      tipo: body.tipo || body.type || "",
      kommo_id: body.kommo_id || body.lead_id || body.id?.toString() || body.atendente_id,
      status: body.status || "pending",
    }
    
    // Validação básica
    if (!leadData.nome || !leadData.data || !leadData.hora || !leadData.responsavel) {
      return NextResponse.json(
        { 
          error: "Campos obrigatórios faltando",
          required: ["nome", "data", "hora", "responsavel"],
          received: leadData 
        },
        { status: 400 }
      )
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
