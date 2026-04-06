"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Header } from "@/components/quadro/header"
import { StatsCards } from "@/components/quadro/stats-cards"
import { DayColumn } from "@/components/quadro/day-column"
import { NewLeadModal } from "@/components/quadro/new-lead-modal"
import { useLeads } from "@/hooks/use-leads"
import { getWeekDays, getWeekRange } from "@/lib/date-utils"
import { Spinner } from "@/components/ui/spinner"

export default function QuadroReunioes() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { start, end } = getWeekRange(weekOffset)
  const { leads, isLoading, createLead, updateLead, deleteLead } = useLeads(start, end)
  const weekDays = getWeekDays(weekOffset)

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
      toast.success(
        status === "veio" 
          ? "Cliente marcado como presente!" 
          : status === "nao" 
            ? "Cliente marcado como ausente" 
            : "Status resetado"
      )
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
    <div className="min-h-screen bg-background">
      <Header
        weekOffset={weekOffset}
        onPrevWeek={() => setWeekOffset((w) => w - 1)}
        onNextWeek={() => setWeekOffset((w) => w + 1)}
        onNewLead={() => setIsModalOpen(true)}
      />

      <StatsCards stats={stats} />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <div className="px-4 md:px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 overflow-x-auto">
            {weekDays.map((day) => (
              <DayColumn
                key={day.date.toISOString()}
                day={day}
                leads={leads}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      <NewLeadModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateLead}
      />
    </div>
  )
}
