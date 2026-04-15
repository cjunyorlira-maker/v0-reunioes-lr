"use client"

import { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { Header } from "@/components/quadro/header"
import { StatsCards } from "@/components/quadro/stats-cards"
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
  const [testCelebration, setTestCelebration] = useState(false)

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

  // Sincronização automática com Kommo a cada 5 minutos
  // Sincronização automática removida - agora é apenas manual via botão de refresh no card

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

      {/* BOTAO TEMPORARIO - Testar celebracao de meta */}
      <button
        onClick={() => setTestCelebration(true)}
        className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-xs font-bold text-black"
        style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)", boxShadow: "0 0 15px rgba(251,191,36,0.5)" }}
      >
        Testar Meta Amanda
      </button>

      {/* Celebracao de meta - teste */}
      {testCelebration && (
        <TestMetaCelebration onClose={() => setTestCelebration(false)} />
      )}

      <Header
        weekLabel={weekLabel}
        onPrevWeek={() => setWeekOffset((w) => w - 1)}
        onNextWeek={() => setWeekOffset((w) => w + 1)}
        onNewLead={() => setIsModalOpen(true)}
      />

      <StatsCards stats={stats} />

      {/* Filtro por Equipe */}
      {equipes.length > 0 && (
        <div className="px-4 md:px-6 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-[#8a8070] uppercase tracking-wider font-semibold mr-1">Equipe:</span>
            <button
              onClick={() => setSelectedEquipe(null)}
              className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                selectedEquipe === null
                  ? "bg-[#d4af37] text-[#0a0a0a] border-[#d4af37] font-semibold"
                  : "bg-transparent text-[#8a8070] border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.3)] hover:text-[#f5f0e8]"
              }`}
            >
              Todas
            </button>
            {equipes.map(equipe => (
              <button
                key={equipe}
                onClick={() => setSelectedEquipe(equipe)}
                className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                  selectedEquipe === equipe
                    ? "bg-[#d4af37] text-[#0a0a0a] border-[#d4af37] font-semibold"
                    : "bg-transparent text-[#8a8070] border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.3)] hover:text-[#f5f0e8]"
                }`}
              >
                {equipe}
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

// Componente de celebracao de meta - TEMPORARIO PARA TESTE
function TestMetaCelebration({ onClose }: { onClose: () => void }) {
  const [audioPlayed, setAudioPlayed] = useState(false)

  useEffect(() => {
    // Som de buzina via Web Audio API
    if (!audioPlayed) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const playHorn = (time: number) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = "sawtooth"
          osc.frequency.setValueAtTime(220, ctx.currentTime + time)
          osc.frequency.setValueAtTime(330, ctx.currentTime + time + 0.2)
          osc.frequency.setValueAtTime(220, ctx.currentTime + time + 0.4)
          gain.gain.setValueAtTime(0.4, ctx.currentTime + time)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.6)
          osc.start(ctx.currentTime + time)
          osc.stop(ctx.currentTime + time + 0.6)
        }
        playHorn(0); playHorn(0.7); playHorn(1.4); playHorn(2.1); playHorn(2.8)
        setAudioPlayed(true)
      } catch (e) {}
    }

    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose, audioPlayed])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Fogos de artifício SVG animados */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600">
        {[
          { cx: 150, cy: 100, color: "#f472b6", delay: 0 },
          { cx: 650, cy: 80, color: "#60a5fa", delay: 0.2 },
          { cx: 400, cy: 60, color: "#fbbf24", delay: 0.4 },
          { cx: 100, cy: 250, color: "#34d399", delay: 0.6 },
          { cx: 700, cy: 220, color: "#f472b6", delay: 0.8 },
          { cx: 300, cy: 150, color: "#a78bfa", delay: 1.0 },
          { cx: 550, cy: 300, color: "#fb923c", delay: 0.3 },
          { cx: 200, cy: 400, color: "#f472b6", delay: 0.5 },
          { cx: 600, cy: 380, color: "#60a5fa", delay: 0.7 },
          { cx: 350, cy: 480, color: "#fbbf24", delay: 0.9 },
          { cx: 500, cy: 120, color: "#ef4444", delay: 1.1 },
          { cx: 250, cy: 320, color: "#22d3ee", delay: 1.3 },
        ].map((fw, i) => (
          <g key={i}>
            {Array.from({ length: 16 }).map((_, j) => {
              const angle = (j * 22.5 * Math.PI) / 180
              const len = 50 + Math.random() * 40
              return (
                <line
                  key={j}
                  x1={fw.cx}
                  y1={fw.cy}
                  x2={fw.cx + Math.cos(angle) * len}
                  y2={fw.cy + Math.sin(angle) * len}
                  stroke={fw.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{
                    animation: `firework 1.2s ease-out infinite`,
                    animationDelay: `${fw.delay + j * 0.02}s`
                  }}
                />
              )
            })}
            <circle cx={fw.cx} cy={fw.cy} r="8" fill={fw.color} style={{
              animation: `pulse 0.8s ease-out infinite`,
              animationDelay: `${fw.delay}s`
            }} />
          </g>
        ))}
      </svg>

      {/* Card central */}
      <div className="relative z-10 flex flex-col items-center animate-[zoomIn_0.5s_ease-out]">
        <div className="text-6xl mb-4">🏆</div>
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: "rgba(244,114,182,0.4)" }} />
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/amanda-A8MBCF4rdXyJwhPF9LbAk9E51hAqbr.jpg"
            alt="Amanda Souza"
            className="relative w-40 h-40 rounded-full object-cover shadow-2xl"
            style={{ border: "5px solid #f472b6", boxShadow: "0 0 40px rgba(244,114,182,0.6)" }}
          />
        </div>
        <h2 className="text-4xl font-black text-white mt-6 drop-shadow-lg">AMANDA SOUZA</h2>
        <p className="text-2xl font-bold mt-2" style={{ color: "#fbbf24" }}>BATEU A META!</p>
        <div className="flex gap-2 mt-4">
          <span className="px-4 py-2 rounded-full text-lg font-bold" style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)", color: "black" }}>
            10 Qualificados
          </span>
        </div>
        <p className="text-white/40 text-sm mt-6">Grand Prix LR</p>
      </div>

      <style>{`
        @keyframes firework {
          0% { stroke-dasharray: 0 100; opacity: 1; }
          50% { stroke-dasharray: 50 50; opacity: 1; }
          100% { stroke-dasharray: 100 0; opacity: 0; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.3); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
