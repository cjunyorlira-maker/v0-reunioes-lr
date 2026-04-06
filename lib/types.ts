export interface Lead {
  id: string
  nome: string
  data: string
  hora: string
  responsavel: string
  tipo: string
  kommo_id: string | null
  status: "pending" | "veio" | "nao"
  created_at: string
  updated_at: string
}

export interface WeekDay {
  date: Date
  dayName: string
  dayNumber: number
  month: string
  isToday: boolean
}

export interface Stats {
  total: number
  veio: number
  nao: number
  pending: number
}
