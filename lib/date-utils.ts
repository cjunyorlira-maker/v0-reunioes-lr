import { WeekDay } from "./types"

// Retorna a data atual no fuso horário de São Paulo (Brasil)
function getTodayInBrazil(): Date {
  const now = new Date()
  // Converte para string no fuso de São Paulo e depois volta para Date
  const brazilTime = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  return new Date(brazilTime)
}

export function getWeekDays(weekOffset: number = 0): WeekDay[] {
  const today = getTodayInBrazil()
  const currentDay = today.getDay()
  
  // Calcular o início da semana (domingo)
  // getDay(): 0=domingo, 1=segunda, 2=terça... 6=sábado
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - currentDay + (weekOffset * 7))
  
  const days: WeekDay[] = []
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + i)
    
    days.push({
      date,
      dayName: dayNames[i],
      dayNumber: date.getDate(),
      month: monthNames[date.getMonth()],
      isToday: isSameDay(date, today),
    })
  }
  
  return days
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function formatDateForDB(date: Date): string {
  // Usa horário local em vez de UTC para evitar bug de "voltou um dia" em fusos negativos (Brasil -3/-4)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })
}

export function formatTimeDisplay(timeStr: string | null | undefined): string {
  if (!timeStr) return ""
  return timeStr.slice(0, 5) // "14:30:00" -> "14:30"
}

export function getWeekRange(weekOffset: number = 0): { start: string; end: string } {
  const days = getWeekDays(weekOffset)
  return {
    start: formatDateForDB(days[0].date),
    end: formatDateForDB(days[days.length - 1].date),
  }
}

export function getWeekLabel(weekOffset: number = 0): string {
  const days = getWeekDays(weekOffset)
  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  
  if (firstDay.date.getMonth() === lastDay.date.getMonth()) {
    return `${firstDay.dayNumber} - ${lastDay.dayNumber} ${firstDay.month}`
  }
  
  return `${firstDay.dayNumber} ${firstDay.month} - ${lastDay.dayNumber} ${lastDay.month}`
}
