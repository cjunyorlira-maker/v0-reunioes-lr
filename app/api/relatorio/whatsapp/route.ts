import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Gera relatório formatado para WhatsApp
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
    
    // Busca leads do dia
    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .eq("data", date)

    // Busca qualificados do dia
    const { data: qualificados } = await supabase
      .from("pluga_eventos")
      .select("*")
      .eq("tipo", "qualificado")
      .gte("data_evento", `${date}T00:00:00`)
      .lte("data_evento", `${date}T23:59:59`)

    // Agrupa por vendedor
    const stats: Record<string, any> = {}

    // Processa qualificados
    qualificados?.forEach((evt) => {
      const vendedor = evt.vendedor || "Não informado"
      if (!stats[vendedor]) {
        stats[vendedor] = { nome: vendedor, equipe: evt.equipe || "", qualificados: 0, agendados: 0, marcados: 0, veio: 0, faltou: 0, vendas: 0 }
      }
      stats[vendedor].qualificados++
    })

    // Processa leads
    leads?.forEach((lead) => {
      const vendedor = lead.responsavel || "Não informado"
      if (!stats[vendedor]) {
        stats[vendedor] = { nome: vendedor, equipe: lead.equipe || "", qualificados: 0, agendados: 0, marcados: 0, veio: 0, faltou: 0, vendas: 0 }
      }
      stats[vendedor].marcados++
      if (lead.status === "veio") stats[vendedor].veio++
      if (lead.status === "nao") stats[vendedor].faltou++
      if (lead.venda_fechada) stats[vendedor].vendas++
      
      // Agendei = criados no dia
      const createdDate = lead.created_at?.split("T")[0]
      if (createdDate === date) {
        stats[vendedor].agendados++
      }
    })

    // Ordena por produtividade
    const vendedores = Object.values(stats).sort((a: any, b: any) => {
      return (b.qualificados + b.agendados) - (a.qualificados + a.agendados)
    })

    // Totais
    const totals = vendedores.reduce((acc: any, v: any) => ({
      qualificados: acc.qualificados + v.qualificados,
      agendados: acc.agendados + v.agendados,
      marcados: acc.marcados + v.marcados,
      veio: acc.veio + v.veio,
      faltou: acc.faltou + v.faltou,
      vendas: acc.vendas + v.vendas,
    }), { qualificados: 0, agendados: 0, marcados: 0, veio: 0, faltou: 0, vendas: 0 })

    // Formata data
    const dateObj = new Date(date + "T12:00:00")
    const dateFormatted = dateObj.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

    // Gera mensagem formatada para WhatsApp
    let message = `*RELATÓRIO DIÁRIO - LR MULTIMARCAS*\n`
    message += `${dateFormatted}\n\n`
    
    message += `*RESUMO GERAL:*\n`
    message += `Qualificados: ${totals.qualificados}\n`
    message += `Agendamentos: ${totals.agendados}\n`
    message += `Reuniões: ${totals.marcados}\n`
    message += `Atendimentos: ${totals.veio}\n`
    message += `Faltas: ${totals.faltou}\n`
    message += `Vendas: ${totals.vendas}\n\n`

    message += `*POR VENDEDOR:*\n`
    message += `━━━━━━━━━━━━━━━━━\n`

    vendedores.forEach((v: any) => {
      if (v.qualificados > 0 || v.agendados > 0 || v.marcados > 0) {
        message += `\n*${v.nome}*\n`
        if (v.equipe) message += `${v.equipe}\n`
        message += `Qualif: ${v.qualificados} | Agendei: ${v.agendados}\n`
        message += `Marcados: ${v.marcados} | Veio: ${v.veio} | Faltou: ${v.faltou}\n`
        if (v.vendas > 0) message += `Vendas: ${v.vendas}\n`
      }
    })

    message += `\n━━━━━━━━━━━━━━━━━\n`
    message += `Gerado automaticamente pelo Dashboard LR`

    return NextResponse.json({
      success: true,
      date,
      totals,
      vendedores,
      message,
      whatsappLink: `https://wa.me/?text=${encodeURIComponent(message)}`,
    })
  } catch (error) {
    console.error("[v0] Erro ao gerar relatório:", error)
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 })
  }
}
