import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

// Função para extrair dados do payload do Kommo
function extractKommoData(data: any): { leadId: string | null; statusId: string | null } {
  // Formato: leads[status][0][id]
  const formats = [
    { idKey: "leads[status][0][id]", statusKey: "leads[status][0][status_id]" },
    { idKey: "leads[update][0][id]", statusKey: "leads[update][0][status_id]" },
    { idKey: "leads[add][0][id]", statusKey: "leads[add][0][status_id]" },
  ]

  for (const format of formats) {
    const leadId = data[format.idKey]
    const statusId = data[format.statusKey]
    if (leadId) {
      return { leadId: leadId.toString(), statusId: statusId?.toString() || null }
    }
  }

  return { leadId: null, statusId: null }
}

// Busca dados completos do lead na API do Kommo
async function fetchLeadFromKommo(leadId: string) {
  const KOMMO_DOMAIN = process.env.KOMMO_DOMAIN || "crm2lrmultimarcascom"
  const KOMMO_TOKEN = process.env.KOMMO_API_TOKEN

  if (!KOMMO_TOKEN) {
    console.log("[v0] KOMMO_API_TOKEN não configurado")
    return null
  }

  try {
    const url = `https://${KOMMO_DOMAIN}.kommo.com/api/v4/leads/${leadId}?with=contacts`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${KOMMO_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.log("[v0] Erro ao buscar lead:", response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.log("[v0] Erro fetch Kommo:", error)
    return null
  }
}

// Extrai campos customizados do lead
function extractCustomFields(lead: any) {
  const fields: Record<string, any> = {}
  const customFields = lead.custom_fields_values || []

  const fieldMapping: Record<string, string> = {
    "Origem": "origem",
    "Qualifiquei": "data_qualificacao",
    "Data da Reunião": "data_reuniao",
    "Agendei": "data_agendei",
    "Equipe": "equipe",
    "Tipo de Reunião": "tipo_reuniao",
  }

  customFields.forEach((field: any) => {
    const mappedName = fieldMapping[field.field_name]
    if (mappedName && field.values?.[0]?.value) {
      fields[mappedName] = field.values[0].value
    }
  })

  return fields
}

// Tabela temporária para armazenar leads pendentes de aprovação
const TABELA_PENDENTES = "leads_pendentes_importacao"

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] === IMPORTAR FALTARAM - WEBHOOK RECEBIDO ===")
    const contentType = req.headers.get("content-type") || ""

    let bodyRaw: any
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text()
      const params = new URLSearchParams(text)
      bodyRaw = {}
      params.forEach((value, key) => {
        bodyRaw[key] = value
      })
    } else {
      bodyRaw = await req.json()
    }

    const body = bodyRaw.body || bodyRaw
    const { leadId } = extractKommoData(body)

    if (!leadId) {
      console.log("[v0] Sem ID de lead")
      return NextResponse.json({ success: false, error: "sem_id" })
    }

    console.log("[v0] Lead ID encontrado:", leadId)

    // Busca dados completos do Kommo
    const leadData = await fetchLeadFromKommo(leadId)
    if (!leadData) {
      return NextResponse.json({ success: false, error: "erro_fetch_kommo" })
    }

    const customFields = extractCustomFields(leadData)
    const supabase = getSupabaseClient()

    // Verifica se já existe na tabela leads
    const { data: existente } = await supabase
      .from("leads")
      .select("id")
      .eq("kommo_id", leadId)
      .single()

    if (existente) {
      console.log("[v0] Lead já existe na tabela leads")
      return NextResponse.json({ 
        success: true, 
        action: "ja_existe",
        kommo_id: leadId 
      })
    }

    // Monta objeto do lead
    const leadParaImportar = {
      kommo_id: leadId,
      nome: leadData.name || "Sem nome",
      responsavel: leadData._embedded?.contacts?.[0]?.name || leadData.responsible_user_id?.toString() || null,
      equipe: customFields.equipe || null,
      origem: customFields.origem || null,
      data_reuniao: customFields.data_reuniao || null,
      data_agendei: customFields.data_agendei || null,
      data_qualificacao: customFields.data_qualificacao || null,
      tipo_reuniao: customFields.tipo_reuniao || null,
      status: "nao", // Faltou
      raw_data: JSON.stringify(leadData),
      created_at: new Date().toISOString(),
    }

    console.log("[v0] Lead para importar:", JSON.stringify(leadParaImportar, null, 2))

    // Salva na tabela de pendentes (precisa criar essa tabela)
    // Por enquanto vamos salvar direto numa tabela auxiliar
    const { error } = await supabase
      .from("leads_importacao_pendentes")
      .upsert(leadParaImportar, { onConflict: "kommo_id" })

    if (error) {
      // Se a tabela não existe, cria na hora
      if (error.code === "42P01") {
        console.log("[v0] Tabela não existe, salvando em leads direto como pendente")
        // Salva direto em leads mas com flag
        const { error: insertError } = await supabase.from("leads").insert({
          ...leadParaImportar,
          status: "pendente_importacao",
        })
        
        if (insertError) {
          console.log("[v0] Erro ao inserir:", insertError)
          return NextResponse.json({ success: false, error: insertError.message })
        }
      } else {
        console.log("[v0] Erro ao salvar pendente:", error)
        return NextResponse.json({ success: false, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      action: "pendente_aprovacao",
      lead: leadParaImportar,
    })

  } catch (error: any) {
    console.log("[v0] Erro geral:", error)
    return NextResponse.json({ success: false, error: error.message })
  }
}

// GET para listar leads pendentes de importação
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    
    // Busca leads pendentes
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "pendente_importacao")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message })
    }

    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      leads: data || [],
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
