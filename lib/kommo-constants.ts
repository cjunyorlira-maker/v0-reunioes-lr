// IDs do Funil Principal do Kommo (Pipeline ID: 7012299)

export const PIPELINE_PRINCIPAL = 7012299

export const ETAPAS = {
  // Etapas iniciais
  INCOMING_LEADS: 58498467,
  AGUARDANDO_CONTATO_NOVOS: 58518959,
  RECUPERADOS_AGUARDANDO_CONTATO: 99861839,
  RECUPERADOS_NAO_VIERAM: 72670548,
  CONTATO_INICIAL_SEM_RESPOSTA: 58498471,
  SEM_RESPOSTAS_RECUPERADOS: 100045567,
  
  // Etapas de qualificação
  QUALIFICANDO: 58498475,
  VENDENDO_REUNIAO: 58498479,
  
  // Etapas de reunião
  CONFIRMAR_REUNIAO: 67567420,
  REUNIAO_CONFIRMADA: 58498483,
  NAO_VIERAM: 69799504,
  REMARCADOS: 102225923,
  VIERAM: 69799508,
  
  // Etapas de venda
  VENDIDO_PRODUCAO: 69615804,
  
  // Etapas especiais
  ETAPA_TESTE_IA: 100017463,
  CLOSED_WON: 142,
  CLOSED_LOST: 143,
} as const

// Nomes das etapas para exibição
export const ETAPAS_NOMES: Record<number, string> = {
  58498467: "Incoming leads",
  58518959: "Aguardando seu contato novos",
  99861839: "Recuperados aguardando contato",
  72670548: "Recuperados Não vieram",
  58498471: "Seu Contato inicial sem resposta",
  100045567: "Sem respostas Recuperados",
  58498475: "Qualificando",
  58498479: "Vendendo Reunião",
  67567420: "Confirmar reunião",
  58498483: "Reunião confirmada",
  69799504: "Não vieram",
  102225923: "Remarcados",
  69799508: "Vieram",
  69615804: "Vendido produção 21/03 a 20/04",
  100017463: "Etapa Teste IA",
  142: "Closed - won",
  143: "Closed - lost",
}

// Cores das etapas
export const ETAPAS_CORES: Record<number, string> = {
  58498467: "#c1c1c1",
  58518959: "#ffce5a",
  99861839: "#f9deff",
  72670548: "#87f2c0",
  58498471: "#ff8f92",
  100045567: "#e6e8ea",
  58498475: "#98cbff",
  58498479: "#ebffb1",
  67567420: "#f9deff",
  58498483: "#87f2c0",
  69799504: "#ff8f92",
  102225923: "#f3beff",
  69799508: "#99ccff",
  69615804: "#ebffb1",
  100017463: "#99ccff",
  142: "#CCFF66",
  143: "#D5D8DB",
}
