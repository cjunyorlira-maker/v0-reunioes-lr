"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Header } from "@/components/quadro/header"
import { StatsCards } from "@/components/quadro/stats-cards"
import { SalesDashboard } from "@/components/quadro/sales-dashboard"
import { DayColumn } from "@/components/quadro/day-column"
import { NewLeadModal } from "@/components/quadro/new-lead-modal"
import { EditLeadModal } from "@/components/quadro/edit-lead-modal"
import { AtendenteModal } from "@/components/quadro/atendente-modal"
import { RemarcarModal } from "@/components/quadro/remarcar-modal"
import { NextWeekPreview } from "@/components/quadro/next-week-preview"
import { AnalyticsDashboard } from "@/components/quadro/analytics-dashboard"
import type { Lead } from "@/lib/types"
import { useLeads } from "@/hooks/use-leads"
import { getWeekDays, getWeekRange, getWeekLabel } from "@/lib/date-utils"
import { Spinner } from "@/components/ui/spinner"
import { Confetti } from "@/components/ui/confetti"
import type { WeekDay } from "@/lib/types"
import { getFotoVendedor } from "@/lib/vendedor-fotos"

export default function QuadroReunioes() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [mounted, setMounted] = useState(false)
  const [weekDays, setWeekDays] = useState<WeekDay[]>([])
  const [weekLabel, setWeekLabel] = useState("")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [nextWeekRange, setNextWeekRange] = useState({ start: "", end: "" })
  const [selectedEquipe, setSelectedEquipe] = useState<string | null>(null)
  const [isAtendenteModalOpen, setIsAtendenteModalOpen] = useState(false)
  const [pendingVeioLead, setPendingVeioLead] = useState<Lead | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isRemarcarModalOpen, setIsRemarcarModalOpen] = useState(false)
  const [pendingRemarcarLead, setPendingRemarcarLead] = useState<Lead | null>(null)
  const [agendamentoCelebration, setAgendamentoCelebration] = useState<{ nome: string; foto?: string } | null>(null)


  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      setWeekDays(getWeekDays(weekOffset))
      setWeekLabel(getWeekLabel(weekOffset))
      setDateRange(getWeekRange(weekOffset))
      setNextWeekRange(getWeekRange(weekOffset + 1))
    }
  }, [weekOffset, mounted])

  const { leads, isLoading, createLead, updateLead, deleteLead, mutate } = useLeads(dateRange.start, dateRange.end)
  const { leads: nextWeekLeads } = useLeads(nextWeekRange.start, nextWeekRange.end)
  
  // Busca TODOS os leads para calcular Agendei corretamente (usa data_agendei - igual ao dashboard)
  const { data: allLeadsData } = useSWR<Lead[]>(`/api/leads`, (url: string) => fetch(url).then(res => res.json()), { refreshInterval: 30000 })
  const allLeads = allLeadsData || []

  // TOP 1 Agendei (usa data_agendei no período da semana - igual ao dashboard)
  const top1Agendei = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return null
    const count: Record<string, { total: number; foto?: string }> = {}
    allLeads.forEach((lead: Lead) => {
      const agendeiDate = (lead as any).data_agendei
      if (!agendeiDate) return
      if (agendeiDate < dateRange.start || agendeiDate > dateRange.end) return
      
      const nome = lead.responsavel || "Sem nome"
      if (!count[nome]) count[nome] = { total: 0, foto: lead.foto_responsavel || getFotoVendedor(nome) || undefined }
      count[nome].total++
    })
    const sorted = Object.entries(count).sort((a, b) => b[1].total - a[1].total)
    if (sorted.length === 0) return null
    return { nome: sorted[0][0], total: sorted[0][1].total, foto: sorted[0][1].foto }
  }, [allLeads, dateRange])

  // TOP 1 Veio (mais clientes que vieram por responsavel na semana)
  const top1Veio = useMemo(() => {
    const count: Record<string, { total: number; foto?: string }> = {}
    leads.filter(l => l.status === "veio").forEach(lead => {
      const nome = lead.responsavel || "Sem nome"
      if (!count[nome]) count[nome] = { total: 0, foto: lead.foto_responsavel || getFotoVendedor(nome) || undefined }
      count[nome].total++
    })
    const sorted = Object.entries(count).sort((a, b) => b[1].total - a[1].total)
    if (sorted.length === 0) return null
    return { nome: sorted[0][0], total: sorted[0][1].total, foto: sorted[0][1].foto }
  }, [leads])

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

  const handleUpdateStatus = async (id: string, status: "veio" | "nao" | "pending" | "remarcou") => {
    // Se for "veio", abre o modal para selecionar o atendente
    if (status === "veio") {
      const lead = leads.find(l => l.id === id)
      if (lead) {
        setPendingVeioLead(lead)
        setIsAtendenteModalOpen(true)
      }
      return
    }
    
    // Se for "remarcou", abre o modal para selecionar nova data/hora
    if (status === "remarcou") {
      const lead = leads.find(l => l.id === id)
      if (lead) {
        setPendingRemarcarLead(lead)
        setIsRemarcarModalOpen(true)
      }
      return
    }
    
    try {
      await updateLead(id, { status: status as "veio" | "nao" | "pending" })
      
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
              atendente: lead.atendente || null,
              data_reuniao: lead.data, // Envia a data da reunião para preencher no Kommo
            })
          })
          
          const toastMessages = {
            veio: "Cliente marcado como presente e movido no Kommo!",
            nao: "Cliente marcado como ausente e movido no Kommo!",
          }
          
          if (response.ok) {
            const responseData = await response.json()
            toast.success(status === "veio" ? toastMessages.veio : toastMessages.nao)
            
            // Chama a API para atualizar a data após 5 segundos (para sobrescrever o bot do Kommo)
            if (lead.data && responseData.leadId) {
              setTimeout(async () => {
                try {
                  await fetch("/api/kommo/update-date", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      leadId: responseData.leadId,
                      data_reuniao: lead.data,
                      tipo: status,
                    })
                  })
                } catch (err) {
                  console.error("Erro ao atualizar data após delay:", err)
                }
              }, 5000) // 5 segundos de delay
            }
          } else {
            toast.success(status === "veio" ? "Cliente marcado como presente!" : "Cliente marcado como ausente")
            console.error("Erro ao mover no Kommo")
          }
        } catch (kommoError) {
          console.error("Erro ao mover no Kommo:", kommoError)
          toast.success(status === "veio" ? "Cliente marcado como presente!" : "Cliente marcado como ausente")
        }
      } else {
        toast.success(status === "veio" ? "Cliente marcado como presente!" : status === "nao" ? "Cliente marcado como ausente" : "Status resetado")
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

  const handleSync = async (id: string) => {
    const lead = leads.find(l => l.id === id)
    if (!lead) return
    
    toast.loading("Sincronizando com Kommo...", { id: "sync" })
    
    try {
      const response = await fetch("/api/kommo/sync-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: id,
          kommo_lead_id: lead.kommo_lead_id,
          nome: lead.nome,
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Recarrega os leads para mostrar os dados atualizados
        await mutate()
        
        // Se a data mudou para fora do período atual, avisa o usuário
        if (data.novaData && (data.novaData < dateRange.start || data.novaData > dateRange.end)) {
          toast.success(`Lead sincronizado! A nova data (${data.novaData}) está em outra semana. Navegue para visualizar.`, { id: "sync", duration: 5000 })
        } else {
          toast.success(data.message || "Lead sincronizado com sucesso!", { id: "sync" })
        }
      } else {
        toast.error(data.error || "Erro ao sincronizar", { id: "sync" })
      }
    } catch (error) {
      console.error("Erro ao sincronizar:", error)
      toast.error("Erro ao sincronizar com Kommo", { id: "sync" })
    }
  }

  const handleVeioWithAtendente = async (atendente: string, atendenteId?: number) => {
    if (!pendingVeioLead) return
    
    const lead = pendingVeioLead
    setIsAtendenteModalOpen(false)
    setPendingVeioLead(null)
    
    try {
      // Atualiza o lead com o atendente e status veio
      await updateLead(lead.id, { status: "veio", atendente })
      
      // Move o lead no Kommo
      try {
        const response = await fetch("/api/kommo/move-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kommo_id: lead.kommo_id,
            kommo_lead_id: lead.kommo_lead_id,
            nome: lead.nome,
            status: "veio",
            atendente: atendente,
            atendenteId: atendenteId, // ID do enum para o campo de seleção
            data_reuniao: lead.data,
          })
        })
        
        if (response.ok) {
          const responseData = await response.json()
          toast.success(`Cliente marcado como presente! Atendente: ${atendente}`)
          
          // Chama a API para atualizar a data após 5 segundos
          if (lead.data && responseData.leadId) {
            setTimeout(async () => {
              try {
                await fetch("/api/kommo/update-date", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    leadId: responseData.leadId,
                    data_reuniao: lead.data,
                    tipo: "veio",
                  })
                })
              } catch (err) {
                console.error("Erro ao atualizar data após delay:", err)
              }
            }, 5000)
          }
        } else {
          toast.success(`Cliente marcado como presente! Atendente: ${atendente}`)
        }
      } catch (kommoError) {
        console.error("Erro ao mover no Kommo:", kommoError)
        toast.success(`Cliente marcado como presente! Atendente: ${atendente}`)
      }
    } catch {
      toast.error("Erro ao atualizar status")
    }
  }

  const handleRemarcarWithDate = async (novaData: string, novaHora: string) => {
    if (!pendingRemarcarLead) return
    
    const lead = pendingRemarcarLead
    setIsRemarcarModalOpen(false)
    setPendingRemarcarLead(null)
    
    try {
      // Atualiza o lead com a nova data/hora e marca como remarcado
      await updateLead(lead.id, { 
        data: novaData, 
        hora: novaHora, 
        remarcado: true, 
        status: "pending" 
      })
      
      // Move o lead no Kommo para etapa Remarcados e preenche o campo remarcado
      try {
        const response = await fetch("/api/kommo/move-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kommo_id: lead.kommo_id,
            kommo_lead_id: lead.kommo_lead_id,
            nome: lead.nome,
            status: "remarcou",
            data_reuniao: novaData,
            hora_reuniao: novaHora,
          })
        })
        
        if (response.ok) {
          toast.success(`Reunião remarcada para ${novaData} às ${novaHora}!`)
        } else {
          toast.success("Reunião remarcada com sucesso!")
        }
      } catch (kommoError) {
        console.error("Erro ao mover no Kommo:", kommoError)
        toast.success("Reunião remarcada com sucesso!")
      }
    } catch {
      toast.error("Erro ao remarcar reunião")
    }
  }

  const handleRemoveRemarcado = async (id: string) => {
    try {
      await updateLead(id, { remarcado: false })
      toast.success("Tag remarcado removida")
    } catch {
      toast.error("Erro ao remover tag")
    }
  }

  const handleVendaFechada = async (id: string) => {
    try {
      const lead = leads.find(l => l.id === id)
      const newValue = !lead?.venda_fechada
      await updateLead(id, { venda_fechada: newValue })
      setShowConfetti(newValue)
      toast.success(newValue ? "Venda fechada registrada!" : "Venda fechada removida")
    } catch {
      toast.error("Erro ao atualizar venda fechada")
    }
  }

  const handleRetorno = async (id: string) => {
    try {
      const lead = leads.find(l => l.id === id)
      const newValue = !lead?.retorno
      await updateLead(id, { retorno: newValue })
      toast.success(newValue ? "Cliente marcado como retorno" : "Retorno removido")
    } catch {
      toast.error("Erro ao atualizar retorno")
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
    <div className="relative min-h-screen bg-[#0a0a0a] z-[1]">
      {/* Efeito de fogos quando fecha venda */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Celebracao de agendamento */}
      {agendamentoCelebration && (
        <AgendamentoCelebration
          nome={agendamentoCelebration.nome}
          foto={agendamentoCelebration.foto}
          onClose={() => setAgendamentoCelebration(null)}
        />
      )}

      <Header
        weekLabel={weekLabel}
        onPrevWeek={() => setWeekOffset((w) => w - 1)}
        onNextWeek={() => setWeekOffset((w) => w + 1)}
        onNewLead={() => setIsModalOpen(true)}
      />

      <StatsCards 
        stats={stats} 
        top1Agendei={mounted && !isLoading ? top1Agendei : null}
        top1Veio={mounted && !isLoading ? top1Veio : null}
      />

      {/* Sales Dashboard */}
      <SalesDashboard />

      {/* Filtro por Equipe */}
      {equipes.length > 0 && (
        <div className="px-4 md:px-6 mb-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] text-[#8a8070] uppercase tracking-wider font-semibold mr-1">Equipe:</span>
            <button
              onClick={() => setSelectedEquipe(null)}
              className={`text-[11px] px-4 py-2 rounded-xl border font-semibold transition-all duration-300 backdrop-blur-sm overflow-hidden relative group ${
                selectedEquipe === null
                  ? "bg-gradient-to-r from-[#d4af37] to-[#c9a227] text-[#0a0a0a] border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  : "bg-transparent text-[#8a8070] border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.4)] hover:text-[#f5f0e8] hover:bg-white/[0.03]"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 opacity-0 group-hover:opacity-100" />
              <span className="relative z-10">Todas</span>
            </button>
            {equipes.map(equipe => (
              <button
                key={equipe}
                onClick={() => setSelectedEquipe(equipe)}
                className={`text-[11px] px-4 py-2 rounded-xl border font-semibold transition-all duration-300 backdrop-blur-sm overflow-hidden relative group ${
                  selectedEquipe === equipe
                    ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                    : "bg-transparent text-[#8a8070] border-[rgba(212,175,55,0.15)] hover:border-violet-500/40 hover:text-[#f5f0e8] hover:bg-violet-500/5"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 opacity-0 group-hover:opacity-100" />
                <span className="relative z-10">{equipe}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!mounted || isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <div className="px-4 md:px-6 pb-6 overflow-x-auto">
          <div className="flex gap-3" style={{ minWidth: "fit-content" }}>
            {weekDays.map((day) => (
              <DayColumn
                key={day.date.toISOString()}
                day={day}
                leads={filteredLeads}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onSync={handleSync}
                onRemoveRemarcado={handleRemoveRemarcado}
                onVendaFechada={handleVendaFechada}
                onRetorno={handleRetorno}
              />
            ))}
          </div>
        </div>
      )}

      {/* Preview da Próxima Semana */}
      {mounted && !isLoading && (
        <NextWeekPreview
          leads={nextWeekLeads}
          onNavigateToWeek={() => setWeekOffset(w => w + 1)}
        />
      )}

      {/* Dashboard de Analytics */}
      {mounted && !isLoading && (
        <AnalyticsDashboard
          leads={leads}
          weekLabel={weekLabel}
          dateRange={dateRange}
        />
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

      <AtendenteModal
        open={isAtendenteModalOpen}
        onClose={() => {
          setIsAtendenteModalOpen(false)
          setPendingVeioLead(null)
        }}
        onConfirm={handleVeioWithAtendente}
        leadNome={pendingVeioLead?.nome || ""}
      />

      <RemarcarModal
        open={isRemarcarModalOpen}
        onClose={() => {
          setIsRemarcarModalOpen(false)
          setPendingRemarcarLead(null)
        }}
        onConfirm={handleRemarcarWithDate}
        leadNome={pendingRemarcarLead?.nome || ""}
        currentData={pendingRemarcarLead?.data || ""}
        currentHora={pendingRemarcarLead?.hora || ""}
      />
    </div>
  )
}

// Celebracao de agendamento - canvas com confete azul/ciano
function AgendamentoCelebration({ nome, foto, onClose }: { nome: string; foto?: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [audioPlayed, setAudioPlayed] = useState(false)

  useEffect(() => {
    // Som de sino/notificacao animado
    if (!audioPlayed) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const playChime = (time: number, freq: number) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = "sine"
          osc.frequency.setValueAtTime(freq, ctx.currentTime + time)
          gain.gain.setValueAtTime(0.3, ctx.currentTime + time)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.8)
          osc.start(ctx.currentTime + time)
          osc.stop(ctx.currentTime + time + 0.8)
        }
        // Melodia de agendamento (acordes ascendentes)
        playChime(0,    523) // Do
        playChime(0.15, 659) // Mi
        playChime(0.3,  784) // Sol
        playChime(0.5,  1047) // Do alto
        playChime(1.2,  523)
        playChime(1.35, 659)
        playChime(1.5,  784)
        playChime(1.7,  1047)
        playChime(2.8,  784)
        playChime(2.95, 1047)
        playChime(3.1,  1319)
        setAudioPlayed(true)
      } catch (e) {}
    }
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose, audioPlayed])

  // Canvas confete
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    interface Piece {
      x: number; y: number; vx: number; vy: number
      color: string; size: number; angle: number; spin: number; shape: "rect" | "circle"
    }

    const colors = ["#22d3ee","#38bdf8","#60a5fa","#3b82f6","#6366f1","#a5f3fc","#e0f2fe","#ffffff","#34d399","#86efac"]
    const pieces: Piece[] = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 8,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.15,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }))

    let frame: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.angle += p.spin
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.y > canvas.height * 0.85 ? 1 - (p.y - canvas.height * 0.85) / (canvas.height * 0.15) : 1
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width }
      })
      frame = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frame)
  }, [])

  const primeiroNome = nome.split(" ")[0]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/65" />

      {/* Confete canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Card central */}
      <div className="relative z-10 flex flex-col items-center" style={{ animation: "zoomIn 0.4s ease-out" }}>
        {/* Icone calendario */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-2xl"
          style={{ background: "linear-gradient(135deg, #22d3ee, #3b82f6)", boxShadow: "0 0 40px rgba(34,211,238,0.5)" }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="6" width="24" height="22" rx="3" fill="white" opacity="0.15" stroke="white" strokeWidth="2" />
            <line x1="4" y1="13" x2="28" y2="13" stroke="white" strokeWidth="2" />
            <line x1="10" y1="3" x2="10" y2="9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="22" y1="3" x2="22" y2="9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="11" cy="20" r="2" fill="white" />
            <circle cx="16" cy="20" r="2" fill="white" />
            <circle cx="21" cy="20" r="2" fill="white" />
          </svg>
        </div>

        {/* Foto do vendedor */}
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full blur-2xl opacity-60" style={{ background: "rgba(34,211,238,0.5)" }} />
          {foto ? (
            <img
              src={foto}
              alt={nome}
              className="relative w-36 h-36 rounded-full object-cover shadow-2xl"
              style={{ border: "4px solid #22d3ee", boxShadow: "0 0 35px rgba(34,211,238,0.6)" }}
            />
          ) : (
            <div
              className="relative w-36 h-36 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-2xl"
              style={{ background: "linear-gradient(135deg, #22d3ee, #3b82f6)", border: "4px solid #22d3ee" }}
            >
              {primeiroNome.charAt(0)}
            </div>
          )}
        </div>

        {/* Texto */}
        <h2 className="text-4xl font-black text-white drop-shadow-lg tracking-wide">{nome.toUpperCase()}</h2>
        <p className="text-2xl font-bold mt-2" style={{ color: "#22d3ee" }}>AGENDAMENTO CONFIRMADO!</p>
        <div
          className="mt-4 px-6 py-2 rounded-full text-base font-bold"
          style={{ background: "linear-gradient(135deg, #22d3ee, #3b82f6)", color: "white", boxShadow: "0 0 20px rgba(34,211,238,0.4)" }}
        >
          + 1 Agendamento
        </div>
        <p className="text-white/30 text-sm mt-5">Grand Prix LR</p>
      </div>

      <style>{`
        @keyframes zoomIn {
          from { transform: scale(0.3); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}


