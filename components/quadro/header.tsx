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
    <header className="flex items-center justify-between mx-4 md:mx-6 mt-4 mb-4 p-4 bg-[#111] border border-white/[0.06] rounded-lg">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Image
          src="/images/logo-lr.png"
          alt="LR Multimarcas"
          width={140}
          height={46}
          className="h-[40px] w-auto object-contain"
          priority
        />
        
        <div className="hidden sm:block w-px h-8 bg-white/10 mx-2" />
        
        <h1 className="hidden sm:block text-[15px] font-medium text-white/80">
          Reunioes
        </h1>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Sync indicator */}
        <span className="hidden md:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Sync
        </span>
        
        {/* Week navigation */}
        <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-md">
          <button
            onClick={onPrevWeek}
            className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-l-md transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-[12px] font-medium text-white/70 min-w-[140px] text-center px-2">
            {weekLabel || "..."}
          </span>
          
          <button
            onClick={onNextWeek}
            className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-r-md transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        {/* Add button */}
        <button
          onClick={onNewLead}
          className="flex items-center gap-1.5 bg-[#a78bfa] hover:bg-[#8b5cf6] text-black text-[12px] font-medium px-3 py-2 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Novo</span>
        </button>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
