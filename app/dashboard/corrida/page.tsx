"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import useSWR from "swr"
import { getWeekDays, formatDateForDB } from "@/lib/date-utils"
import { getFotoVendedor, normalizeVendedorNome, getVendedorGenero } from "@/lib/vendedor-fotos"
import { useQualificados } from "@/hooks/use-qualificados"
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
  const struggling = position >= 10  // Do 10o para baixo: capô fumando + guincho

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-20"
      style={{ left: `calc(${Math.min(progresso, 90)}% - 50px)` }}
    >
      <div className="relative">

        {/* Guincho na frente puxando o carro - apenas do 10o para baixo */}
        {struggling && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center pointer-events-none" style={{ zIndex: 30 }}>
            {/* Foto sutil acima do guincho */}
            <div className="absolute -top-6 left-20">
              <img
                src="/images/guincho-motorista.jpg"
                alt="Motorista Guincho"
                className="w-8 h-8 rounded-full object-cover shadow-lg border-1.5 border-amber-400"
                style={{ boxShadow: "0 0 8px rgba(251, 191, 36, 0.4)" }}
              />
            </div>
              {/* Cabo/corrente tensionada */}
              <svg width="35" height="20" viewBox="0 0 35 20" className="mr-[-2px]">
              {/* Corrente com elos */}
              <g>
                {[0, 7, 14, 21, 28].map((x, i) => (
                  <g key={i}>
                    <ellipse cx={x + 3} cy="10" rx="4" ry="3" fill="none" stroke="#71717a" strokeWidth="2" />
                    {i < 4 && <ellipse cx={x + 6.5} cy="10" rx="4" ry="3" fill="none" stroke="#52525b" strokeWidth="2" />}
                  </g>
                ))}
              </g>
              {/* Tensao no cabo */}
              <line x1="0" y1="10" x2="35" y2="10" stroke="#a1a1aa" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
            </svg>
            
            {/* Caminhao guincho realista */}
            <svg width="90" height="55" viewBox="0 0 90 55" className="drop-shadow-xl">
              {/* Sombra no chao */}
              <ellipse cx="45" cy="52" rx="40" ry="3" fill="black" opacity="0.3" />
              
              {/* Chassi/base do caminhao */}
              <rect x="5" y="35" width="80" height="8" rx="1" fill="#374151" />
              
              {/* Plataforma de carga inclinada */}
              <polygon points="8,35 75,35 80,22 12,22" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
              {/* Linhas da plataforma */}
              <line x1="20" y1="22" x2="18" y2="35" stroke="#d97706" strokeWidth="0.5" />
              <line x1="35" y1="22" x2="33" y2="35" stroke="#d97706" strokeWidth="0.5" />
              <line x1="50" y1="22" x2="48" y2="35" stroke="#d97706" strokeWidth="0.5" />
              <line x1="65" y1="22" x2="63" y2="35" stroke="#d97706" strokeWidth="0.5" />
              
              {/* Braco do guincho */}
              <polygon points="10,22 18,22 22,8 14,8" fill="#78716c" stroke="#57534e" strokeWidth="1" />
              <polygon points="14,8 22,8 18,2 12,2" fill="#a8a29e" stroke="#78716c" strokeWidth="0.8" />
              {/* Polia na ponta */}
              <circle cx="15" cy="4" r="3" fill="#525252" stroke="#404040" strokeWidth="0.5" />
              <circle cx="15" cy="4" r="1.5" fill="#737373" />
              
              {/* Carretel do cabo no braco */}
              <circle cx="16" cy="16" r="5" fill="#404040" stroke="#262626" strokeWidth="1" />
              <circle cx="16" cy="16" r="3" fill="#525252" />
              <circle cx="16" cy="16" r="1" fill="#262626" />
              
              {/* Cabine do caminhao */}
              <rect x="58" y="12" width="28" height="23" rx="3" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
              {/* Teto da cabine */}
              <rect x="58" y="8" width="28" height="6" rx="2" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
              {/* Para-brisa */}
              <rect x="61" y="14" width="22" height="10" rx="2" fill="#0ea5e9" opacity="0.6" />
              <rect x="62" y="15" width="20" height="8" rx="1" fill="#7dd3fc" opacity="0.4" />
              {/* Foto do motorista (você!) na janela da cabine */}
              <image href="/images/guincho-motorista.jpg" x="64" y="14" width="14" height="14" preserveAspectRatio="xMidYMid slice" clip-path="url(#circleMask)" />
              <defs>
                <clipPath id="circleMask">
                  <circle cx="71" cy="21" r="7" />
                </clipPath>
              </defs>
              {/* Circulo ao redor da foto */}
              <circle cx="71" cy="21" r="7" fill="none" stroke="#d97706" strokeWidth="1" />
              {/* Porta */}
              <rect x="61" y="25" width="10" height="9" rx="1" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
              <circle cx="69" cy="29" r="1" fill="#78716c" />
              
              {/* Luzes de emergencia no teto */}
              <rect x="63" y="5" width="18" height="4" rx="2" fill="#1f2937" />
              <circle cx="68" cy="7" r="2" fill="#ef4444" className="animate-pulse" />
              <circle cx="76" cy="7" r="2" fill="#3b82f6" className="animate-pulse" style={{ animationDelay: "0.5s" }} />
              
              {/* Farol dianteiro */}
              <rect x="84" y="20" width="4" height="8" rx="2" fill="#fef3c7" />
              <rect x="85" y="21" width="2" height="6" rx="1" fill="#fde68a" opacity="0.8" />
              
              {/* Faixa amarela e preta de seguranca */}
              <rect x="8" y="32" width="50" height="3" fill="url(#hazardStripes)" />
              <defs>
                <pattern id="hazardStripes" patternUnits="userSpaceOnUse" width="6" height="3">
                  <rect width="3" height="3" fill="#fbbf24" />
                  <rect x="3" width="3" height="3" fill="#1f2937" />
                </pattern>
              </defs>
              
              {/* Texto GUINCHO 24H */}
              <rect x="20" y="22" width="40" height="10" rx="1" fill="#1f2937" />
              <text x="40" y="32" fontSize="7" fontWeight="bold" fill="#fbbf24" textAnchor="middle">GUINCHO</text>
              
              {/* Rodas traseiras (duplas) */}
              <circle cx="22" cy="46" r="7" fill="#1f2937" stroke="#404040" strokeWidth="1" />
              <circle cx="22" cy="46" r="5" fill="#374151" />
              <circle cx="22" cy="46" r="2" fill="#525252" />
              <circle cx="30" cy="46" r="7" fill="#1f2937" stroke="#404040" strokeWidth="1" />
              <circle cx="30" cy="46" r="5" fill="#374151" />
              <circle cx="30" cy="46" r="2" fill="#525252" />
              
              {/* Roda dianteira */}
              <circle cx="72" cy="46" r="7" fill="#1f2937" stroke="#404040" strokeWidth="1" />
              <circle cx="72" cy="46" r="5" fill="#374151" />
              <circle cx="72" cy="46" r="2" fill="#525252" />
              
              {/* Para-choque traseiro com gancho */}
              <rect x="2" y="38" width="6" height="6" rx="1" fill="#52525b" />
              <path d="M 0 41 Q -3 41, -3 44 L -3 46 Q -3 48, 0 48" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        )}

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

          {/* Fumaca do capo - apenas do 15o para baixo */}
          {struggling && (
            <g>
              <circle cx="90" cy="18" r="5" fill="#d1d5db" opacity="0.55" className="animate-[exhaust1_0.9s_ease-out_infinite]" style={{ animationDelay: "0s" }} />
              <circle cx="93" cy="12" r="7" fill="#e5e7eb" opacity="0.40" className="animate-[exhaust1_1.1s_ease-out_infinite]" style={{ animationDelay: "0.15s" }} />
              <circle cx="88" cy="7"  r="9" fill="#f3f4f6" opacity="0.30" className="animate-[exhaust1_1.3s_ease-out_infinite]" style={{ animationDelay: "0.3s" }} />
              <circle cx="95" cy="3"  r="11" fill="#9ca3af" opacity="0.20" className="animate-[exhaust1_1.5s_ease-out_infinite]" style={{ animationDelay: "0.45s" }} />
              <circle cx="85" cy="-2" r="13" fill="#6b7280" opacity="0.12" className="animate-[exhaust1_1.7s_ease-out_infinite]" style={{ animationDelay: "0.6s" }} />
              {/* Pequenas chispas de superaquecimento */}
              <circle cx="92" cy="20" r="1.2" fill="#fbbf24" opacity="0.8" className="animate-pulse" />
              <circle cx="88" cy="22" r="0.9" fill="#f97316" opacity="0.7" className="animate-pulse" style={{ animationDelay: "0.3s" }} />
              <circle cx="94" cy="19" r="0.7" fill="#ef4444" opacity="0.6" className="animate-pulse" style={{ animationDelay: "0.6s" }} />
            </g>
          )}
        </svg>

        {/* Foto do piloto acima do carro */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
          {foto ? (
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg border-2" style={{ borderColor: primary, boxShadow: `0 0 10px rgba(${glow},0.6)` }}>
              <img
                src={foto}
                alt={nome}
                className="w-full h-full object-cover"
                style={{ objectPosition: "center 20%" }}
              />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
              style={{ background: primary, border: `2px solid ${accent}`, boxShadow: `0 0 10px rgba(${glow},0.6)` }}
            >
              {nome.charAt(0)}
            </div>
          )}
          <div
            className="text-[8px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: `rgba(${glow},0.25)`, color: primary, border: `1px solid rgba(${glow},0.4)` }}
          >
            {nome.split(" ")[0]}
          </div>
        </div>

        {/* Badge CHEGOU acima */}
        {finished && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-[9px] font-bold text-black shadow-lg animate-bounce">
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

  // Busca TODOS os leads sem filtro de data (igual dashboard principal)
  // data_agendei pode ser desta semana mas data da reunião pode ser outra semana
  const { data: leadsData } = useSWR(`/api/leads`, fetcher, { refreshInterval: 10000 })

  // Busca qualificados com o mesmo hook e parâmetros do dashboard principal
  const { qualificadosSemana: qualificados } = useQualificados(dateRange)

  const leads = leadsData || []

  const vendedoresData = useMemo(() => {
    const map: Record<string, any> = {}

    // Usa data_agendei igual ao dashboard principal (data que o lead entrou em Confirmar Reunião)
    leads.forEach((lead: any) => {
      if (!lead.data_agendei || !lead.responsavel) return
      // Verifica se data_agendei está dentro do range da semana
      if (lead.data_agendei < dateRange.start || lead.data_agendei > dateRange.end) return
      const v = normalizeVendedorNome(lead.responsavel)
      if (!map[v]) map[v] = { nome: v, foto: getFotoVendedor(v), genero: getVendedorGenero(v), agendeiDia: 0, agendeiSemana: 0, qualificadosDia: 0, qualificadosSemana: 0 }
      map[v].agendeiSemana++
      // Compara data_agendei com o dia selecionado
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
      .filter(v => v.valor > 0) // Remove apenas vendedores com 0 em ambas as situações
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

  // Calcula totais de agendei e qualificados
  const totais = useMemo(() => {
    const totalAgendeiDia = vendedoresData.reduce((sum, v) => sum + v.agendeiDia, 0)
    const totalAgendeiSemana = vendedoresData.reduce((sum, v) => sum + v.agendeiSemana, 0)
    const totalQualificadosDia = vendedoresData.reduce((sum, v) => sum + v.qualificadosDia, 0)
    const totalQualificadosSemana = vendedoresData.reduce((sum, v) => sum + v.qualificadosSemana, 0)
    return { totalAgendeiDia, totalAgendeiSemana, totalQualificadosDia, totalQualificadosSemana }
  }, [vendedoresData])

  // Lista de quem está na oficina "Tá difícil"
  const oficina = useMemo(() => {
    if (viewMode === "dia") {
      // No dia: quem tem 0 em agendei OU 0 em qualificados
      return vendedoresData.filter(v => v.agendeiDia === 0 || v.qualificadosDia === 0)
    } else {
      // Na semana: quem tem menos de 5 em agendei E menos de 20 em qualificados
      return vendedoresData.filter(v => v.agendeiSemana < 5 && v.qualificadosSemana < 20)
    }
  }, [vendedoresData, viewMode])

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
        {/* Header com glassmorphism */}
        <header className="border-b border-white/10 backdrop-blur-2xl sticky top-0 z-40 transition-all duration-500" style={{ 
          background: "linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.85) 100%)",
          boxShadow: "0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
        }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 md:py-4 max-w-[1600px] mx-auto gap-3">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="group p-2.5 rounded-xl transition-all duration-300 hover:scale-105" style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(10px)"
              }}>
                <ArrowLeft size={20} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl flex items-center justify-center animate-pulse" style={{
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  boxShadow: "0 0 30px rgba(239,68,68,0.5), 0 0 60px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                }}>
                  <Trophy size={24} className="text-white drop-shadow-lg" />
                  <div className="absolute inset-0 rounded-xl" style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)"
                  }} />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black drop-shadow-lg" style={{
                    background: "linear-gradient(90deg, #fbbf24, #f97316, #ef4444, #fbbf24)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "shimmer 3s linear infinite"
                  }}>Grand Prix LR</h1>
                  <p className="text-xs text-white/50 font-medium">{weekLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Race type toggle - glassmorphism */}
              <div className="flex rounded-2xl p-1.5 transition-all duration-300" style={{ 
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)"
              }}>
                {[
                  { key: "qualificados", label: "Qualificados", icon: Target, color: "#0ea5e9" },
                  { key: "agendei", label: "Agendei", icon: Calendar, color: "#8b5cf6" }
                ].map(({ key, label, icon: Icon, color }) => (
                  <button key={key} onClick={() => setRaceType(key as RaceType)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 hover:scale-105"
                    style={raceType === key ? {
                      background: key === "qualificados" 
                        ? "linear-gradient(135deg,#0ea5e9,#3b82f6)" 
                        : "linear-gradient(135deg,#8b5cf6,#7c3aed)",
                      color: "white", 
                      boxShadow: `0 0 20px ${color}66, 0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`,
                      transform: "translateY(-1px)"
                    } : { 
                      color: "rgba(255,255,255,0.5)",
                      background: "transparent"
                    }}>
                    <Icon size={14} className={raceType === key ? "drop-shadow-lg" : ""} />{label}
                  </button>
                ))}
              </div>

              {/* View mode toggle - glassmorphism */}
              <div className="flex rounded-2xl p-1.5 transition-all duration-300" style={{ 
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)"
              }}>
                {["dia", "semana"].map(mode => (
                  <button key={mode} onClick={() => setViewMode(mode as ViewMode)}
                    className="px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 capitalize hover:scale-105"
                    style={viewMode === mode ? {
                      background: "linear-gradient(135deg,#10b981,#059669)",
                      color: "white", 
                      boxShadow: "0 0 20px rgba(16,185,129,0.5), 0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                      transform: "translateY(-1px)"
                    } : { 
                      color: "rgba(255,255,255,0.5)",
                      background: "transparent"
                    }}>
                    {mode === "dia" ? "Hoje" : "Semana"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Seletor de dia com glassmorphism */}
        {viewMode === "dia" && (
          <div className="px-4 py-4 max-w-[1600px] mx-auto">
            <div className="flex flex-wrap gap-3 justify-center">
              {weekDays.map(day => {
                const dateStr = formatDateForDB(day.date)
                const isSelected = dateStr === selectedDay
                return (
                  <button key={dateStr} onClick={() => setSelectedDay(dateStr)}
                    className="group relative px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-300 hover:scale-105 overflow-hidden"
                    style={isSelected ? {
                      background: "linear-gradient(135deg,#f59e0b,#f97316)",
                      color: "white", 
                      boxShadow: "0 0 30px rgba(245,158,11,0.5), 0 8px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
                      transform: "translateY(-2px)"
                    } : day.isToday ? {
                      background: "rgba(16,185,129,0.1)", 
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(16,185,129,0.4)", 
                      color: "#34d399",
                      boxShadow: "0 0 20px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.05)"
                    } : {
                      background: "rgba(255,255,255,0.03)", 
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.08)", 
                      color: "rgba(255,255,255,0.6)",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)"
                    }}>
                    {/* Efeito de brilho no hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)"
                    }} />
                    <span className="relative z-10">{day.dayName.slice(0, 3)} {day.date.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="px-4 pb-6 max-w-[1600px] mx-auto">
            {/* Totais e Meta - Glassmorphism cards */}
            <div className="flex flex-wrap justify-center gap-5 mb-8">
              {/* Total Qualificados */}
              <div className="group relative flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 overflow-hidden" style={{
                background: "linear-gradient(135deg,rgba(14,165,233,0.1),rgba(59,130,246,0.05))",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(14,165,233,0.2)",
                boxShadow: "0 8px 32px rgba(14,165,233,0.15), 0 0 0 1px rgba(255,255,255,0.05) inset"
              }}>
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                  background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                  boxShadow: "0 0 25px rgba(14,165,233,0.5), inset 0 1px 0 rgba(255,255,255,0.2)"
                }}>
                  <Target size={22} className="text-white drop-shadow-lg" />
                </div>
                <div className="relative">
                  <span className="text-xs text-white/60 block uppercase tracking-widest font-semibold">
                    Qualificados {viewMode === "dia" ? "Hoje" : "Semana"}
                  </span>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 drop-shadow-lg">
                    {viewMode === "dia" ? totais.totalQualificadosDia : totais.totalQualificadosSemana}
                  </span>
                </div>
              </div>

              {/* Total Agendei */}
              <div className="group relative flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 overflow-hidden" style={{
                background: "linear-gradient(135deg,rgba(139,92,246,0.1),rgba(124,58,237,0.05))",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(139,92,246,0.2)",
                boxShadow: "0 8px 32px rgba(139,92,246,0.15), 0 0 0 1px rgba(255,255,255,0.05) inset"
              }}>
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                  background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                  boxShadow: "0 0 25px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.2)"
                }}>
                  <Calendar size={22} className="text-white drop-shadow-lg" />
                </div>
                <div className="relative">
                  <span className="text-xs text-white/60 block uppercase tracking-widest font-semibold">
                    Agendei {viewMode === "dia" ? "Hoje" : "Semana"}
                  </span>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-400 drop-shadow-lg">
                    {viewMode === "dia" ? totais.totalAgendeiDia : totais.totalAgendeiSemana}
                  </span>
                </div>
              </div>

              {/* Meta da Corrida */}
              <div className="group relative flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 overflow-hidden" style={{
                background: "linear-gradient(135deg,rgba(239,68,68,0.1),rgba(245,158,11,0.05))",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(239,68,68,0.2)",
                boxShadow: "0 8px 32px rgba(239,68,68,0.15), 0 0 0 1px rgba(255,255,255,0.05) inset"
              }}>
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse" style={{
                  background: "linear-gradient(135deg, #ef4444, #f97316)",
                  boxShadow: "0 0 25px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.2)"
                }}>
                  <Flag size={22} className="text-white drop-shadow-lg" />
                </div>
                <div className="relative">
                  <span className="text-xs text-white/60 block uppercase tracking-widest font-semibold">Meta da Corrida</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">{meta}</span>
                    <span className="text-sm text-white/50 font-semibold">{raceType === "qualificados" ? "qualif." : "agend."}</span>
                  </div>
                </div>
                <Zap size={20} className="relative text-yellow-400 animate-pulse drop-shadow-lg" style={{
                  filter: "drop-shadow(0 0 8px rgba(250,204,21,0.8))"
                }} />
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

          {/* Oficina "Tá difícil" */}
          {oficina.length > 0 && (
            <div className="mt-12 pt-8 border-t border-white/5">
              <div className="relative rounded-3xl overflow-hidden" style={{
                background: "linear-gradient(180deg, #1a1a1f 0%, #0d0d12 100%)",
                border: "1px solid rgba(255,255,255,0.08)"
              }}>
                {/* Header da oficina */}
                <div className="relative px-6 py-4 flex items-center justify-between" style={{
                  background: "linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(245,158,11,0.1) 50%, rgba(239,68,68,0.15) 100%)",
                  borderBottom: "1px solid rgba(239,68,68,0.2)"
                }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                      background: "linear-gradient(135deg, #ef4444, #f97316)",
                      boxShadow: "0 0 20px rgba(239,68,68,0.4)"
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">Oficina: Tá difícil</h3>
                      <p className="text-xs text-white/40">
                        {viewMode === "dia" 
                          ? "Pilotos com 0 em agendei ou qualificados hoje" 
                          : "Pilotos com menos de 5 agendei e menos de 20 qualificados na semana"}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-xl" style={{
                    background: "rgba(239,68,68,0.2)",
                    border: "1px solid rgba(239,68,68,0.3)"
                  }}>
                    <span className="text-2xl font-black text-red-400">{oficina.length}</span>
                    <span className="text-xs text-white/40 ml-1">carros</span>
                  </div>
                </div>

                {/* Area da oficina com carros quebrados */}
                <div className="relative p-6" style={{
                  background: "repeating-linear-gradient(90deg, transparent 0px, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 80px)"
                }}>
                  {/* Piso da oficina */}
                  <div className="absolute inset-0" style={{
                    background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 100%)"
                  }} />
                  
                  {/* Carros quebrados */}
                  <div className="relative flex flex-wrap gap-6 justify-center">
                    {oficina.map((v, idx) => {
                      const isF = v.genero === "F"
                      return (
                        <div key={v.nome} className="flex flex-col items-center gap-2">
                          {/* Carro quebrado com fumaca */}
                          <div className="relative">
                            {/* Fumaca do capo */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                              {[...Array(3)].map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute rounded-full"
                                  style={{
                                    width: 8 + i * 4,
                                    height: 8 + i * 4,
                                    background: `rgba(150,150,150,${0.6 - i * 0.15})`,
                                    left: -4 - i * 2,
                                    top: -i * 8,
                                    animation: `smoke ${1.5 + i * 0.3}s ease-out infinite`,
                                    animationDelay: `${i * 0.2}s`
                                  }}
                                />
                              ))}
                            </div>
                            
                            {/* Carro SVG simplificado */}
                            <svg width="80" height="45" viewBox="0 0 80 45" style={{ opacity: 0.7 }}>
                              {/* Sombra */}
                              <ellipse cx="40" cy="42" rx="35" ry="3" fill="black" opacity="0.4" />
                              {/* Corpo */}
                              <path d="M10,30 L15,18 Q20,12 30,12 L50,12 Q60,12 65,18 L70,30 Q72,35 70,38 L10,38 Q8,35 10,30 Z" 
                                fill={isF ? "#be185d" : "#1e40af"} opacity="0.6" />
                              {/* Capo aberto */}
                              <path d="M15,18 L30,5 L45,5 L35,18 Z" fill={isF ? "#9f1239" : "#1e3a8a"} opacity="0.8" />
                              {/* Rodas */}
                              <circle cx="22" cy="38" r="6" fill="#1f1f1f" />
                              <circle cx="58" cy="38" r="6" fill="#1f1f1f" />
                              {/* Rodas - furadas */}
                              <ellipse cx="22" cy="40" rx="6" ry="4" fill="#1f1f1f" />
                              <ellipse cx="58" cy="40" rx="6" ry="4" fill="#1f1f1f" />
                            </svg>
                            
                            {/* Foto do piloto */}
                            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full overflow-hidden border-2"
                              style={{ borderColor: isF ? "#f472b6" : "#3b82f6", boxShadow: `0 0 10px ${isF ? "rgba(244,114,182,0.5)" : "rgba(59,130,246,0.5)"}` }}>
                              {v.foto ? (
                                <img src={v.foto} alt={v.nome} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                                  style={{ background: isF ? "#be185d" : "#1e40af" }}>
                                  {v.nome.charAt(0)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Nome e stats */}
                          <div className="text-center">
                            <p className="text-sm font-semibold text-white/70">{v.nome.split(" ")[0]}</p>
                            <div className="flex gap-2 text-xs text-white/40">
                              <span className="text-purple-400">{viewMode === "dia" ? v.agendeiDia : v.agendeiSemana} ag.</span>
                              <span className="text-cyan-400">{viewMode === "dia" ? v.qualificadosDia : v.qualificadosSemana} qf.</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes exhaust1 {
          0% { opacity: 0.7; transform: translateX(0) scale(0.8); }
          100% { opacity: 0; transform: translateX(-25px) scale(1.8); }
        }
        @keyframes smoke {
          0% { opacity: 0.6; transform: translateY(0) scale(1); }
          50% { opacity: 0.4; transform: translateY(-15px) scale(1.5); }
          100% { opacity: 0; transform: translateY(-30px) scale(2); }
        }
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(245,158,11,0.4); }
          50% { box-shadow: 0 0 40px rgba(245,158,11,0.6), 0 0 60px rgba(239,68,68,0.3); }
        }
        /* Smooth scroll */
        html { scroll-behavior: smooth; }
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}
