"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome } from "@/lib/vendedor-fotos"
import { ArrowLeft, Printer, Calendar } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function VendedoresDiarioPage() {
  const hoje = new Date().toISOString().split("T")[0]
  const [selectedDay, setSelectedDay] = useState<string>(hoje)

  // Dias da semana
  const weekDays = useMemo(() => getWeekDays(), [])
  const weekRange = useMemo(() => ({
    start: formatDateForDB(weekDays[0].date),
    end: formatDateForDB(weekDays[weekDays.length - 1].date),
  }), [weekDays])

  // Busca dados
  const { data: leadsData } = useSWR("/api/leads", fetcher, { refreshInterval: 30000 })
  const { data: qualificadosData } = useSWR(
    `/api/leads/qualificados?startDate=${weekRange.start}&endDate=${weekRange.end}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const leads = leadsData || []
  const qualificados = qualificadosData?.leads || []

  // Dados por vendedor (dia selecionado + acumulado semana)
  const vendedoresData = useMemo(() => {
    const map: Record<string, {
      nome: string
      foto: string | null
      equipe: string
      agendeiDia: number
      agendeiSemana: number
      qualifiqueiDia: number
      qualifiqueiSemana: number
    }> = {}

    // Agendei do dia e semana
    leads.forEach((lead: any) => {
      const agendeiDate = lead.data_agendei
      if (!agendeiDate) return
      if (agendeiDate < weekRange.start || agendeiDate > weekRange.end) return

      const vendedor = normalizeVendedorNome(lead.responsavel || "Nao informado")
      if (!map[vendedor]) {
        map[vendedor] = {
          nome: vendedor,
          foto: lead.foto_responsavel || getFotoVendedor(vendedor) || null,
          equipe: lead.equipe || "Sem equipe",
          agendeiDia: 0,
          agendeiSemana: 0,
          qualifiqueiDia: 0,
          qualifiqueiSemana: 0,
        }
      }
      map[vendedor].agendeiSemana++
      if (agendeiDate === selectedDay) {
        map[vendedor].agendeiDia++
      }
    })

    // Qualifiquei do dia e semana
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
          agendeiSemana: 0,
          qualifiqueiDia: 0,
          qualifiqueiSemana: 0,
        }
      }
      map[vendedor].qualifiqueiSemana++
      if (qualDate === selectedDay) {
        map[vendedor].qualifiqueiDia++
      }
    })

    // Ordena por total do dia (agendei + qualifiquei)
    return Object.values(map).sort((a, b) => 
      (b.agendeiDia + b.qualifiqueiDia) - (a.agendeiDia + a.qualifiqueiDia)
    )
  }, [leads, qualificados, selectedDay, weekRange])

  // Totais
  const totais = useMemo(() => {
    return vendedoresData.reduce((acc, v) => ({
      agendeiDia: acc.agendeiDia + v.agendeiDia,
      agendeiSemana: acc.agendeiSemana + v.agendeiSemana,
      qualifiqueiDia: acc.qualifiqueiDia + v.qualifiqueiDia,
      qualifiqueiSemana: acc.qualifiqueiSemana + v.qualifiqueiSemana,
    }), { agendeiDia: 0, agendeiSemana: 0, qualifiqueiDia: 0, qualifiqueiSemana: 0 })
  }, [vendedoresData])

  // Formata data para exibicao
  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })
  }

  // Imprimir
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      {/* Header */}
      <header className="bg-[#18181b] border-b border-white/10 px-6 py-4 print:hidden">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Vendedores - Produtividade</h1>
              <p className="text-sm text-white/50">Agendei e Qualifiquei por vendedor</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </header>

      {/* Seletor de dia */}
      <div className="px-6 py-4 max-w-[1200px] mx-auto print:hidden">
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

      {/* Conteudo - Lista para impressao */}
      <div className="px-6 py-4 max-w-[1200px] mx-auto">
        {/* Titulo para impressao */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">LR MULTIMARCAS</h1>
          <p className="text-center text-gray-600">Produtividade - {formatDayLabel(selectedDay)}</p>
        </div>

        {/* Tabela */}
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
                  Agendei<br/><span className="text-xs font-normal">(Semana)</span>
                </th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-cyan-400 print:text-gray-800">
                  Qualifiquei<br/><span className="text-xs font-normal">(Dia)</span>
                </th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-cyan-400/60 print:text-gray-600">
                  Qualifiquei<br/><span className="text-xs font-normal">(Semana)</span>
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
                    <span className="text-sm text-white/40 print:text-gray-600">{v.agendeiSemana}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-lg font-bold ${v.qualifiqueiDia > 0 ? "text-cyan-400" : "text-white/30"} print:text-gray-800`}>
                      {v.qualifiqueiDia}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-white/40 print:text-gray-600">{v.qualifiqueiSemana}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#d4af37]/10 border-t border-white/10 print:bg-gray-100 print:border-gray-300">
                <td className="px-4 py-3 font-bold text-[#d4af37] print:text-gray-800" colSpan={2}>TOTAL</td>
                <td className="px-4 py-3 text-center text-xl font-bold text-violet-400 print:text-gray-800">{totais.agendeiDia}</td>
                <td className="px-4 py-3 text-center text-sm text-violet-400/60 print:text-gray-600">{totais.agendeiSemana}</td>
                <td className="px-4 py-3 text-center text-xl font-bold text-cyan-400 print:text-gray-800">{totais.qualifiqueiDia}</td>
                <td className="px-4 py-3 text-center text-sm text-cyan-400/60 print:text-gray-600">{totais.qualifiqueiSemana}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legenda */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-white/40 print:text-gray-500">
          <span>Dia: {formatDayLabel(selectedDay)}</span>
          <span>|</span>
          <span>Semana: {formatDayLabel(weekRange.start)} - {formatDayLabel(weekRange.end)}</span>
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
