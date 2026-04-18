"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Plus, LogOut, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface HeaderProps {
  weekLabel: string
  onPrevWeek: () => void
  onNextWeek: () => void
  onNewLead: () => void
}

export function Header({ weekLabel, onPrevWeek, onNextWeek, onNewLead }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }
  
  return (
    <header className="flex items-center justify-between mx-4 md:mx-6 mt-4 mb-4 p-4 glass-card rounded-2xl animate-fade-in">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="relative group">
          <Image
            src="/images/logo-lr.png"
            alt="LR Multimarcas"
            width={180}
            height={60}
            className="h-[56px] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/0 via-[#d4af37]/10 to-[#d4af37]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
        </div>
        
        <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-transparent via-[#d4af37]/30 to-transparent mx-2" />
        
        <h1 className="hidden sm:block text-[15px] font-bold text-gradient-gold">
          Reunioes
        </h1>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Week navigation */}
        <div className="flex items-center glass rounded-xl overflow-hidden">
          <button
            onClick={onPrevWeek}
            className="w-10 h-10 flex items-center justify-center text-[#d4af37]/50 hover:text-[#d4af37] hover:bg-[rgba(212,175,55,0.15)] transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-[12px] font-bold text-[#f5f0e8] min-w-[150px] text-center px-3">
            {weekLabel || "..."}
          </span>
          
          <button
            onClick={onNextWeek}
            className="w-10 h-10 flex items-center justify-center text-[#d4af37]/50 hover:text-[#d4af37] hover:bg-[rgba(212,175,55,0.15)] transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        {/* Add button */}
        <button
          onClick={onNewLead}
          className="group relative flex items-center gap-1.5 bg-gradient-to-r from-[#d4af37] to-[#c9a227] text-[#0a0a0a] text-[12px] font-bold px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden"
          style={{
            boxShadow: "0 4px 20px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <Plus className="h-4 w-4 relative z-10" />
          <span className="hidden sm:inline relative z-10">Novo Lead</span>
        </button>

        {/* Corrida button */}
        <Link
          href="/dashboard/corrida"
          className="group relative flex items-center gap-1.5 text-[12px] font-bold px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            boxShadow: "0 4px 20px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
            color: "white"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <Trophy className="h-4 w-4 relative z-10 animate-pulse" />
          <span className="hidden sm:inline relative z-10">Corrida</span>
        </Link>

        {/* Dashboard button */}
        <Link
          href="/dashboard"
          className="group relative flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[12px] font-bold px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden"
          style={{
            boxShadow: "0 4px 20px rgba(6,182,212,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="hidden sm:inline relative z-10">Dashboard</span>
        </Link>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center text-[#8a8070] hover:text-red-400 glass rounded-xl transition-all duration-300 hover:scale-105 hover:bg-red-500/10 hover:border-red-500/20"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
