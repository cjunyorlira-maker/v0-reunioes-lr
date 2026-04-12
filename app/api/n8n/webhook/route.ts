import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("[v0] N8N Webhook recebido:", JSON.stringify(body))

    // Se for um array, processa cada item
    const leads = Array.isArray(body) ? body : [body]

    const supabase = createClient()
    const results = []

    for (const lead of leads) {
      try {
        // Mapeia os campos do Kommo para os campos da app
        const leadData = {
          kommo_id: lead.kommo_lead_id?.toString(),
          nome: lead.nome,
          responsavel: lead.responsavel,
          responsavel_id: lead.responsavel_id?.toString(),
          equipe: lead.equipe,
          origem: lead.origem,
          data: lead.agendei || lead.created_at, // Data do agendamento ou criação
          hora: lead.data_reuniao ? new Date(lead.data_reuniao).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null,
          status: getStatusFromKommo(lead),
          valor: lead.price ? parseFloat(lead.price) : null,
          entrada: lead.entrada ? parseFloat(lead.entrada) : null,
          parcela: lead.parcela ? parseFloat(lead.parcela) : null,
          tipo_bem: lead.tipo,
          tipo_reuniao: lead.tipo_reuniao,
          tags: lead.tags?.join(", ") || null,
          atendente: null,
          venda_fechada: false,
          retorno: lead.tags?.includes("Retornar contato") || false,
          qualificado: lead.qualifiquei ? true : false,
          data_qualificacao: lead.qualifiquei,
        }

        // Verifica se já existe pelo kommo_id
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .eq("kommo_id", leadData.kommo_id)
          .single()

        if (existing) {
          // Atualiza
          const { data, error } = await supabase
            .from("leads")
            .update(leadData)
            .eq("id", existing.id)
            .select()

          if (error) throw error
          results.push({ action: "updated", lead: data?.[0] })
          console.log("[v0] Lead atualizado:", leadData.nome)
        } else {
          // Insere novo
          const { data, error } = await supabase
            .from("leads")
            .insert([leadData])
            .select()

          if (error) throw error
          results.push({ action: "created", lead: data?.[0] })
          console.log("[v0] Lead criado:", leadData.nome)
        }
      } catch (error) {
        console.error("[v0] Erro ao processar lead:", error)
        results.push({ action: "error", error: String(error) })
      }
    }

    return NextResponse.json({ success: true, results }, { status: 200 })
  } catch (error) {
    console.error("[v0] Erro no webhook N8N:", error)
    return NextResponse.json(
      { error: String(error) },
      { status: 400 }
    )
  }
}

// Helper para mapear status do Kommo para a app
function getStatusFromKommo(lead: any): string {
  const tags = lead.tags || []
  
  if (tags.includes("Agendei")) return "agendado"
  if (lead.status_id === "58498483") return "veio"
  if (lead.status_id === "67567420") return "marcado"
  
  if (lead.qualifiquei) return "qualificado"
  
  // Default based on pipeline
  return "pendente"
}
