"use client"

import { Stats } from "@/lib/types"

interface Top1Person {
  nome: string
  total: number
  foto?: string
}

interface StatsCardsProps {
  stats: Stats
  top1Agendei?: Top1Person | null
  top1Veio?: Top1Person | null
}

export function StatsCards({ stats, top1Agendei, top1Veio }: StatsCardsProps) {
  const cards = [
    {
      label: "Total",
      value: stats.total,
      gradient: "from-[#d4af37] to-[#c9a227]",
      glowColor: "rgba(212,175,55,0.4)",
      iconBg: "linear-gradient(135deg, #d4af37, #c9a227)",
    },
    {
      label: "Vieram",
      value: stats.veio,
      gradient: "from-emerald-400 to-green-500",
      glowColor: "rgba(16,185,129,0.4)",
      iconBg: "linear-gradient(135deg, #10b981, #22c55e)",
    },
    {
      label: "Faltaram",
      value: stats.nao,
      gradient: "from-red-400 to-rose-500",
      glowColor: "rgba(239,68,68,0.4)",
      iconBg: "linear-gradient(135deg, #ef4444, #f43f5e)",
    },
    {
      label: "Pendentes",
      value: stats.pending,
      gradient: "from-amber-400 to-orange-500",
      glowColor: "rgba(245,158,11,0.4)",
      iconBg: "linear-gradient(135deg, #f59e0b, #f97316)",
    },
  ]

  const TopCard = ({ person, label, gold }: { person: Top1Person; label: string; gold: boolean }) => (
    <div className={`group relative flex items-center gap-3 glass-card rounded-2xl px-4 py-3 min-w-fit cursor-default transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-slide-up border ${gold ? "border-[rgba(212,175,55,0.3)] hover:border-[rgba(212,175,55,0.6)] hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]" : "border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]"}`}>
      {/* Troféu */}
      <div className={`text-xl ${gold ? "text-[#d4af37]" : "text-emerald-400"}`} style={{ filter: gold ? "drop-shadow(0 0 8px rgba(212,175,55,0.7))" : "drop-shadow(0 0 8px rgba(16,185,129,0.7))" }}>
        🏆
      </div>

      {/* Foto grande */}
      <div className="relative">
        {person.foto ? (
          <img
            src={person.foto}
            alt={person.nome}
            className={`w-12 h-12 rounded-full object-cover object-top border-2 transition-all duration-300 group-hover:scale-110 shadow-lg ${gold ? "border-[rgba(212,175,55,0.5)] shadow-[0_0_15px_rgba(212,175,55,0.3)]" : "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"}`}
          />
        ) : (
          <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${gold ? "bg-[rgba(212,175,55,0.12)] border-[rgba(212,175,55,0.4)]" : "bg-emerald-500/12 border-emerald-500/40"}`}>
            <span className={`text-[18px] font-bold ${gold ? "text-[#d4af37]" : "text-emerald-400"}`}>{person.nome.charAt(0)}</span>
          </div>
        )}
        {/* Badge TOP 1 */}
        <span className={`absolute -top-1.5 -right-1.5 text-[8px] font-black px-1 py-0.5 rounded-md leading-none ${gold ? "bg-[#d4af37] text-black" : "bg-emerald-400 text-black"}`}>
          TOP 1
        </span>
      </div>

      {/* Info */}
      <div>
        <span className={`text-[10px] font-black uppercase tracking-widest block mb-0.5 ${gold ? "text-[#d4af37]/60" : "text-emerald-400/60"}`}>{label}</span>
        <span className="text-[13px] font-bold text-[#f5f0e8] block leading-tight">{person.nome}</span>
        <span className={`text-[11px] font-semibold ${gold ? "text-[#d4af37]" : "text-emerald-400"}`}>{person.total} {gold ? "agendados" : "vieram"}</span>
      </div>
    </div>
  )

  return (
    <div className="flex gap-3 px-4 md:px-6 mb-5 overflow-x-auto pb-2 items-center">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="group relative flex items-center gap-3 glass-card rounded-2xl px-5 py-4 min-w-fit cursor-default transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-slide-up"
          style={{ 
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'backwards'
          }}
        >
          {/* Glow effect on hover */}
          <div 
            className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
            style={{ background: card.glowColor }}
          />
          
          {/* Icon container */}
          <div 
            className="relative w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ 
              background: card.iconBg,
              boxShadow: `0 4px 20px ${card.glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)`
            }}
          >
            <span className="text-[20px] font-black text-white drop-shadow-lg">{card.value}</span>
          </div>
          
          {/* Label */}
          <div className="relative">
            <span className="text-[11px] text-white/40 font-semibold uppercase tracking-wider block">
              {card.label}
            </span>
            <span className={`text-lg font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
              {card.value} leads
            </span>
          </div>
        </div>
      ))}

      {/* Separador */}
      {(top1Agendei || top1Veio) && (
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/15 to-transparent mx-1 flex-shrink-0" />
      )}

      {/* TOP 1 Agendei */}
      {top1Agendei && <TopCard person={top1Agendei} label="Top Agendei" gold={true} />}

      {/* TOP 1 Veio */}
      {top1Veio && <TopCard person={top1Veio} label="Top Veio" gold={false} />}
    </div>
  )
}
