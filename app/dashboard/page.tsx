"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome } from "@/lib/vendedor-fotos"
import { Calendar, Download } from "lucide-react"
import * as XLSX from "xlsx"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type TabType = "produtividade" | "resultados" | "funil"
type FilterMode = "semana" | "dia" | "custom"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("produtividade")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>("semana")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  // Dias da semana
  const weekDays = useMemo(() => getWeekDays(), [])
  const dateRange = useMemo(() => ({
    start: formatDateForDB(weekDays[0].date),
    end: formatDateForDB(weekDays[weekDays.length - 1].date),
  }), [weekDays])

  // Range ativo baseado no modo de filtro
  const activeRange = useMemo(() => {
    if (filterMode === "custom" && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate }
    }
    if (filterMode === "dia" && selectedDay) {
      return { start: selectedDay, end: selectedDay }
    }
    return dateRange
  }, [filterMode, selectedDay, customStartDate, customEndDate, dateRange])

  // Busca dados baseado no range ativo (semana, dia ou período custom)
  const { data: leadsData } = useSWR(
    `/api/leads?startDate=${activeRange.start}&endDate=${activeRange.end}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  // Busca TODOS os leads (para calcular remarcados e agendei corretamente)
  const { data: allLeadsData } = useSWR(
    `/api/leads`,
    fetcher,
    { refreshInterval: 30000 }
  )

  // Busca qualificados da tabela qualificacoes
  const { data: qualificadosData } = useSWR(
    `/api/leads/qualificados?startDate=${activeRange.start}&endDate=${activeRange.end}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  // Busca vendas reais da tabela vendas (fonte de verdade do Kommo)
  const { data: vendasData } = useSWR(
    `/api/vendas?startDate=${activeRange.start}&endDate=${activeRange.end}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const leads = leadsData || []
  const allLeads = allLeadsData || []
  const qualificados = qualificadosData?.leads || []
  const vendasReais = vendasData?.vendas || []

  // Leads filtrados pelo range ativo (exclui retornos)
  const leadsAtivos = useMemo(() => {
    return leads.filter((l: any) => {
      // Exclui retornos
      if (l.retorno) return false
      
      // Filtra por data
      return l.data >= activeRange.start && l.data <= activeRange.end
    })
  }, [leads, activeRange])

  // Estatisticas gerais (sem retornos)
  const stats = useMemo(() => {
    const veio = leadsAtivos.filter((l: any) => l.status === "veio").length
    // Conta todos com status "nao", independente de remarcado
    const nao = leadsAtivos.filter((l: any) => l.status === "nao").length
    const remarcados = leadsAtivos.filter((l: any) => l.remarcado).length
    // Vendas vem da tabela vendas (fonte de verdade do Kommo), nao do campo venda_fechada
    const vendas = vendasReais.length
    
    // Total é simplesmente a quantidade de leads ativos
    const total = leadsAtivos.length
    // Pendentes = total - veio - nao
    const pendentes = total - veio - nao

    return {
      total,
      veio,
      nao,
      remarcados,
      vendas,
      pendentes,
      taxaPresenca: (veio + nao) > 0 ? Math.round((veio / (veio + nao)) * 100) : 0,
      taxaConversao: veio > 0 ? Math.round((vendas / veio) * 100) : 0,
    }
  }, [leadsAtivos, vendasReais])

  // Agendei por vendedor (leads com data_agendei no periodo)
  // Usa allLeads para pegar leads que foram agendados nesta semana mas remarcados para outra
  const agendeiPorVendedor = useMemo(() => {
    const map: Record<string, { nome: string; foto: string | null; equipe: string; agendei: number }> = {}

    allLeads.forEach((lead: any) => {
      // Usa data_agendei ao inves de created_at
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const vendedor = normalizeVendedorNome(lead.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: lead.foto_responsavel || getFotoVendedor(vendedor) || null,
          equipe: lead.equipe || "Sem equipe",
          agendei: 0,
        }
      }
      map[vendedor].agendei++
    })

    return Object.values(map).sort((a, b) => b.agendei - a.agendei)
  }, [allLeads, activeRange])

  // Qualifiquei por vendedor
  const qualifiqueiPorVendedor = useMemo(() => {
    const map: Record<string, { nome: string; foto: string | null; equipe: string; qualificados: number }> = {}

    qualificados.forEach((q: any) => {
      const vendedor = normalizeVendedorNome(q.responsavel || q.vendedor || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: getFotoVendedor(vendedor) || null,
          equipe: q.equipe || "Sem equipe",
          qualificados: 0,
        }
      }
      map[vendedor].qualificados++
    })

    return Object.values(map).sort((a, b) => b.qualificados - a.qualificados)
  }, [qualificados])

  // Resultados por vendedor (marcados, veio, faltou, vendas) - sem retornos
  const resultadosPorVendedor = useMemo(() => {
    const map: Record<string, any> = {}

    // Primeiro processa leadsAtivos
    leadsAtivos.forEach((lead: any) => {
      const vendedor = normalizeVendedorNome(lead.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: lead.foto_responsavel || getFotoVendedor(vendedor) || null,
          equipe: lead.equipe || "Sem equipe",
          marcados: 0,
          veio: 0,
          nao: 0,
          remarcados: 0,
          vendas: 0,
        }
      }
      map[vendedor].marcados++
      if (lead.status === "veio") map[vendedor].veio++
      if (lead.status === "nao") map[vendedor].nao++
      if (lead.remarcado) map[vendedor].remarcados++
    })

    // Vendas vem da tabela vendas (fonte de verdade do Kommo), por responsavel
    vendasReais.forEach((venda: any) => {
      const vendedor = normalizeVendedorNome(venda.atendente || venda.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: getFotoVendedor(vendedor) || null,
          equipe: "Sem equipe",
          marcados: 0,
          veio: 0,
          nao: 0,
          remarcados: 0,
          vendas: 0,
        }
      }
      map[vendedor].vendas++
    })

    return Object.values(map).sort((a: any, b: any) => b.marcados - a.marcados)
  }, [leadsAtivos, vendasReais])

  // Conversão real por atendente: quem atendeu a reunião (lead "veio") -> quem fechou (venda)
  const conversaoPorAtendente = useMemo(() => {
    const map: Record<string, { nome: string; foto: string | null; atendeu: number; fechou: number; valor: number; taxa: number }> = {}
    // Reuniões atendidas (leads "veio" têm o atendente gravado)
    leadsAtivos.forEach((lead: any) => {
      if (lead.status !== "veio") return
      const at = normalizeVendedorNome(lead.atendente || "Não informado")
      if (!map[at]) map[at] = { nome: at, foto: getFotoVendedor(at) || null, atendeu: 0, fechou: 0, valor: 0, taxa: 0 }
      map[at].atendeu++
    })
    // Fechamentos (vendas têm o atendente)
    vendasReais.forEach((venda: any) => {
      const at = normalizeVendedorNome(venda.atendente || venda.responsavel || "Não informado")
      if (!map[at]) map[at] = { nome: at, foto: getFotoVendedor(at) || null, atendeu: 0, fechou: 0, valor: 0, taxa: 0 }
      map[at].fechou++
      map[at].valor += Number(venda.valor_venda || 0)
    })
    Object.values(map).forEach(m => { m.taxa = m.atendeu > 0 ? Math.round((m.fechou / m.atendeu) * 100) : 0 })
    return Object.values(map).sort((a, b) => b.fechou - a.fechou || b.atendeu - a.atendeu)
  }, [leadsAtivos, vendasReais])

  // Origens dos leads marcados e vendas
  const origensMarcados = useMemo(() => {
    const mapMarcados: Record<string, number> = {}
    const mapVendas: Record<string, number> = {}

    leadsAtivos.forEach((lead: any) => {
      const origem = lead.origem || "Nao informado"
      mapMarcados[origem] = (mapMarcados[origem] || 0) + 1
    })

    // Vendas por origem vem da tabela vendas (fonte de verdade do Kommo)
    vendasReais.forEach((venda: any) => {
      const origem = venda.origem || "Nao informado"
      mapVendas[origem] = (mapVendas[origem] || 0) + 1
    })

    return {
      marcados: Object.entries(mapMarcados).sort((a, b) => b[1] - a[1]),
      vendas: Object.entries(mapVendas).sort((a, b) => b[1] - a[1]),
    }
  }, [leadsAtivos, vendasReais])

  // Funil por equipe - usa allLeads para pegar todos incluindo remarcados
  const funilPorEquipe = useMemo(() => {
    const map: Record<string, any> = {}

    // Qualificados por equipe (data_qualificacao no periodo)
    qualificados.forEach((q: any) => {
      const equipe = q.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { equipe, qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, remarcados: 0, vendas: 0 }
      }
      map[equipe].qualificados++
    })

    // Agendei por equipe (data_agendei no periodo) - usa allLeads
    allLeads.forEach((lead: any) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const equipe = lead.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { equipe, qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, remarcados: 0, vendas: 0 }
      }
      map[equipe].agendei++
    })

    // Marcados/Veio/Faltou = apenas leads que foram agendados via webhook (data_agendei no periodo)
    // Assim o funil é consistente: só conta quem passou pelo processo completo (Qualifiquei → Agendei → Marcado)
    allLeads.forEach((lead: any) => {
      if (lead.retorno) return

      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const equipe = lead.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { equipe, qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, remarcados: 0, vendas: 0 }
      }
      map[equipe].marcados++
      if (lead.status === "veio") map[equipe].veio++
      if (lead.status === "nao") map[equipe].nao++
      if (lead.remarcado) map[equipe].remarcados++
    })

    // Vendas por equipe: mapeia responsavel da venda -> equipe (via leads)
    const vendedorParaEquipe: Record<string, string> = {}
    allLeads.forEach((lead: any) => {
      const v = normalizeVendedorNome(lead.responsavel || "")
      if (v && lead.equipe) vendedorParaEquipe[v] = lead.equipe
    })
    vendasReais.forEach((venda: any) => {
      const v = normalizeVendedorNome(venda.atendente || venda.responsavel || "")
      const equipe = vendedorParaEquipe[v] || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { equipe, qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, remarcados: 0, vendas: 0 }
      }
      map[equipe].vendas++
    })

    return Object.values(map).sort((a: any, b: any) => (b.qualificados + b.agendei) - (a.qualificados + a.agendei))
  }, [qualificados, allLeads, leadsAtivos, activeRange, vendasReais])

  // Funil GERAL da operação: agrega os totais de todas as equipes
  const funilGeral = useMemo(() => {
    const g = { equipe: "GERAL", qualificados: 0, agendei: 0, marcados: 0, veio: 0, nao: 0, remarcados: 0, vendas: 0 }
    funilPorEquipe.forEach((e: any) => {
      g.qualificados += e.qualificados; g.agendei += e.agendei
      g.marcados += e.marcados; g.veio += e.veio; g.nao += e.nao
      g.remarcados += e.remarcados || 0; g.vendas += e.vendas
    })
    return g
  }, [funilPorEquipe])

  // Conversao Qualifiquei -> Agendei por vendedor
  const conversaoQualAgendei = useMemo(() => {
    const map: Record<string, { nome: string; foto: string | null; equipe: string; qualificados: number; agendei: number; taxa: number }> = {}

    // Qualificados
    qualificados.forEach((q: any) => {
      const vendedor = normalizeVendedorNome(q.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = { nome: vendedor, foto: getFotoVendedor(vendedor), equipe: q.equipe || "Sem equipe", qualificados: 0, agendei: 0, taxa: 0 }
      }
      map[vendedor].qualificados++
    })

    // Agendei - usa allLeads para pegar todos incluindo remarcados
    allLeads.forEach((lead: any) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const vendedor = normalizeVendedorNome(lead.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = { nome: vendedor, foto: lead.foto_responsavel || getFotoVendedor(vendedor), equipe: lead.equipe || "Sem equipe", qualificados: 0, agendei: 0, taxa: 0 }
      }
      map[vendedor].agendei++
    })

    // Calcula taxa
    Object.values(map).forEach(v => {
      v.taxa = v.qualificados > 0 ? Math.round((v.agendei / v.qualificados) * 100) : 0
    })

    return Object.values(map).filter(v => v.qualificados > 0 || v.agendei > 0).sort((a, b) => b.taxa - a.taxa)
  }, [qualificados, allLeads, activeRange])

  // Conversao por equipe
  const conversaoPorEquipe = useMemo(() => {
    const map: Record<string, { nome: string; qualificados: number; agendei: number; taxa: number }> = {}

    // Qualificados
    qualificados.forEach((q: any) => {
      const equipe = q.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { nome: equipe, qualificados: 0, agendei: 0, taxa: 0 }
      }
      map[equipe].qualificados++
    })

    // Agendei - usa allLeads para pegar todos incluindo remarcados
    allLeads.forEach((lead: any) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const equipe = lead.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { nome: equipe, qualificados: 0, agendei: 0, taxa: 0 }
      }
      map[equipe].agendei++
    })

    // Calcula taxa
    Object.values(map).forEach(e => {
      e.taxa = e.qualificados > 0 ? Math.round((e.agendei / e.qualificados) * 100) : 0
    })

    return Object.values(map).filter(e => e.qualificados > 0 || e.agendei > 0).sort((a, b) => b.taxa - a.taxa)
  }, [qualificados, allLeads, activeRange])

  // Atendentes
  const atendenteStats = useMemo(() => {
    const map: Record<string, { nome: string; atendidos: number; vendas: number }> = {}

    leadsAtivos.forEach((lead: any) => {
      if (lead.atendente && lead.status === "veio") {
        if (!map[lead.atendente]) {
          map[lead.atendente] = { nome: lead.atendente, atendidos: 0, vendas: 0 }
        }
        map[lead.atendente].atendidos++
      }
    })

    // Vendas por atendente vem da tabela vendas (fonte de verdade do Kommo)
    vendasReais.forEach((venda: any) => {
      if (venda.atendente) {
        if (!map[venda.atendente]) {
          map[venda.atendente] = { nome: venda.atendente, atendidos: 0, vendas: 0 }
        }
        map[venda.atendente].vendas++
      }
    })

    return Object.values(map).sort((a, b) => b.atendidos - a.atendidos)
  }, [leadsAtivos, vendasReais])

  // Origem dos leads
  const origemData = useMemo(() => {
    const map: Record<string, number> = {}
    leadsAtivos.forEach((lead: any) => {
      const origem = lead.origem || "Nao informada"
      map[origem] = (map[origem] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [leadsAtivos])

  const COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"]

  // Download Excel com todas as abas organizadas
  const handleDownloadExcel = () => {
    setDownloading(true)
    try {
      const wb = XLSX.utils.book_new()
      const periodoLabel = filterMode === "custom" && customStartDate && customEndDate
        ? `${customStartDate} a ${customEndDate}`
        : filterMode === "dia" && selectedDay
        ? selectedDay
        : `${activeRange.start} a ${activeRange.end}`

      // ABA 1: Resumo Geral
      const resumoData = [
        ["RESUMO GERAL - LR MULTIMARCAS"],
        [`Periodo: ${periodoLabel}`],
        [`Gerado em: ${new Date().toLocaleString("pt-BR")}`],
        [],
        ["Metrica", "Valor"],
        ["Marcados", stats.total],
        ["Veio", stats.veio],
        ["Faltou", stats.nao],
        ["Pendentes", stats.pendentes],
        ["Vendas", stats.vendas],
        ["Taxa de Presenca", `${stats.taxaPresenca}%`],
        ["Taxa de Conversao", `${stats.taxaConversao}%`],
        ["Qualificados", qualificados.length],
        ["Agendei Total", agendeiPorVendedor.reduce((acc, v) => acc + v.agendei, 0)],
      ]
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
      wsResumo["!cols"] = [{ wch: 25 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Geral")

      // ABA 2: Marcados e Resultados por Vendedor (COMPLETO)
      const resultadosHeader = ["Vendedor", "Equipe", "Marcados", "Veio", "Faltou", "Remarcados", "Fechou", "Taxa Presenca %", "Taxa Conversao %"]
      const resultadosRows = resultadosPorVendedor.map((v: any) => {
        const presenca = (v.veio + v.nao) > 0 ? Math.round((v.veio / (v.veio + v.nao)) * 100) : 0
        const conversao = v.veio > 0 ? Math.round((v.vendas / v.veio) * 100) : 0
        return [v.nome, v.equipe, v.marcados, v.veio, v.nao, v.remarcados || 0, v.vendas, `${presenca}%`, `${conversao}%`]
      })
      // Totais
      const totalMarcados = resultadosPorVendedor.reduce((a: number, v: any) => a + v.marcados, 0)
      const totalVeio = resultadosPorVendedor.reduce((a: number, v: any) => a + v.veio, 0)
      const totalNao = resultadosPorVendedor.reduce((a: number, v: any) => a + v.nao, 0)
      const totalRemarcados = resultadosPorVendedor.reduce((a: number, v: any) => a + (v.remarcados || 0), 0)
      const totalVendas = resultadosPorVendedor.reduce((a: number, v: any) => a + v.vendas, 0)
      const totalPresenca = (totalVeio + totalNao) > 0 ? Math.round((totalVeio / (totalVeio + totalNao)) * 100) : 0
      const totalConversao = totalVeio > 0 ? Math.round((totalVendas / totalVeio) * 100) : 0
      
      const wsResultados = XLSX.utils.aoa_to_sheet([
        [`MARCADOS & RESULTADOS — Periodo: ${periodoLabel}`],
        [],
        resultadosHeader,
        ...resultadosRows,
        [],
        ["TOTAL", "", totalMarcados, totalVeio, totalNao, totalRemarcados, totalVendas, `${totalPresenca}%`, `${totalConversao}%`]
      ])
      wsResultados["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, wsResultados, "Marcados e Resultados")

      // ABA: Conversao por Atendente (atendeu -> fechou)
      const convAtendHeader = ["Atendente", "Atendeu", "Fechou", "Valor fechado (R$)", "Conversao %"]
      const convAtendRows = conversaoPorAtendente.map((a) => [
        a.nome, a.atendeu, a.fechou, a.valor.toLocaleString("pt-BR"), `${a.taxa}%`
      ])
      const totalConvAtendeu = conversaoPorAtendente.reduce((s, a) => s + a.atendeu, 0)
      const totalConvFechou = conversaoPorAtendente.reduce((s, a) => s + a.fechou, 0)
      const totalConvValor = conversaoPorAtendente.reduce((s, a) => s + a.valor, 0)
      const totalConvTaxa = totalConvAtendeu > 0 ? Math.round((totalConvFechou / totalConvAtendeu) * 100) : 0
      const wsConvAtend = XLSX.utils.aoa_to_sheet([
        [`CONVERSAO POR ATENDENTE — Periodo: ${periodoLabel}`],
        [],
        convAtendHeader,
        ...convAtendRows,
        [],
        ["TOTAL", totalConvAtendeu, totalConvFechou, totalConvValor.toLocaleString("pt-BR"), `${totalConvTaxa}%`]
      ])
      wsConvAtend["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, wsConvAtend, "Conversao por Atendente")

      // ABA 3: Qualifiquei & Agendei por Vendedor (COMPLETO)
      const qualAgendHeader = ["Vendedor", "Equipe", "Qualificados", "Agendamentos", "Taxa Conversao %"]
      const qualAgendRows = qualifiqueiPorVendedor.map(qv => {
        const agend = agendeiPorVendedor.find(av => av.nome === qv.nome)
        const agendei = agend?.agendei || 0
        const taxa = qv.qualificados > 0 ? Math.round((agendei / qv.qualificados) * 100) : 0
        return [qv.nome, qv.equipe, qv.qualificados, agendei, `${taxa}%`]
      })
      // Adiciona vendedores que só tem agendei mas não qualificaram
      agendeiPorVendedor.forEach(av => {
        if (!qualifiqueiPorVendedor.find(qv => qv.nome === av.nome)) {
          qualAgendRows.push([av.nome, av.equipe, 0, av.agendei, "0%"])
        }
      })
      const totalQualif = qualifiqueiPorVendedor.reduce((a, v) => a + v.qualificados, 0)
      const totalAgendei = agendeiPorVendedor.reduce((a, v) => a + v.agendei, 0)
      const totalTaxaQA = totalQualif > 0 ? Math.round((totalAgendei / totalQualif) * 100) : 0
      
      const wsQualAgend = XLSX.utils.aoa_to_sheet([
        [`QUALIFIQUEI & AGENDEI — Periodo: ${periodoLabel}`],
        [],
        qualAgendHeader,
        ...qualAgendRows,
        [],
        ["TOTAL", "", totalQualif, totalAgendei, `${totalTaxaQA}%`]
      ])
      wsQualAgend["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, wsQualAgend, "Qualifiquei e Agendei")

      // ABA 4: Funil por Equipe (COMPLETO)
      const funilHeader = ["Equipe", "Qualificados", "Agendei", "Marcados", "Veio", "Faltou", "Vendas", "Taxa Qual→Agend %", "Taxa Presenca %", "Taxa Conversao %"]
      const funilRows = funilPorEquipe.map((e: any) => {
        const presenca = (e.veio + e.nao) > 0 ? Math.round((e.veio / (e.veio + e.nao)) * 100) : 0
        const conversao = e.veio > 0 ? Math.round((e.vendas / e.veio) * 100) : 0
        return [e.equipe, e.qualificados, e.agendei, e.marcados, e.veio, e.nao, e.vendas, `${e.taxa}%`, `${presenca}%`, `${conversao}%`]
      })
      const wsFunil = XLSX.utils.aoa_to_sheet([
        [`FUNIL POR EQUIPE — Periodo: ${periodoLabel}`],
        [],
        funilHeader,
        ...funilRows
      ])
      wsFunil["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, wsFunil, "Funil por Equipe")

      // ABA 5: Atendentes (COMPLETO)
      const atendHeader = ["Atendente", "Atendidos (Veio)", "Vendas", "Taxa Conversao %"]
      const atendRows = atendenteStats.map((a: any) => {
        const conv = a.atendidos > 0 ? Math.round((a.vendas / a.atendidos) * 100) : 0
        return [a.nome, a.atendidos, a.vendas, `${conv}%`]
      })
      const totalAtendidos = atendenteStats.reduce((a: number, v: any) => a + v.atendidos, 0)
      const totalVendasAtend = atendenteStats.reduce((a: number, v: any) => a + v.vendas, 0)
      const totalConvAtend = totalAtendidos > 0 ? Math.round((totalVendasAtend / totalAtendidos) * 100) : 0
      
      const wsAtend = XLSX.utils.aoa_to_sheet([
        [`ATENDENTES (CONVERSAO) — Periodo: ${periodoLabel}`],
        [],
        atendHeader,
        ...atendRows,
        [],
        ["TOTAL", totalAtendidos, totalVendasAtend, `${totalConvAtend}%`]
      ])
      wsAtend["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, wsAtend, "Atendentes")

      // ABA 6: Origem dos Leads (COMPLETO)
      const origemHeader = ["Origem", "Marcados", "Vendas", "Taxa Conversao %"]
      const origemRows = origensMarcados.marcados.map(([origem, qtd]) => {
        const vendas = origensMarcados.vendas.find(([o]) => o === origem)?.[1] || 0
        const taxa = qtd > 0 ? Math.round((vendas / qtd) * 100) : 0
        return [origem, qtd, vendas, `${taxa}%`]
      })
      const wsOrigem = XLSX.utils.aoa_to_sheet([
        [`ORIGEM DOS LEADS — Periodo: ${periodoLabel}`],
        [],
        origemHeader,
        ...origemRows
      ])
      wsOrigem["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, wsOrigem, "Origem dos Leads")

      // ABA 7: Lista de Leads Detalhada
      const leadsHeader = ["Nome Lead", "Vendedor", "Equipe", "Atendente", "Origem", "Data Reuniao", "Status", "Venda Fechada"]
      const leadsRows = leadsAtivos.map((lead: any) => [
        lead.nome || "Sem nome",
        lead.responsavel || "Nao informado",
        lead.equipe || "Sem equipe",
        lead.atendente || "-",
        lead.origem || "Nao informado",
        lead.data || "-",
        lead.status === "veio" ? "Veio" : lead.status === "nao" ? "Faltou" : "Pendente",
        lead.venda_fechada ? "Sim" : "Nao"
      ])
      const wsLeads = XLSX.utils.aoa_to_sheet([
        [`LISTA DE LEADS — Periodo: ${periodoLabel}`],
        [`Total: ${leadsAtivos.length} leads`],
        [],
        leadsHeader,
        ...leadsRows
      ])
      wsLeads["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, wsLeads, "Lista de Leads")

      // Salva o arquivo
      const fileName = `LR_Dashboard_${periodoLabel.replace(/\//g, "-").replace(/ /g, "_")}.xlsx`
      XLSX.writeFile(wb, fileName)
    } finally {
      setDownloading(false)
    }
  }

  // Copiar relatorio para clipboard
  const handleCopyReport = async () => {
    setCopying(true)
    try {
      const dayLabel = selectedDay 
        ? weekDays.find(d => formatDateForDB(d.date) === selectedDay)?.dayName || selectedDay
        : "Semana Toda"

      let report = `*LR MULTIMARCAS - RELATORIO ${dayLabel.toUpperCase()}*\n`
      report += `_${new Date().toLocaleDateString("pt-BR")}_\n\n`

      report += `*RESUMO GERAL*\n`
      report += `Qualificados: ${qualificados.length}\n`
      report += `Agendei: ${agendeiPorVendedor.reduce((acc, v) => acc + v.agendei, 0)}\n`
      report += `Marcados: ${stats.total}\n`
      report += `Veio: ${stats.veio} | Faltou: ${stats.nao}\n`
      report += `Vendas: ${stats.vendas}\n`
      report += `Taxa Presenca: ${stats.taxaPresenca}% | Conversao: ${stats.taxaConversao}%\n\n`

      report += `*QUALIFIQUEI POR VENDEDOR*\n`
      qualifiqueiPorVendedor.forEach(v => {
        report += `${v.nome}: ${v.qualificados}\n`
      })
      report += `\n`

      report += `*AGENDEI POR VENDEDOR*\n`
      agendeiPorVendedor.forEach(v => {
        report += `${v.nome}: ${v.agendei}\n`
      })
      report += `\n`

      report += `*RESULTADOS POR VENDEDOR*\n`
      resultadosPorVendedor.forEach((v: any) => {
        const conv = v.veio > 0 ? Math.round((v.vendas / v.veio) * 100) : 0
        report += `${v.nome}: M${v.marcados} V${v.veio} F${v.nao} $${v.vendas} (${conv}%)\n`
      })

      await navigator.clipboard.writeText(report)
      alert("Relatorio copiado! Cole no WhatsApp.")
    } catch (error) {
      console.error("Erro ao copiar:", error)
      alert("Erro ao copiar. Tente novamente.")
    } finally {
      setCopying(false)
    }
  }

  const weekLabel = `${weekDays[0].dayNumber}/${weekDays[0].date.getMonth() + 1} - ${weekDays[weekDays.length - 1].dayNumber}/${weekDays[weekDays.length - 1].date.getMonth() + 1}`

  // Funil em dois estágios: Produção (atividade do vendedor) e Agenda & Resultado
  function FunilDoisEstagios({ dados, destaque }: { dados: any; destaque?: boolean }) {
    const blocoTrapezio = (etapas: { label: string; valor: number; cor: string }[]) => {
      const topo = Math.max(etapas[0].valor, 1)
      return (
        <div className="flex flex-col items-center">
          {etapas.map((etapa, i) => {
            const wAtual = Math.max(30, Math.round((etapa.valor / topo) * 100))
            const proxima = etapas[i + 1]
            const wProx = proxima ? Math.max(30, Math.round((proxima.valor / topo) * 100)) : wAtual
            const taxa = i > 0 && etapas[i - 1].valor > 0 ? Math.round((etapa.valor / etapas[i - 1].valor) * 100) : null
            return (
              <div key={etapa.label} className="w-full flex flex-col items-center">
                {i > 0 && (
                  <div className="flex items-center gap-1 py-0.5">
                    <span className="text-white/30 text-xs">{"\u25BC"}</span>
                    <span className="text-xs font-bold" style={{ color: etapa.cor }}>{taxa !== null ? `${taxa}%` : "\u2014"}</span>
                  </div>
                )}
                <div className="relative flex items-center justify-center" style={{
                  width: `${wAtual}%`, height: "46px",
                  background: `linear-gradient(180deg, ${etapa.cor}33, ${etapa.cor}1a)`,
                  borderTop: `2px solid ${etapa.cor}99`,
                  clipPath: `polygon(0 0, 100% 0, ${50 + (wProx / wAtual) * 50}% 100%, ${50 - (wProx / wAtual) * 50}% 100%)`,
                }}>
                  <span className="text-xl font-bold mr-2" style={{ color: etapa.cor }}>{etapa.valor}</span>
                  <span className="text-[10px] font-semibold tracking-wider text-white/60">{etapa.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )
    }
    return (
      <div className={`bg-white/[0.03] border rounded-2xl p-6 ${destaque ? "border-[#d4af37]/40" : "border-white/10"}`}>
        <h4 className={`text-lg font-bold mb-4 text-center ${destaque ? "text-[#d4af37] text-xl" : "text-[#d4af37]"}`}>{dados.equipe}</h4>
        {/* BLOCO 1: PRODUÇÃO (atividade do vendedor no período) */}
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2 text-center">Produção do período (atividade)</p>
        {blocoTrapezio([
          { label: "QUALIFIQUEI", valor: dados.qualificados, cor: "#22d3ee" },
          { label: "AGENDEI", valor: dados.agendei, cor: "#a78bfa" },
        ])}
        {/* divisor: réguas de tempo diferentes */}
        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 border-t border-dashed border-white/15"></div>
          <span className="text-[9px] text-white/30 uppercase">reuniões do período</span>
          <div className="flex-1 border-t border-dashed border-white/15"></div>
        </div>
        {/* BLOCO 2: AGENDA & RESULTADO */}
        {blocoTrapezio([
          { label: "MARCADOS", valor: dados.marcados, cor: "#60a5fa" },
          { label: "VIERAM", valor: dados.veio, cor: "#34d399" },
          { label: "VENDAS", valor: dados.vendas, cor: "#d4af37" },
        ])}
        <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[10px] text-white/50 uppercase">Qualif {"\u2192"} Agendei</p>
            <p className="text-lg font-bold text-violet-400">{dados.qualificados > 0 ? Math.round((dados.agendei / dados.qualificados) * 100) : 0}%</p></div>
          <div><p className="text-[10px] text-white/50 uppercase">Presença</p>
            <p className="text-lg font-bold text-emerald-400">{dados.marcados > 0 ? Math.round((dados.veio / dados.marcados) * 100) : 0}%</p></div>
          <div><p className="text-[10px] text-white/50 uppercase">Veio {"\u2192"} Venda</p>
            <p className="text-lg font-bold text-[#d4af37]">{dados.veio > 0 ? Math.round((dados.vendas / dados.veio) * 100) : 0}%</p></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050a15] text-white overflow-x-hidden">
      {/* Fundo animado */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-emerald-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 backdrop-blur-xl bg-black/20 sticky top-0 z-40">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 md:py-4 max-w-[1600px] mx-auto gap-3 md:gap-0">
            <div className="flex items-center gap-3 md:gap-4">
              <Image
                src="/images/logo-lr.png"
                alt="LR Multimarcas"
                width={160}
                height={52}
                className="h-[36px] md:h-[48px] w-auto object-contain"
              />
              <div>
                <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Dashboard Executivo
                </h1>
                <p className="text-[10px] md:text-xs text-white/40">{weekLabel}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0">
              <Link
                href="/dashboard/corrida"
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 hover:from-yellow-500/30 hover:to-orange-500/30 text-yellow-400 text-xs md:text-sm font-medium transition-all"
              >
                Corrida
              </Link>
              <Link
                href="/dashboard/vendedores"
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 text-violet-400 text-xs md:text-sm font-medium transition-all"
              >
                Lista Vendedores
              </Link>
              <Link
                href="/dashboard/piores"
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 text-xs md:text-sm font-medium transition-all"
              >
                Piores
              </Link>
              <button
                onClick={handleCopyReport}
                disabled={copying}
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-400 text-xs md:text-sm font-medium transition-all disabled:opacity-50"
              >
                {copying ? "Copiando..." : "Copiar Relatorio"}
              </button>
              <button
                onClick={handleDownloadExcel}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-400 text-xs md:text-sm font-medium transition-all disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {downloading ? "Gerando..." : "Excel"}
              </button>
              <Link
                href="/"
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs md:text-sm font-medium transition-all"
              >
                Voltar ao Quadro
              </Link>
            </div>
          </div>
        </header>

        {/* Filtros */}
        <div className="px-6 py-4 max-w-[1600px] mx-auto">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Modo de filtro */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
              <button
                onClick={() => { setFilterMode("semana"); setSelectedDay(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filterMode === "semana"
                    ? "bg-[#d4af37] text-black"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                Semana Toda
              </button>
              <button
                onClick={() => setFilterMode("dia")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filterMode === "dia"
                    ? "bg-violet-500 text-white"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                Por Dia
              </button>
              <button
                onClick={() => setFilterMode("custom")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  filterMode === "custom"
                    ? "bg-cyan-500 text-white"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Periodo
              </button>
            </div>

            {/* Seletor de dias (quando filtro por dia) */}
            {filterMode === "dia" && (
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => {
                  const dayStr = formatDateForDB(day.date)
                  return (
                    <button
                      key={dayStr}
                      onClick={() => setSelectedDay(dayStr)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedDay === dayStr
                          ? "bg-violet-500 text-white"
                          : day.isToday
                          ? "bg-violet-500/20 border border-violet-500/30 text-violet-400"
                          : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {day.dayName} {day.dayNumber}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Seletor de periodo customizado */}
            {filterMode === "custom" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-white/50">De:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-white/50">Ate:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10 mb-6">
            {[
              { id: "produtividade", label: "Qualifiquei & Agendei" },
              { id: "resultados", label: "Marcados & Resultados" },
              { id: "funil", label: "Funil por Equipe" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-[2px] ${
                  activeTab === tab.id
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteudo das Tabs */}
        <div className="px-6 pb-8 max-w-[1600px] mx-auto">
          {/* Tab: Produtividade (Qualifiquei & Agendei) */}
          {activeTab === "produtividade" && (
            <div className="space-y-6">
              {/* Cards resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-5">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Qualificados</p>
                  <p className="text-4xl font-bold text-cyan-400">{qualificados.length}</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500/15 to-violet-600/5 border border-violet-500/20 rounded-2xl p-5">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Agendei</p>
                  <p className="text-4xl font-bold text-violet-400">{agendeiPorVendedor.reduce((acc, v) => acc + v.agendei, 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Top Vendedor</p>
                  <p className="text-lg font-bold text-emerald-400 truncate">{agendeiPorVendedor[0]?.nome || "-"}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Top Equipe</p>
                  <p className="text-lg font-bold text-amber-400 truncate">{agendeiPorVendedor[0]?.equipe || "-"}</p>
                </div>
              </div>

              {/* Tabelas lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Qualifiquei por Vendedor */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4">Qualifiquei por Vendedor</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {qualifiqueiPorVendedor.length === 0 ? (
                      <p className="text-white/40 text-sm">Nenhum lead qualificado no periodo</p>
                    ) : (
                      qualifiqueiPorVendedor.map((v, idx) => (
                        <div key={v.nome} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                          <span className="text-lg font-bold text-white/30 w-6">{idx + 1}</span>
                          {v.foto ? (
                            <img src={v.foto} alt={v.nome} className="w-10 h-10 rounded-full object-cover object-top border border-cyan-500/30" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                              {v.nome.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{v.nome}</p>
                            <p className="text-xs text-white/40">{v.equipe}</p>
                          </div>
                          <span className="text-2xl font-bold text-cyan-400">{v.qualificados}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Agendei por Vendedor */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-violet-400 mb-4">Agendei por Vendedor</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {agendeiPorVendedor.length === 0 ? (
                      <p className="text-white/40 text-sm">Nenhum lead agendado no periodo</p>
                    ) : (
                      agendeiPorVendedor.map((v, idx) => (
                        <div key={v.nome} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                          <span className="text-lg font-bold text-white/30 w-6">{idx + 1}</span>
                          {v.foto ? (
                            <img src={v.foto} alt={v.nome} className="w-10 h-10 rounded-full object-cover object-top border border-violet-500/30" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                              {v.nome.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{v.nome}</p>
                            <p className="text-xs text-white/40">{v.equipe}</p>
                          </div>
                          <span className="text-2xl font-bold text-violet-400">{v.agendei}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Grafico de barras comparativo */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Comparativo Qualifiquei vs Agendei</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={agendeiPorVendedor.slice(0, 10).map(v => ({
                      name: v.nome.split(" ")[0],
                      Agendei: v.agendei,
                      Qualificados: qualifiqueiPorVendedor.find(q => q.nome === v.nome)?.qualificados || 0,
                    }))}
                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" style={{ fontSize: "12px" }} />
                    <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: "12px" }} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                    <Legend />
                    <Bar dataKey="Qualificados" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Agendei" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Ranking de Conversao Qualifiquei -> Agendei */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Por Vendedor */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-emerald-400 mb-4">Conversao Qualifiquei → Agendei (Vendedor)</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {conversaoQualAgendei.length === 0 ? (
                      <p className="text-white/40 text-sm">Sem dados de conversao</p>
                    ) : (
                      conversaoQualAgendei.map((v, idx) => (
                        <div key={v.nome} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                          <span className="text-lg font-bold text-white/30 w-6">{idx + 1}</span>
                          {v.foto ? (
                            <img src={v.foto} alt={v.nome} className="w-10 h-10 rounded-full object-cover object-top border border-emerald-500/30" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                              {v.nome.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{v.nome}</p>
                            <p className="text-xs text-white/40">{v.qualificados} qual → {v.agendei} agendei</p>
                          </div>
                          <span className={`text-2xl font-bold ${v.taxa >= 70 ? "text-emerald-400" : v.taxa >= 40 ? "text-amber-400" : "text-red-400"}`}>
                            {v.taxa}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Por Equipe */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-amber-400 mb-4">Conversao Qualifiquei → Agendei (Equipe)</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {conversaoPorEquipe.length === 0 ? (
                      <p className="text-white/40 text-sm">Sem dados de conversao</p>
                    ) : (
                      conversaoPorEquipe.map((e, idx) => (
                        <div key={e.nome} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                          <span className="text-lg font-bold text-white/30 w-6">{idx + 1}</span>
                          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                            {e.nome.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{e.nome}</p>
                            <p className="text-xs text-white/40">{e.qualificados} qual → {e.agendei} agendei</p>
                          </div>
                          <span className={`text-2xl font-bold ${e.taxa >= 70 ? "text-emerald-400" : e.taxa >= 40 ? "text-amber-400" : "text-red-400"}`}>
                            {e.taxa}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Resultados (Marcados, Veio, Faltou) */}
          {activeTab === "resultados" && (
            <div className="space-y-6">
              {/* Cards resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className="bg-gradient-to-br from-[#d4af37]/15 to-[#d4af37]/5 border border-[#d4af37]/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Marcados</p>
                  <p className="text-3xl font-bold text-[#d4af37]">{stats.total}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Veio</p>
                  <p className="text-3xl font-bold text-emerald-400">{stats.veio}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500/15 to-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Faltou</p>
                  <p className="text-3xl font-bold text-red-400">{stats.nao}</p>
                </div>
                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Pendentes</p>
                  <p className="text-3xl font-bold text-white/70">{stats.pendentes}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Presenca</p>
                  <p className="text-3xl font-bold text-blue-400">{stats.taxaPresenca}%</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Vendas</p>
                  <p className="text-3xl font-bold text-emerald-400">{stats.vendas}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase">Conversao</p>
                  <p className="text-3xl font-bold text-amber-400">{stats.taxaConversao}%</p>
                </div>
              </div>

              {/* Tabela de resultados por vendedor */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 overflow-x-auto">
                <h3 className="text-lg font-semibold text-[#d4af37] mb-4">Resultados por Vendedor</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-2 text-white/50 font-medium">Vendedor</th>
                      <th className="text-center py-3 px-2 text-[#d4af37] font-medium">Marcados</th>
                      <th className="text-center py-3 px-2 text-emerald-400 font-medium">Veio</th>
                      <th className="text-center py-3 px-2 text-red-400 font-medium">Faltou</th>
                      <th className="text-center py-3 px-2 text-emerald-400 font-medium">Fechou</th>
                      <th className="text-center py-3 px-2 text-white/50 font-medium">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosPorVendedor.map((v: any) => {
                      const conv = v.veio > 0 ? Math.round((v.vendas / v.veio) * 100) : 0
                      return (
                        <tr key={v.nome} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              {v.foto ? (
                                <img src={v.foto} alt={v.nome} className="w-8 h-8 rounded-full object-cover object-top" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] text-sm font-bold">
                                  {v.nome.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-white">{v.nome}</p>
                                <p className="text-xs text-white/40">{v.equipe}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2 text-[#d4af37] font-semibold">{v.marcados}</td>
                          <td className="text-center py-3 px-2 text-emerald-400 font-semibold">{v.veio}</td>
                          <td className="text-center py-3 px-2 text-red-400 font-semibold">{v.nao}</td>
                          <td className="text-center py-3 px-2 text-emerald-400 font-semibold">{v.vendas}</td>
                          <td className="text-center py-3 px-2 text-white/70 font-semibold">{conv}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tabela de conversao por atendente (atendeu -> fechou) */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 overflow-x-auto">
                <h3 className="text-lg font-semibold text-emerald-400 mb-4">Conversao por Atendente (atendeu &rarr; fechou)</h3>
                {conversaoPorAtendente.length === 0 ? (
                  <p className="text-white/40 text-sm">Nenhum atendimento registrado</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-2 text-white/50 font-medium">Atendente</th>
                        <th className="text-center py-3 px-2 text-[#d4af37] font-medium">Atendeu</th>
                        <th className="text-center py-3 px-2 text-emerald-400 font-medium">Fechou</th>
                        <th className="text-right py-3 px-2 text-emerald-400 font-medium">Valor fechado</th>
                        <th className="text-center py-3 px-2 text-amber-400 font-medium">Conversao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversaoPorAtendente.map((a) => (
                        <tr key={a.nome} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              {a.foto ? (
                                <img src={a.foto || "/placeholder.svg"} alt={a.nome} className="w-8 h-8 rounded-full object-cover object-top" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                                  {a.nome.charAt(0)}
                                </div>
                              )}
                              <p className="font-medium text-white">{a.nome}</p>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2 text-[#d4af37] font-semibold">{a.atendeu}</td>
                          <td className="text-center py-3 px-2 text-emerald-400 font-semibold">{a.fechou}</td>
                          <td className="text-right py-3 px-2 text-emerald-400 font-semibold">R$ {a.valor.toLocaleString("pt-BR")}</td>
                          <td className="text-center py-3 px-2 text-amber-400 font-semibold">{a.taxa}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Atendentes e Origem */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Atendentes */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-emerald-400 mb-4">Atendentes (Conversao)</h3>
                  <div className="space-y-3">
                    {atendenteStats.length === 0 ? (
                      <p className="text-white/40 text-sm">Nenhum atendimento registrado</p>
                    ) : (
                      atendenteStats.map((a) => {
                        const conv = a.atendidos > 0 ? Math.round((a.vendas / a.atendidos) * 100) : 0
                        return (
                          <div key={a.nome} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                            <span className="font-medium text-white">{a.nome}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-white/50 text-sm">Atendeu: {a.atendidos}</span>
                              <span className="text-emerald-400 font-bold">Vendas: {a.vendas}</span>
                              <span className="text-amber-400 font-bold">{conv}%</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Origens Marcados e Vendas */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-violet-400 mb-4">Origem dos Leads</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Origens Marcados */}
                    <div>
                      <p className="text-sm text-[#d4af37] mb-2 font-medium">Marcados</p>
                      <div className="space-y-1 max-h-[180px] overflow-y-auto">
                        {origensMarcados.marcados.length === 0 ? (
                          <p className="text-white/30 text-xs">Sem dados</p>
                        ) : (
                          origensMarcados.marcados.map(([origem, qtd]) => (
                            <div key={origem} className="flex items-center justify-between text-sm">
                              <span className="text-white/60 truncate">{origem}</span>
                              <span className="text-[#d4af37] font-semibold">{qtd}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {/* Origens Vendas */}
                    <div>
                      <p className="text-sm text-emerald-400 mb-2 font-medium">Vendas</p>
                      <div className="space-y-1 max-h-[180px] overflow-y-auto">
                        {origensMarcados.vendas.length === 0 ? (
                          <p className="text-white/30 text-xs">Sem vendas</p>
                        ) : (
                          origensMarcados.vendas.map(([origem, qtd]) => (
                            <div key={origem} className="flex items-center justify-between text-sm">
                              <span className="text-white/60 truncate">{origem}</span>
                              <span className="text-emerald-400 font-semibold">{qtd}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Funil por Equipe */}
          {activeTab === "funil" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Funil de Conversão</h3>
              {/* GERAL */}
              <div className="max-w-2xl mx-auto">
                <FunilDoisEstagios dados={funilGeral} destaque />
              </div>
              <h3 className="text-lg font-bold text-white/80 pt-2">Por Equipe</h3>
              {funilPorEquipe.length === 0 ? (
                <p className="text-white/40">Nenhum dado disponivel</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {funilPorEquipe.map((equipe: any) => (
                    <FunilDoisEstagios key={equipe.equipe} dados={equipe} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
