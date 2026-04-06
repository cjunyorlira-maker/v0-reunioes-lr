"use client"

import { Clock, User, Building2, Check, X, Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Lead } from "@/lib/types"
import { formatTimeDisplay } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface LeadCardProps {
  lead: Lead
  onUpdateStatus: (id: string, status: "veio" | "nao" | "pending") => void
  onDelete: (id: string) => void
}

export function LeadCard({ lead, onUpdateStatus, onDelete }: LeadCardProps) {
  const statusStyles = {
    pending: "border-l-amber-500 bg-card",
    veio: "border-l-emerald-500 bg-emerald-500/5",
    nao: "border-l-red-500 bg-red-500/5 opacity-60",
  }

  const statusLabels = {
    pending: "Pendente",
    veio: "Compareceu",
    nao: "Não veio",
  }

  return (
    <div
      className={cn(
        "rounded-lg border-l-4 border border-border/50 p-4 transition-all hover:border-border",
        statusStyles[lead.status]
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-medium text-foreground line-clamp-1">{lead.nome}</h4>
        {lead.kommo_id && (
          <a
            href={`https://lrmultimarcas.kommo.com/leads/detail/${lead.kommo_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Abrir no Kommo"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          <span>{formatTimeDisplay(lead.hora)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4 text-primary" />
          <span className="line-clamp-1">{lead.responsavel}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          <span>{lead.tipo}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {lead.status === "pending" ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateStatus(lead.id, "veio")}
              className="flex-1 h-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
            >
              <Check className="h-4 w-4 mr-1" />
              Veio
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateStatus(lead.id, "nao")}
              className="flex-1 h-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <X className="h-4 w-4 mr-1" />
              Não
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span
              className={cn(
                "text-sm font-medium",
                lead.status === "veio" ? "text-emerald-500" : "text-red-500"
              )}
            >
              {statusLabels[lead.status]}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateStatus(lead.id, "pending")}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Desfazer
            </Button>
          </div>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(lead.id)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Deletar</span>
        </Button>
      </div>
    </div>
  )
}
