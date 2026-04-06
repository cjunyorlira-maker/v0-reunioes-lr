"use client"

import { useState, useEffect } from "react"

interface NewLeadModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    nome: string
    data: string
    hora: string
    responsavel: string
    tipo: string
    kommo_id?: string
  }) => Promise<void>
  defaultDate?: string
}

export function NewLeadModal({ open, onClose, onSubmit, defaultDate }: NewLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: "",
    dataHora: "",
    responsavel: "",
    tipo: "",
    kommo_id: "",
  })

  useEffect(() => {
    if (open && defaultDate) {
      setFormData(prev => ({
        ...prev,
        dataHora: `${defaultDate}T09:00`,
      }))
    }
  }, [open, defaultDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.dataHora || !formData.responsavel) {
      return
    }

    // Separa data e hora do campo combinado
    const [data, hora] = formData.dataHora.split("T")

    setLoading(true)
    try {
      await onSubmit({
        nome: formData.nome,
        data,
        hora,
        responsavel: formData.responsavel,
        tipo: formData.tipo,
        kommo_id: formData.kommo_id,
      })
      setFormData({
        nome: "",
        dataHora: defaultDate ? `${defaultDate}T09:00` : "",
        responsavel: "",
        tipo: "",
        kommo_id: "",
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-[#111111] border border-[rgba(212,175,55,0.25)] rounded-[20px] p-7 w-full max-w-[380px] animate-in fade-in zoom-in-95 duration-200">
        {/* Linha decorativa */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
        
        <h2 className="font-serif text-[20px] font-semibold text-[#f0d060] mb-6 tracking-tight">
          Novo lead
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Nome */}
          <div className="mb-3">
            <label className="block text-[10px] text-[#8a8070] uppercase tracking-wider mb-1.5 font-medium">
              Nome do cliente
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: João Silva"
              required
              className="w-full bg-[#191919] border border-[rgba(212,175,55,0.1)] rounded-[10px] px-3 py-2.5 text-[#f5f0e8] text-[13px] outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors placeholder:text-[#8a8070]/50"
            />
          </div>
          
          {/* Data e Hora */}
          <div className="mb-3">
            <label className="block text-[10px] text-[#8a8070] uppercase tracking-wider mb-1.5 font-medium">
              Data e Hora
            </label>
            <input
              type="datetime-local"
              value={formData.dataHora}
              onChange={(e) => setFormData({ ...formData, dataHora: e.target.value })}
              required
              className="w-full bg-[#191919] border border-[rgba(212,175,55,0.1)] rounded-[10px] px-3 py-2.5 text-[#f5f0e8] text-[13px] outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors"
            />
          </div>
          
          {/* Responsável */}
          <div className="mb-3">
            <label className="block text-[10px] text-[#8a8070] uppercase tracking-wider mb-1.5 font-medium">
              Responsável
            </label>
            <input
              type="text"
              value={formData.responsavel}
              onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
              placeholder="Ex: Amanda"
              required
              className="w-full bg-[#191919] border border-[rgba(212,175,55,0.1)] rounded-[10px] px-3 py-2.5 text-[#f5f0e8] text-[13px] outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors placeholder:text-[#8a8070]/50"
            />
          </div>
          
          {/* Tipo */}
          <div className="mb-3">
            <label className="block text-[10px] text-[#8a8070] uppercase tracking-wider mb-1.5 font-medium">
              Tipo do bem
            </label>
            <input
              type="text"
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              placeholder="Ex: Imóvel, Casa, Caminhão"
              className="w-full bg-[#191919] border border-[rgba(212,175,55,0.1)] rounded-[10px] px-3 py-2.5 text-[#f5f0e8] text-[13px] outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors placeholder:text-[#8a8070]/50"
            />
          </div>
          
          {/* Atendente */}
          <div className="mb-3">
            <label className="block text-[10px] text-[#8a8070] uppercase tracking-wider mb-1.5 font-medium">
              Atendente
            </label>
            <input
              type="text"
              value={formData.kommo_id}
              onChange={(e) => setFormData({ ...formData, kommo_id: e.target.value })}
              placeholder="Ex: Maria, João"
              className="w-full bg-[#191919] border border-[rgba(212,175,55,0.1)] rounded-[10px] px-3 py-2.5 text-[#f5f0e8] text-[13px] outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors placeholder:text-[#8a8070]/50"
            />
          </div>
          
          {/* Buttons */}
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-transparent border border-[rgba(212,175,55,0.1)] text-[#8a8070] text-[13px] py-3 rounded-[10px] hover:border-[rgba(212,175,55,0.25)] hover:text-[#f5f0e8] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-gradient-to-br from-[#b8960c] via-[#d4af37] to-[#f0d060] text-black text-[13px] font-medium py-3 rounded-[10px] hover:opacity-90 transition-all tracking-wide disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
