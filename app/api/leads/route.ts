import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  
  let query = supabase
    .from("leads")
    .select("*")
    .order("data", { ascending: true })
    .order("hora", { ascending: true })
  
  if (startDate && endDate) {
    query = query.gte("data", startDate).lte("data", endDate)
  }
  
  const { data, error } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  const { nome, data, hora, responsavel, tipo, kommo_id, status } = body
  
  if (!nome || !data || !hora || !responsavel) {
    return NextResponse.json(
      { error: "Campos obrigatórios: nome, data, hora, responsavel" },
      { status: 400 }
    )
  }
  
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      nome,
      data,
      hora,
      responsavel,
      tipo: tipo || "Imóvel",
      kommo_id: kommo_id || null,
      status: status || "pending",
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(lead, { status: 201 })
}
