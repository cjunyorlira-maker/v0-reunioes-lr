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
    <header className="flex items-center justify-between mx-4 md:mx-6 mt-4 mb-5 p-4 backdrop-blur-xl border border-[rgba(212,175,55,0.2)] rounded-2xl bg-gradient-to-r from-white/[0.05] to-white/[0.02] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      {/* Brand */}
      <div className="flex items-center gap-3 group">
        <div className="relative transition-transform duration-300 group-hover:scale-105">
          <Image
            src="/images/logo-lr.png"
            alt="LR Multimarcas"
            width={180}
            height={60}
            className="h-[56px] w-auto object-contain"
            priority
          />
        </div>
        
        <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-[rgba(212,175,55,0.3)] via-[rgba(212,175,55,0.1)] to-transparent" />
        
        <h1 className="hidden sm:block text-[15px] font-bold bg-gradient-to-r from-[#d4af37] to-[#f5b041] bg-clip-text text-transparent">
          Reunioes
        </h1>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Week navigation */}
        <div className="flex items-center bg-white/[0.04] backdrop-blur-md border border-[rgba(212,175,55,0.15)] rounded-xl overflow-hidden transition-all duration-300 hover:border-[rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]">
          <button
            onClick={onPrevWeek}
            className="w-10 h-10 flex items-center justify-center text-[#d4af37]/60 hover:text-[#d4af37] hover:bg-[rgba(212,175,55,0.1)] transition-all duration-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <span className="text-[12px] font-bold text-[#f5f0e8] min-w-[160px] text-center px-3 bg-gradient-to-r from-transparent via-white/5 to-transparent">
            {weekLabel || "..."}
          </span>
          
          <button
            onClick={onNextWeek}
            className="w-10 h-10 flex items-center justify-center text-[#d4af37]/60 hover:text-[#d4af37] hover:bg-[rgba(212,175,55,0.1)] transition-all duration-300"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        
        {/* Add button */}
        <button
          onClick={onNewLead}
          className="group relative flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[12px] font-bold text-[#0a0a0a] transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #d4af37, #c9a227)",
            boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <Plus className="h-4 w-4 relative z-10" />
          <span className="hidden sm:inline relative z-10">Novo Lead</span>
        </button>

        {/* Corrida button */}
        <Link
          href="/dashboard/corrida"
          className="group relative flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <Trophy className="h-4 w-4 relative z-10" />
          <span className="hidden sm:inline relative z-10">Corrida</span>
        </Link>

        {/* Dashboard button */}
        <Link
          href="/dashboard"
          className="group relative flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
            boxShadow: "0 4px 20px rgba(6,182,212,0.3)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="hidden sm:inline relative z-10">Dashboard</span>
        </Link>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center text-[#8a8070] hover:text-red-400 hover:bg-red-500/15 rounded-xl transition-all duration-300 hover:scale-105"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
