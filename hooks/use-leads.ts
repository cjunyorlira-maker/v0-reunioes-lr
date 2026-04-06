"use client"

import useSWR from "swr"
import { Lead } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useLeads(startDate: string, endDate: string) {
  const { data, error, isLoading, mutate } = useSWR<Lead[]>(
    `/api/leads?startDate=${startDate}&endDate=${endDate}`,
    fetcher,
    {
      refreshInterval: 30000, // Atualiza a cada 30 segundos
      revalidateOnFocus: true,
    }
  )

  const createLead = async (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    })
    
    if (!response.ok) {
      throw new Error("Erro ao criar lead")
    }
    
    mutate()
    return response.json()
  }

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const response = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    
    if (!response.ok) {
      throw new Error("Erro ao atualizar lead")
    }
    
    mutate()
    return response.json()
  }

  const deleteLead = async (id: string) => {
    const response = await fetch(`/api/leads/${id}`, {
      method: "DELETE",
    })
    
    if (!response.ok) {
      throw new Error("Erro ao deletar lead")
    }
    
    mutate()
  }

  return {
    leads: data || [],
    isLoading,
    error,
    mutate,
    createLead,
    updateLead,
    deleteLead,
  }
}
