import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Criar cliente Supabase direto para webhooks
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Busca dados do usuário no Kommo (equipe e foto)
async function getUserDataFromKommo(responsavelId: string): Promise<{ equipe: string | null, foto: string | null, nome: string | null }> {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN

  if (!token || !subdomain || !responsavelId) return { equipe: null, foto: null, nome: null }

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
      const foto = user.avatar || user.avatar_url || null
      const nome = user.name || null
      console.log("[v0] Dados do usuário:", responsavelId, "- Equipe:", equipe, "- Nome:", nome)
      return { equipe, foto, nome }
    }
  } catch (error) {
    console.error("[v0] Erro ao buscar dados do usuário:", error)
  }

  return { equipe: null, foto: null, nome: null }
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
        // Busca dados do usuário do Kommo (equipe, foto, nome correto)
        let equipe = lead.equipe
        let fotoResponsavel = null
        let nomeResponsavel = lead.responsavel
        
        if (lead.responsavel_id) {
          const userData = await getUserDataFromKommo(lead.responsavel_id.toString())
          if (!equipe) equipe = userData.equipe
          fotoResponsavel = userData.foto
          if (userData.nome) nomeResponsavel = userData.nome // Usa nome do Kommo se disponível
        }

        // Extrai data e hora do campo data_reuniao (formato: "2026-04-15 21:00")
        let dataReuniao = null
        let horaReuniao = null
        if (lead.data_reuniao) {
          const partes = lead.data_reuniao.split(" ")
          dataReuniao = partes[0] // "2026-04-15"
          horaReuniao = partes[1] || null // "21:00"
        }

        // Mapeia os campos do Kommo para as colunas da tabela leads
        const leadData: Record<string, any> = {
          kommo_id: lead.kommo_lead_id?.toString(),
          kommo_lead_id: lead.kommo_lead_id?.toString(),
          nome: lead.nome,
          responsavel: nomeResponsavel,
          responsavel_id: lead.responsavel_id?.toString(),
          equipe: equipe,
          origem: lead.origem,
          data: dataReuniao || lead.agendei || null,
          hora: horaReuniao || null,
          status: "pending",
          tipo: lead.tipo || null,
          tipo_reuniao: lead.tipo_reuniao || null,
          foto_responsavel: fotoResponsavel,
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
