"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import useSWR from "swr"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome, getVendedorGenero } from "@/lib/vendedor-fotos"
import { Trophy, Flag, Target, ArrowLeft, Calendar, Zap } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const META_AGENDEI_DIA = 5
const META_QUALIFICADOS_DIA = 10
const META_AGENDEI_SEMANA = META_AGENDEI_DIA * 6
const META_QUALIFICADOS_SEMANA = META_QUALIFICADOS_DIA * 6

type ViewMode = "dia" | "semana"
type RaceType = "agendei" | "qualificados"

// Componente de carro estilo Gran Turismo
function RaceCar({ foto, nome, genero, progresso, position }: {
  foto?: string; nome: string; genero: "M" | "F"; progresso: number; position: number
}) {
  const isF = genero === "F"
  const primary = isF ? "#f472b6" : "#3b82f6"
  const secondary = isF ? "#be185d" : "#1d4ed8"
  const accent = isF ? "#fce7f3" : "#dbeafe"
  const glow = isF ? "255,100,180" : "59,130,246"
  const moving = progresso > 0 && progresso < 100
  const finished = progresso >= 100

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-20"
      style={{ left: `calc(${Math.min(progresso, 90)}% - 50px)` }}
    >
      <div className="relative">

        {/* Fumaca do escape - multiplas particulas animadas */}
        {moving && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <div className="relative w-20 h-10">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/30 blur-[2px] animate-[exhaust1_0.4s_ease-out_infinite]" style={{ animationDelay: "0s" }} />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300/20 blur-[4px] animate-[exhaust1_0.4s_ease-out_infinite]" style={{ animationDelay: "0.1s" }} />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-400/15 blur-[6px] animate-[exhaust1_0.5s_ease-out_infinite]" style={{ animationDelay: "0.2s" }} />
              <div className="absolute right-10 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gray-500/10 blur-[8px] animate-[exhaust1_0.6s_ease-out_infinite]" style={{ animationDelay: "0.3s" }} />
              <div className="absolute right-14 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gray-600/8 blur-[10px] animate-[exhaust1_0.7s_ease-out_infinite]" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}

        {/* Linhas de velocidade */}
        {moving && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="relative w-24">
              <div className="absolute right-0 top-0 w-16 h-[2px] bg-gradient-to-l from-white/50 to-transparent" />
              <div className="absolute right-0 top-2 w-20 h-[1px] bg-gradient-to-l from-white/30 to-transparent" />
              <div className="absolute right-0 top-4 w-12 h-[2px] bg-gradient-to-l from-white/40 to-transparent" />
              <div className="absolute right-0 -top-2 w-10 h-[1px] bg-gradient-to-l from-white/25 to-transparent" />
            </div>
          </div>
        )}

        {/* Brilho reflexo no chao */}
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24 h-4 rounded-full blur-lg opacity-50 transition-opacity duration-500"
          style={{ background: `rgba(${glow}, 0.6)`, opacity: finished ? 0.8 : moving ? 0.5 : 0.2 }}
        />

        {/* SVG do carro - grande, detalhado, estilo GT */}
        <svg
          width="120"
          height="60"
          viewBox="0 0 120 55"
          className="drop-shadow-2xl"
          style={{
            filter: finished
              ? `drop-shadow(0 0 12px gold) drop-shadow(0 0 20px rgba(255,215,0,0.5))`
              : `drop-shadow(0 0 6px rgba(${glow},0.6))`
          }}
        >
          <defs>
            <linearGradient id={`body-${position}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
              <stop offset="30%" stopColor={primary} />
              <stop offset="100%" stopColor={secondary} />
            </linearGradient>
            <linearGradient id={`roof-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={secondary} />
            </linearGradient>
            <linearGradient id={`window-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id={`wheel-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            <radialGradient id={`glow-${position}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={primary} stopOpacity="0.4" />
              <stop offset="100%" stopColor={primary} stopOpacity="0" />
            </radialGradient>
            <filter id={`blur-${position}`}>
              <feGaussianBlur stdDeviation="1" />
            </filter>
          </defs>

          {/* Sombra do carro */}
          <ellipse cx="60" cy="52" rx="46" ry="4" fill="rgba(0,0,0,0.5)" filter={`url(#blur-${position})`} />

          {/* Asas traseiras (spoiler) */}
          <rect x="10" y="12" width="14" height="2.5" rx="1" fill={secondary} />
          <rect x="11" y="9" width="12" height="4" rx="1" fill={primary} stroke={accent} strokeWidth="0.5" />

          {/* Corpo principal do carro */}
          <path
            d={`M 14 38
                Q 10 38, 10 34
                L 10 30
                Q 10 26, 14 24
                L 20 24
                Q 24 16, 32 13
                L 62 12
                Q 82 12, 92 18
                L 100 20
                Q 108 22, 110 28
                L 110 34
                Q 110 38, 106 38
                Z`}
            fill={`url(#body-${position})`}
            stroke={accent}
            strokeWidth="0.5"
            strokeOpacity="0.6"
          />

          {/* Teto do carro */}
          <path
            d={`M 24 24
                Q 28 16, 36 13
                L 62 12
                Q 80 12, 88 18
                L 96 20
                Q 90 16, 78 14
                L 44 14
                Q 32 14, 28 20
                Z`}
            fill={`url(#roof-${position})`}
            opacity="0.9"
          />

          {/* Para-brisas dianteiro (grande, com reflexo) */}
          <path
            d="M 65 13 Q 82 13, 92 20 L 88 22 Q 78 16, 64 16 Z"
            fill={`url(#window-${position})`}
            stroke="#93c5fd"
            strokeWidth="0.5"
            strokeOpacity="0.4"
          />
          {/* Reflexo no para-brisas */}
          <path
            d="M 70 14 Q 80 14, 86 18 L 84 19 Q 78 15, 70 15 Z"
            fill="white"
            opacity="0.2"
          />

          {/* Janela lateral */}
          <path
            d="M 30 24 Q 34 16, 44 14 L 62 14 Q 74 14, 78 18 L 76 22 Q 66 18, 44 18 Q 34 18, 30 24 Z"
            fill={`url(#window-${position})`}
            stroke="#93c5fd"
            strokeWidth="0.4"
            strokeOpacity="0.3"
          />
          {/* Divisor de janela */}
          <line x1="55" y1="14" x2="54" y2="23" stroke={accent} strokeWidth="0.8" strokeOpacity="0.6" />

          {/* Espelho retrovisor */}
          <path d="M 28 22 L 26 24 L 30 25 Z" fill={secondary} />

          {/* Detalhe lateral / faixa de corrida */}
          <path
            d="M 14 30 L 106 30"
            stroke={accent}
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
          {/* Segunda faixa */}
          <path
            d="M 14 33 L 106 33"
            stroke="white"
            strokeWidth="0.5"
            strokeOpacity="0.15"
          />

          {/* Farol dianteiro */}
          <path d="M 106 26 Q 110 27, 110 30 L 106 30 Z" fill="#fef9c3" opacity="0.95" />
          <path d="M 106 26 Q 109 27, 109 29 L 107 29 Z" fill="white" opacity="0.8" />
          {/* Brilho farol */}
          <ellipse cx="110" cy="28" rx="3" ry="2" fill="#fef08a" opacity="0.4" filter={`url(#blur-${position})`} />

          {/* Farol traseiro */}
          <path d="M 10 26 Q 10 30, 10 32 L 14 32 L 14 26 Z" fill="#ef4444" opacity="0.9" />
          <path d="M 11 27 L 13 27 L 13 31 L 11 31 Z" fill="#fca5a5" opacity="0.8" />
          {/* Brilho farol traseiro */}
          <ellipse cx="10" cy="29" rx="2" ry="3" fill="#ef4444" opacity="0.4" filter={`url(#blur-${position})`} />

          {/* Difusor traseiro */}
          <path d="M 10 36 L 20 36 L 20 40 L 10 38 Z" fill={secondary} opacity="0.8" />
          <rect x="12" y="36" width="2" height="3" rx="0.5" fill="#374151" />
          <rect x="15" y="36" width="2" height="3" rx="0.5" fill="#374151" />

          {/* Escapamento */}
          <rect x="11" y="37" width="4" height="1.5" rx="0.5" fill="#6b7280" />
          <rect x="16" y="37" width="4" height="1.5" rx="0.5" fill="#6b7280" />

          {/* Aerofólio dianteiro */}
          <path d="M 100 38 L 112 38 L 112 40 L 100 40 Z" fill={secondary} />
          <path d="M 100 36 L 110 36 L 110 38 L 100 38 Z" fill={primary} opacity="0.8" />

          {/* Roda traseira - grande */}
          <circle cx="28" cy="40" r="10" fill="url(#wheel-1)" />
          <circle cx="28" cy="40" r="9" fill="#1f2937" />
          <circle cx="28" cy="40" r="7.5" fill="#374151" />
          {/* Aro da roda traseira */}
          <circle cx="28" cy="40" r="7" fill="none" stroke="#d1d5db" strokeWidth="1" />
          <circle cx="28" cy="40" r="4" fill="#6b7280" />
          <circle cx="28" cy="40" r="2.5" fill="#9ca3af" />
          {/* Raios */}
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <line
              key={angle}
              x1={28 + 2.5 * Math.cos((angle * Math.PI) / 180)}
              y1={40 + 2.5 * Math.sin((angle * Math.PI) / 180)}
              x2={28 + 7 * Math.cos((angle * Math.PI) / 180)}
              y2={40 + 7 * Math.sin((angle * Math.PI) / 180)}
              stroke="#d1d5db"
              strokeWidth="1"
            />
          ))}

          {/* Roda dianteira - grande */}
          <circle cx="94" cy="40" r="10" fill="url(#wheel-1)" />
          <circle cx="94" cy="40" r="9" fill="#1f2937" />
          <circle cx="94" cy="40" r="7.5" fill="#374151" />
          <circle cx="94" cy="40" r="7" fill="none" stroke="#d1d5db" strokeWidth="1" />
          <circle cx="94" cy="40" r="4" fill="#6b7280" />
          <circle cx="94" cy="40" r="2.5" fill="#9ca3af" />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <line
              key={angle}
              x1={94 + 2.5 * Math.cos((angle * Math.PI) / 180)}
              y1={40 + 2.5 * Math.sin((angle * Math.PI) / 180)}
              x2={94 + 7 * Math.cos((angle * Math.PI) / 180)}
              y2={40 + 7 * Math.sin((angle * Math.PI) / 180)}
              stroke="#d1d5db"
              strokeWidth="1"
            />
          ))}

          {/* Numero do carro no capô */}
          <rect x="46" y="29" width="18" height="10" rx="3" fill="white" opacity="0.92" />
          <text x="55" y="37" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1f2937">
            #{position}
          </text>
        </svg>

        {/* Foto do piloto na frente do carro */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 flex flex-col items-center">
          {foto ? (
            <img
              src={foto}
              alt={nome}
              className="w-16 h-16 rounded-full object-cover shadow-xl"
              style={{ border: `3.5px solid ${primary}`, boxShadow: `0 0 18px rgba(${glow},0.7), inset 0 0 10px rgba(0,0,0,0.3)` }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-xl"
              style={{ background: primary, border: `3.5px solid ${accent}`, boxShadow: `0 0 18px rgba(${glow},0.7)` }}
            >
              {nome.charAt(0)}
            </div>
          )}
          <div
            className="text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: `rgba(${glow},0.3)`, color: primary, border: `1px solid rgba(${glow},0.5)` }}
          >
            {nome.split(" ")[0]}
          </div>
        </div>

        {/* Badge CHEGOU na frente */}
        {finished && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-20 whitespace-nowrap px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-[11px] font-bold text-black shadow-lg animate-bounce">
            META!
          </div>
        )}
      </div>
    </div>
  )
}

// Componente da pista estilo videogame
function RaceTrack({ vendedor, index }: { vendedor: any; index: number }) {
  const isF = vendedor.genero === "F"
  const glow = isF ? "244,114,182" : "59,130,246"
  const primary = isF ? "#f472b6" : "#3b82f6"

  return (
    <div className="flex items-center gap-3">
      {/* Info do piloto */}
      <div className="w-40 md:w-56 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-black text-lg md:text-xl shadow-xl flex-shrink-0 ${
            index === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-600 text-black" :
            index === 1 ? "bg-gradient-to-br from-gray-200 to-gray-500 text-black" :
            index === 2 ? "bg-gradient-to-br from-amber-500 to-orange-700 text-white" :
            "bg-white/10 text-white/60"
          }`} style={index < 3 ? { boxShadow: `0 0 16px ${index === 0 ? "rgba(234,179,8,0.6)" : index === 1 ? "rgba(156,163,175,0.4)" : "rgba(245,158,11,0.5)"}` } : {}}>
            {index + 1}°
          </div>
          <div className="min-w-0">
            <p className="text-sm md:text-lg font-black text-white truncate">{vendedor.nome.split(" ")[0]}</p>
            <p className="text-sm md:text-base font-bold" style={{ color: primary }}>
              {vendedor.valor}<span className="text-white/40 text-xs md:text-sm">/{vendedor.meta}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Pista */}
      <div className="flex-1 relative" style={{ height: "88px" }}>
        {/* Asfalto base */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{
          background: "linear-gradient(180deg, #1c1c24 0%, #141418 40%, #1c1c24 100%)",
          boxShadow: `inset 0 0 30px rgba(0,0,0,0.8), 0 0 1px rgba(${glow},0.3)`,
          border: `1px solid rgba(${glow},0.12)`
        }}>

          {/* Textura granulada */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
          }} />

          {/* Bordas da pista - neutras */}
          <div className="absolute top-0 left-0 right-0 h-[5px]" style={{
            background: "repeating-linear-gradient(90deg, #3f3f46 0px, #3f3f46 24px, #71717a 24px, #71717a 48px)"
          }} />
          <div className="absolute bottom-0 left-0 right-0 h-[5px]" style={{
            background: "repeating-linear-gradient(90deg, #71717a 0px, #71717a 24px, #3f3f46 24px, #3f3f46 48px)"
          }} />

          {/* Linha central tracejada branca */}
          <div className="absolute top-1/2 -translate-y-1/2 left-4 right-16 h-[2px]" style={{
            background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 28px, transparent 28px, transparent 56px)"
          }} />

          {/* Marcadores de % na pista */}
          {[25, 50, 75].map((pct) => (
            <div key={pct} className="absolute top-[5px] bottom-[5px]" style={{ left: `${pct}%` }}>
              <div className="w-[1px] h-full bg-white/8" />
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[8px] text-white/20">{pct}%</div>
            </div>
          ))}

          {/* Linha de chegada - xadrez clássico */}
          <div className="absolute right-0 top-[5px] bottom-[5px] w-12 rounded-r-xl overflow-hidden">
            <div className="w-full h-full" style={{
              background: "repeating-conic-gradient(#fff 0deg 90deg, #000 90deg 180deg)",
              backgroundSize: "10px 10px",
              opacity: 0.85
            }} />
          </div>

          {/* Brilho lateral animado (pista iluminada) */}
          <div
            className="absolute left-0 right-16 top-[5px] bottom-[5px]"
            style={{
              background: `linear-gradient(90deg, transparent ${Math.max(0, vendedor.progresso - 15)}%, rgba(${glow},0.06) ${vendedor.progresso - 5}%, transparent ${Math.min(100, vendedor.progresso + 5)}%)`,
              transition: "all 1s ease-out"
            }}
          />
        </div>

        {/* Carro na pista */}
        <RaceCar
          foto={vendedor.foto}
          nome={vendedor.nome}
          genero={vendedor.genero}
          progresso={vendedor.progresso}
          position={index + 1}
        />
      </div>
    </div>
  )
}

// Celebracao ao atingir meta
function MetaCelebration({ vendedor, onClose }: { vendedor: any; onClose: () => void }) {
  useEffect(() => {
    // Som de buzina via Web Audio API
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const playHorn = (time: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(440, ctx.currentTime + time)
        osc.frequency.setValueAtTime(550, ctx.currentTime + time + 0.15)
        osc.frequency.setValueAtTime(440, ctx.currentTime + time + 0.3)
        gain.gain.setValueAtTime(0.3, ctx.currentTime + time)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.5)
        osc.start(ctx.currentTime + time)
        osc.stop(ctx.currentTime + time + 0.5)
      }
      playHorn(0); playHorn(0.6); playHorn(1.2); playHorn(1.8); playHorn(2.4)
    } catch (e) {}

    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  const isF = vendedor.genero === "F"
  const primary = isF ? "#f472b6" : "#3b82f6"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Fogos de artifício SVG animados */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600">
        {[
          { cx: 200, cy: 150, color: "#f472b6", delay: 0 },
          { cx: 600, cy: 120, color: "#60a5fa", delay: 0.3 },
          { cx: 400, cy: 80, color: "#fbbf24", delay: 0.6 },
          { cx: 150, cy: 300, color: "#34d399", delay: 0.9 },
          { cx: 650, cy: 280, color: "#f472b6", delay: 1.2 },
          { cx: 350, cy: 200, color: "#a78bfa", delay: 1.5 },
          { cx: 500, cy: 350, color: "#fb923c", delay: 0.4 },
          { cx: 100, cy: 450, color: "#f472b6", delay: 0.8 },
          { cx: 700, cy: 400, color: "#60a5fa", delay: 1.1 },
        ].map((fw, i) => (
          <g key={i}>
            {Array.from({ length: 12 }).map((_, j) => {
              const angle = (j * 30 * Math.PI) / 180
              const len = 40 + Math.random() * 30
              return (
                <line
                  key={j}
                  x1={fw.cx} y1={fw.cy}
                  x2={fw.cx + len * Math.cos(angle)}
                  y2={fw.cy + len * Math.sin(angle)}
                  stroke={fw.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{
                    animation: `firework 0.8s ease-out ${fw.delay + j * 0.02}s both`,
                    transformOrigin: `${fw.cx}px ${fw.cy}px`
                  }}
                />
              )
            })}
          </g>
        ))}
      </svg>

      {/* Card central */}
      <div className="pointer-events-auto animate-[zoomIn_0.5s_ease-out] z-10">
        <div
          className="rounded-3xl p-8 text-center shadow-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(15,15,25,0.95), rgba(25,25,40,0.98))",
            border: `2px solid ${primary}`,
            boxShadow: `0 0 60px rgba(${isF ? "244,114,182" : "59,130,246"},0.4)`
          }}
        >
          {vendedor.foto ? (
            <img
              src={vendedor.foto}
              alt={vendedor.nome}
              className="w-28 h-28 rounded-full object-cover mx-auto mb-4 shadow-2xl"
              style={{ border: `4px solid ${primary}` }}
            />
          ) : (
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-4"
              style={{ background: primary }}
            >
              {vendedor.nome.charAt(0)}
            </div>
          )}
          <h2 className="text-4xl font-black text-white mb-2">{vendedor.nome.split(" ")[0]}</h2>
          <p className="text-xl text-white/60 mb-4">atingiu a META!</p>
          <div
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-2xl font-black"
            style={{ background: `rgba(${isF ? "244,114,182" : "59,130,246"},0.2)`, color: primary }}
          >
            <Trophy size={24} />
            {vendedor.valor} / {vendedor.meta}
          </div>
          <p className="text-white/30 text-sm mt-4">Grand Prix LR</p>
        </div>
      </div>

      <style>{`
        @keyframes firework {
          0% { stroke-dasharray: 0 100; opacity: 1; }
          60% { stroke-dasharray: 100 0; opacity: 1; }
          100% { stroke-dasharray: 100 0; opacity: 0; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes exhaust1 {
          0% { opacity: 0.8; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(-20px) scale(1.5); }
        }
      `}</style>
    </div>
  )
}

export default function CorridaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("dia")
  const [raceType, setRaceType] = useState<RaceType>("qualificados")
  const [selectedDay, setSelectedDay] = useState<string>(() => formatDateForDB(new Date()))
  const [celebration, setCelebration] = useState<any>(null)
  const prevMetaReached = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const weekDays = useMemo(() => getWeekDays(), [])
  const dateRange = useMemo(() => ({
    start: formatDateForDB(weekDays[0].date),
    end: formatDateForDB(weekDays[weekDays.length - 1].date),
  }), [weekDays])

  const { data: leadsData } = useSWR(`/api/leads?startDate=${dateRange.start}&endDate=${dateRange.end}`, fetcher, { refreshInterval: 10000 })
  const { data: qualificadosData } = useSWR(`/api/leads/qualificados?startDate=${dateRange.start}&endDate=${dateRange.end}`, fetcher, { refreshInterval: 10000 })

  const leads = leadsData || []
  const qualificados = qualificadosData?.leads || []

  const vendedoresData = useMemo(() => {
    const map: Record<string, any> = {}

    leads.forEach((lead: any) => {
      if (!lead.data_agendei || !lead.responsavel) return
      const v = normalizeVendedorNome(lead.responsavel)
      if (!map[v]) map[v] = { nome: v, foto: getFotoVendedor(v), genero: getVendedorGenero(v), agendeiDia: 0, agendeiSemana: 0, qualificadosDia: 0, qualificadosSemana: 0 }
      map[v].agendeiSemana++
      if (lead.data_agendei === selectedDay) map[v].agendeiDia++
    })

    qualificados.forEach((q: any) => {
      if (!q.responsavel) return
      const v = normalizeVendedorNome(q.responsavel)
      if (!map[v]) map[v] = { nome: v, foto: getFotoVendedor(v), genero: getVendedorGenero(v), agendeiDia: 0, agendeiSemana: 0, qualificadosDia: 0, qualificadosSemana: 0 }
      map[v].qualificadosSemana++
      if (q.data_qualificacao === selectedDay) map[v].qualificadosDia++
    })

    return Object.values(map)
  }, [leads, qualificados, selectedDay])

  const meta = viewMode === "dia"
    ? (raceType === "agendei" ? META_AGENDEI_DIA : META_QUALIFICADOS_DIA)
    : (raceType === "agendei" ? META_AGENDEI_SEMANA : META_QUALIFICADOS_SEMANA)

  const sortedVendedores = useMemo(() => {
    return [...vendedoresData]
      .map(v => {
        const valor = viewMode === "dia"
          ? (raceType === "agendei" ? v.agendeiDia : v.qualificadosDia)
          : (raceType === "agendei" ? v.agendeiSemana : v.qualificadosSemana)
        const progresso = Math.min((valor / meta) * 100, 100)
        return { ...v, valor, progresso, meta }
      })
      .filter(v => v.valor > 0 || viewMode === "semana")
      .sort((a, b) => b.progresso - a.progresso)
  }, [vendedoresData, viewMode, raceType, meta])

  // Detecta quem atingiu a meta e mostra celebracao
  useEffect(() => {
    sortedVendedores.forEach(v => {
      const key = `${v.nome}-${viewMode}-${raceType}`
      if (v.progresso >= 100 && !prevMetaReached.current.has(key)) {
        prevMetaReached.current.add(key)
        setCelebration(v)
      }
    })
  }, [sortedVendedores, viewMode, raceType])

  const weekLabel = `${weekDays[0].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} - ${weekDays[weekDays.length - 1].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#0a0a0f" }}>
      {/* Video de fundo */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          style={{ opacity: 0.15 }}
        >
          <source src="https://cdn.pixabay.com/video/2020/05/25/40026-424930959_large.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, rgba(10,10,15,0.8) 0%, rgba(10,10,15,0.6) 50%, rgba(10,10,15,0.95) 100%)"
        }} />
      </div>

      {/* Musica Top Gun */}
      <audio ref={audioRef} loop autoPlay>
        <source src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" type="audio/mpeg" />
      </audio>

      {/* Celebracao de meta */}
      {celebration && (
        <MetaCelebration
          vendedor={celebration}
          onClose={() => setCelebration(null)}
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-40" style={{ background: "rgba(10,10,15,0.85)" }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 md:py-4 max-w-[1600px] mx-auto gap-3">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl flex items-center justify-center" style={{
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  boxShadow: "0 0 20px rgba(239,68,68,0.4)"
                }}>
                  <Trophy size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black" style={{
                    background: "linear-gradient(90deg, #fbbf24, #f97316, #ef4444)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}>Grand Prix LR</h1>
                  <p className="text-xs text-white/40">{weekLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Race type toggle */}
              <div className="flex rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {[
                  { key: "qualificados", label: "Qualificados", icon: Target },
                  { key: "agendei", label: "Agendei", icon: Calendar }
                ].map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setRaceType(key as RaceType)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={raceType === key ? {
                      background: key === "qualificados" ? "linear-gradient(135deg,#0ea5e9,#3b82f6)" : "linear-gradient(135deg,#8b5cf6,#7c3aed)",
                      color: "white", boxShadow: "0 0 12px rgba(59,130,246,0.4)"
                    } : { color: "rgba(255,255,255,0.5)" }}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>

              {/* View mode toggle */}
              <div className="flex rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {["dia", "semana"].map(mode => (
                  <button key={mode} onClick={() => setViewMode(mode as ViewMode)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                    style={viewMode === mode ? {
                      background: "linear-gradient(135deg,#10b981,#059669)",
                      color: "white", boxShadow: "0 0 12px rgba(16,185,129,0.4)"
                    } : { color: "rgba(255,255,255,0.5)" }}>
                    {mode === "dia" ? "Hoje" : "Semana"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Seletor de dia */}
        {viewMode === "dia" && (
          <div className="px-4 py-3 max-w-[1600px] mx-auto">
            <div className="flex flex-wrap gap-2 justify-center">
              {weekDays.map(day => {
                const dateStr = formatDateForDB(day.date)
                const isSelected = dateStr === selectedDay
                return (
                  <button key={dateStr} onClick={() => setSelectedDay(dateStr)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={isSelected ? {
                      background: "linear-gradient(135deg,#f59e0b,#f97316)",
                      color: "white", boxShadow: "0 0 16px rgba(245,158,11,0.4)"
                    } : day.isToday ? {
                      background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399"
                    } : {
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)"
                    }}>
                    {day.dayName.slice(0, 3)} {day.date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="px-4 pb-4 max-w-[1600px] mx-auto">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl" style={{
              background: "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(245,158,11,0.15))",
              border: "1px solid rgba(239,68,68,0.25)",
              boxShadow: "0 0 20px rgba(239,68,68,0.1)"
            }}>
              <Flag size={20} className="text-red-400" />
              <div>
                <span className="text-xs text-white/50 block uppercase tracking-wider">Meta da Corrida</span>
                <span className="text-3xl font-black text-white">{meta}</span>
                <span className="text-sm text-white/40 ml-2">{raceType === "qualificados" ? "qualificados" : "agendados"}</span>
              </div>
              <Zap size={20} className="text-yellow-400 animate-pulse" />
            </div>
          </div>

          {/* Pistas */}
          <div className="space-y-5">
            {sortedVendedores.length === 0 ? (
              <div className="text-center py-20">
                <Trophy size={48} className="mx-auto mb-4 text-white/10" />
                <p className="text-white/30 text-lg">Aguardando pilotos na largada...</p>
              </div>
            ) : (
              sortedVendedores.map((vendedor, index) => (
                <RaceTrack key={vendedor.nome} vendedor={vendedor} index={index} />
              ))
            )}
          </div>

          {/* Legenda */}
          <div className="flex justify-center gap-8 mt-10 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm bg-pink-500 shadow-[0_0_8px_rgba(244,114,182,0.6)]" />
              <span className="text-xs text-white/40">Pilotas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <span className="text-xs text-white/40">Pilotos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 rounded-sm" style={{ background: "repeating-conic-gradient(white 0deg 90deg, black 90deg 180deg)", backgroundSize: "6px 6px" }} />
              <span className="text-xs text-white/40">Meta</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes exhaust1 {
          0% { opacity: 0.7; transform: translateX(0) scale(0.8); }
          100% { opacity: 0; transform: translateX(-25px) scale(1.8); }
        }
      `}</style>
    </div>
  )
}
