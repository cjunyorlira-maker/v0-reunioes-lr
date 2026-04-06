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
    <header className="relative flex items-center justify-between mx-4 md:mx-8 mt-6 mb-6 p-6 bg-[rgba(18,18,18,0.8)] backdrop-blur-sm border border-[rgba(255,255,255,0.06)] rounded-2xl flex-wrap gap-4">
      {/* Gradiente decorativo */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgba(212,175,55,0.02)] to-transparent pointer-events-none" />
      
      {/* Brand */}
      <div className="relative flex items-center gap-3.5">
        {/* Logo */}
        <Image
          src="/images/logo-lr.png"
          alt="LR Multimarcas"
          width={180}
          height={60}
          className="h-[50px] w-auto object-contain"
          priority
        />
        
        {/* Divider */}
        <div className="hidden sm:block w-px h-10 bg-[rgba(212,175,55,0.25)] mx-1" />
        
        {/* Título */}
        <div className="hidden sm:block">
          <h1 className="font-serif text-[22px] font-semibold text-[#f5f0e8] tracking-tight">
            Reuniões Agendadas
          </h1>
        </div>
      </div>

      {/* Right side */}
      <div className="relative flex items-center gap-2.5 flex-wrap">
        {/* Sync badge */}
        <span className="text-[11px] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap bg-[rgba(74,222,128,0.08)] text-[#4ade80] border border-[rgba(74,222,128,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
          Sincronizado
        </span>
        
        {/* Week navigation */}
        <div className="flex items-center gap-1.5 bg-[#191919] border border-[rgba(212,175,55,0.1)] rounded-xl p-1">
          <button
            onClick={onPrevWeek}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8a8070] hover:bg-[rgba(212,175,55,0.08)] hover:text-[#d4af37] transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="font-serif text-[13px] font-semibold text-[#f5f0e8] min-w-[170px] text-center">
            {weekLabel || "..."}
          </span>
          
          <button
            onClick={onNextWeek}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8a8070] hover:bg-[rgba(212,175,55,0.08)] hover:text-[#d4af37] transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        {/* Add button */}
        <button
          onClick={onNewLead}
          className="bg-gradient-to-br from-[#b8960c] via-[#d4af37] to-[#f0d060] text-black text-[13px] font-medium px-5 py-2.5 rounded-[10px] hover:opacity-90 hover:shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition-all tracking-wide whitespace-nowrap"
        >
          <Plus className="h-4 w-4 inline mr-1 -mt-0.5" />
          Novo lead
        </button>
        
        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#8a8070] hover:bg-[rgba(239,68,68,0.1)] hover:text-red-400 transition-all"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
