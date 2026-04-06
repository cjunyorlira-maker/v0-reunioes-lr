import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Webhook endpoint para integração com Make.com / Kommo
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    const body = await request.json()
    
    // Suporte para diferentes formatos de payload do Make/Kommo
    const leadData = {
      nome: body.nome || body.name || body.lead_name || body.contact_name,
      data: body.data || body.date || body.meeting_date,
      hora: body.hora || body.time || body.meeting_time,
      responsavel: body.responsavel || body.responsible || body.assigned_to || body.user_name,
      tipo: body.tipo || body.type || "Imóvel",
      kommo_id: body.kommo_id || body.lead_id || body.id?.toString(),
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
