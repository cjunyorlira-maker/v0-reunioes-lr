import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getPeriodoProducaoAtual } from "@/lib/periodo-producao"

// Pipeline e etapa "Vendido Produção" reais no Kommo (pipeline "Principal")
const PIPELINE_ID = 7012299
const ETAPAS_VENDIDO = [71181426, 69615804]

// Campos customizados do lead no Kommo
const CAMPO_VALOR_VENDA = 1085703   // fallback de valor (campo nativo lead.price é prioritário)
const CAMPO_VENDA_FECHADA = 1026056 // timestamp da data em que a venda foi fechada

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
    // Período de produção: dia 23 ao dia 22 do mês seguinte
    const periodo = getPeriodoProducaoAtual()

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

      // Responsável: usa o usuário responsável padrão do lead (já mapeado às equipes)
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

      // data_venda = data em que a venda foi fechada.
      // PRIORIZA o campo customizado "Venda Fechada" (1026056, timestamp em segundos).
      // Fallback: closed_at -> updated_at -> created_at -> hoje.
      const campoVendaFechada = customFields.find((f) => f.field_id === CAMPO_VENDA_FECHADA)
      const tsVendaFechada = campoVendaFechada?.values?.[0]?.value
      const tsVenda = (tsVendaFechada && Number(tsVendaFechada))
        || lead.closed_at || lead.updated_at || lead.created_at
      const dataLead = tsVenda
        ? new Date(Number(tsVenda) * 1000).toISOString().split("T")[0]
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
            na_etapa_kommo: true,
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
        // Insere (atendente é NOT NULL: usa o próprio responsável como padrão)
        const { error: insertError } = await supabase.from("vendas").insert({
          kommo_id: venda.kommo_id,
          nome_lead: venda.nome_lead,
          responsavel: venda.responsavel,
          atendente: venda.responsavel,
          valor_venda: venda.valor_venda,
          data_venda: venda.data_venda,
          na_etapa_kommo: true,
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
      // Busca vendas no banco DENTRO do periodo atual que NAO estao mais na etapa do Kommo.
      // Filtra por periodo para NAO apagar producao de periodos passados.
      const { data: vendasNoBanco } = await supabase
        .from("vendas")
        .select("id, kommo_id, nome_lead, na_etapa_kommo")
        .gte("data_venda", periodo.inicio)
        .lte("data_venda", periodo.fim)
      
      if (vendasNoBanco) {
        for (const venda of vendasNoBanco) {
          if (venda.na_etapa_kommo === false) continue
          if (venda.kommo_id && !kommoIds.includes(venda.kommo_id)) {
            const { error: updError } = await supabase
              .from("vendas")
              .update({ na_etapa_kommo: false, updated_at: new Date().toISOString() })
              .eq("id", venda.id)
            if (!updError) {
              console.log("[v0] Venda marcada como fora da etapa:", venda.nome_lead)
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
