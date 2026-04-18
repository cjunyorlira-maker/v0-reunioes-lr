"use client"

import { Stats } from "@/lib/types"

interface Top1Person {
  nome: string
  total: number
  foto?: string
}

interface Top1Venda {
  nome: string
  vendas: number
  valor: number
}

interface StatsCardsProps {
  stats: Stats
  top1Agendei?: Top1Person | null
  top1Veio?: Top1Person | null
  top1Vendedor?: Top1Venda | null
  top1Equipe?: Top1Venda | null
}

export function StatsCards({ stats, top1Agendei, top1Veio, top1Vendedor, top1Equipe }: StatsCardsProps) {
  const cards = [
    {
      label: "Total",
      value: stats.total,
      color: "text-[#d4af37]",
      glow: "rgba(212,175,55,0.3)",
    },
    {
      label: "Vieram",
      value: stats.veio,
      color: "text-emerald-400",
      glow: "rgba(16,185,129,0.3)",
    },
    {
      label: "Faltaram",
      value: stats.nao,
      color: "text-red-400",
      glow: "rgba(239,68,68,0.3)",
    },
    {
      label: "Pendentes",
      value: stats.pending,
      color: "text-amber-400",
      glow: "rgba(245,158,11,0.3)",
    },
  ]

  const TopCardVenda = ({ venda, label, color, glow }: { venda: Top1Venda; label: string; color: string; glow: string }) => {
    const isPurple = color === "text-purple-400"
    const primaryColor = isPurple ? "#a78bfa" : "#f97316"
    const borderColor = isPurple ? "rgba(167,139,250,0.4)" : "rgba(249,115,22,0.4)"
    
    return (
      <div 
        className="group relative flex items-center gap-4 px-5 py-4 min-w-fit rounded-2xl backdrop-blur-xl transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden cursor-default"
      >
        <div 
          className="absolute inset-0 rounded-2xl backdrop-blur-2xl transition-all duration-500"
          style={{
            background: `linear-gradient(145deg, ${glow.replace('0.3', '0.08')} 0%, transparent 50%, ${glow.replace('0.3', '0.05')} 100%)`,
            border: `1px solid ${borderColor.replace('0.4', '0.25')}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
          }}
        />
        
        <div 
          className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl -z-10"
          style={{ background: `radial-gradient(ellipse at center, ${glow}, transparent 70%)` }}
        />
        
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
          <div 
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
          />
        </div>
        
        <div className="relative z-10">
          <div 
            className="text-3xl transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12"
            style={{ filter: `drop-shadow(0 0 12px ${glow})` }}
          >
            🏆
          </div>
        </div>

        <div className="relative z-10 flex flex-col min-w-0">
          <span 
            className="text-[9px] font-black uppercase tracking-widest mb-0.5"
            style={{ color: primaryColor, textShadow: `0 0 20px ${glow}` }}
          >
            {label}
          </span>
          <span className="text-sm font-bold text-white truncate max-w-[140px]">
            {venda.nome}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span 
              className="text-lg font-black"
              style={{ color: primaryColor, textShadow: `0 0 15px ${glow}` }}
            >
              {venda.vendas}
            </span>
            <span className="text-[10px] text-white/50 font-semibold">vendas</span>
          </div>
          <span className="text-[10px] text-white/40 mt-0.5">
            R$ {(venda.valor / 1000).toFixed(0)}k
          </span>
        </div>
      </div>
    )
  }

  const TopCard = ({ person, label, color, glow }: { person: Top1Person; label: string; color: string; glow: string }) => {
    const isGold = color === "text-[#d4af37]"
    const primaryColor = isGold ? "#d4af37" : "#10b981"
    const borderColor = isGold ? "rgba(212,175,55,0.4)" : "rgba(16,185,129,0.4)"
    
    return (
      <div 
        className="group relative flex items-center gap-4 px-5 py-4 min-w-fit rounded-2xl backdrop-blur-xl transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 overflow-hidden cursor-default"
      >
        <div 
          className="absolute inset-0 rounded-2xl backdrop-blur-2xl transition-all duration-500"
          style={{
            background: `linear-gradient(145deg, ${glow.replace('0.3', '0.08')} 0%, transparent 50%, ${glow.replace('0.3', '0.05')} 100%)`,
            border: `1px solid ${borderColor.replace('0.4', '0.25')}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
          }}
        />
        
        <div 
          className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl -z-10"
          style={{ background: `radial-gradient(ellipse at center, ${glow}, transparent 70%)` }}
        />
        
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
          <div 
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
          />
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div 
            className="text-3xl transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12"
            style={{ filter: `drop-shadow(0 0 12px ${glow}) drop-shadow(0 0 20px ${glow.replace('0.3', '0.5')})` }}
          >
            🏆
          </div>
        </div>

        <div className="relative z-10">
          <div 
            className="absolute -inset-1 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 blur-sm"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, transparent, ${primaryColor})` }}
          />
          {person.foto ? (
            <img
              src={person.foto}
              alt={person.nome}
              className="relative w-14 h-14 rounded-full object-cover object-top border-2 transition-all duration-500 group-hover:scale-110"
              style={{
                borderColor: primaryColor,
                boxShadow: `0 0 25px ${glow}, 0 4px 15px rgba(0,0,0,0.3)`,
              }}
            />
          ) : (
            <div
              className="relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500 group-hover:scale-110 font-black text-xl"
              style={{
                background: `linear-gradient(135deg, ${glow.replace('0.3', '0.2')}, ${glow.replace('0.3', '0.1')})`,
                borderColor: primaryColor,
                color: primaryColor,
                boxShadow: `0 0 25px ${glow}`,
              }}
            >
              {person.nome.charAt(0)}
            </div>
          )}
          <span 
            className="absolute -top-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none text-black shadow-lg transition-transform duration-300 group-hover:scale-110"
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor}, ${isGold ? '#f5d742' : '#34d399'})`,
              boxShadow: `0 2px 10px ${glow}`,
            }}
          >
            TOP 1
          </span>
        </div>

        <div className="relative z-10 flex flex-col min-w-0">
          <span 
            className="text-[9px] font-black uppercase tracking-widest mb-0.5"
            style={{ color: primaryColor, textShadow: `0 0 20px ${glow}` }}
          >
            {label}
          </span>
          <span className="text-sm font-bold text-white truncate max-w-[120px]">
            {person.nome}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span 
              className="text-lg font-black"
              style={{ color: primaryColor, textShadow: `0 0 15px ${glow}` }}
            >
              {person.total}
            </span>
            <span className="text-[10px] text-white/50 font-semibold">
              {label === "Top Agendei" ? "agendados" : "vieram"}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 px-4 md:px-6 mb-6 overflow-x-auto pb-2">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="group relative flex items-center gap-3 px-5 py-3.5 rounded-2xl cursor-default transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-1 animate-slide-up overflow-hidden"
          style={{
            animationDelay: `${index * 80}ms`,
            animationFillMode: 'backwards',
          }}
        >
          <div 
            className="absolute inset-0 rounded-2xl backdrop-blur-2xl transition-all duration-500"
            style={{
              background: `linear-gradient(135deg, ${card.glow.replace('0.3', '0.05')} 0%, transparent 50%, ${card.glow.replace('0.3', '0.03')} 100%)`,
              border: `1px solid ${card.glow.replace('0.3', '0.15')}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
            }}
          />
          
          <div 
            className="absolute -inset-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-md -z-10"
            style={{ background: `linear-gradient(135deg, ${card.glow}, transparent, ${card.glow})` }}
          />
          
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 overflow-hidden">
            <div 
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
            />
          </div>
          
          <div className="relative z-10 flex flex-col items-center justify-center min-w-[48px]">
            <span 
              className={`text-3xl font-black ${card.color} transition-all duration-500 group-hover:scale-110`}
              style={{ 
                textShadow: `0 0 30px ${card.glow}, 0 0 60px ${card.glow.replace('0.3', '0.2')}`,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            >
              {card.value}
            </span>
          </div>
          
          <div className="relative z-10 flex flex-col">
            <span className="text-[11px] text-white/50 font-bold uppercase tracking-widest transition-colors duration-300 group-hover:text-white/70">
              {card.label}
            </span>
            <div 
              className="h-0.5 w-0 group-hover:w-full mt-1 rounded-full transition-all duration-500 ease-out"
              style={{ background: `linear-gradient(90deg, ${card.glow}, transparent)` }}
            />
          </div>
        </div>
      ))}

      {(top1Agendei || top1Veio) && (
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent flex-shrink-0 mx-2" />
      )}

      {top1Agendei && (
        <TopCard 
          person={top1Agendei} 
          label="Top Agendei" 
          color="text-[#d4af37]" 
          glow="rgba(212,175,55,0.3)"
        />
      )}

      {top1Veio && (
        <TopCard 
          person={top1Veio} 
          label="Top Veio" 
          color="text-emerald-400" 
          glow="rgba(16,185,129,0.3)"
        />
      )}

      {(top1Vendedor || top1Equipe) && (
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent flex-shrink-0 mx-2" />
      )}

      {top1Vendedor && (
        <TopCardVenda 
          venda={top1Vendedor} 
          label="Top Vendedor Mes" 
          color="text-purple-400" 
          glow="rgba(167,139,250,0.3)"
        />
      )}

      {top1Equipe && (
        <TopCardVenda 
          venda={top1Equipe} 
          label="Top Equipe Mes" 
          color="text-orange-400" 
          glow="rgba(249,115,22,0.3)"
        />
      )}
    </div>
  )
}
