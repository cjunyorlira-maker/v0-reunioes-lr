"use client"

import { useMemo } from "react"
import type { Lead } from "@/lib/types"
import { getFotoVendedor } from "@/lib/vendedor-fotos"

interface OnlinePresencialStatsProps {
  leads: Lead[]
}

interface VendedorStats {
  nome: string
  foto?: string
  presencial: { total: number; veio: number; nao: number }
  online: { total: number; veio: number; nao: number }
}

export function OnlinePresencialStats({ leads }: OnlinePresencialStatsProps) {
  const vendedorStats = useMemo(() => {
    const stats: Record<string, VendedorStats> = {}

    leads.forEach((lead) => {
      const nome = lead.responsavel || "Sem nome"
      const tipoReu = lead.tipo_reuniao?.toLowerCase() || "presencial"
      const isOnline = tipoReu === "online"

      if (!stats[nome]) {
        stats[nome] = {
          nome,
          foto: lead.foto_responsavel || getFotoVendedor(nome) || undefined,
          presencial: { total: 0, veio: 0, nao: 0 },
          online: { total: 0, veio: 0, nao: 0 },
        }
      }

      if (isOnline) {
        stats[nome].online.total++
        if (lead.status === "veio") stats[nome].online.veio++
        else if (lead.status === "nao") stats[nome].online.nao++
      } else {
        stats[nome].presencial.total++
        if (lead.status === "veio") stats[nome].presencial.veio++
        else if (lead.status === "nao") stats[nome].presencial.nao++
      }
    })

    // Ordena por quem tem mais online marcados
    return Object.values(stats).sort((a, b) => b.online.total - a.online.total)
  }, [leads])

  // Calcula totais gerais
  const totais = useMemo(() => {
    let presencialTotal = 0, presencialVeio = 0, presencialNao = 0
    let onlineTotal = 0, onlineVeio = 0, onlineNao = 0

    vendedorStats.forEach((v) => {
      presencialTotal += v.presencial.total
      presencialVeio += v.presencial.veio
      presencialNao += v.presencial.nao
      onlineTotal += v.online.total
      onlineVeio += v.online.veio
      onlineNao += v.online.nao
    })

    const presencialDecididos = presencialVeio + presencialNao
    const onlineDecididos = onlineVeio + onlineNao

    return {
      presencial: {
        total: presencialTotal,
        veio: presencialVeio,
        conversao: presencialDecididos > 0 ? Math.round((presencialVeio / presencialDecididos) * 100) : 0,
      },
      online: {
        total: onlineTotal,
        veio: onlineVeio,
        conversao: onlineDecididos > 0 ? Math.round((onlineVeio / onlineDecididos) * 100) : 0,
      },
    }
  }, [vendedorStats])

  const calcConversao = (veio: number, nao: number) => {
    const decididos = veio + nao
    return decididos > 0 ? Math.round((veio / decididos) * 100) : null
  }

  if (vendedorStats.length === 0) return null

  return (
    <div className="px-4 md:px-6 mb-8">
      <div className="rounded-2xl border border-white/10 backdrop-blur-sm p-6" style={{ background: "rgba(0,0,0,0.12)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Presencial vs Online</h3>
            <p className="text-xs text-white/40 mt-0.5">Comparativo de agendamentos e conversao por tipo</p>
          </div>

          {/* Totais gerais */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-400 text-sm font-bold">Presencial</span>
              <span className="text-white/60 text-xs">{totais.presencial.total} marc.</span>
              <span className="text-emerald-400 text-xs font-bold">{totais.presencial.conversao}% conv.</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-blue-400 text-sm font-bold">Online</span>
              <span className="text-white/60 text-xs">{totais.online.total} marc.</span>
              <span className="text-blue-400 text-xs font-bold">{totais.online.conversao}% conv.</span>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-[10px] text-white/40 uppercase tracking-wider font-semibold">Vendedor</th>
                <th className="text-center py-3 px-2 text-[10px] text-emerald-400/60 uppercase tracking-wider font-semibold" colSpan={3}>
                  Presencial
                </th>
                <th className="text-center py-3 px-2 text-[10px] text-blue-400/60 uppercase tracking-wider font-semibold" colSpan={3}>
                  Online
                </th>
                <th className="text-center py-3 px-4 text-[10px] text-white/40 uppercase tracking-wider font-semibold">Alerta</th>
              </tr>
              <tr className="border-b border-white/5">
                <th></th>
                <th className="text-center py-1 px-2 text-[9px] text-white/30 font-medium">Marc.</th>
                <th className="text-center py-1 px-2 text-[9px] text-white/30 font-medium">Veio</th>
                <th className="text-center py-1 px-2 text-[9px] text-white/30 font-medium">Conv.</th>
                <th className="text-center py-1 px-2 text-[9px] text-white/30 font-medium">Marc.</th>
                <th className="text-center py-1 px-2 text-[9px] text-white/30 font-medium">Veio</th>
                <th className="text-center py-1 px-2 text-[9px] text-white/30 font-medium">Conv.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vendedorStats.map((v) => {
                const presConv = calcConversao(v.presencial.veio, v.presencial.nao)
                const onlineConv = calcConversao(v.online.veio, v.online.nao)
                const maisOnline = v.online.total > v.presencial.total
                const onlineConvBaixa = onlineConv !== null && onlineConv < 50

                return (
                  <tr key={v.nome} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    {/* Vendedor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {v.foto ? (
                          <img src={v.foto} alt={v.nome} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                            {v.nome.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-medium text-white">{v.nome}</span>
                      </div>
                    </td>

                    {/* Presencial */}
                    <td className="text-center py-3 px-2">
                      <span className="text-sm text-white/70">{v.presencial.total}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-sm text-emerald-400 font-semibold">{v.presencial.veio}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      {presConv !== null ? (
                        <span className={`text-sm font-bold ${presConv >= 60 ? "text-emerald-400" : presConv >= 40 ? "text-amber-400" : "text-red-400"}`}>
                          {presConv}%
                        </span>
                      ) : (
                        <span className="text-sm text-white/20">-</span>
                      )}
                    </td>

                    {/* Online */}
                    <td className="text-center py-3 px-2">
                      <span className="text-sm text-white/70">{v.online.total}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-sm text-blue-400 font-semibold">{v.online.veio}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      {onlineConv !== null ? (
                        <span className={`text-sm font-bold ${onlineConv >= 60 ? "text-emerald-400" : onlineConv >= 40 ? "text-amber-400" : "text-red-400"}`}>
                          {onlineConv}%
                        </span>
                      ) : (
                        <span className="text-sm text-white/20">-</span>
                      )}
                    </td>

                    {/* Alertas */}
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {maisOnline && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            + Online
                          </span>
                        )}
                        {onlineConvBaixa && v.online.total > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                            Conv. Baixa
                          </span>
                        )}
                        {!maisOnline && !onlineConvBaixa && (
                          <span className="text-white/20 text-xs">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legenda */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-4 text-[10px] text-white/30">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">+ Online</span>
            <span>Marca mais online que presencial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold">Conv. Baixa</span>
            <span>Conversao online abaixo de 50%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
