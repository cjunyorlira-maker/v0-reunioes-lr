"use client"

import useSWR from "swr"
import { getFotoVendedor } from "@/lib/vendedores"

interface Venda {
  id: number
  kommo_id: string
  nome_lead: string
  valor_venda: number
  responsavel: string
  atendente: string
  origem: string
  tags: string | null
  avaliacao: string | null
  data_venda: string
}

interface VendasStats {
  totalVendas: number
  valorTotal: number
  top1Vendedor: { nome: string; total: number; valor: number } | null
  top1PorValor: { nome: string; total: number; valor: number } | null
  rankingVendedores: { nome: string; total: number; valor: number }[]
  rankingOrigens: { nome: string; total: number; valor: number }[]
  avaliacoes: { Excelente: number; Bom: number; "Sem avaliação": number }
}

interface VendasResponse {
  vendas: Venda[]
  stats: VendasStats
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SalesDashboard() {
  const { data, isLoading } = useSWR<VendasResponse>("/api/vendas", fetcher, { refreshInterval: 60000 })

  if (isLoading || !data) {
    return (
      <div className="px-4 md:px-6 mb-6">
        <div className="h-32 rounded-2xl bg-white/[0.02] animate-pulse" />
      </div>
    )
  }

  const { stats, vendas } = data
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

  return (
    <div className="px-4 md:px-6 mb-6">
      {/* Header com titulo */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
            Vendas Produção
          </h2>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent" />
        <span className="text-xs text-white/40 font-semibold">{stats.totalVendas} vendas</span>
      </div>

      {/* Grid principal */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {/* TOP 1 Vendedor - com palminha animada */}
        {stats.top1Vendedor && (
          <div className="group relative flex items-center gap-4 px-5 py-4 min-w-fit rounded-2xl backdrop-blur-2xl overflow-hidden cursor-default transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1"
            style={{
              background: "linear-gradient(145deg, rgba(16,185,129,0.12) 0%, transparent 50%, rgba(16,185,129,0.08) 100%)",
              border: "1px solid rgba(16,185,129,0.3)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            {/* Glow animado */}
            <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl -z-10"
              style={{ background: "radial-gradient(ellipse at center, rgba(16,185,129,0.4), transparent 70%)" }}
            />
            
            {/* Shimmer */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
              />
            </div>

            {/* Palminha animada */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="text-3xl animate-bounce" style={{ 
                filter: "drop-shadow(0 0 12px rgba(16,185,129,0.5))",
                animationDuration: "2s",
              }}>
                🏆
              </div>
              <span className="text-[8px] font-black text-emerald-400/60 uppercase tracking-widest mt-1">TOP 1</span>
            </div>

            {/* Foto */}
            <div className="relative z-10">
              <div className="absolute -inset-1 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 blur-sm"
                style={{ background: "linear-gradient(135deg, #10b981, transparent, #10b981)" }}
              />
              {getFotoVendedor(stats.top1Vendedor.nome) ? (
                <img
                  src={getFotoVendedor(stats.top1Vendedor.nome) || ""}
                  alt={stats.top1Vendedor.nome}
                  className="relative w-14 h-14 rounded-full object-cover object-top border-2 border-emerald-500/60 transition-all duration-500 group-hover:scale-110"
                  style={{ boxShadow: "0 0 25px rgba(16,185,129,0.3)" }}
                />
              ) : (
                <div className="relative w-14 h-14 rounded-full border-2 border-emerald-500/60 flex items-center justify-center bg-emerald-500/20 font-black text-xl text-emerald-400"
                  style={{ boxShadow: "0 0 25px rgba(16,185,129,0.3)" }}
                >
                  {stats.top1Vendedor.nome.charAt(0)}
                </div>
              )}
              <span className="absolute -top-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none text-black shadow-lg"
                style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}
              >
                TOP 1
              </span>
            </div>

            {/* Info */}
            <div className="relative z-10 flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest mb-0.5 text-emerald-400"
                style={{ textShadow: "0 0 20px rgba(16,185,129,0.5)" }}
              >
                Vendedor
              </span>
              <span className="text-sm font-bold text-white truncate max-w-[120px]">
                {stats.top1Vendedor.nome}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-black text-emerald-400"
                  style={{ textShadow: "0 0 15px rgba(16,185,129,0.5)" }}
                >
                  {stats.top1Vendedor.total}
                </span>
                <span className="text-[10px] text-white/50 font-semibold">vendas</span>
              </div>
            </div>
          </div>
        )}

        {/* TOP 1 Por Valor */}
        {stats.top1PorValor && (
          <div className="group relative flex items-center gap-4 px-5 py-4 min-w-fit rounded-2xl backdrop-blur-2xl overflow-hidden cursor-default transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1"
            style={{
              background: "linear-gradient(145deg, rgba(212,175,55,0.12) 0%, transparent 50%, rgba(212,175,55,0.08) 100%)",
              border: "1px solid rgba(212,175,55,0.3)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            {/* Glow animado */}
            <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl -z-10"
              style={{ background: "radial-gradient(ellipse at center, rgba(212,175,55,0.4), transparent 70%)" }}
            />

            {/* Palminha animada */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="text-3xl animate-bounce" style={{ 
                filter: "drop-shadow(0 0 12px rgba(212,175,55,0.5))",
                animationDuration: "2s",
                animationDelay: "0.5s",
              }}>
                💰
              </div>
              <span className="text-[8px] font-black text-[#d4af37]/60 uppercase tracking-widest mt-1">VGV</span>
            </div>

            {/* Foto */}
            <div className="relative z-10">
              <div className="absolute -inset-1 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 blur-sm"
                style={{ background: "linear-gradient(135deg, #d4af37, transparent, #d4af37)" }}
              />
              {getFotoVendedor(stats.top1PorValor.nome) ? (
                <img
                  src={getFotoVendedor(stats.top1PorValor.nome) || ""}
                  alt={stats.top1PorValor.nome}
                  className="relative w-14 h-14 rounded-full object-cover object-top border-2 border-[#d4af37]/60 transition-all duration-500 group-hover:scale-110"
                  style={{ boxShadow: "0 0 25px rgba(212,175,55,0.3)" }}
                />
              ) : (
                <div className="relative w-14 h-14 rounded-full border-2 border-[#d4af37]/60 flex items-center justify-center bg-[#d4af37]/20 font-black text-xl text-[#d4af37]"
                  style={{ boxShadow: "0 0 25px rgba(212,175,55,0.3)" }}
                >
                  {stats.top1PorValor.nome.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="relative z-10 flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest mb-0.5 text-[#d4af37]"
                style={{ textShadow: "0 0 20px rgba(212,175,55,0.5)" }}
              >
                Maior VGV
              </span>
              <span className="text-sm font-bold text-white truncate max-w-[120px]">
                {stats.top1PorValor.nome}
              </span>
              <span className="text-sm font-black text-[#d4af37] mt-1"
                style={{ textShadow: "0 0 15px rgba(212,175,55,0.5)" }}
              >
                {formatCurrency(stats.top1PorValor.valor)}
              </span>
            </div>
          </div>
        )}

        {/* Separador */}
        <div className="w-px h-20 bg-gradient-to-b from-transparent via-white/15 to-transparent flex-shrink-0 self-center" />

        {/* Total VGV */}
        <div className="group relative flex items-center gap-3 px-5 py-4 min-w-fit rounded-2xl backdrop-blur-2xl overflow-hidden cursor-default transition-all duration-500 hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, transparent 50%, rgba(139,92,246,0.05) 100%)",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          <div className="text-2xl">📊</div>
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Total VGV</span>
            <span className="text-xl font-black text-violet-400"
              style={{ textShadow: "0 0 20px rgba(139,92,246,0.5)" }}
            >
              {formatCurrency(stats.valorTotal)}
            </span>
          </div>
        </div>

        {/* Origens */}
        {stats.rankingOrigens.slice(0, 3).map((origem, i) => (
          <div key={origem.nome}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-xl transition-all duration-300 hover:scale-105 cursor-default"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="text-lg">
              {origem.nome === "Tráfego Pago" ? "📱" : 
               origem.nome === "Facebook Grupos" ? "👥" : 
               origem.nome === "Indicação" ? "🤝" : "🏢"}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-white/50 font-semibold">{origem.nome}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white">{origem.total}</span>
                <span className="text-[9px] text-white/40">vendas</span>
              </div>
            </div>
          </div>
        ))}

        {/* Avaliacoes */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-xl"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Avaliacoes</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-sm">⭐</span>
                <span className="text-xs font-bold text-emerald-400">{stats.avaliacoes.Excelente}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm">👍</span>
                <span className="text-xs font-bold text-amber-400">{stats.avaliacoes.Bom}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm">➖</span>
                <span className="text-xs font-bold text-white/40">{stats.avaliacoes["Sem avaliação"]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
