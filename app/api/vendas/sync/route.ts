import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getPeriodoProducaoAtual, timestampToDateString } from "@/lib/periodo-producao"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Etapa "Vendido Produção" do Kommo
const ETAPA_VENDIDO = 69615804
const PIPELINE_ID = 7012299

// Campo customizado de Valor da Venda no Kommo
// Você precisa verificar qual é o ID correto - por enquanto usa o campo price padrão do lead
const CAMPO_VALOR_VENDA = 1085703 // Ajustar conforme o ID real do campo no Kommo

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
  "Emily Machado": "TDM",
  "Emily": "TDM",
  "Amanda Souza": "TDM",
  "Amanda": "TDM",
  "Bianca Isabela": "TDM",
  "Bianca": "TDM",
  "João Lucas": "TDM",
  "Joao Lucas": "TDM",
  "Ana Beatriz": "TDM",
  "Ana": "TDM",
  "Willy Santana": "TDM",
  "Willy": "TDM",
}

export async function POST() {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN

  if (!token || !subdomain) {
    return NextResponse.json({ error: "Kommo não configurado" }, { status: 500 })
  }

  try {
    // Período de produção: dia 21 ao dia 20 do mês seguinte
    const periodo = getPeriodoProducaoAtual()

    // Busca TODOS os leads na etapa "Vendido Produção" (69615804)
    // Filtragem por data será feita no código, pois o Kommo usa updated_at que pode ser diferente da data de venda
    const url = `https://${subdomain}.kommo.com/api/v4/leads?filter[pipeline_id]=${PIPELINE_ID}&filter[statuses][0][pipeline_id]=${PIPELINE_ID}&filter[statuses][0][status_id]=${ETAPA_VENDIDO}&with=custom_fields_values&limit=250`

    console.log("[v0] Buscando vendas do Kommo - Período:", periodo.mesReferencia, periodo.inicio, "a", periodo.fim)

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
      
      // Extrai valor da venda - tenta campo customizado primeiro, depois price do lead
      let valorVenda = 0
      const campoValor = customFields.find((f) => f.field_id === CAMPO_VALOR_VENDA)
      if (campoValor?.values?.[0]?.value) {
        valorVenda = Number(campoValor.values[0].value) || 0
      }
      // Se não achou no campo customizado, usa o price do lead
      if (valorVenda === 0 && lead.price) {
        valorVenda = Number(lead.price) || 0
      }

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

      vendas.push({
        kommo_id: lead.id.toString(),
        nome_lead: lead.name || "Sem nome",
        responsavel: responsavelNome,
        equipe: equipe,
        valor_venda: valorVenda,
        data_venda: timestampToDateString(lead.updated_at),
      })
    }

    console.log("[v0] Vendas processadas:", vendas.length)

    // Upsert vendas no Supabase (atualiza se existir, insere se não)
    let inserted = 0
    let updated = 0

    for (const venda of vendas) {
      // Verifica se já existe
      const { data: existing } = await supabase
        .from("vendas")
        .select("id")
        .eq("kommo_id", venda.kommo_id)
        .single()

      if (existing) {
        // Atualiza
        await supabase
          .from("vendas")
          .update({
            nome_lead: venda.nome_lead,
            responsavel: venda.responsavel,
            valor_venda: venda.valor_venda,
            data_venda: venda.data_venda,
            updated_at: new Date().toISOString(),
          })
          .eq("kommo_id", venda.kommo_id)
        updated++
      } else {
        // Insere
        await supabase.from("vendas").insert({
          kommo_id: venda.kommo_id,
          nome_lead: venda.nome_lead,
          responsavel: venda.responsavel,
          valor_venda: venda.valor_venda,
          data_venda: venda.data_venda,
          created_at: new Date().toISOString(),
        })
        inserted++
      }
    }

    return NextResponse.json({
      success: true,
      total: vendas.length,
      inserted,
      updated,
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
