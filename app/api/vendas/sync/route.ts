import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getPeriodoProducaoAtual } from "@/lib/periodo-producao"

// Etapas "Vendido Produção" do Kommo (fallback caso a busca dinâmica falhe)
// IMPORTANTE: o Kommo cria uma nova etapa "Vendido" a cada período de produção,
// por isso buscamos dinamicamente todas as etapas com "vendido" no nome.
const ETAPAS_VENDIDO_FALLBACK = [71181426, 69615804]
const PIPELINE_ID = 8637094

// Busca dinamicamente os IDs de TODAS as etapas que contêm "vendido" no nome,
// dentro do pipeline de produção. Isso garante que vendas em etapas novas
// (criadas a cada período) sejam sempre capturadas.
async function getEtapasVendido(subdomain: string, token: string): Promise<number[]> {
  try {
    const res = await fetch(
      `https://${subdomain}.kommo.com/api/v4/leads/pipelines/${PIPELINE_ID}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    )
    if (!res.ok) {
      console.error("[v0] Erro ao buscar pipeline, usando fallback:", res.status)
      return ETAPAS_VENDIDO_FALLBACK
    }
    const data = await res.json()
    const statuses = data._embedded?.statuses || []
    const etapasVendido = statuses
      .filter((s: { name?: string }) => (s.name || "").toLowerCase().includes("vendido"))
      .map((s: { id: number }) => s.id)

    if (etapasVendido.length === 0) {
      console.warn("[v0] Nenhuma etapa 'Vendido' encontrada, usando fallback")
      return ETAPAS_VENDIDO_FALLBACK
    }

    // Garante que os IDs do fallback também estejam incluídos (etapas antigas)
    const todasEtapas = Array.from(new Set([...etapasVendido, ...ETAPAS_VENDIDO_FALLBACK]))
    console.log("[v0] Etapas 'Vendido' encontradas dinamicamente:", todasEtapas)
    return todasEtapas
  } catch (e) {
    console.error("[v0] Erro ao buscar etapas Vendido, usando fallback:", e)
    return ETAPAS_VENDIDO_FALLBACK
  }
}

// Campo customizado de Valor da Venda no Kommo
const CAMPO_VALOR_VENDA = 1085703

// Mapeamento vendedor -> equipe
const vendedorEquipe: Record<string, string> = {
  "Yuri Ryan Pereira": "Elite",
  "Yuri Pereira": "Elite",
  "Gisely Leal": "Guerreiros",
  "Rafaella Antunes": "Guerreiros",
  "Rafaella": "Guerreiros",
  "Lidiane Fonseca": "Guerreiros",
  "Lidiane": "Guerreiros",
  "Alexia Cunha": "Gladiadores",
  "Alexia": "Gladiadores",
  "Nathan Caue": "Gladiadores",
  "Nathan Cauê": "Gladiadores",
  "Leonardo Freitas": "Samurais",
  "João Victor": "Samurais",
  "Joao Victor": "Samurais",
  "Janaina Dantas": "Legado",
  "Janaína Dantas": "Legado",
  "Brayan": "Legado",
  "Brayan Bertolai": "Legado",
  "Nicolas Moraes": "Legado",
  "Gabrielly Pereira": "Legado",
  "Gabrielly": "Legado",
  "Alex Negreiros": "Lobos",
  "Lucas Dionisio": "Lobos",
  "Lucas Dionísio": "Lobos",
  "Ana Gabrielly": "Lobos",
  "Isabelly Ribeiro": "Lobos",
  "Isabelly": "Lobos",
  "Kleinver Seabra": "TDM",
  "Klaiver": "TDM",
  "Emily Machado": "TDM",
  "Emily": "TDM",
  "Amanda Souza": "TDM",
  "Amanda": "TDM",
  "Bianca Isabela": "TDM",
  "Bianca": "TDM",
  "Bianca da Silva": "TDM",
  "João Lucas": "TDM",
  "Joao Lucas": "TDM",
  "Ana Beatriz": "TDM",
  "Ana": "TDM",
}

export async function POST() {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN

  if (!token || !subdomain) {
    return NextResponse.json({ error: "Kommo não configurado" }, { status: 500 })
  }

  // Inicializa Supabase client dentro da função
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Período de produção: dia 21 ao dia 20 do mês seguinte
    const periodo = getPeriodoProducaoAtual()

    // Busca dinamicamente as etapas "Vendido" (o Kommo cria uma nova a cada período)
    const ETAPAS_VENDIDO = await getEtapasVendido(subdomain, token)

    // Busca leads de AMBAS as etapas "Vendido Produção"
    // Usa múltiplos filtros de status para pegar todas as etapas
    const statusFilters = ETAPAS_VENDIDO.map((s, i) => 
      `filter[statuses][${i}][pipeline_id]=${PIPELINE_ID}&filter[statuses][${i}][status_id]=${s}`
    ).join('&')
    
    const url = `https://${subdomain}.kommo.com/api/v4/leads?filter[pipeline_id]=${PIPELINE_ID}&${statusFilters}&with=custom_fields_values&limit=250`

    console.log("[v0] Buscando vendas do Kommo - Período:", periodo.mesReferencia, periodo.inicio, "a", periodo.fim)
    console.log("[v0] URL:", url)

    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[v0] Erro Kommo:", response.status, err.substring(0, 200))
      return NextResponse.json({ error: "Erro na API do Kommo", detail: err }, { status: response.status })
    }

    const text = await response.text()
    if (!text || text.trim() === "") {
      return NextResponse.json({ total: 0, vendas: [], message: "Nenhuma venda encontrada" })
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.error("[v0] Resposta inválida do Kommo:", text.substring(0, 200))
      return NextResponse.json({ total: 0, vendas: [] })
    }

    const leads = data._embedded?.leads || []
    console.log("[v0] Leads encontrados na etapa Vendido:", leads.length)

    // Processa cada lead e busca dados do responsável
    const vendas: Array<{
      kommo_id: string
      nome_lead: string
      responsavel: string
      equipe: string
      valor_venda: number
      data_venda: string
    }> = []

    for (const lead of leads) {
      const customFields: Array<{ field_id: number; values?: Array<{ value: unknown }> }> = lead.custom_fields_values || []
      
      // Extrai valor da venda - PRIORIZA lead.price (campo nativo "Venda" do Kommo)
      let valorVenda = 0
      
      // Primeiro tenta o campo price nativo do Kommo (campo "Venda")
      if (lead.price && Number(lead.price) > 0) {
        valorVenda = Number(lead.price)
      } else {
        // Fallback para campo customizado se existir
        const campoValor = customFields.find((f) => f.field_id === CAMPO_VALOR_VENDA)
        if (campoValor?.values?.[0]?.value) {
          valorVenda = Number(campoValor.values[0].value) || 0
        }
      }
      
      console.log(`[v0] Lead ${lead.id} (${lead.name}) - price: ${lead.price}, valorVenda: ${valorVenda}`)

      // Busca responsável
      let responsavelNome = "Não informado"
      if (lead.responsible_user_id) {
        try {
          const userResponse = await fetch(
            `https://${subdomain}.kommo.com/api/v4/users/${lead.responsible_user_id}`,
            { headers: { "Authorization": `Bearer ${token}` } }
          )
          if (userResponse.ok) {
            const user = await userResponse.json()
            responsavelNome = user.name || "Não informado"
          }
        } catch (e) {
          console.error("[v0] Erro ao buscar usuário:", e)
        }
      }

      const equipe = vendedorEquipe[responsavelNome] || "Outro"

      // data_venda = data em que o lead virou VENDA (entrou na etapa Vendido).
      // No Kommo, closed_at marca quando o lead foi ganho/fechado.
      // Fallback: updated_at (ultima modificacao) -> created_at -> hoje.
      const tsVenda = lead.closed_at || lead.updated_at || lead.created_at
      const dataLead = tsVenda
        ? new Date(tsVenda * 1000).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]

      vendas.push({
        kommo_id: lead.id.toString(),
        nome_lead: lead.name || "Sem nome",
        responsavel: responsavelNome,
        equipe: equipe,
        valor_venda: valorVenda,
        data_venda: dataLead,
      })
      console.log("[v0] Coletando:", lead.name, "| Responsável:", responsavelNome, "| Equipe:", equipe)
    }

    console.log("[v0] Vendas processadas:", vendas.length)

    // Upsert vendas no Supabase (atualiza se existir, insere se não)
    let inserted = 0
    let updated = 0

    for (const venda of vendas) {
      console.log("[v0] Processando venda:", venda.nome_lead, "| Responsável:", venda.responsavel, "| Valor:", venda.valor_venda, "| Data:", venda.data_venda)
      
      // Verifica se já existe
      const { data: existing } = await supabase
        .from("vendas")
        .select("id")
        .eq("kommo_id", venda.kommo_id)
        .single()

      if (existing) {
        // Atualiza tambem a data_venda para refletir quando o lead entrou no Vendido
        const { error: updateError } = await supabase
          .from("vendas")
          .update({
            nome_lead: venda.nome_lead,
            responsavel: venda.responsavel,
            valor_venda: venda.valor_venda,
            data_venda: venda.data_venda,
            updated_at: new Date().toISOString(),
          })
          .eq("kommo_id", venda.kommo_id)
        if (updateError) {
          console.error("[v0] Erro ao atualizar venda:", venda.nome_lead, updateError.message)
        } else {
          console.log("[v0] ✅ Venda atualizada:", venda.nome_lead)
          updated++
        }
      } else {
        // Insere
        const { error: insertError } = await supabase.from("vendas").insert({
          kommo_id: venda.kommo_id,
          nome_lead: venda.nome_lead,
          responsavel: venda.responsavel,
          valor_venda: venda.valor_venda,
          data_venda: venda.data_venda,
          created_at: new Date().toISOString(),
        })
        if (insertError) {
          console.error("[v0] Erro ao inserir venda:", venda.nome_lead, insertError.message)
        } else {
          console.log("[v0] ✅ Venda inserida:", venda.nome_lead)
          inserted++
        }
      }
    }

    // Remove vendas que nao estao mais na etapa "Vendido Producao" do Kommo
    const kommoIds = vendas.map(v => v.kommo_id)
    let deleted = 0
    
    if (kommoIds.length > 0) {
      // Busca TODAS as vendas no banco que NAO estao mais na etapa "Vendido" do Kommo.
      // Sem filtro de periodo: a tabela vendas deve ser um espelho EXATO da etapa do Kommo.
      const { data: vendasNoBanco } = await supabase
        .from("vendas")
        .select("id, kommo_id, nome_lead")
      
      if (vendasNoBanco) {
        for (const venda of vendasNoBanco) {
          if (!kommoIds.includes(venda.kommo_id)) {
            const { error: deleteError } = await supabase
              .from("vendas")
              .delete()
              .eq("id", venda.id)
            if (!deleteError) {
              console.log("[v0] Venda removida (saiu do Kommo):", venda.nome_lead)
              deleted++
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: vendas.length,
      inserted,
      updated,
      deleted,
      periodo: {
        inicio: periodo.inicio,
        fim: periodo.fim,
        mesReferencia: periodo.mesReferencia,
      },
      vendas,
    })
  } catch (error) {
    console.error("[v0] Erro ao sincronizar vendas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function GET() {
  // GET dispara a sincronização também
  return POST()
}
