"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Star, 
  ChevronDown, 
  ChevronUp,
  User,
  Clock,
  FileText,
  Loader2
} from "lucide-react"
import { AudioRecorder } from "./audio-recorder"
import { cn } from "@/lib/utils"

interface Atendimento {
  id: string
  lead_id: number
  kommo_id: string
  nome_lead: string
  responsavel: string
  equipe: string
  audio_url: string | null
  duracao_segundos: number | null
  transcricao_completa: string | null
  resumo: string | null
  motivo_nao_fechamento: string | null
  score_geral: number | null
  score_abordagem: number | null
  score_financiamento: number | null
  score_consorcio: number | null
  score_fechamento: number | null
  pontos_positivos: string[] | null
  pontos_criticos: string[] | null
  feedback_coaching: string | null
  status: string
  fechou: boolean
  is_benchmark: boolean
  data_atendimento: string
  created_at: string
}

interface AtendimentoCardProps {
  atendimento: Atendimento
  onUpdate: () => void
}

export function AtendimentoCard({ atendimento, onUpdate }: AtendimentoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showRecorder, setShowRecorder] = useState(false)
  const [markingResult, setMarkingResult] = useState<"fechou" | "nao_fechou" | null>(null)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-white/50"
    if (score >= 8) return "text-emerald-400"
    if (score >= 6) return "text-amber-400"
    return "text-red-400"
  }

  const handleMarkResult = async (fechou: boolean) => {
    setMarkingResult(fechou ? "fechou" : "nao_fechou")
    try {
      await fetch(`/api/atendimentos/${atendimento.id}/resultado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechou }),
      })
      onUpdate()
    } catch (err) {
      console.error("Erro ao marcar resultado:", err)
    } finally {
      setMarkingResult(null)
    }
  }

  const isAguardando = atendimento.status === "aguardando"
  const isProcessando = atendimento.status === "processando" || atendimento.status === "gravando"
  const isConcluido = atendimento.status === "concluido"

  return (
    <Card className={cn(
      "bg-[#12121a] border-white/10 overflow-hidden transition-all",
      atendimento.fechou && "border-emerald-500/30",
      atendimento.is_benchmark && "ring-2 ring-amber-500/50"
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-white">{atendimento.nome_lead}</h3>
            <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
              <User className="w-3 h-3" />
              {atendimento.responsavel}
              <span className="text-white/30">|</span>
              <Clock className="w-3 h-3" />
              {formatDate(atendimento.data_atendimento)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {atendimento.is_benchmark && (
              <Badge className="bg-amber-500/20 text-amber-400 border-0">
                <Star className="w-3 h-3 mr-1" />
                Benchmark
              </Badge>
            )}
            {isConcluido && (
              <Badge className={cn(
                "border-0",
                atendimento.fechou 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/20 text-red-400"
              )}>
                {atendimento.fechou ? "Fechou" : "Nao Fechou"}
              </Badge>
            )}
          </div>
        </div>

        {/* Score geral */}
        {atendimento.score_geral !== null && (
          <div className="flex items-center gap-4 mb-3 p-2 rounded-lg bg-white/5">
            <div className="text-center">
              <p className={cn("text-2xl font-bold", getScoreColor(atendimento.score_geral))}>
                {atendimento.score_geral.toFixed(1)}
              </p>
              <p className="text-[10px] text-white/40">GERAL</p>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-2 text-center">
              <div>
                <p className={cn("text-sm font-semibold", getScoreColor(atendimento.score_abordagem))}>
                  {atendimento.score_abordagem?.toFixed(1) || "-"}
                </p>
                <p className="text-[9px] text-white/40">Abordagem</p>
              </div>
              <div>
                <p className={cn("text-sm font-semibold", getScoreColor(atendimento.score_financiamento))}>
                  {atendimento.score_financiamento?.toFixed(1) || "-"}
                </p>
                <p className="text-[9px] text-white/40">Financ.</p>
              </div>
              <div>
                <p className={cn("text-sm font-semibold", getScoreColor(atendimento.score_consorcio))}>
                  {atendimento.score_consorcio?.toFixed(1) || "-"}
                </p>
                <p className="text-[9px] text-white/40">Consorcio</p>
              </div>
              <div>
                <p className={cn("text-sm font-semibold", getScoreColor(atendimento.score_fechamento))}>
                  {atendimento.score_fechamento?.toFixed(1) || "-"}
                </p>
                <p className="text-[9px] text-white/40">Fecham.</p>
              </div>
            </div>
          </div>
        )}

        {/* Resumo */}
        {atendimento.resumo && (
          <p className="text-sm text-white/70 mb-3 line-clamp-2">{atendimento.resumo}</p>
        )}

        {/* Motivo nao fechamento */}
        {atendimento.motivo_nao_fechamento && !atendimento.fechou && (
          <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400 font-medium">Motivo nao fechamento:</p>
            <p className="text-sm text-white/70 mt-1">{atendimento.motivo_nao_fechamento}</p>
          </div>
        )}

        {/* Acoes - Aguardando */}
        {isAguardando && !showRecorder && (
          <Button
            onClick={() => setShowRecorder(true)}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            <Mic className="w-4 h-4 mr-2" />
            Gravar Reuniao
          </Button>
        )}

        {/* Gravador de audio */}
        {showRecorder && isAguardando && (
          <AudioRecorder
            atendimentoId={atendimento.id}
            onComplete={() => {
              setShowRecorder(false)
              onUpdate()
            }}
            onCancel={() => setShowRecorder(false)}
          />
        )}

        {/* Processando */}
        {isProcessando && (
          <div className="flex items-center justify-center gap-2 py-4 text-blue-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Processando transcricao...</span>
          </div>
        )}

        {/* Acoes - Concluido sem resultado */}
        {isConcluido && !atendimento.fechou && atendimento.fechou === null && (
          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => handleMarkResult(true)}
              disabled={markingResult !== null}
              className="flex-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0"
            >
              {markingResult === "fechou" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Fechou
                </>
              )}
            </Button>
            <Button
              onClick={() => handleMarkResult(false)}
              disabled={markingResult !== null}
              className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0"
            >
              {markingResult === "nao_fechou" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1" />
                  Nao Fechou
                </>
              )}
            </Button>
          </div>
        )}

        {/* Expandir detalhes */}
        {isConcluido && (atendimento.pontos_positivos || atendimento.feedback_coaching) && (
          <Button
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 text-white/50 hover:text-white hover:bg-white/5"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Ocultar detalhes
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Ver detalhes da analise
              </>
            )}
          </Button>
        )}

        {/* Detalhes expandidos */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
            {/* Pontos positivos */}
            {atendimento.pontos_positivos && atendimento.pontos_positivos.length > 0 && (
              <div>
                <p className="text-xs text-emerald-400 font-medium mb-2">Pontos Positivos:</p>
                <ul className="space-y-1">
                  {atendimento.pontos_positivos.map((ponto, i) => (
                    <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400 mt-1 flex-shrink-0" />
                      {ponto}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pontos criticos */}
            {atendimento.pontos_criticos && atendimento.pontos_criticos.length > 0 && (
              <div>
                <p className="text-xs text-red-400 font-medium mb-2">Pontos a Melhorar:</p>
                <ul className="space-y-1">
                  {atendimento.pontos_criticos.map((ponto, i) => (
                    <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                      <XCircle className="w-3 h-3 text-red-400 mt-1 flex-shrink-0" />
                      {ponto}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Feedback coaching */}
            {atendimento.feedback_coaching && (
              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <p className="text-xs text-violet-400 font-medium mb-1">Feedback para o vendedor:</p>
                <p className="text-sm text-white/70">{atendimento.feedback_coaching}</p>
              </div>
            )}

            {/* Audio */}
            {atendimento.audio_url && (
              <div>
                <p className="text-xs text-white/50 mb-2">
                  Audio ({atendimento.duracao_segundos ? formatDuration(atendimento.duracao_segundos) : "-"})
                </p>
                <audio controls className="w-full h-10" src={atendimento.audio_url} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
