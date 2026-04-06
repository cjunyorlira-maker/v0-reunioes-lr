"use client"

import { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { Header } from "@/components/quadro/header"
import { StatsCards } from "@/components/quadro/stats-cards"
import { DayColumn } from "@/components/quadro/day-column"
import { NewLeadModal } from "@/components/quadro/new-lead-modal"
import { EditLeadModal } from "@/components/quadro/edit-lead-modal"
import type { Lead } from "@/lib/types"
import { useLeads } from "@/hooks/use-leads"
import { getWeekDays, getWeekRange, getWeekLabel } from "@/lib/date-utils"
import { Spinner } from "@/components/ui/spinner"
import type { WeekDay } from "@/lib/types"

export default function QuadroReunioes() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [mounted, setMounted] = useState(false)
  const [weekDays, setWeekDays] = useState<WeekDay[]>([])
  const [weekLabel, setWeekLabel] = useState("")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [selectedEquipe, setSelectedEquipe] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      setWeekDays(getWeekDays(weekOffset))
      setWeekLabel(getWeekLabel(weekOffset))
      setDateRange(getWeekRange(weekOffset))
    }
  }, [weekOffset, mounted])

  const { leads, isLoading, createLead, updateLead, deleteLead } = useLeads(dateRange.start, dateRange.end)

  // Lista de equipes únicas
  const equipes = useMemo(() => {
    const equipesSet = new Set<string>()
    leads.forEach(lead => {
      if (lead.equipe) equipesSet.add(lead.equipe)
    })
    return Array.from(equipesSet).sort()
  }, [leads])

  // Leads filtrados por equipe
  const filteredLeads = useMemo(() => {
    if (!selectedEquipe) return leads
    return leads.filter(lead => lead.equipe === selectedEquipe)
  }, [leads, selectedEquipe])

  // Estatísticas por equipe
  const statsByEquipe = useMemo(() => {
    const stats: Record<string, { total: number; veio: number; nao: number; pending: number }> = {}
    
    leads.forEach(lead => {
      const equipe = lead.equipe || "Sem equipe"
      if (!stats[equipe]) {
        stats[equipe] = { total: 0, veio: 0, nao: 0, pending: 0 }
      }
      stats[equipe].total++
      if (lead.status === "veio") stats[equipe].veio++
      else if (lead.status === "nao") stats[equipe].nao++
      else stats[equipe].pending++
    })
    
    return stats
  }, [leads])

  const stats = useMemo(() => {
    const leadsToCount = selectedEquipe ? filteredLeads : leads
    return {
      total: leadsToCount.length,
      veio: leadsToCount.filter((l) => l.status === "veio").length,
      nao: leadsToCount.filter((l) => l.status === "nao").length,
      pending: leadsToCount.filter((l) => l.status === "pending").length,
    }
  }, [leads, filteredLeads, selectedEquipe])

  const handleUpdateStatus = async (id: string, status: "veio" | "nao" | "pending") => {
    try {
      await updateLead(id, { status })
      
      // Encontra o lead para pegar o kommo_id
      const lead = leads.find(l => l.id === id)
      
      // Move o lead no Kommo (apenas se não for "pending")
      if (lead && status !== "pending") {
        try {
          const response = await fetch("/api/kommo/move-lead", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kommo_id: lead.kommo_id,
              kommo_lead_id: lead.kommo_lead_id,
              nome: lead.nome,
              status: status,
            })
          })
          
          if (response.ok) {
            toast.success(
              status === "veio" 
                ? "Cliente marcado como presente e movido no Kommo!" 
                : "Cliente marcado como ausente e movido no Kommo!"
            )
          } else {
            toast.success(
              status === "veio" 
                ? "Cliente marcado como presente!" 
                : "Cliente marcado como ausente"
            )
            console.error("Erro ao mover no Kommo")
          }
        } catch (kommoError) {
          console.error("Erro ao mover no Kommo:", kommoError)
          toast.success(
            status === "veio" 
              ? "Cliente marcado como presente!" 
              : "Cliente marcado como ausente"
          )
        }
      } else {
        toast.success(
          status === "veio" 
            ? "Cliente marcado como presente!" 
            : status === "nao" 
              ? "Cliente marcado como ausente" 
              : "Status resetado"
        )
      }
    } catch {
      toast.error("Erro ao atualizar status")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteLead(id)
      toast.success("Lead removido com sucesso")
    } catch {
      toast.error("Erro ao remover lead")
    }
  }

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (id: string, data: {
    nome: string
    data: string
    hora: string
    responsavel: string
    tipo: string
    kommo_id?: string
  }) => {
    try {
      await updateLead(id, data)
      toast.success("Lead atualizado com sucesso!")
    } catch {
      toast.error("Erro ao atualizar lead")
      throw new Error("Erro ao atualizar lead")
    }
  }

  const handleCreateLead = async (data: {
    nome: string
    data: string
    hora: string
    responsavel: string
    tipo: string
    kommo_id?: string
  }) => {
    try {
      await createLead({
        ...data,
        kommo_id: data.kommo_id || null,
        status: "pending",
      })
      toast.success("Lead criado com sucesso!")
    } catch {
      toast.error("Erro ao criar lead")
      throw new Error("Erro ao criar lead")
    }
  }

  return (
    <div className="relative min-h-screen bg-[#080808] z-[1] max-w-[1440px] mx-auto">
      <Header
        weekLabel={weekLabel}
        onPrevWeek={() => setWeekOffset((w) => w - 1)}
        onNextWeek={() => setWeekOffset((w) => w + 1)}
        onNewLead={() => setIsModalOpen(true)}
      />

      <StatsCards stats={stats} />

      {/* Filtro por Equipe e Estatísticas */}
      {equipes.length > 0 && (
        <div className="px-4 md:px-6 mb-4">
          <div className="bg-[#191919] border border-[rgba(212,175,55,0.1)] rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] text-[#8a8070] uppercase tracking-wider font-medium">Filtrar por equipe:</span>
              <button
                onClick={() => setSelectedEquipe(null)}
                className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
                  selectedEquipe === null
                    ? "bg-[#d4af37] text-[#080808] border-[#d4af37] font-semibold"
                    : "bg-transparent text-[#f5f0e8] border-[rgba(212,175,55,0.2)] hover:border-[rgba(212,175,55,0.4)]"
                }`}
              >
                Todas
              </button>
              {equipes.map(equipe => (
                <button
                  key={equipe}
                  onClick={() => setSelectedEquipe(equipe)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
                    selectedEquipe === equipe
                      ? "bg-[#d4af37] text-[#080808] border-[#d4af37] font-semibold"
                      : "bg-transparent text-[#f5f0e8] border-[rgba(212,175,55,0.2)] hover:border-[rgba(212,175,55,0.4)]"
                  }`}
                >
                  {equipe}
                </button>
              ))}
            </div>
            
            {/* Estatísticas por Equipe */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(statsByEquipe).map(([equipe, estatisticas]) => (
                <div 
                  key={equipe}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedEquipe === equipe 
                      ? "bg-[rgba(212,175,55,0.1)] border-[#d4af37]" 
                      : "bg-[#0d0d0d] border-[rgba(212,175,55,0.05)] hover:border-[rgba(212,175,55,0.2)]"
                  }`}
                  onClick={() => setSelectedEquipe(selectedEquipe === equipe ? null : equipe)}
                >
                  <p className="text-[11px] text-[#d4af37] font-semibold truncate mb-1">{equipe}</p>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-[#f5f0e8]">{estatisticas.total} total</span>
                    <span className="text-[#4ade80]">{estatisticas.veio} veio</span>
                    <span className="text-[#f87171]">{estatisticas.nao} faltou</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!mounted || isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <div className="px-4 md:px-6 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {weekDays.map((day) => (
              <DayColumn
                key={day.date.toISOString()}
                day={day}
                leads={filteredLeads}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      <NewLeadModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateLead}
        defaultDate={dateRange.start}
      />

      <EditLeadModal
        open={isEditModalOpen}
        lead={editingLead}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingLead(null)
        }}
        onSubmit={handleEditSubmit}
      />
    </div>
  )
}
