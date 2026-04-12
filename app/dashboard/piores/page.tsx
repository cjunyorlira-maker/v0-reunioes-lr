"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome } from "@/lib/vendedor-fotos"
import { ArrowLeft, TrendingDown, Users, User, Calendar } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type ViewMode = "equipe" | "vendedor"

export default function PioresDesempenhoPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("equipe")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  // Dias da semana
  const weekDays = useMemo(() => getWeekDays(), [])
  const weekRange = useMemo(() => ({
    start: formatDateForDB(weekDays[0].date),
    end: formatDateForDB(weekDays[weekDays.length - 1].date),
  }), [weekDays])

  // Range ativo
  const activeRange = useMemo(() => {
    if (customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate }
    }
    return weekRange
  }, [customStartDate, customEndDate, weekRange])

  // Busca dados
  const { data: leadsData } = useSWR("/api/leads", fetcher, { refreshInterval: 30000 })
  const { data: qualificadosData } = useSWR(
    `/api/leads/qualificados?startDate=${activeRange.start}&endDate=${activeRange.end}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const leads = leadsData || []
  const qualificados = qualificadosData?.leads || []

  // Leads filtrados pelo range (exclui retornos)
  const leadsAtivos = useMemo(() => {
    return leads.filter((l: any) => {
      if (l.retorno) return false
      return l.data >= activeRange.start && l.data <= activeRange.end
    })
  }, [leads, activeRange])

  // Piores por EQUIPE
  const pioresPorEquipe = useMemo(() => {
    const map: Record<string, {
      nome: string
      agendei: number
      qualificados: number
      marcados: number
      veio: number
      nao: number
      taxaPresenca: number
    }> = {}

    // Qualificados
    qualificados.forEach((q: any) => {
      const equipe = q.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { nome: equipe, agendei: 0, qualificados: 0, marcados: 0, veio: 0, nao: 0, taxaPresenca: 0 }
      }
      map[equipe].qualificados++
    })

    // Agendei
    leads.forEach((lead: any) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const equipe = lead.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { nome: equipe, agendei: 0, qualificados: 0, marcados: 0, veio: 0, nao: 0, taxaPresenca: 0 }
      }
      map[equipe].agendei++
    })

    // Marcados, Veio, Nao
    leadsAtivos.forEach((lead: any) => {
      const equipe = lead.equipe || "Sem equipe"
      if (!map[equipe]) {
        map[equipe] = { nome: equipe, agendei: 0, qualificados: 0, marcados: 0, veio: 0, nao: 0, taxaPresenca: 0 }
      }
      map[equipe].marcados++
      if (lead.status === "veio") map[equipe].veio++
      if (lead.status === "nao" && !lead.remarcado) map[equipe].nao++
    })

    // Calcula taxa de presenca
    Object.values(map).forEach(e => {
      const total = e.veio + e.nao
      e.taxaPresenca = total > 0 ? Math.round((e.veio / total) * 100) : 0
    })

    return Object.values(map)
  }, [qualificados, leads, leadsAtivos, activeRange])

  // Piores por VENDEDOR
  const pioresPorVendedor = useMemo(() => {
    const map: Record<string, {
      nome: string
      foto: string | null
      equipe: string
      agendei: number
      qualificados: number
      marcados: number
      veio: number
      nao: number
      taxaPresenca: number
    }> = {}

    // Qualificados
    qualificados.forEach((q: any) => {
      const vendedor = normalizeVendedorNome(q.responsavel || q.vendedor || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = { 
          nome: vendedor, 
          foto: getFotoVendedor(vendedor) || null,
          equipe: q.equipe || "Sem equipe",
          agendei: 0, qualificados: 0, marcados: 0, veio: 0, nao: 0, taxaPresenca: 0 
        }
      }
      map[vendedor].qualificados++
    })

    // Agendei
    leads.forEach((lead: any) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return

      const vendedor = normalizeVendedorNome(lead.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = { 
          nome: vendedor, 
          foto: lead.foto_responsavel || getFotoVendedor(vendedor) || null,
          equipe: lead.equipe || "Sem equipe",
          agendei: 0, qualificados: 0, marcados: 0, veio: 0, nao: 0, taxaPresenca: 0 
        }
      }
      map[vendedor].agendei++
    })

    // Marcados, Veio, Nao
    leadsAtivos.forEach((lead: any) => {
      const vendedor = normalizeVendedorNome(lead.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = { 
          nome: vendedor, 
          foto: lead.foto_responsavel || getFotoVendedor(vendedor) || null,
          equipe: lead.equipe || "Sem equipe",
          agendei: 0, qualificados: 0, marcados: 0, veio: 0, nao: 0, taxaPresenca: 0 
        }
      }
      map[vendedor].marcados++
      if (lead.status === "veio") map[vendedor].veio++
      if (lead.status === "nao" && !lead.remarcado) map[vendedor].nao++
    })

    // Calcula taxa de presenca
    Object.values(map).forEach(v => {
      const total = v.veio + v.nao
      v.taxaPresenca = total > 0 ? Math.round((v.veio / total) * 100) : 0
    })

    return Object.values(map)
  }, [qualificados, leads, leadsAtivos, activeRange])

  // Dados ativos baseado no modo
  const data = viewMode === "equipe" ? pioresPorEquipe : pioresPorVendedor

  // Rankings piores
  const pioresQualificar = useMemo(() => [...data].sort((a, b) => a.qualificados - b.qualificados).slice(0, 5), [data])
  const pioresAgendar = useMemo(() => [...data].sort((a, b) => a.agendei - b.agendei).slice(0, 5), [data])
  const pioresMarcados = useMemo(() => [...data].sort((a, b) => a.marcados - b.marcados).slice(0, 5), [data])
  const pioresPresenca = useMemo(() => {
    return [...data]
      .filter(d => (d.veio + d.nao) > 0) // Apenas quem teve reunioes
      .sort((a, b) => a.taxaPresenca - b.taxaPresenca)
      .slice(0, 5)
  }, [data])

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      {/* Header */}
      <header className="bg-[#18181b] border-b border-white/10 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                Piores Desempenhos
              </h1>
              <p className="text-sm text-white/50">Identifique pontos de melhoria</p>
            </div>
          </div>

          {/* Toggle Equipe/Vendedor */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode("equipe")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === "equipe"
                  ? "bg-red-500 text-white"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              <Users className="w-4 h-4" />
              Por Equipe
            </button>
            <button
              onClick={() => setViewMode("vendedor")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === "vendedor"
                  ? "bg-red-500 text-white"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              <User className="w-4 h-4" />
              Por Vendedor
            </button>
          </div>
        </div>
      </header>

      {/* Filtro de periodo */}
      <div className="px-6 py-4 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/50" />
            <span className="text-sm text-white/50">Periodo:</span>
          </div>
          <button
            onClick={() => { setCustomStartDate(""); setCustomEndDate(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !customStartDate && !customEndDate
                ? "bg-red-500 text-white"
                : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
            }`}
          >
            Semana Atual
          </button>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-red-500 focus:outline-none"
            />
            <span className="text-white/30">ate</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Conteudo */}
      <div className="px-6 py-4 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Piores em Qualificar */}
          <div className="bg-[#18181b] border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Piores em Qualificar
            </h3>
            <div className="space-y-3">
              {pioresQualificar.map((item: any, idx) => (
                <div key={item.nome} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-red-400/50">{idx + 1}</span>
                    {viewMode === "vendedor" && item.foto ? (
                      <Image src={item.foto} alt={item.nome} width={32} height={32} className="rounded-full" />
                    ) : null}
                    <div>
                      <p className="font-medium text-white">{item.nome}</p>
                      {viewMode === "vendedor" && <p className="text-xs text-white/40">{item.equipe}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-400">{item.qualificados}</p>
                    <p className="text-xs text-white/40">qualificados</p>
                  </div>
                </div>
              ))}
              {pioresQualificar.length === 0 && <p className="text-white/30 text-center py-4">Sem dados</p>}
            </div>
          </div>

          {/* Piores em Agendei */}
          <div className="bg-[#18181b] border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Piores em Agendei
            </h3>
            <div className="space-y-3">
              {pioresAgendar.map((item: any, idx) => (
                <div key={item.nome} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-orange-400/50">{idx + 1}</span>
                    {viewMode === "vendedor" && item.foto ? (
                      <Image src={item.foto} alt={item.nome} width={32} height={32} className="rounded-full" />
                    ) : null}
                    <div>
                      <p className="font-medium text-white">{item.nome}</p>
                      {viewMode === "vendedor" && <p className="text-xs text-white/40">{item.equipe}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-400">{item.agendei}</p>
                    <p className="text-xs text-white/40">agendados</p>
                  </div>
                </div>
              ))}
              {pioresAgendar.length === 0 && <p className="text-white/30 text-center py-4">Sem dados</p>}
            </div>
          </div>

          {/* Piores em Marcados */}
          <div className="bg-[#18181b] border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Piores em Marcados
            </h3>
            <div className="space-y-3">
              {pioresMarcados.map((item: any, idx) => (
                <div key={item.nome} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-yellow-400/50">{idx + 1}</span>
                    {viewMode === "vendedor" && item.foto ? (
                      <Image src={item.foto} alt={item.nome} width={32} height={32} className="rounded-full" />
                    ) : null}
                    <div>
                      <p className="font-medium text-white">{item.nome}</p>
                      {viewMode === "vendedor" && <p className="text-xs text-white/40">{item.equipe}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-400">{item.marcados}</p>
                    <p className="text-xs text-white/40">marcados</p>
                  </div>
                </div>
              ))}
              {pioresMarcados.length === 0 && <p className="text-white/30 text-center py-4">Sem dados</p>}
            </div>
          </div>

          {/* Piores em Marcar e Nao Vim */}
          <div className="bg-[#18181b] border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Piores em Marcar e Nao Vim
            </h3>
            <div className="space-y-3">
              {pioresPresenca.map((item: any, idx) => (
                <div key={item.nome} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-pink-400/50">{idx + 1}</span>
                    {viewMode === "vendedor" && item.foto ? (
                      <Image src={item.foto} alt={item.nome} width={32} height={32} className="rounded-full" />
                    ) : null}
                    <div>
                      <p className="font-medium text-white">{item.nome}</p>
                      {viewMode === "vendedor" && <p className="text-xs text-white/40">{item.equipe}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-pink-400">{item.taxaPresenca}%</p>
                    <p className="text-xs text-white/40">{item.veio} de {item.veio + item.nao}</p>
                  </div>
                </div>
              ))}
              {pioresPresenca.length === 0 && <p className="text-white/30 text-center py-4">Sem dados</p>}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
