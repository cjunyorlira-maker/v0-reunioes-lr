import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getPeriodoProducaoAtual } from "@/lib/periodo-producao"

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null

// Etapas de "Vendido Produção" do Kommo - podem ter múltiplos IDs
// 71181426 = Vendido Produção 21/04 a 20/05 (correta para período de produção)
// 69615804 = Etapa antiga que estava sendo usada (precisa continuar aceitando)
const ETAPAS_VENDIDO = [71181426, 69615804]

// Mapeamento de responsável para equipe
const EQUIPE_MAP: Record<string, string> = {
  // Lobos
  "Nicolas Moraes": "Lobos", "Nicolas": "Lobos",
  "Rafaella Antunes": "Lobos", "Rafaella": "Lobos",
  "Lidiane Fonseca": "Lobos", "Lidiane": "Lobos",
  "Isabelly Ribeiro": "Lobos", "Isabelly": "Lobos",
  // Legado
  "Brayan": "Legado",
  "Lucas Dionisio": "Legado", "Lucas": "Legado",
  "Janaina Dantas": "Legado", "Janaina": "Legado",
  "Gabrielly Pereira": "Legado", "Gabrielly": "Legado",
  "Willy Santana": "Legado", "Willy": "Legado",
  "Joao Victor": "Legado", "João Victor": "Legado",
  // TDM
  "Kleinver Seabra": "TDM", "Klaiver": "TDM",
  "Emily Machado": "TDM", "Emily": "TDM",
  "Amanda Souza": "TDM", "Amanda": "TDM",
  "Bianca Isabela": "TDM", "Bianca": "TDM", "Bianca da Silva": "TDM",
  "João Lucas": "TDM", "Joao Lucas": "TDM",
  "Ana Beatriz": "TDM", "Ana": "TDM",
}

/**
 * Webhook do Kommo - chamado quando um lead muda de status
 * Configurar no Kommo: quando lead entrar na etapa 71181426 (Vendido Produção), 
 * POST para https://seu-dominio.vercel.app/api/webhook/kommo-venda
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[webhook-venda] Recebido:", JSON.stringify(body).slice(0, 500))

    if (!supabase) {
      return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 })
    }

    // Kommo envia dados em diferentes formatos dependendo do evento
    // Pode vir como leads[status][0][id] ou leads[add][0] etc
    const leads = body.leads || {}
    const statusLeads = leads.status || leads.update || leads.add || []
    
    if (!Array.isArray(statusLeads) || statusLeads.length === 0) {
      console.log("[webhook-venda] Nenhum lead no payload")
      return NextResponse.json({ success: true, message: "Nenhum lead" })
    }

    const periodo = getPeriodoProducaoAtual()
    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const lead of statusLeads) {
      const leadId = lead.id?.toString()
      const statusId = parseInt(lead.status_id || lead.new_status_id || "0")
      
      // Só processa se for uma das etapas de "Vendido Produção"
      if (!ETAPAS_VENDIDO.includes(statusId)) {
        console.log(`[webhook-venda] Lead ${leadId} não está em etapa de vendido (status: ${statusId}, esperado: ${ETAPAS_VENDIDO})`)
        skipped++
        continue
      }

      // Extrai dados do lead
      const nome = lead.name || "Sem nome"
      const valor = parseFloat(lead.price || lead.sale || "0")
      const responsavelId = lead.responsible_user_id
      
      // Busca nome do responsável (pode vir junto ou precisar buscar)
      let responsavelNome = lead.responsible_user_name || "Sem responsável"
      
      // Se veio custom_fields, tenta extrair valor da venda do campo customizado
      let valorVenda = valor
      if (lead.custom_fields_values && Array.isArray(lead.custom_fields_values)) {
        const campoValor = lead.custom_fields_values.find((f: any) => f.field_id === 1085703)
        if (campoValor?.values?.[0]?.value) {
          valorVenda = parseFloat(campoValor.values[0].value) || valor
        }
      }

      // Determina equipe
      const equipe = EQUIPE_MAP[responsavelNome] || "Sem equipe"

      // Verifica se já existe
      const { data: existing } = await supabase
        .from("vendas")
        .select("id")
        .eq("kommo_id", leadId)
        .single()

      if (existing) {
        // Atualiza
        const { error } = await supabase
          .from("vendas")
          .update({
            nome_lead: nome,
            responsavel: responsavelNome,
            valor_venda: valorVenda,
            updated_at: new Date().toISOString(),
          })
          .eq("kommo_id", leadId)

        if (!error) updated++
        console.log(`[webhook-venda] Atualizado: ${nome} (${leadId}) - R$ ${valorVenda}`)
      } else {
        // Busca a origem do lead correspondente (leads ou qualificacoes)
        let origemLead: string | null = null
        const { data: leadOrigem } = await supabase
          .from("leads").select("origem").eq("kommo_id", leadId)
          .not("origem", "is", null).limit(1).maybeSingle()
        if (leadOrigem?.origem) origemLead = leadOrigem.origem
        if (!origemLead) {
          const { data: qualOrigem } = await supabase
            .from("qualificacoes").select("origem").eq("kommo_lead_id", leadId)
            .not("origem", "is", null).limit(1).maybeSingle()
          if (qualOrigem?.origem) origemLead = qualOrigem.origem
        }

        // Insere nova venda
        const { error } = await supabase
          .from("vendas")
          .insert({
            kommo_id: leadId,
            nome_lead: nome,
            responsavel: responsavelNome,
            atendente: responsavelNome,
            valor_venda: valorVenda,
            data_venda: new Date().toISOString().split("T")[0],
            origem: origemLead,
          })

        if (!error) inserted++
        console.log(`[webhook-venda] Inserido: ${nome} (${leadId}) - R$ ${valorVenda}`)
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      skipped,
      message: `Processado: ${inserted} inseridas, ${updated} atualizadas, ${skipped} ignoradas`
    })

  } catch (err) {
    console.error("[webhook-venda] Erro:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// GET para verificar se o webhook está funcionando
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "Webhook de vendas do Kommo ativo",
    etapa_vendido: ETAPA_VENDIDO 
  })
}
