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

  const stats = useMemo(() => {
    return {
      total: leads.length,
      veio: leads.filter((l) => l.status === "veio").length,
      nao: leads.filter((l) => l.status === "nao").length,
      pending: leads.filter((l) => l.status === "pending").length,
    }
  }, [leads])

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
                leads={leads}
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
