import { WeekDay } from "./types"

export function getWeekDays(weekOffset: number = 0): WeekDay[] {
  const today = new Date()
  const currentDay = today.getDay()
  
  // Calcular o início da semana (segunda-feira)
  const monday = new Date(today)
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + (weekOffset * 7))
  
  const days: WeekDay[] = []
  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  
  for (let i = 0; i < 6; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    
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
  return date.toISOString().split("T")[0]
}

export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })
}

export function formatTimeDisplay(timeStr: string): string {
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
