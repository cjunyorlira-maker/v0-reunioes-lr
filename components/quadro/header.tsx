"use client"

import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  weekLabel: string
  onPrevWeek: () => void
  onNextWeek: () => void
  onNewLead: () => void
}

export function Header({ weekLabel, onPrevWeek, onNextWeek, onNewLead }: HeaderProps) {
  
  return (
    <header className="flex items-center justify-between py-6 px-4 md:px-8 border-b border-border/50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">LR</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground">Quadro de Reuniões</h1>
            <p className="text-sm text-muted-foreground">LR Multimarcas</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevWeek}
          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Semana anterior</span>
        </Button>
        
        <div className="px-4 py-2 bg-secondary rounded-lg min-w-[140px] text-center">
          <span className="text-sm font-medium text-foreground">{weekLabel || "Carregando..."}</span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextWeek}
          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <ChevronRight className="h-5 w-5" />
          <span className="sr-only">Próxima semana</span>
        </Button>
      </div>
      
      <Button
        onClick={onNewLead}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Novo Lead</span>
        <span className="sm:hidden">Novo</span>
      </Button>
    </header>
  )
}
