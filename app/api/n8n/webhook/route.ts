import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Criar cliente Supabase direto para webhooks
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Busca a equipe do usuário no Kommo
async function getEquipeFromKommo(responsavelId: string): Promise<string | null> {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN

  if (!token || !subdomain || !responsavelId) return null

  try {
    const response = await fetch(
      `https://${subdomain}.kommo.com/api/v4/users/${responsavelId}?with=group`,
      {
        headers: { "Authorization": `Bearer ${token}` },
      }
    )

    if (response.ok) {
      const user = await response.json()
      const equipe = user._embedded?.groups?.[0]?.name || user.group?.name || null
      console.log("[v0] Equipe encontrada para", responsavelId, ":", equipe)
      return equipe
    }
  } catch (error) {
    console.error("[v0] Erro ao buscar equipe:", error)
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("[v0] N8N Webhook recebido - Lead:", body.nome)

    // Normaliza para array
    const leads = Array.isArray(body) ? body : [body]
    const supabase = getSupabaseClient()
    const results = []

    for (const lead of leads) {
      try {
        // Se equipe não veio, busca do Kommo pelo responsavel_id
        let equipe = lead.equipe
        if (!equipe && lead.responsavel_id) {
          equipe = await getEquipeFromKommo(lead.responsavel_id.toString())
        }

        // Detecta status baseado nas tags e custom fields
        let status = "pendente"
        if (lead.tags?.includes("Agendei")) status = "agendado"
        if (lead.tags?.includes("Marcado")) status = "marcado"
        if (lead.tags?.includes("Veio")) status = "veio"
        if (lead.tags?.includes("Não Veio")) status = "nao"
        if (lead.qualifiquei) status = "qualificado"

        // Mapeia os campos do Kommo para as colunas da tabela leads
        // Colunas existentes: id, created_at, updated_at, nome, kommo_id, kommo_lead_id, 
        // responsavel, responsavel_id, equipe, origem, data, hora, status, tipo, 
        // tipo_reuniao, atendente, venda_fechada, retorno, remarcado, foto_responsavel
        const leadData: Record<string, any> = {
          kommo_id: lead.kommo_lead_id?.toString(),
          kommo_lead_id: lead.kommo_lead_id?.toString(),
          nome: lead.nome,
          responsavel: lead.responsavel,
          responsavel_id: lead.responsavel_id?.toString(),
          equipe: equipe,
          origem: lead.origem,
          data: lead.agendei || null,
          hora: lead.hora_reuniao || null,
          status: status,
          tipo: lead.tipo || null,
          tipo_reuniao: lead.tipo_reuniao || null,
          venda_fechada: lead.tags?.includes("Venda Fechada") || false,
          retorno: lead.tags?.includes("Retornar contato") || false,
          remarcado: lead.tags?.includes("Remarcado") || false,
        }
        
        // Remove campos undefined para não sobrescrever com null
        Object.keys(leadData).forEach(key => {
          if (leadData[key] === undefined) delete leadData[key]
        })

        // Verifica se já existe pelo kommo_id
        const { data: existing, error: fetchError } = await supabase
          .from("leads")
          .select("id")
          .eq("kommo_id", leadData.kommo_id)
          .single()

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError
        }

        if (existing) {
          // Atualiza o lead existente
          const { data, error } = await supabase
            .from("leads")
            .update(leadData)
            .eq("id", existing.id)
            .select()

          if (error) throw error
          results.push({ action: "updated", lead: data?.[0], kommo_id: lead.kommo_lead_id })
          console.log("[v0] Lead atualizado:", leadData.nome, "ID:", existing.id)
        } else {
          // Insere novo lead
          const { data, error } = await supabase
            .from("leads")
            .insert([leadData])
            .select()

          if (error) throw error
          results.push({ action: "created", lead: data?.[0], kommo_id: lead.kommo_lead_id })
          console.log("[v0] Lead criado:", leadData.nome)
        }
      } catch (error: any) {
        const errorMsg = error?.message || error?.details || JSON.stringify(error)
        console.error("[v0] Erro ao processar lead:", errorMsg)
        results.push({ 
          action: "error", 
          lead_name: lead.nome,
          kommo_id: lead.kommo_lead_id,
          error: errorMsg
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results 
    }, { status: 200 })
  } catch (error) {
    console.error("[v0] Erro no webhook N8N:", error)
    return NextResponse.json(
      { error: String(error) },
      { status: 400 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: "Webhook N8N ativo e pronto para receber dados" })
}
