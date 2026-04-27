import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import React from 'react'

// === PALETA DE CORES PROFISSIONAL ===
const COR_PRIMARIA = '#1e40af'       // azul LR
const COR_SECUNDARIA = '#3b82f6'     // azul claro
const COR_DESTAQUE = '#f59e0b'       // âmbar (alertas)
const COR_SUCESSO = '#059669'        // verde escuro
const COR_ERRO = '#dc2626'           // vermelho
const COR_TEXTO = '#1f2937'          // cinza escuro
const COR_TEXTO_CLARO = '#6b7280'    // cinza médio
const COR_FUNDO_CLARO = '#f9fafb'    // cinza muito claro

// === FUNÇÃO QUE LIMPA EMOJIS DO TEXTO ===
// O @react-pdf não renderiza emojis com Helvetica, então removemos tudo
function limparEmojis(texto: string | undefined | null): string {
  if (!texto) return ''
  return String(texto)
    // Remove a maioria dos emojis Unicode
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')   // emojis símbolos
    .replace(/[\u{2600}-\u{27BF}]/gu, '')      // símbolos diversos
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')   // mahjong
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')   // playing cards
    .replace(/[\u{1F100}-\u{1F1FF}]/gu, '')   // letras enclosed
    .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')   // ideogramas
    .replace(/[\u{2700}-\u{27BF}]/gu, '')      // dingbats
    .replace(/[\u{2300}-\u{23FF}]/gu, '')      // misc technical
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')   // emoticons
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')   // transport
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '')   // alchemical
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')   // geometric
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')   // supplemental arrows
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')   // supplemental symbols
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')   // chess symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')   // symbols extended
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')     // variation selectors
    .replace(/[\u{200D}]/gu, '')               // zero width joiner
    // Limpa espaços duplicados que ficaram
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    // Remove pontuação duplicada que ficou
    .replace(/^[\s\:\-\—]+/gm, '')
    .trim()
}

const styles = StyleSheet.create({
  // === ESTRUTURA DA PÁGINA ===
  page: { 
    paddingTop: 90,           // espaço pro header fixo
    paddingBottom: 50,        // espaço pro footer fixo
    paddingHorizontal: 40, 
    fontSize: 10, 
    fontFamily: 'Helvetica', 
    color: COR_TEXTO, 
    lineHeight: 1.5,
  },
  
  // === HEADER FIXO (em todas as páginas) ===
  headerFixo: { 
    position: 'absolute',
    top: 20,
    left: 40,
    right: 40,
    backgroundColor: COR_PRIMARIA, 
    color: 'white', 
    padding: 12,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 9, color: '#dbeafe' },
  
  // === FOOTER FIXO (em todas as páginas) ===
  footerFixo: { 
    position: 'absolute', 
    bottom: 20, 
    left: 40, 
    right: 40, 
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8, 
    color: COR_TEXTO_CLARO,
    borderTop: '1 solid #e5e7eb',
    paddingTop: 6,
  },
  
  // === CARD DE INFORMAÇÕES ===
  infoCard: { 
    backgroundColor: COR_FUNDO_CLARO, 
    padding: 12, 
    marginBottom: 15, 
    borderRadius: 4, 
    borderLeft: '3 solid #1e40af',
  },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { fontWeight: 'bold', width: 90, fontSize: 10 },
  infoValue: { flex: 1, fontSize: 10 },
  
  // === SCORE DESTACADO ===
  scoreBox: { 
    backgroundColor: COR_PRIMARIA, 
    padding: 12, 
    borderRadius: 4, 
    marginBottom: 15, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: { fontSize: 10, fontWeight: 'bold', color: 'white' },
  scoreValue: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  
  // === TÍTULOS DE SEÇÕES ===
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: COR_PRIMARIA, 
    marginTop: 16, 
    marginBottom: 8, 
    borderBottom: '2 solid #3b82f6', 
    paddingBottom: 3,
  },
  subsectionTitle: { 
    fontSize: 11, 
    fontWeight: 'bold', 
    color: COR_TEXTO, 
    marginTop: 8, 
    marginBottom: 4,
  },
  paragraph: { marginBottom: 5, textAlign: 'justify' },
  
  // === GRID DE 4 PILARES ===
  pilaresGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  pilarBox: { 
    width: '48%', 
    padding: 8, 
    marginBottom: 6, 
    marginRight: '2%',
    backgroundColor: COR_FUNDO_CLARO,
    borderRadius: 4,
    borderLeft: '2 solid #3b82f6',
  },
  pilarLabel: { fontSize: 8, color: COR_TEXTO_CLARO, fontWeight: 'bold', marginBottom: 2 },
  pilarValue: { fontSize: 11, fontWeight: 'bold', color: COR_PRIMARIA },
  
  // === BOXES COLORIDOS COM TAGS ===
  boxPositivo: { 
    backgroundColor: '#ecfdf5', 
    padding: 8, 
    borderRadius: 4, 
    marginBottom: 5, 
    borderLeft: '3 solid #059669',
  },
  boxAlerta: { 
    backgroundColor: '#fffbeb', 
    padding: 8, 
    borderRadius: 4, 
    marginBottom: 5, 
    borderLeft: '3 solid #f59e0b',
  },
  boxCritico: { 
    backgroundColor: '#fef2f2', 
    padding: 8, 
    borderRadius: 4, 
    marginBottom: 5, 
    borderLeft: '3 solid #dc2626',
  },
  boxScript: { 
    backgroundColor: '#eff6ff', 
    padding: 10, 
    borderRadius: 4, 
    marginBottom: 6, 
    borderLeft: '3 solid #3b82f6',
  },
  
  // === TAGS ANTES DO CONTEÚDO ===
  tagPositivo: { 
    fontSize: 9, fontWeight: 'bold', color: COR_SUCESSO, marginBottom: 2,
  },
  tagAlerta: { 
    fontSize: 9, fontWeight: 'bold', color: COR_DESTAQUE, marginBottom: 2,
  },
  tagCritico: { 
    fontSize: 9, fontWeight: 'bold', color: COR_ERRO, marginBottom: 2,
  },
  tagScript: { 
    fontSize: 9, fontWeight: 'bold', color: COR_SECUNDARIA, marginBottom: 2,
  },
  
  // === OBJEÇÕES ===
  objecaoCard: { 
    backgroundColor: COR_FUNDO_CLARO, 
    padding: 10, 
    borderRadius: 4, 
    marginBottom: 8, 
    borderTop: '2 solid #3b82f6',
  },
  objecaoTitle: { 
    fontSize: 10, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 4,
  },
  objecaoLabel: { fontWeight: 'bold' },
  
  // === TRANSCRIÇÃO ===
  transcricaoBox: { 
    backgroundColor: COR_FUNDO_CLARO, 
    padding: 12, 
    borderRadius: 4, 
    fontSize: 9, 
    lineHeight: 1.5, 
    color: '#374151',
  },
  
  // === STATUS BADGES (para Reunião, Reversão, etc) ===
  statusBadgeOk: {
    backgroundColor: COR_SUCESSO,
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    marginRight: 6,
  },
  statusBadgeNo: {
    backgroundColor: COR_ERRO,
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    marginRight: 6,
  },
})

interface PDFAnaliseProps {
  callid: string
  vendedor: string
  cliente: string
  telefone: string
  duracaoSegundos: number
  dataLigacao: string
  tipoLigacao: string
  audioUrl: string
  transcricao: string
  analise: any
}

const formatarDuracao = (s: number) => `${Math.floor(s/60)}min ${s%60}s`
const formatarData = (d: string) => {
  try { 
    return new Date(d).toLocaleString('pt-BR', { 
      day:'2-digit', month:'2-digit', year:'numeric', 
      hour:'2-digit', minute:'2-digit',
    }) 
  } catch { return d }
}
const formatarTipo = (t: string) => ({
  'facebook_grupos': 'Facebook/Grupos',
  'simulador_empresa': 'Simulador Empresa',
  'simulador_facebook': 'Simulador Facebook',
  'ativacao_whatsapp': 'Ativacao WhatsApp',
  'confirmacao_reuniao': 'Confirmacao Reuniao',
  'retorno': 'Retorno/Follow-up',
}[t] || t)

// Componente de header fixo (reutilizado em todas as páginas)
const HeaderFixo = ({ pagina, totalPaginas }: { pagina: string; totalPaginas?: string }) => (
  <View style={styles.headerFixo} fixed>
    <View>
      <Text style={styles.headerTitle}>LR MULTIMARCAS</Text>
      <Text style={styles.headerSubtitle}>Inteligencia Comercial - Analise de Ligacao</Text>
    </View>
    <Text style={{ fontSize: 9, color: '#dbeafe' }}>{pagina}</Text>
  </View>
)

const FooterFixo = ({ callid }: { callid: string }) => (
  <View style={styles.footerFixo} fixed>
    <Text>LR Multimarcas (c) 2026</Text>
    <Text>CallID: {callid}</Text>
    <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`} />
  </View>
)

const PDFAnalise: React.FC<PDFAnaliseProps> = ({ 
  callid, vendedor, cliente, telefone, duracaoSegundos, 
  dataLigacao, tipoLigacao, audioUrl, transcricao, analise,
}) => {
  const pilares = analise?.quatro_pilares || {}
  const reuniao = analise?.reuniao || {}
  const credito = analise?.abordagem_credito || {}
  const qualificacao = analise?.qualificacao || {}
  const perfil = analise?.perfil_lead || {}
  const reversao = qualificacao?.reversao_facebook_grupos || null
  
  return (
    <Document>
      {/* ========== PÁGINA 1 - DIAGNÓSTICO ========== */}
      <Page size="A4" style={styles.page}>
        <HeaderFixo pagina="DIAGNOSTICO" />
        <FooterFixo callid={callid} />
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Vendedor:</Text><Text style={styles.infoValue}>{limparEmojis(vendedor)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Cliente:</Text><Text style={styles.infoValue}>{limparEmojis(cliente)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Telefone:</Text><Text style={styles.infoValue}>{telefone}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Data/Hora:</Text><Text style={styles.infoValue}>{formatarData(dataLigacao)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Duracao:</Text><Text style={styles.infoValue}>{formatarDuracao(duracaoSegundos)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Tipo:</Text><Text style={styles.infoValue}>{formatarTipo(tipoLigacao)}</Text></View>
        </View>
        
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>SCORE GERAL DA LIGACAO</Text>
          <Text style={styles.scoreValue}>{analise?.score_geral || 0}/100</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Resumo Executivo</Text>
        <Text style={styles.paragraph}>{limparEmojis(analise?.resumo_executivo) || 'N/A'}</Text>
        
        <Text style={styles.sectionTitle}>4 Pilares ({pilares.pilares_coletados || 0}/4)</Text>
        <View style={styles.pilaresGrid}>
          <View style={styles.pilarBox}>
            <Text style={styles.pilarLabel}>CREDITO (valor do imovel)</Text>
            <Text style={styles.pilarValue}>{limparEmojis(pilares.credito) || '-'}</Text>
          </View>
          <View style={styles.pilarBox}>
            <Text style={styles.pilarLabel}>PARCELA (mensalidade)</Text>
            <Text style={styles.pilarValue}>{limparEmojis(pilares.parcela) || '-'}</Text>
          </View>
          <View style={styles.pilarBox}>
            <Text style={styles.pilarLabel}>ENTRADA (recurso)</Text>
            <Text style={styles.pilarValue}>{limparEmojis(pilares.entrada) || '-'}</Text>
          </View>
          <View style={styles.pilarBox}>
            <Text style={styles.pilarLabel}>MOMENTO (urgencia)</Text>
            <Text style={styles.pilarValue}>{limparEmojis(pilares.momento) || '-'}</Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Status da Ligacao</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Interesse:</Text>
            <Text style={styles.infoValue}>{limparEmojis(perfil.nivel_interesse) || 'indefinido'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reuniao:</Text>
            <Text style={styles.infoValue}>{reuniao.marcou ? `MARCADA (${reuniao.tipo || 'tipo indefinido'})` : 'NAO MARCADA'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Falar/Ouvir:</Text>
            <Text style={styles.infoValue}>{limparEmojis(qualificacao.proporcao_falar_ouvir) || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cliente int.:</Text>
            <Text style={styles.infoValue}>{analise?.cliente_interessado ? 'SIM' : 'NAO'}</Text>
          </View>
        </View>
        
        {tipoLigacao === 'facebook_grupos' && reversao && (
          <>
            <Text style={styles.sectionTitle}>Reversao para Credito</Text>
            <View style={reversao.aplicou_pergunta_reversao ? styles.boxPositivo : styles.boxCritico}>
              <Text style={reversao.aplicou_pergunta_reversao ? styles.tagPositivo : styles.tagCritico}>
                [{reversao.aplicou_pergunta_reversao ? 'APLICOU' : 'NAO APLICOU'}] | Qualidade: {limparEmojis(reversao.qualidade_reversao) || 'N/A'}
              </Text>
              <Text>{limparEmojis(reversao.comentario_reversao)}</Text>
            </View>
          </>
        )}
        
        {analise?.alertas_criticos?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Alertas Criticos</Text>
            {analise.alertas_criticos.slice(0, 5).map((a: string, i: number) => (
              <View key={i} style={styles.boxCritico}>
                <Text style={styles.tagCritico}>[ALERTA {i + 1}]</Text>
                <Text>{limparEmojis(a)}</Text>
              </View>
            ))}
          </>
        )}
        
        <Text style={styles.sectionTitle}>Proximo Passo Sugerido</Text>
        <View style={styles.boxAlerta}>
          <Text style={styles.tagAlerta}>[ACAO RECOMENDADA]</Text>
          <Text>{limparEmojis(analise?.proximo_passo_sugerido) || 'Definir proxima acao'}</Text>
        </View>
      </Page>
      
      {/* ========== PÁGINA 2 - COACHING ========== */}
      <Page size="A4" style={styles.page}>
        <HeaderFixo pagina="COACHING" />
        <FooterFixo callid={callid} />
        
        <Text style={styles.sectionTitle}>Feedback Detalhado para o Vendedor</Text>
        
        {analise?.pontos_positivos?.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>O que fez muito bem:</Text>
            {analise.pontos_positivos.slice(0, 6).map((p: string, i: number) => (
              <View key={i} style={styles.boxPositivo}>
                <Text style={styles.tagPositivo}>[ACERTO {i + 1}]</Text>
                <Text>{limparEmojis(p)}</Text>
              </View>
            ))}
          </>
        )}
        
        {analise?.pontos_criticos?.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Pontos para melhorar:</Text>
            {analise.pontos_criticos.slice(0, 5).map((p: string, i: number) => (
              <View key={i} style={styles.boxCritico}>
                <Text style={styles.tagCritico}>[CRITICA {i + 1}]</Text>
                <Text>{limparEmojis(p)}</Text>
              </View>
            ))}
          </>
        )}
        
        {analise?.objecoes_cliente?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Objecoes + Como Contornar</Text>
            {analise.objecoes_cliente.slice(0, 6).map((obj: any, i: number) => (
              <View key={i} style={styles.objecaoCard}>
                <Text style={styles.objecaoTitle}>OBJECAO {i + 1}: "{limparEmojis(obj.objecao) || 'N/A'}"</Text>
                {obj.significado_real && (
                  <Text style={styles.paragraph}>
                    <Text style={styles.objecaoLabel}>Significado real: </Text>
                    {limparEmojis(obj.significado_real)}
                  </Text>
                )}
                {obj.resposta_vendedor && (
                  <Text style={styles.paragraph}>
                    <Text style={styles.objecaoLabel}>O que o vendedor disse: </Text>
                    {limparEmojis(obj.resposta_vendedor)}
                  </Text>
                )}
                <View style={styles.boxScript}>
                  <Text style={styles.tagScript}>[RESPOSTA IDEAL]</Text>
                  <Text>{limparEmojis(obj.resposta_ideal) || 'N/A'}</Text>
                </View>
              </View>
            ))}
          </>
        )}
        
        {analise?.feedback_vendedor && (
          <>
            <Text style={styles.sectionTitle}>Coaching Personalizado Completo</Text>
            <View style={{ backgroundColor: COR_FUNDO_CLARO, padding: 12, borderRadius: 4 }}>
              <Text style={styles.paragraph}>{limparEmojis(analise.feedback_vendedor)}</Text>
            </View>
          </>
        )}
        
        {tipoLigacao === 'facebook_grupos' && analise?.script_proxima_ligacao && (
          <>
            <Text style={styles.sectionTitle}>Script Ideal Proxima Ligacao Similar</Text>
            <View style={styles.boxScript}>
              <Text style={styles.tagScript}>[SCRIPT PRONTO PARA USAR]</Text>
              <Text>{limparEmojis(analise.script_proxima_ligacao)}</Text>
            </View>
          </>
        )}
      </Page>
      
      {/* ========== PÁGINA 3 - TRANSCRIÇÃO ========== */}
      <Page size="A4" style={styles.page}>
        <HeaderFixo pagina="TRANSCRICAO" />
        <FooterFixo callid={callid} />
        
        <Text style={styles.sectionTitle}>Transcricao Completa da Ligacao</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Audio:</Text>
            <Text style={[styles.infoValue, { fontSize: 8, color: COR_TEXTO_CLARO }]}>{audioUrl}</Text>
          </View>
        </View>
        
        <View style={styles.transcricaoBox}>
          <Text>{limparEmojis(transcricao) || 'Transcricao nao disponivel'}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function gerarPDFAnalise(props: PDFAnaliseProps): Promise<Buffer> {
  const blob = await pdf(<PDFAnalise {...props} />).toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
