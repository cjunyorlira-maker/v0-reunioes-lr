import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const periodo = searchParams.get("periodo") || "dia" // "dia" ou "semana"
    const vendedor = searchParams.get("vendedor") // opcional
    const equipe = searchParams.get("equipe") // opcional
    const origem = searchParams.get("origem") // opcional

    const supabase = getSupabaseClient()
    
    // Define data de início baseado no período
    // Semana começa no Domingo e termina no Sábado
    let dataInicio = new Date()
    if (periodo === "semana") {
      const dia = dataInicio.getDay() // 0=domingo, 6=sábado
      // Volta para o domingo da semana atual
      dataInicio = new Date(dataInicio.setDate(dataInicio.getDate() - dia))
    }
    dataInicio.setHours(0, 0, 0, 0)
    const dataInicioStr = dataInicio.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })

    // Query base
    let query = supabase.from("leads").select("*")

    // Filtros
    if (dataInicioStr) {
      query = query.gte("created_at", dataInicioStr)
    }
    if (vendedor) {
      query = query.eq("responsavel", vendedor)
    }
    if (equipe) {
      query = query.eq("equipe", equipe)
    }
    if (origem) {
      query = query.eq("origem", origem)
    }

    const { data: leads, error } = await query

    if (error) throw error

    // Processa métricas
    const metricas = {
      // Qualificados: leads com data_qualificacao preenchida
      qualificados: leads.filter(l => l.data_qualificacao).length,
      
      // Agendados: leads com data_agendei preenchida (foram para Confirmar Reunião)
      agendados: leads.filter(l => l.data_agendei).length,
      
      // Conversão qualificado -> agendado
      conversao_qualificado_agendado: 0,
      
      // Por origem
      por_origem: {} as Record<string, any>,
      
      // Por status
      por_status: {
        pending: leads.filter(l => l.status === "pending").length,
        veio: leads.filter(l => l.status === "veio").length,
        nao: leads.filter(l => l.status === "nao").length,
      },
      
      // Por vendedor
      por_vendedor: {} as Record<string, any>,
      
      // Por equipe
      por_equipe: {} as Record<string, any>,
      
      // Vendas
      vendas: leads.filter(l => l.venda_fechada).length,
      conversao_agendado_venda: 0,
    }

    // Conversão qualificado -> agendado
    if (metricas.qualificados > 0) {
      metricas.conversao_qualificado_agendado = (metricas.agendados / metricas.qualificados) * 100
    }

    // Conversão agendado -> venda
    if (metricas.agendados > 0) {
      metricas.conversao_agendado_venda = (metricas.vendas / metricas.agendados) * 100
    }

    // Agrupa por origem
    leads.forEach(lead => {
      const orig = lead.origem || "Sem origem"
      if (!metricas.por_origem[orig]) {
        metricas.por_origem[orig] = {
          total: 0,
          qualificados: 0,
          agendados: 0,
          veio: 0,
          nao: 0,
          venda: 0,
        }
      }
      metricas.por_origem[orig].total++
      if (lead.data_qualificacao) metricas.por_origem[orig].qualificados++
      if (lead.data_agendei) metricas.por_origem[orig].agendados++
      if (lead.status === "veio") metricas.por_origem[orig].veio++
      if (lead.status === "nao") metricas.por_origem[orig].nao++
      if (lead.venda_fechada) metricas.por_origem[orig].venda++
    })

    // Agrupa por vendedor
    leads.forEach(lead => {
      const vend = lead.responsavel || "Sem vendedor"
      if (!metricas.por_vendedor[vend]) {
        metricas.por_vendedor[vend] = {
          total: 0,
          qualificados: 0,
          agendados: 0,
          veio: 0,
          nao: 0,
          venda: 0,
          conversao_qualificado_agendado: 0,
          conversao_agendado_venda: 0,
        }
      }
      metricas.por_vendedor[vend].total++
      if (lead.data_qualificacao) metricas.por_vendedor[vend].qualificados++
      if (lead.data_agendei) metricas.por_vendedor[vend].agendados++
      if (lead.status === "veio") metricas.por_vendedor[vend].veio++
      if (lead.status === "nao") metricas.por_vendedor[vend].nao++
      if (lead.venda_fechada) metricas.por_vendedor[vend].venda++
    })

    // Calcula conversões por vendedor
    Object.keys(metricas.por_vendedor).forEach(vend => {
      const dados = metricas.por_vendedor[vend]
      if (dados.qualificados > 0) {
        dados.conversao_qualificado_agendado = (dados.agendados / dados.qualificados) * 100
      }
      if (dados.agendados > 0) {
        dados.conversao_agendado_venda = (dados.venda / dados.agendados) * 100
      }
    })

    // Agrupa por equipe
    leads.forEach(lead => {
      const eq = lead.equipe || "Sem equipe"
      if (!metricas.por_equipe[eq]) {
        metricas.por_equipe[eq] = {
          total: 0,
          qualificados: 0,
          agendados: 0,
          veio: 0,
          nao: 0,
          venda: 0,
          conversao_qualificado_agendado: 0,
          conversao_agendado_venda: 0,
        }
      }
      metricas.por_equipe[eq].total++
      if (lead.data_qualificacao) metricas.por_equipe[eq].qualificados++
      if (lead.data_agendei) metricas.por_equipe[eq].agendados++
      if (lead.status === "veio") metricas.por_equipe[eq].veio++
      if (lead.status === "nao") metricas.por_equipe[eq].nao++
      if (lead.venda_fechada) metricas.por_equipe[eq].venda++
    })

    // Calcula conversões por equipe
    Object.keys(metricas.por_equipe).forEach(eq => {
      const dados = metricas.por_equipe[eq]
      if (dados.qualificados > 0) {
        dados.conversao_qualificado_agendado = (dados.agendados / dados.qualificados) * 100
      }
      if (dados.agendados > 0) {
        dados.conversao_agendado_venda = (dados.venda / dados.agendados) * 100
      }
    })

    return NextResponse.json({
      periodo,
      dataInicio: dataInicioStr,
      filtros: { vendedor, equipe, origem },
      metricas,
    })
  } catch (error) {
    console.error("[v0] Erro ao calcular métricas:", error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
