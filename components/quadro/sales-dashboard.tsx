"use client"

import { useMemo } from "react"
import { useVendas } from "@/hooks/use-vendas"

export function SalesDashboard() {
  const { vendas, isLoading } = useVendas()

  // TOP 1 Vendedor (maior valor total)
  const top1Vendedor = useMemo(() => {
    if (!vendas || vendas.length === 0) return null
    const byVendedor: Record<string, { total: number; vendas: number }> = {}
    
    vendas.forEach((venda) => {
      if (!byVendedor[venda.responsavel]) {
        byVendedor[venda.responsavel] = { total: 0, vendas: 0 }
      }
      byVendedor[venda.responsavel].total += venda.valor_venda
      byVendedor[venda.responsavel].vendas++
    })

    const sorted = Object.entries(byVendedor).sort((a, b) => b[1].total - a[1].total)
    if (sorted.length === 0) return null

    return {
      nome: sorted[0][0],
      total: sorted[0][1].total,
      vendas: sorted[0][1].vendas,
    }
  }, [vendas])

  // TOP 1 Equipe (mapeando vendedor para equipe)
  const top1Equipe = useMemo(() => {
    if (!vendas || vendas.length === 0) return null
    
    const byEquipe: Record<string, { total: number; vendas: number }> = {}
    
    vendas.forEach((venda) => {
      const equipe = "LR Multimarcas"
      if (!byEquipe[equipe]) {
        byEquipe[equipe] = { total: 0, vendas: 0 }
      }
      byEquipe[equipe].total += venda.valor_venda
      byEquipe[equipe].vendas++
    })

    const sorted = Object.entries(byEquipe).sort((a, b) => b[1].total - a[1].total)
    if (sorted.length === 0) return null

    return {
      nome: sorted[0][0],
      total: sorted[0][1].total,
      vendas: sorted[0][1].vendas,
    }
  }, [vendas])

  // Vendas por origem
  const vendorPorOrigem = useMemo(() => {
    if (!vendas || vendas.length === 0) return []
    const byOrigem: Record<string, { total: number; vendas: number }> = {}
    
    vendas.forEach((venda) => {
      const origem = venda.origem || "Sem origem"
      if (!byOrigem[origem]) {
        byOrigem[origem] = { total: 0, vendas: 0 }
      }
      byOrigem[origem].total += venda.valor_venda
      byOrigem[origem].vendas++
    })

    return Object.entries(byOrigem).map(([nome, data]) => ({ nome, ...data })).sort((a, b) => b.total - a.total)
  }, [vendas])

  // Estatísticas de avaliação
  const avaliacaoStats = useMemo(() => {
    if (!vendas || vendas.length === 0) return { excelente: 0, bom: 0, naoAvaliado: 0 }
    
    let excelente = 0
    let bom = 0
    let naoAvaliado = 0

    vendas.forEach((venda) => {
      if (venda.avaliacao === "Excelente") excelente++
      else if (venda.avaliacao === "Bom") bom++
      else naoAvaliado++
    })

    return { excelente, bom, naoAvaliado }
  }, [vendas])

  const totalVendas = vendas.length
  const totalValor = vendas.reduce((acc, v) => acc + v.valor_venda, 0)

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 mb-6">
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-center text-white/50">
          Carregando vendas...
        </div>
      </div>
    )
  }

  if (!vendas || vendas.length === 0) {
    return (
      <div className="px-4 md:px-6 mb-6">
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-center text-white/50">
          Nenhuma venda registrada
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 mb-6 space-y-5">
      {/* TOP 1 Cards com palminha animada */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        {/* TOP 1 Vendedor */}
        {top1Vendedor && (
          <div className="group relative flex items-center gap-4 px-6 py-4 min-w-fit rounded-2xl backdrop-blur-2xl transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden cursor-default">
            <div 
              className="absolute inset-0 rounded-2xl backdrop-blur-2xl transition-all duration-500"
              style={{
                background: `linear-gradient(145deg, rgba(212,175,55,0.08) 0%, transparent 50%, rgba(212,175,55,0.05) 100%)`,
                border: `1px solid rgba(212,175,55,0.25)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
              }}
            />
            
            <div 
              className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl -z-10"
              style={{ background: `radial-gradient(ellipse at center, rgba(212,175,55,0.3), transparent 70%)` }}
            />
            
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
              <div 
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
              />
            </div>

            {/* Palminha animada */}
            <div className="relative z-10 text-4xl" style={{ animation: 'wave 1.5s ease-in-out infinite' }}>
              👏
            </div>

            <div className="relative z-10 flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "#d4af37", textShadow: `0 0 20px rgba(212,175,55,0.5)` }}>
                TOP 1 VENDEDOR
              </span>
              <span className="text-sm font-bold text-white truncate">{top1Vendedor.nome}</span>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xl font-black" style={{ color: "#d4af37" }}>
                  R$ {(top1Vendedor.total / 1000).toFixed(0)}k
                </span>
                <span className="text-[10px] text-white/60">{top1Vendedor.vendas} vendas</span>
              </div>
            </div>
          </div>
        )}

        {/* TOP 1 Equipe */}
        {top1Equipe && (
          <div className="group relative flex items-center gap-4 px-6 py-4 min-w-fit rounded-2xl backdrop-blur-2xl transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden cursor-default">
            <div 
              className="absolute inset-0 rounded-2xl backdrop-blur-2xl transition-all duration-500"
              style={{
                background: `linear-gradient(145deg, rgba(16,185,129,0.08) 0%, transparent 50%, rgba(16,185,129,0.05) 100%)`,
                border: `1px solid rgba(16,185,129,0.25)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
              }}
            />
            
            <div 
              className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl -z-10"
              style={{ background: `radial-gradient(ellipse at center, rgba(16,185,129,0.3), transparent 70%)` }}
            />
            
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
              <div 
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
              />
            </div>

            {/* Palminha animada */}
            <div className="relative z-10 text-4xl" style={{ animation: 'wave 1.5s ease-in-out infinite 0.2s' }}>
              👏
            </div>

            <div className="relative z-10 flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "#10b981", textShadow: `0 0 20px rgba(16,185,129,0.5)` }}>
                TOP 1 EQUIPE
              </span>
              <span className="text-sm font-bold text-white truncate">{top1Equipe.nome}</span>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xl font-black" style={{ color: "#10b981" }}>
                  R$ {(top1Equipe.total / 1000).toFixed(0)}k
                </span>
                <span className="text-[10px] text-white/60">{top1Equipe.vendas} vendas</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Vendas */}
        <div className="group relative backdrop-blur-xl rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
          <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(135deg, rgba(59,130,246,0.08) 0%, transparent 100%)`, border: `1px solid rgba(59,130,246,0.2)` }} />
          <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10" style={{ background: `rgba(59,130,246,0.2)` }} />
          <div className="relative z-10">
            <span className="text-[10px] text-blue-400/60 uppercase tracking-wider font-bold">Total de Vendas</span>
            <p className="text-3xl font-black text-white mt-2">{totalVendas}</p>
            <p className="text-xs text-blue-400/80 mt-1">R$ {(totalValor / 1000).toFixed(1)}k faturado</p>
          </div>
        </div>

        {/* Avaliação */}
        <div className="group relative backdrop-blur-xl rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
          <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(135deg, rgba(34,197,94,0.08) 0%, transparent 100%)`, border: `1px solid rgba(34,197,94,0.2)` }} />
          <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10" style={{ background: `rgba(34,197,94,0.2)` }} />
          <div className="relative z-10 space-y-2">
            <span className="text-[10px] text-emerald-400/60 uppercase tracking-wider font-bold block">Avaliações</span>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-2xl font-black text-emerald-400">{avaliacaoStats.excelente}</p>
                <p className="text-[9px] text-emerald-400/60">Excelente</p>
              </div>
              <div>
                <p className="text-2xl font-black text-amber-400">{avaliacaoStats.bom}</p>
                <p className="text-[9px] text-amber-400/60">Bom</p>
              </div>
              <div>
                <p className="text-2xl font-black text-gray-400">{avaliacaoStats.naoAvaliado}</p>
                <p className="text-[9px] text-gray-400/60">Não avaliado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Origem */}
        {vendorPorOrigem.length > 0 && (
          <div className="group relative backdrop-blur-xl rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
            <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(135deg, rgba(139,92,246,0.08) 0%, transparent 100%)`, border: `1px solid rgba(139,92,246,0.2)` }} />
            <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10" style={{ background: `rgba(139,92,246,0.2)` }} />
            <div className="relative z-10">
              <span className="text-[10px] text-purple-400/60 uppercase tracking-wider font-bold">Top Origem</span>
              <p className="text-sm font-bold text-white mt-2">{vendorPorOrigem[0].nome}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-black text-purple-400">{vendorPorOrigem[0].vendas}</p>
                <p className="text-xs text-purple-400/60">vendas</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Origem Breakdown */}
      {vendorPorOrigem.length > 0 && (
        <div className="group relative backdrop-blur-xl rounded-2xl p-5 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 100%)`, border: `1px solid rgba(255,255,255,0.08)` }} />
          <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10" style={{ background: `rgba(255,255,255,0.05)` }} />
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-white mb-4">Vendas por Origem</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {vendorPorOrigem.map((item) => (
                <div key={item.nome} className="backdrop-blur-sm bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12]">
                  <p className="text-[11px] text-white/60 font-semibold mb-2">{item.nome}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-white">{item.vendas}</p>
                    <p className="text-xs text-white/40">vendas</p>
                  </div>
                  <p className="text-[10px] text-white/50 mt-1">R$ {(item.total / 1000).toFixed(1)}k</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
