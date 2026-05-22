/**
 * Calcula o período de produção (dia 21 ao dia 20 do mês seguinte)
 * Se o dia 20 cair em sábado, domingo ou feriado, o fechamento é no próximo dia útil
 */

// Feriados nacionais fixos (mês é 0-indexed)
const FERIADOS_FIXOS = [
  { mes: 0, dia: 1 },   // Ano Novo
  { mes: 3, dia: 21 },  // Tiradentes
  { mes: 4, dia: 1 },   // Dia do Trabalhador
  { mes: 8, dia: 7 },   // Independência
  { mes: 9, dia: 12 },  // Nossa Senhora Aparecida
  { mes: 10, dia: 2 },  // Finados
  { mes: 10, dia: 15 }, // Proclamação da República
  { mes: 11, dia: 25 }, // Natal
]

function isFeriado(date: Date): boolean {
  const mes = date.getMonth()
  const dia = date.getDate()
  return FERIADOS_FIXOS.some(f => f.mes === mes && f.dia === dia)
}

function isFimDeSemana(date: Date): boolean {
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6 // 0 = Domingo, 6 = Sábado
}

function proximoDiaUtil(date: Date): Date {
  const result = new Date(date)
  while (isFimDeSemana(result) || isFeriado(result)) {
    result.setDate(result.getDate() + 1)
  }
  return result
}

export interface PeriodoProducao {
  inicio: string  // YYYY-MM-DD
  fim: string     // YYYY-MM-DD
  mesReferencia: string // Ex: "Abril 2026"
}

/**
 * Retorna o período de produção atual
 * - Começa no dia 21 do mês anterior ou atual
 * - Termina no dia 22 do mês atual ou próximo
 * - Importante: se estamos entre 21 e 22 de um mês, o período já começou no 21
 */
export function getPeriodoProducaoAtual(): PeriodoProducao {
  const hoje = new Date()
  const diaAtual = hoje.getDate()
  const mesAtual = hoje.getMonth()
  const anoAtual = hoje.getFullYear()
  
  let inicioAno: number
  let inicioMes: number
  let fimAno: number
  let fimMes: number
  let mesReferenciaNum: number
  let anoReferencia: number

  // Se estamos entre dia 1-20: período começou no 21 do mês anterior
  // Se estamos entre dia 21-22: período é de hoje até 22 do mês que vem
  // Se estamos depois do dia 22: período será apenas até 22 do mês próximo
  
  if (diaAtual <= 20) {
    // Antes do dia 21: período começou em 21 do mês anterior
    if (mesAtual === 0) {
      inicioAno = anoAtual - 1
      inicioMes = 11 // Dezembro
    } else {
      inicioAno = anoAtual
      inicioMes = mesAtual - 1
    }
    fimAno = anoAtual
    fimMes = mesAtual
    mesReferenciaNum = mesAtual
    anoReferencia = anoAtual
  } else {
    // Dia 21 ou depois: período vai até dia 22 do próximo mês
    inicioAno = anoAtual
    inicioMes = mesAtual
    if (mesAtual === 11) {
      fimAno = anoAtual + 1
      fimMes = 0 // Janeiro
      mesReferenciaNum = 0
      anoReferencia = anoAtual + 1
    } else {
      fimAno = anoAtual
      fimMes = mesAtual + 1
      mesReferenciaNum = mesAtual + 1
      anoReferencia = anoAtual
    }
  }

  const inicio = new Date(inicioAno, inicioMes, 21)
  let fim = new Date(fimAno, fimMes, 22)
  
  // Ajusta o fim para o próximo dia útil se cair em fim de semana ou feriado
  fim = proximoDiaUtil(fim)

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]

  return {
    inicio: inicio.toISOString().split("T")[0],
    fim: fim.toISOString().split("T")[0],
    mesReferencia: `${meses[mesReferenciaNum]} ${anoReferencia}`,
  }
}

/**
 * Converte timestamp Unix (segundos) para data no formato YYYY-MM-DD
 */
export function timestampToDateString(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().split("T")[0]
}
