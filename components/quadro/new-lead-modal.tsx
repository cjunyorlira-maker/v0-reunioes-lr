"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

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
}

const responsaveis = [
  "Wesley",
  "Reinaldo", 
  "Lucas",
  "Outro"
]

const tipos = [
  "Imóvel",
  "Veículo",
  "Consórcio",
  "Outro"
]

export function NewLeadModal({ open, onClose, onSubmit }: NewLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: "",
    data: new Date().toISOString().split("T")[0],
    hora: "10:00",
    responsavel: "",
    tipo: "Imóvel",
    kommo_id: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.data || !formData.hora || !formData.responsavel) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
      setFormData({
        nome: "",
        data: new Date().toISOString().split("T")[0],
        hora: "10:00",
        responsavel: "",
        tipo: "Imóvel",
        kommo_id: "",
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Novo Lead</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nome">Nome do Cliente</FieldLabel>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo"
                required
                className="bg-input border-border"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="data">Data</FieldLabel>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                  className="bg-input border-border"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="hora">Hora</FieldLabel>
                <Input
                  id="hora"
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                  required
                  className="bg-input border-border"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="responsavel">Responsável</FieldLabel>
              <Select
                value={formData.responsavel}
                onValueChange={(value) => setFormData({ ...formData, responsavel: value })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {responsaveis.map((resp) => (
                    <SelectItem key={resp} value={resp}>
                      {resp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="tipo">Tipo de Negócio</FieldLabel>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="kommo_id">ID Kommo (opcional)</FieldLabel>
              <Input
                id="kommo_id"
                value={formData.kommo_id}
                onChange={(e) => setFormData({ ...formData, kommo_id: e.target.value })}
                placeholder="ID do lead no Kommo"
                className="bg-input border-border"
              />
            </Field>
          </FieldGroup>

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? <Spinner className="mr-2" /> : null}
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
