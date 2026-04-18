"use client"

import { useVendas } from "@/hooks/use-vendas"

export function SalesDashboard() {
  const { rankingVendedores, vendas, isLoading } = useVendas()

  // Calcular estatísticas de avaliação
  const avaliacaoStats = {
    excelente: vendas.filter(v => v.avaliacao === "Excelente").length,
    bom: vendas.filter(v => v.avaliacao === "Bom").length,
    naoAvaliado: vendas.filter(v => !v.avaliacao).length,
  }

  // Total de vendas e valor
  const totalVendas = vendas.length
  const totalValor = vendas.reduce((acc, v) => acc + v.valor_venda, 0)

  // Vendas por origem
  const vendorPorOrigem = vendas.reduce((acc, v) => {
    const origem = v.origem || "Sem origem"
    const existing = acc.find(x => x.nome === origem)
    if (existing) {
      existing.total += v.valor_venda
      existing.vendas++
    } else {
      acc.push({ nome: origem, total: v.valor_venda, vendas: 1 })
    }
    return acc
  }, [] as Array<{ nome: string; total: number; vendas: number }>)
    .sort((a, b) => b.vendas - a.vendas)

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

      {/* Ranking Vendedores */}
      {rankingVendedores.length > 0 && (
        <div className="group relative backdrop-blur-xl rounded-2xl p-5 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 100%)`, border: `1px solid rgba(255,255,255,0.08)` }} />
          <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10" style={{ background: `rgba(255,255,255,0.05)` }} />
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-white mb-4">Ranking de Vendedores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rankingVendedores.map((vendedor, idx) => (
                <div key={vendedor.nome} className="backdrop-blur-sm bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12] hover:scale-105">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#d4af37] to-[#c9a227] flex items-center justify-center text-white text-xs font-black">
                      {idx + 1}
                    </div>
                    <p className="text-[11px] text-white/80 font-semibold flex-1 truncate">{vendedor.nome}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-white">{vendedor.vendas}</p>
                    <p className="text-xs text-white/40">vendas</p>
                  </div>
                  <p className="text-[10px] text-white/50 mt-2">R$ {(vendedor.valor / 1000).toFixed(1)}k</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Origem Breakdown */}
      {vendorPorOrigem.length > 0 && (
        <div className="group relative backdrop-blur-xl rounded-2xl p-5 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 100%)`, border: `1px solid rgba(255,255,255,0.08)` }} />
          <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10" style={{ background: `rgba(255,255,255,0.05)` }} />
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-white mb-4">Vendas por Origem</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {vendorPorOrigem.map((item) => (
                <div key={item.nome} className="backdrop-blur-sm bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12] hover:scale-105">
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
