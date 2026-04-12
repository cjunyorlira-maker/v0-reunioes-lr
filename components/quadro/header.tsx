"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Plus, LogOut, RefreshCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface HeaderProps {
  weekLabel: string
  onPrevWeek: () => void
  onNextWeek: () => void
  onNewLead: () => void
}

export function Header({ weekLabel, onPrevWeek, onNextWeek, onNewLead }: HeaderProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/kommo/sync-all-leads", {
        method: "POST",
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success(`${data.created || 0} leads sincronizados!`)
        // Recarrega os dados
        router.refresh()
      } else {
        toast.error("Erro ao sincronizar leads")
      }
    } catch (error) {
      toast.error("Erro na sincronização")
      console.error("[v0] Sync error:", error)
    } finally {
      setIsSyncing(false)
    }
  }
  
  return (
    <header className="flex items-center justify-between mx-4 md:mx-6 mt-4 mb-4 p-4 bg-black/30 backdrop-blur-md border border-[rgba(212,175,55,0.15)] rounded-xl">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Image
          src="/images/logo-lr.png"
          alt="LR Multimarcas"
          width={180}
          height={60}
          className="h-[56px] w-auto object-contain"
          priority
        />
        
        <div className="hidden sm:block w-px h-8 bg-[rgba(212,175,55,0.2)] mx-2" />
        
        <h1 className="hidden sm:block text-[15px] font-semibold text-[#d4af37]">
          Reunioes
        </h1>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2.5">
        {/* Week navigation */}
        <div className="flex items-center bg-white/5 backdrop-blur-sm border border-[rgba(212,175,55,0.15)] rounded-lg">
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

        {/* Dashboard button */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-[12px] font-bold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-cyan-500/20"
        >
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-emerald-500/50 disabled:to-green-500/50 text-white text-[12px] font-bold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-500/20"
          title="Sincronizar leads do Kommo"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
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
