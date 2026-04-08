import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface PlugaEvento {
  id: string
  tipo: "qualificado" | "agendei" | "marcado" | "veio" | "nao_veio" | "venda_fechada"
  lead_id: string | null
  vendedor: string | null
  equipe: string | null
  data_evento: string
  created_at: string
}

export function usePlugaEventos(dateRange: { start: string; end: string }) {
  const [eventos, setEventos] = useState<PlugaEvento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEventos = async () => {
      try {
        setIsLoading(true)
        const { data, error: err } = await supabase
          .from("pluga_eventos")
          .select("*")
          .gte("data_evento", dateRange.start + "T00:00:00")
          .lte("data_evento", dateRange.end + "T23:59:59")
          .order("data_evento", { ascending: false })

        if (err) {
          console.error("[v0] Erro ao buscar eventos:", err)
          setError(err.message)
          setEventos([])
        } else {
          setEventos(data as PlugaEvento[])
        }
      } catch (err) {
        console.error("[v0] Erro inesperado:", err)
        setError("Erro ao buscar eventos")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEventos()
  }, [dateRange])

  return { eventos, isLoading, error }
}
