// IDs dos custom fields no Kommo da LR Multimarcas (mapeados de leads reais)
const FIELD_IDS = {
  ORIGEM: 797344,
  CIDADE: 797346,
  ANUNCIO: 797246,
  TIPO_BEM: 1025944,
  PRECO_BEM: 1025942,
  FAIXA_ENTRADA: 1021207,
  OBSERVACAO: 797600,
  PARCELA: 1000398,
  ENTRADA: 1000400,
  FORM_URL: 1007582,
} as const

// Mapeamento OFICIAL: origem do Kommo → tipo de ligação esperado
export const ORIGEM_PARA_TIPO: Record<string, string> = {
  'Facebook Grupos': 'facebook_grupos',
  'Simulador': 'simulador_facebook',
  'Simulador Empresa': 'simulador_empresa',
  'Trafego Pago': 'simulador_facebook',
  'Tráfego Pago': 'simulador_facebook',
  'Matriz': 'retorno',
  'Site': 'simulador_facebook',
  'Indicação': 'retorno',
  'Indicacao': 'retorno',
  'Reciclagem': 'retorno',
  'Captação Supervisor': 'retorno',
  'Captacao Supervisor': 'retorno',
  'Canal Pro': 'simulador_facebook',
  'Instagram': 'ativacao_whatsapp',
}

// Formatação amigável dos valores enum (Kommo retorna com underscore)
function formatarValorEnum(valor: string | null): string | null {
  if (!valor) return null
  return valor
    .replace(/_á_/g, ' a ')
    .replace(/_a_/g, ' a ')
    .replace(/_de_/g, ' de ')
    .replace(/entre_/g, 'entre ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Parser do campo Observação do Simulador Empresa
function parsearObservacao(texto: string | null): {
  tipoBem?: string
  faixaPreco?: string
  modalidade?: string
  entrada?: string
  parcela?: string
} {
  if (!texto) return {}
  
  const result: any = {}
  const linhas = texto.split('\n')
  
  for (const linha of linhas) {
    const lower = linha.toLowerCase()
    if (lower.includes('deseja adquirir')) {
      result.tipoBem = linha.split(':')[1]?.trim()
    } else if (lower.includes('de quanto precisa')) {
      result.faixaPreco = linha.split(':')[1]?.trim()
    } else if (lower.includes('modalidade')) {
      result.modalidade = linha.split(':')[1]?.trim()
    } else if (lower.includes('quanto tem de entrada')) {
      result.entrada = linha.split(':')[1]?.trim()
    } else if (lower.includes('valor de parcela')) {
      result.parcela = linha.split(':')[1]?.trim()
    }
  }
  
  return result
}

export interface DadosLeadKommo {
  origem: string | null
  tipoLigacaoEsperado: string | null
  
  // Dados gerais
  creditoEsperado: number | null
  cidade: string | null
  anuncio: string | null
  
  // Dados de Tráfego Pago (form Facebook Ads)
  tipoBem: string | null
  precoBem: string | null
  faixaEntrada: string | null
  
  // Dados de Simulador Empresa (form web)
  observacaoTipoBem: string | null
  observacaoFaixaPreco: string | null
  observacaoModalidade: string | null
  observacaoEntrada: string | null
  observacaoParcela: string | null
  
  // Outros
  parcelaCadastrada: number | null
  entradaCadastrada: number | null
  formUrl: string | null
  
  // Metadata
  pipelineId: number | null
  statusId: number | null
}

export async function buscarDadosLeadKommo(
  leadId: number | string
): Promise<DadosLeadKommo | null> {
  if (!process.env.KOMMO_ACCESS_TOKEN || !leadId) return null
  
  try {
    console.log('[Kommo Dados] Buscando dados do lead:', leadId)
    
    const response = await fetch(
      `https://crm2lrmultimarcascom.kommo.com/api/v4/leads/${leadId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.KOMMO_ACCESS_TOKEN}`,
        },
      }
    )
    
    if (!response.ok) {
      console.error('[Kommo Dados] Erro:', response.status)
      return null
    }
    
    const lead = await response.json()
    const customFields = lead.custom_fields_values || []
    
    const getField = (id: number): string | null => {
      const field = customFields.find((f: any) => f.field_id === id)
      const value = field?.values?.[0]?.value
      return value ? String(value) : null
    }
    
    const origem = getField(FIELD_IDS.ORIGEM)
    const tipoLigacaoEsperado = origem ? ORIGEM_PARA_TIPO[origem] || null : null
    
    // Parser do campo Observação (só Simulador Empresa)
    const observacaoTexto = getField(FIELD_IDS.OBSERVACAO)
    const obs = parsearObservacao(observacaoTexto)
    
    const dados: DadosLeadKommo = {
      origem,
      tipoLigacaoEsperado,
      creditoEsperado: lead.price || null,
      cidade: getField(FIELD_IDS.CIDADE),
      anuncio: getField(FIELD_IDS.ANUNCIO),
      
      tipoBem: formatarValorEnum(getField(FIELD_IDS.TIPO_BEM)),
      precoBem: formatarValorEnum(getField(FIELD_IDS.PRECO_BEM)),
      faixaEntrada: formatarValorEnum(getField(FIELD_IDS.FAIXA_ENTRADA)),
      
      observacaoTipoBem: obs.tipoBem || null,
      observacaoFaixaPreco: obs.faixaPreco || null,
      observacaoModalidade: obs.modalidade || null,
      observacaoEntrada: obs.entrada || null,
      observacaoParcela: obs.parcela || null,
      
      parcelaCadastrada: getField(FIELD_IDS.PARCELA) ? Number(getField(FIELD_IDS.PARCELA)) : null,
      entradaCadastrada: getField(FIELD_IDS.ENTRADA) ? Number(getField(FIELD_IDS.ENTRADA)) : null,
      formUrl: getField(FIELD_IDS.FORM_URL),
      
      pipelineId: lead.pipeline_id || null,
      statusId: lead.status_id || null,
    }
    
    console.log('[Kommo Dados] ✅ Origem:', dados.origem, '| Tipo:', dados.tipoLigacaoEsperado)
    
    return dados
  } catch (err) {
    console.error('[Kommo Dados] Erro:', err)
    return null
  }
}

/**
 * Monta bloco de contexto autoritativo para o Claude
 */
export function montarContextoKommoParaIA(dados: DadosLeadKommo | null): string {
  if (!dados || !dados.origem) {
    return '\n[CRM] Sem dados do CRM disponíveis. Use sua melhor inferência da transcrição.\n'
  }
  
  const tipo = dados.tipoLigacaoEsperado
  
  // Bloco com dados do form (varia por origem)
  let dadosForm = ''
  
  if (tipo === 'simulador_facebook' && dados.tipoBem) {
    dadosForm = `
DADOS DO FORMULÁRIO (Tráfego Pago - Facebook Ads):
- Tipo de bem: ${dados.tipoBem}
- Faixa de preço: ${dados.precoBem || 'não informado'}
- Faixa de entrada: ${dados.faixaEntrada || 'não informado'}
- Cidade: ${dados.cidade || 'não informado'}

IMPORTANTE: Esses dados são FAIXAS pré-definidas no anúncio.
A REALIDADE pode ser diferente (cliente clicou no que mais se aproximava).
Vendedor PRECISA validar e aprofundar.`
  } else if (tipo === 'simulador_empresa' && (dados.observacaoTipoBem || dados.observacaoFaixaPreco)) {
    dadosForm = `
DADOS DO FORMULÁRIO (Simulador Empresa):
- O que deseja adquirir: ${dados.observacaoTipoBem || 'não informado'}
- Faixa de preço: ${dados.observacaoFaixaPreco || 'não informado'}
- Modalidade desejada: ${dados.observacaoModalidade || 'não informado'}
- Entrada disponível: ${dados.observacaoEntrada || 'não informado'}
- Parcela ideal: ${dados.observacaoParcela || 'não informado'}

IMPORTANTE: Cliente preencheu esses dados, mas pode não ser realidade.
Vendedor PRECISA validar entrada (se está disponível em conta), parcela 
(se cabe no orçamento), e aprofundar momento e perfil de crédito.`
  }
  
  // Instruções específicas por tipo
  let instrucao = ''
  
  if (tipo === 'facebook_grupos') {
    instrucao = `
INSTRUÇÃO ESPECIAL para tipo "facebook_grupos":
- REVERSÃO É OBRIGATÓRIA quando cliente acha que é imobiliária
- Pergunta-chave OBRIGATÓRIA: "à vista ou parcelado?"`
  } else if (tipo === 'simulador_facebook') {
    instrucao = `
INSTRUÇÃO ESPECIAL para tipo "simulador_facebook":
- Lead JÁ SABE que é simulação de crédito (preencheu form do anúncio)
- NÃO PENALIZAR por não fazer pergunta-chave de reversão
- VENDEDOR DEVE: validar dados do form PRIMEIRO, depois aprofundar pilares
- Boa abordagem: "Vi que você quer um [tipo_bem] de [faixa_preco] em [cidade], certo? Me conta mais..."
- Penalizar se vendedor IGNOROU os dados do form e perguntou tudo do zero`
  } else if (tipo === 'simulador_empresa') {
    instrucao = `
INSTRUÇÃO ESPECIAL para tipo "simulador_empresa":
- Lead preencheu form COMPLETO no site (tem dados estruturados)
- NÃO PENALIZAR por não fazer reversão
- VENDEDOR DEVE: validar PRIMEIRO os dados (entrada, parcela, modalidade), depois aprofundar
- Atenção: dados do form podem ser estimados pelo cliente (não são reais)
- Boa abordagem: "Vi que você quer [tipo] de [valor], com entrada de [valor] e parcela [valor]. Está confirmado?"`
  } else if (tipo === 'retorno') {
    instrucao = `
INSTRUÇÃO ESPECIAL para tipo "retorno" (origem: ${dados.origem}):
- Lead já contatado anteriormente
- NÃO PENALIZAR por não se apresentar formalmente
- Foco: continuidade da relação, qualificação fina, fechamento`
  } else if (tipo === 'ativacao_whatsapp') {
    instrucao = `
INSTRUÇÃO ESPECIAL para tipo "ativacao_whatsapp":
- Lead orgânico (Instagram), provavelmente frio
- Vendedor PRECISA criar interesse antes de qualificar
- Foco: rapport, interesse, qualificação inicial`
  }
  
  return `
═══════════════════════════════════════
DADOS AUTORITATIVOS DO CRM (KOMMO):
═══════════════════════════════════════

ORIGEM CONFIRMADA NO CRM: ${dados.origem}
TIPO DE LIGAÇÃO ESPERADO: ${tipo || 'indefinido'}
${dados.creditoEsperado ? `VALOR DO CRÉDITO (price): R$ ${dados.creditoEsperado.toLocaleString('pt-BR')}` : ''}
${dados.cidade ? `CIDADE: ${dados.cidade}` : ''}
${dados.anuncio ? `CÓDIGO DO ANÚNCIO: ${dados.anuncio}` : ''}
${dadosForm}
${instrucao}

A origem foi extraída do CRM Kommo, é AUTORITATIVA.
Sempre defina "tipo_ligacao" no JSON como: "${tipo || 'inferir_da_transcricao'}"
`
}
