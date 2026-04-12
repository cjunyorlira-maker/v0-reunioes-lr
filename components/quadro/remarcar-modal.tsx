"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RemarcarModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: string, hora: string) => void
  leadNome: string
  currentData?: string
  currentHora?: string
}

export function RemarcarModal({ 
  open, 
  onClose, 
  onConfirm, 
  leadNome,
  currentData,
  currentHora 
}: RemarcarModalProps) {
  const [data, setData] = useState(currentData || "")
  const [hora, setHora] = useState(currentHora || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (data && hora) {
      onConfirm(data, hora)
      setData("")
      setHora("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#141414] border-[rgba(212,175,55,0.15)] text-[#f5f0e8] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#d4af37]">Remarcar Reunião</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-[#8a8070]">
            Informe a nova data e hora da reunião para <span className="text-[#f5f0e8] font-medium">{leadNome}</span>
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="data" className="text-[#8a8070]">Nova Data</Label>
            <Input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="bg-[#0a0a0a] border-[rgba(212,175,55,0.15)] text-[#f5f0e8] focus:border-[#d4af37]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hora" className="text-[#8a8070]">Nova Hora</Label>
            <Input
              id="hora"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              required
              className="bg-[#0a0a0a] border-[rgba(212,175,55,0.15)] text-[#f5f0e8] focus:border-[#d4af37]"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-[rgba(212,175,55,0.15)] text-[#8a8070] hover:bg-[rgba(212,175,55,0.08)] hover:text-[#f5f0e8]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!data || !hora}
              className="flex-1 bg-[#d4af37] text-[#0a0a0a] hover:bg-[#c4a030] font-semibold disabled:opacity-50"
            >
              Confirmar Remarcação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
