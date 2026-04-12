"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome } from "@/lib/vendedor-fotos"
import { ArrowLeft, Printer, Calendar, Download, FileSpreadsheet } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type FilterMode = "semana" | "mes" | "custom"

export default function VendedoresDiarioPage() {
  const hoje = new Date().toISOString().split("T")[0]
  const [selectedDay, setSelectedDay] = useState<string>(hoje)
  const [filterMode, setFilterMode] = useState<FilterMode>("semana")
  const [selectedMonth, setSelectedMonth] = useState<string>(hoje.substring(0, 7))
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  // Dias da semana
  const weekDays = useMemo(() => getWeekDays(), [])
  const weekRange = useMemo(() => ({
    start: formatDateForDB(weekDays[0].date),
    end: formatDateForDB(weekDays[weekDays.length - 1].date),
  }), [weekDays])

  // Range do mes
  const monthRange = useMemo(() => {
    const [year, month] = selectedMonth.split("-")
    const startDate = `${year}-${month}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, "0")}`
    return { start: startDate, end: endDate }
  }, [selectedMonth])

  // Range ativo baseado no modo
  const activeRange = useMemo(() => {
    if (filterMode === "mes") return monthRange
    if (filterMode === "custom" && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate }
    }
    return weekRange
  }, [filterMode, weekRange, monthRange, customStartDate, customEndDate])

  // Busca dados
  const { data: leadsData } = useSWR("/api/leads", fetcher, { refreshInterval: 30000 })
  const { data: qualificadosData } = useSWR(
    `/api/leads/qualificados?startDate=${activeRange.start}&endDate=${activeRange.end}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const leads = leadsData || []
  const qualificados = qualificadosData?.leads || []

  // Dados por vendedor
  const vendedoresData = useMemo(() => {
    const map: Record<string, {
      nome: string
      foto: string | null
      equipe: string
      agendeiDia: number
      agendeiPeriodo: number
      qualifiqueiDia: number
      qualifiqueiPeriodo: number
    }> = {}

    // Agendei do dia e periodo
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
          agendeiDia: 0,
          agendeiPeriodo: 0,
          qualifiqueiDia: 0,
          qualifiqueiPeriodo: 0,
        }
      }
      map[vendedor].agendeiPeriodo++
      if (agendeiDate === selectedDay) {
        map[vendedor].agendeiDia++
      }
    })

    // Qualifiquei do dia e periodo
    qualificados.forEach((q: any) => {
      const qualDate = q.data_qualificacao
      if (!qualDate) return

      const vendedor = normalizeVendedorNome(q.responsavel || q.vendedor || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: getFotoVendedor(vendedor) || null,
          equipe: q.equipe || "Sem equipe",
          agendeiDia: 0,
          agendeiPeriodo: 0,
          qualifiqueiDia: 0,
          qualifiqueiPeriodo: 0,
        }
      }
      map[vendedor].qualifiqueiPeriodo++
      if (qualDate === selectedDay) {
        map[vendedor].qualifiqueiDia++
      }
    })

    return Object.values(map).sort((a, b) => 
      (b.agendeiDia + b.qualifiqueiDia) - (a.agendeiDia + a.qualifiqueiDia)
    )
  }, [leads, qualificados, selectedDay, activeRange])

  // Origens dos leads
  const origensDados = useMemo(() => {
    const mapAgendei: Record<string, number> = {}
    const mapQualificados: Record<string, number> = {}

    // Origens do Agendei
    leads.forEach((lead: any) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < activeRange.start || agendeiDate > activeRange.end) return
      
      const origem = lead.origem || "Nao informado"
      mapAgendei[origem] = (mapAgendei[origem] || 0) + 1
    })

    // Origens do Qualifiquei
    qualificados.forEach((q: any) => {
      const origem = q.origem || "Nao informado"
      mapQualificados[origem] = (mapQualificados[origem] || 0) + 1
    })

    return {
      agendei: Object.entries(mapAgendei).sort((a, b) => b[1] - a[1]),
      qualificados: Object.entries(mapQualificados).sort((a, b) => b[1] - a[1]),
    }
  }, [leads, qualificados, activeRange])

  // Totais
  const totais = useMemo(() => {
    return vendedoresData.reduce((acc, v) => ({
      agendeiDia: acc.agendeiDia + v.agendeiDia,
      agendeiPeriodo: acc.agendeiPeriodo + v.agendeiPeriodo,
      qualifiqueiDia: acc.qualifiqueiDia + v.qualifiqueiDia,
      qualifiqueiPeriodo: acc.qualifiqueiPeriodo + v.qualifiqueiPeriodo,
    }), { agendeiDia: 0, agendeiPeriodo: 0, qualifiqueiDia: 0, qualifiqueiPeriodo: 0 })
  }, [vendedoresData])

  // Formata data para exibicao
  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })
  }

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  }

  // Imprimir
  const handlePrint = () => {
    window.print()
  }

  // Exportar Excel
  const handleExportExcel = () => {
    let csv = "Vendedor;Equipe;Agendei (Dia);Agendei (Periodo);Qualifiquei (Dia);Qualifiquei (Periodo)\n"
    vendedoresData.forEach(v => {
      csv += `${v.nome};${v.equipe};${v.agendeiDia};${v.agendeiPeriodo};${v.qualifiqueiDia};${v.qualifiqueiPeriodo}\n`
    })
    csv += `TOTAL;;${totais.agendeiDia};${totais.agendeiPeriodo};${totais.qualifiqueiDia};${totais.qualifiqueiPeriodo}\n`
    csv += `\nOrigens Agendei\n`
    origensDados.agendei.forEach(([origem, qtd]) => {
      csv += `${origem};${qtd}\n`
    })
    csv += `\nOrigens Qualifiquei\n`
    origensDados.qualificados.forEach(([origem, qtd]) => {
      csv += `${origem};${qtd}\n`
    })

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `produtividade_${selectedDay}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Label do periodo
  const periodoLabel = filterMode === "mes" 
    ? formatMonthLabel(selectedMonth) 
    : filterMode === "custom" && customStartDate && customEndDate
    ? `${formatDayLabel(customStartDate)} - ${formatDayLabel(customEndDate)}`
    : "Semana"

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      {/* Header */}
      <header className="bg-[#18181b] border-b border-white/10 px-6 py-4 print:hidden">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Vendedores - Produtividade</h1>
              <p className="text-sm text-white/50">Agendei e Qualifiquei por vendedor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="px-6 py-4 max-w-[1400px] mx-auto print:hidden">
        {/* Modo de filtro */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setFilterMode("semana")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                filterMode === "semana" ? "bg-[#d4af37] text-black" : "text-white/70 hover:bg-white/10"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setFilterMode("mes")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                filterMode === "mes" ? "bg-violet-500 text-white" : "text-white/70 hover:bg-white/10"
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setFilterMode("custom")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                filterMode === "custom" ? "bg-cyan-500 text-white" : "text-white/70 hover:bg-white/10"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Periodo
            </button>
          </div>

          {filterMode === "mes" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 focus:outline-none"
            />
          )}

          {filterMode === "custom" && (
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-white/50">ate</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Seletor de dia */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Calendar className="w-4 h-4 text-white/50 flex-shrink-0" />
          {weekDays.map((day) => {
            const dayStr = formatDateForDB(day.date)
            return (
              <button
                key={dayStr}
                onClick={() => setSelectedDay(dayStr)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  selectedDay === dayStr
                    ? "bg-[#d4af37] text-black"
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
      </div>

      {/* Conteudo */}
      <div className="px-6 py-4 max-w-[1400px] mx-auto">
        {/* Titulo para impressao */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">LR MULTIMARCAS</h1>
          <p className="text-center text-gray-600">Produtividade - {formatDayLabel(selectedDay)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabela principal */}
          <div className="lg:col-span-2">
            <div className="bg-[#18181b] border border-white/10 rounded-xl overflow-hidden print:border-gray-300">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#d4af37]/10 border-b border-white/10 print:bg-gray-100 print:border-gray-300">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#d4af37] print:text-gray-800">Vendedor</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#d4af37] print:text-gray-800">Equipe</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-violet-400 print:text-gray-800">
                      Agendei<br/><span className="text-xs font-normal">(Dia)</span>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-violet-400/60 print:text-gray-600">
                      Agendei<br/><span className="text-xs font-normal">({periodoLabel})</span>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-cyan-400 print:text-gray-800">
                      Qualifiquei<br/><span className="text-xs font-normal">(Dia)</span>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-cyan-400/60 print:text-gray-600">
                      Qualifiquei<br/><span className="text-xs font-normal">({periodoLabel})</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vendedoresData.map((v, idx) => (
                    <tr 
                      key={v.nome} 
                      className={`border-b border-white/5 hover:bg-white/5 print:border-gray-200 ${
                        idx % 2 === 0 ? "print:bg-gray-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {v.foto ? (
                            <Image
                              src={v.foto}
                              alt={v.nome}
                              width={32}
                              height={32}
                              className="rounded-full object-cover print:hidden"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold print:hidden">
                              {v.nome.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-white print:text-gray-800">{v.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60 print:text-gray-600">{v.equipe}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${v.agendeiDia > 0 ? "text-violet-400" : "text-white/30"} print:text-gray-800`}>
                          {v.agendeiDia}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-white/40 print:text-gray-600">{v.agendeiPeriodo}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${v.qualifiqueiDia > 0 ? "text-cyan-400" : "text-white/30"} print:text-gray-800`}>
                          {v.qualifiqueiDia}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-white/40 print:text-gray-600">{v.qualifiqueiPeriodo}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#d4af37]/10 border-t border-white/10 print:bg-gray-100 print:border-gray-300">
                    <td className="px-4 py-3 font-bold text-[#d4af37] print:text-gray-800" colSpan={2}>TOTAL</td>
                    <td className="px-4 py-3 text-center text-xl font-bold text-violet-400 print:text-gray-800">{totais.agendeiDia}</td>
                    <td className="px-4 py-3 text-center text-sm text-violet-400/60 print:text-gray-600">{totais.agendeiPeriodo}</td>
                    <td className="px-4 py-3 text-center text-xl font-bold text-cyan-400 print:text-gray-800">{totais.qualifiqueiDia}</td>
                    <td className="px-4 py-3 text-center text-sm text-cyan-400/60 print:text-gray-600">{totais.qualifiqueiPeriodo}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Origens */}
          <div className="space-y-6 print:hidden">
            {/* Origens Agendei */}
            <div className="bg-[#18181b] border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-violet-400 mb-3">Origens - Agendei</h3>
              {origensDados.agendei.length === 0 ? (
                <p className="text-white/30 text-sm">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {origensDados.agendei.map(([origem, qtd]) => (
                    <div key={origem} className="flex items-center justify-between">
                      <span className="text-sm text-white/70 truncate">{origem}</span>
                      <span className="text-sm font-bold text-violet-400">{qtd}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Origens Qualifiquei */}
            <div className="bg-[#18181b] border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-cyan-400 mb-3">Origens - Qualifiquei</h3>
              {origensDados.qualificados.length === 0 ? (
                <p className="text-white/30 text-sm">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {origensDados.qualificados.map(([origem, qtd]) => (
                    <div key={origem} className="flex items-center justify-between">
                      <span className="text-sm text-white/70 truncate">{origem}</span>
                      <span className="text-sm font-bold text-cyan-400">{qtd}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-white/40 print:text-gray-500">
          <span>Dia: {formatDayLabel(selectedDay)}</span>
          <span>|</span>
          <span>Periodo: {activeRange.start} a {activeRange.end}</span>
        </div>
      </div>

      {/* Estilos de impressao */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}
