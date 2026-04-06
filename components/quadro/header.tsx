"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Plus, LogOut } from "lucide-react"
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
    <header className="flex items-center justify-between mx-4 md:mx-6 mt-4 mb-4 p-4 bg-[#0f0f0f] border border-[rgba(212,175,55,0.1)] rounded-xl">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Image
          src="/images/logo-lr.png"
          alt="LR Multimarcas"
          width={140}
          height={46}
          className="h-[42px] w-auto object-contain"
          priority
        />
        
        <div className="hidden sm:block w-px h-8 bg-[rgba(212,175,55,0.2)] mx-2" />
        
        <h1 className="hidden sm:block text-[15px] font-semibold text-[#d4af37]">
          Reunioes
        </h1>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2.5">
        {/* Sync indicator */}
        <span className="hidden md:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Sync
        </span>
        
        {/* Week navigation */}
        <div className="flex items-center bg-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.15)] rounded-lg">
          <button
            onClick={onPrevWeek}
            className="w-9 h-9 flex items-center justify-center text-[#d4af37]/50 hover:text-[#d4af37] hover:bg-[rgba(212,175,55,0.1)] rounded-l-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-[12px] font-semibold text-[#f5f0e8] min-w-[150px] text-center px-3">
            {weekLabel || "..."}
          </span>
          
          <button
            onClick={onNextWeek}
            className="w-9 h-9 flex items-center justify-center text-[#d4af37]/50 hover:text-[#d4af37] hover:bg-[rgba(212,175,55,0.1)] rounded-r-lg transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        {/* Add button */}
        <button
          onClick={onNewLead}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#d4af37] to-[#c9a227] hover:from-[#c9a227] hover:to-[#b8960c] text-[#0a0a0a] text-[12px] font-bold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-[rgba(212,175,55,0.2)]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Lead</span>
        </button>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-9 h-9 flex items-center justify-center text-[#8a8070] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
