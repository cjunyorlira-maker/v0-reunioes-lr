"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface Atendente {
  id: number
  nome: string
  sort: number
}

interface AtendenteModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (atendente: string) => void
  leadNome: string
}

export function AtendenteModal({ open, onClose, onConfirm, leadNome }: AtendenteModalProps) {
  const [atendentes, setAtendentes] = useState<Atendente[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string>("")
  const [customName, setCustomName] = useState("")

  useEffect(() => {
    if (open) {
      fetchAtendentes()
      setSelected("")
      setCustomName("")
    }
  }, [open])

  const fetchAtendentes = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/kommo/get-atendentes")
      const data = await response.json()
      if (data.success) {
        setAtendentes(data.atendentes)
      }
    } catch (error) {
      console.error("Erro ao buscar atendentes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    const atendente = selected === "outro" ? customName : selected
    if (atendente) {
      onConfirm(atendente)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.2)] text-[#f5f0e8] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#d4af37] text-lg font-semibold">
            Selecionar Atendente
          </DialogTitle>
          <DialogDescription className="text-[#8a8070] text-sm mt-1">
            Cliente: <span className="text-[#f5f0e8]">{leadNome}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-center py-4 text-[#8a8070]">Carregando atendentes...</div>
          ) : (
            <>
              {/* Lista de atendentes */}
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {atendentes.map((atendente) => (
                  <button
                    key={atendente.id}
                    onClick={() => setSelected(atendente.nome)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selected === atendente.nome
                        ? "bg-[rgba(212,175,55,0.15)] border-[rgba(212,175,55,0.5)] text-[#d4af37]"
                        : "bg-[rgba(255,255,255,0.02)] border-[rgba(212,175,55,0.1)] text-[#f5f0e8] hover:border-[rgba(212,175,55,0.3)]"
                    }`}
                  >
                    <span className="text-[14px] font-medium">{atendente.nome}</span>
                  </button>
                ))}
                
                {/* Opção "Outro" */}
                <button
                  onClick={() => setSelected("outro")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selected === "outro"
                      ? "bg-[rgba(212,175,55,0.15)] border-[rgba(212,175,55,0.5)] text-[#d4af37]"
                      : "bg-[rgba(255,255,255,0.02)] border-[rgba(212,175,55,0.1)] text-[#f5f0e8] hover:border-[rgba(212,175,55,0.3)]"
                  }`}
                >
                  <span className="text-[14px] font-medium">Outro...</span>
                </button>
              </div>

              {/* Campo para nome customizado */}
              {selected === "outro" && (
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Digite o nome do atendente"
                  className="w-full bg-[#191919] border border-[rgba(212,175,55,0.1)] rounded-lg px-3 py-2.5 text-[#f5f0e8] text-[14px] outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors placeholder:text-[#8a8070]/50"
                  autoFocus
                />
              )}
            </>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[rgba(212,175,55,0.2)] text-[#8a8070] hover:text-[#f5f0e8] hover:border-[rgba(212,175,55,0.4)] transition-all text-[14px] font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || (selected === "outro" && !customName)}
            className="flex-1 py-2.5 rounded-lg bg-[rgba(74,222,128,0.15)] border border-[rgba(74,222,128,0.3)] text-[#4ade80] hover:bg-[rgba(74,222,128,0.25)] transition-all text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Presença
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
