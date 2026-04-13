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

// Busca dados COMPLETOS do lead direto no Kommo pela API
async function getLeadFromKommo(leadId: string): Promise<any | null> {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN

  if (!token || !subdomain || !leadId) return null

  try {
    const response = await fetch(
      `https://${subdomain}.kommo.com/api/v4/leads/${leadId}?with=contacts`,
      {
        headers: { "Authorization": `Bearer ${token}` },
      }
    )

    if (response.ok) {
      const lead = await response.json()
      console.log("[v0] Lead completo do Kommo:", leadId, "- Nome:", lead.name)
      return lead
    }
  } catch (error) {
    console.error("[v0] Erro ao buscar lead do Kommo:", error)
  }

  return null
}

// Extrai campos customizados do lead do Kommo
function extractCustomFields(lead: any): Record<string, any> {
  const cf: Record<string, any> = {}
  const customFields = lead.custom_fields_values || []
  
  for (const field of customFields) {
    const name = field.field_name
    const value = field.values?.[0]?.value
    if (name && value !== undefined) {
      cf[name] = value
    }
  }
  
  return cf
}

// Converte timestamp Unix para data (YYYY-MM-DD)
function tsToDate(ts: number | string | null): string | null {
  if (!ts) return null
  const timestamp = typeof ts === 'string' ? parseInt(ts) : ts
  if (isNaN(timestamp)) return null
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
}

// Converte timestamp Unix para data e hora
function tsToDateTime(ts: number | string | null): { data: string | null, hora: string | null } {
  if (!ts) return { data: null, hora: null }
  const timestamp = typeof ts === 'string' ? parseInt(ts) : ts
  if (isNaN(timestamp)) return { data: null, hora: null }
  const date = new Date(timestamp * 1000)
  return {
    data: date.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }),
    hora: date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })
  }
}

// Extrai ID e Status do formato RAW do Kommo (leads[status][0][id] ou leads[update][0][id])
function extractFromRawKommo(body: any): { leadId: string | null, statusId: string | null } {
  // Tenta diferentes formatos que o Kommo pode enviar
  const formats = [
    // Formato quando muda status: leads[status][0][id]
    { idKey: "leads[status][0][id]", statusKey: "leads[status][0][status_id]" },
    // Formato quando atualiza: leads[update][0][id]
    { idKey: "leads[update][0][id]", statusKey: "leads[update][0][status_id]" },
    // Formato quando adiciona: leads[add][0][id]
    { idKey: "leads[add][0][id]", statusKey: "leads[add][0][status_id]" },
  ]
  
  // Se tem body.body (N8N passou o webhook completo)
  const data = body.body || body
  
  for (const format of formats) {
    const leadId = data[format.idKey]
    const statusId = data[format.statusKey]
    if (leadId) {
      console.log("[v0] Extraído do formato RAW:", format.idKey, "->", leadId)
      return { leadId: leadId.toString(), statusId: statusId?.toString() || null }
    }
  }
  
  return { leadId: null, statusId: null }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("[v0] N8N Webhook recebido:", JSON.stringify(body).substring(0, 500))

    // Normaliza para array
    const leads = Array.isArray(body) ? body : [body]
    const supabase = getSupabaseClient()
    const results = []

    for (const leadInput of leads) {
      try {
        // NOVA LÓGICA: Extrai ID e status de diferentes formatos
        let kommoLeadId = leadInput.kommo_lead_id?.toString() || leadInput.kommo_id?.toString()
        let statusId = leadInput.status_id?.toString()
        
        // Se não tem o ID nos campos normais, tenta extrair do payload
        if (!kommoLeadId && leadInput.id) {
          kommoLeadId = leadInput.id.toString()
        }
        
        // Se ainda não tem ID, tenta extrair do formato RAW do Kommo
        if (!kommoLeadId) {
          const rawData = extractFromRawKommo(leadInput)
          kommoLeadId = rawData.leadId
          if (!statusId) statusId = rawData.statusId
        }
        
        // Última tentativa: procurar em todos_campos
        if (!kommoLeadId && leadInput.todos_campos) {
          const raw = extractFromRawKommo(leadInput.todos_campos)
          kommoLeadId = raw.leadId
          if (!statusId) statusId = raw.statusId
        }
        
        console.log("[v0] Lead ID:", kommoLeadId, "Status:", statusId)
        
        if (!kommoLeadId) {
          console.log("[v0] Lead sem ID, ignorando")
          results.push({ action: "ignored", reason: "sem_id" })
          continue
        }
        
        // BUSCA DADOS COMPLETOS DO LEAD DIRETAMENTE NO KOMMO
        const kommoLead = await getLeadFromKommo(kommoLeadId)
        
        if (!kommoLead) {
          console.log("[v0] Lead não encontrado no Kommo:", kommoLeadId)
          results.push({ action: "error", reason: "lead_nao_encontrado_kommo", kommo_id: kommoLeadId })
          continue
        }
        
        // Extrai campos customizados do lead do Kommo
        const cf = extractCustomFields(kommoLead)
        console.log("[v0] Campos customizados:", JSON.stringify(cf))
        
        // Usa o status do Kommo se não veio no payload
        if (!statusId) {
          statusId = kommoLead.status_id?.toString()
        }
        
        const STATUS_VENDENDO_REUNIAO = "58498479"
        const STATUS_CONFIRMAR_REUNIAO = "67567420"
        
        // Busca dados do responsável (equipe, foto, nome)
        const responsavelId = kommoLead.responsible_user_id?.toString()
        let equipe = null
        let fotoResponsavel = null
        let nomeResponsavel = null
        
        if (responsavelId) {
          const userData = await getUserDataFromKommo(responsavelId)
          equipe = userData.equipe
          fotoResponsavel = userData.foto
          nomeResponsavel = userData.nome
        }
        
        // Se chegou em "Vendendo Reunião", marca data_qualificacao (sem criar cartão)
        if (statusId === STATUS_VENDENDO_REUNIAO) {
          console.log("[v0] Lead em 'Vendendo Reunião':", kommoLead.name)
          
          const qualificacaoData = {
            kommo_id: kommoLeadId,
            kommo_lead_id: kommoLeadId,
            nome: kommoLead.name,
            responsavel: nomeResponsavel || cf["Responsável"],
            responsavel_id: responsavelId,
            equipe: equipe,
            origem: cf["Origem"] || null,
            data_qualificacao: tsToDate(cf["Qualifiquei"]) || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }),
          }
          
          // Verifica se já existe
          const { data: existing } = await supabase
            .from("qualificacoes")
            .select("id")
            .eq("kommo_id", qualificacaoData.kommo_id)
            .single()
          
          if (existing) {
            await supabase
              .from("qualificacoes")
              .update(qualificacaoData)
              .eq("id", existing.id)
          } else {
            await supabase.from("qualificacoes").insert([qualificacaoData])
          }
          
          results.push({ action: "qualificado", lead_name: kommoLead.name, kommo_id: kommoLeadId, equipe: equipe })
          continue
        }
        
        // Se chegou em "Confirmar Reunião", cria/atualiza o cartão
        if (statusId !== STATUS_CONFIRMAR_REUNIAO) {
          console.log("[v0] Lead ignorado - etapa:", statusId)
          results.push({ action: "ignored", reason: "etapa_incorreta", status_id: statusId, lead_name: kommoLead.name })
          continue
        }

        // Extrai data e hora da reunião
        const dataReuniaoRaw = cf["Data da Reunião"]
        const { data: dataReuniao, hora: horaReuniao } = tsToDateTime(dataReuniaoRaw)

        // Mapeia os campos do Kommo para as colunas da tabela leads
        const leadData: Record<string, any> = {
          kommo_id: kommoLeadId,
          kommo_lead_id: kommoLeadId,
          nome: kommoLead.name,
          responsavel: nomeResponsavel || cf["Responsável"],
          responsavel_id: responsavelId,
          equipe: equipe,
          origem: cf["Origem"] || null,
          data: dataReuniao || tsToDate(cf["Agendei"]) || null,
          hora: horaReuniao || null,
          status: "pending",
          tipo: cf["Tipo do Bem"] || null,
          tipo_reuniao: cf["Tipo de Reunião"] || null,
          foto_responsavel: fotoResponsavel,
          data_agendei: tsToDate(cf["Agendei"]) || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }),
          data_original: dataReuniao || tsToDate(cf["Agendei"]) || null,
          data_qualificacao: tsToDate(cf["Qualifiquei"]) || null,
        }
        
        // Remove campos undefined/null para não sobrescrever
        Object.keys(leadData).forEach(key => {
          if (leadData[key] === undefined) delete leadData[key]
        })

        // Verifica se já existe pelo kommo_id
        const { data: existing } = await supabase
          .from("leads")
          .select("id, data_original")
          .eq("kommo_id", leadData.kommo_id)
          .single()

        if (existing) {
          // Se já existe, não sobrescreve data_original
          if (existing.data_original) {
            delete leadData.data_original
          }
          
          const { data, error } = await supabase
            .from("leads")
            .update(leadData)
            .eq("id", existing.id)
            .select()

          if (error) throw error
          results.push({ action: "updated", lead: data?.[0], kommo_id: kommoLeadId })
          console.log("[v0] Lead atualizado:", leadData.nome)
        } else {
          const { data, error } = await supabase
            .from("leads")
            .insert([leadData])
            .select()

          if (error) {
            if (error.code === "23505") {
              console.log("[v0] Lead já existe (inserido por outro request):", leadData.nome)
              results.push({ action: "skipped_duplicate", kommo_id: kommoLeadId })
            } else {
              throw error
            }
          } else {
            results.push({ action: "created", lead: data?.[0], kommo_id: kommoLeadId })
            console.log("[v0] Lead criado:", leadData.nome)
          }
        }
      } catch (error: any) {
        const errorMsg = error?.message || error?.details || JSON.stringify(error)
        console.error("[v0] Erro ao processar lead:", errorMsg)
        results.push({ 
          action: "error", 
          kommo_id: leadInput.kommo_lead_id,
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
