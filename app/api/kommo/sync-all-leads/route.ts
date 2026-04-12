import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// IDs das etapas que devem aparecer no quadro
const ETAPAS_QUADRO = [
  67567420,   // Confirmar Reunião
  58498483,   // Reunião Confirmada
  102225923,  // Remarcados
  69799508,   // Vieram
  69799504,   // Não Vieram
]

// IDs dos campos customizados
const CAMPO_DATA_REUNIAO_ID = 1025159
const CAMPO_TIPO_REUNIAO_ID = 1026810
const CAMPO_ORIGEM_ID = 797344

export async function POST() {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN

  if (!token || !subdomain) {
    return NextResponse.json({ error: "Credenciais do Kommo não configuradas" }, { status: 500 })
  }

  const results: any[] = []
  let totalImported = 0

  try {
    for (const statusId of ETAPAS_QUADRO) {
      // Busca leads de cada etapa
      let page = 1
      let hasMore = true

      while (hasMore) {
        const response = await fetch(
          `https://${subdomain}.kommo.com/api/v4/leads?filter[statuses][0][status_id]=${statusId}&filter[statuses][0][pipeline_id]=7012299&with=contacts&page=${page}&limit=50`,
          {
            headers: { "Authorization": `Bearer ${token}` },
          }
        )

        if (!response.ok) {
          console.error(`Erro ao buscar etapa ${statusId}:`, response.status)
          break
        }

        const data = await response.json()
        const leads = data._embedded?.leads || []

        if (leads.length === 0) {
          hasMore = false
          break
        }

        for (const lead of leads) {
          try {
            // Busca dados do responsável
            let responsavelNome = "Sem responsável"
            let responsavelId = null
            let equipe = null
            let fotoResponsavel = null

            if (lead.responsible_user_id) {
              responsavelId = lead.responsible_user_id
              try {
                const userResp = await fetch(
                  `https://${subdomain}.kommo.com/api/v4/users/${lead.responsible_user_id}?with=group`,
                  { headers: { "Authorization": `Bearer ${token}` } }
                )
                if (userResp.ok) {
                  const user = await userResp.json()
                  responsavelNome = user.name || "Sem responsável"
                  equipe = user._embedded?.groups?.[0]?.name || null
                  fotoResponsavel = user.avatar || null
                }
              } catch (e) {
                console.error("Erro ao buscar usuário:", e)
              }
            }

            // Extrai campos customizados
            let dataReuniao: string | null = null
            let horaReuniao: string | null = null
            let tipoReuniao: string | null = null
            let origem: string | null = null

            const customFields = lead.custom_fields_values || []
            for (const field of customFields) {
              const fieldId = field.field_id
              const value = field.values?.[0]?.value

              if (fieldId === CAMPO_DATA_REUNIAO_ID && value && typeof value === "number") {
                const date = new Date(value * 1000)
                dataReuniao = date.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
                horaReuniao = date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })
              }

              if (fieldId === CAMPO_TIPO_REUNIAO_ID && value) {
                tipoReuniao = String(value)
              }

              if (fieldId === CAMPO_ORIGEM_ID && value) {
                origem = String(value)
              }
            }

            // Define status baseado na etapa
            let status: "pending" | "veio" | "nao" = "pending"
            if (statusId === 69799508) status = "veio"
            if (statusId === 69799504) status = "nao"

            // Verifica se já existe pelo kommo_id numérico
            const { data: existing } = await supabase
              .from("leads")
              .select("id")
              .eq("kommo_id", lead.id.toString())
              .single()

            const leadData = {
              kommo_id: lead.id.toString(),
              kommo_lead_id: lead.id.toString(),
              nome: lead.name,
              responsavel: responsavelNome,
              responsavel_id: responsavelId?.toString(),
              equipe,
              origem,
              data: dataReuniao,
              hora: horaReuniao,
              status,
              tipo_reuniao: tipoReuniao,
              foto_responsavel: fotoResponsavel,
              remarcado: statusId === 102225923,
            }

            if (existing) {
              await supabase
                .from("leads")
                .update(leadData)
                .eq("id", existing.id)
              results.push({ action: "updated", nome: lead.name, kommo_id: lead.id })
            } else {
              await supabase.from("leads").insert([leadData])
              results.push({ action: "created", nome: lead.name, kommo_id: lead.id })
              totalImported++
            }
          } catch (leadError) {
            console.error("Erro ao processar lead:", lead.name, leadError)
            results.push({ action: "error", nome: lead.name, error: String(leadError) })
          }
        }

        page++
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return NextResponse.json({
      success: true,
      totalImported,
      results,
    })
  } catch (error) {
    console.error("Erro na sincronização:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
