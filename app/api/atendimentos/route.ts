import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Listar atendimentos da equipe
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const equipe = searchParams.get("equipe")

    if (!equipe) {
      return NextResponse.json({ error: "Equipe é obrigatória" }, { status: 400 })
    }

    const supabase = await createClient()

    // Admin vê todos, outras equipes só veem os seus
    const query = supabase
      .from("atendimentos")
      .select("*")
      .order("created_at", { ascending: false })

    if (equipe !== "Admin") {
      query.eq("equipe", equipe)
    }

    const { data, error } = await query

    if (error) {
      console.error("Erro ao buscar atendimentos:", error)
      return NextResponse.json({ error: "Erro ao buscar atendimentos" }, { status: 500 })
    }

    return NextResponse.json({ atendimentos: data || [] })
  } catch (error) {
    console.error("Erro ao buscar atendimentos:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Criar novo atendimento (quando lead muda para "veio")
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { lead_id, kommo_id, nome_lead, responsavel, equipe } = body

    if (!lead_id || !nome_lead || !responsavel || !equipe) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verificar se já existe atendimento para este lead
    const { data: existente } = await supabase
      .from("atendimentos")
      .select("id")
      .eq("lead_id", lead_id)
      .single()

    if (existente) {
      return NextResponse.json({ 
        success: true, 
        atendimento: existente,
        message: "Atendimento já existe" 
      })
    }

    // Criar novo atendimento
    const { data, error } = await supabase
      .from("atendimentos")
      .insert({
        lead_id,
        kommo_id,
        nome_lead,
        responsavel,
        equipe,
        status: "aguardando",
        data_atendimento: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar atendimento:", error)
      return NextResponse.json({ error: "Erro ao criar atendimento" }, { status: 500 })
    }

    return NextResponse.json({ success: true, atendimento: data })
  } catch (error) {
    console.error("Erro ao criar atendimento:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
