import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  
  try {
    let query = supabase
      .from("qualificacoes")
      .select("id, kommo_id, kommo_lead_id, nome, responsavel, responsavel_id, equipe, origem, data_qualificacao, created_at")
      .order("data_qualificacao", { ascending: false })
    
    // Filtra por período se fornecido
    if (startDate) {
      query = query.gte("data_qualificacao", startDate)
    }
    if (endDate) {
      query = query.lte("data_qualificacao", endDate)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error("[v0] Erro ao buscar qualificados:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Formata para o padrão esperado pelo hook
    const leads = (data || []).map(lead => ({
      id: lead.kommo_lead_id || lead.kommo_id || lead.id,
      nome: lead.nome,
      responsavel: lead.responsavel,
      responsavel_id: lead.responsavel_id,
      equipe: lead.equipe,
      origem: lead.origem,
      criado_em: lead.created_at,
      data_qualificacao: lead.data_qualificacao,
    }))
    
    return NextResponse.json({
      total: leads.length,
      leads,
    })
  } catch (error) {
    console.error("[v0] Erro ao buscar qualificados:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
