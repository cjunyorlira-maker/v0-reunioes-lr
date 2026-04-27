import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import React from 'react'

const COR_PRIMARIA = '#1e40af'
const COR_SECUNDARIA = '#3b82f6'
const COR_DESTAQUE = '#f59e0b'
const COR_SUCESSO = '#10b981'
const COR_ERRO = '#ef4444'
const COR_TEXTO = '#1f2937'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: COR_TEXTO, lineHeight: 1.5 },
  header: { backgroundColor: COR_PRIMARIA, color: 'white', padding: 20, marginBottom: 20, borderRadius: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  headerSubtitle: { fontSize: 11, opacity: 0.9 },
  infoCard: { backgroundColor: '#f3f4f6', padding: 15, marginBottom: 20, borderRadius: 6, borderLeft: `4 solid ${COR_PRIMARIA}` },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { fontWeight: 'bold', width: 100 },
  infoValue: { flex: 1 },
  scoreBox: { backgroundColor: COR_PRIMARIA, color: 'white', padding: 10, borderRadius: 6, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between' },
  scoreLabel: { fontSize: 11, fontWeight: 'bold' },
  scoreValue: { fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: COR_PRIMARIA, marginTop: 18, marginBottom: 8, borderBottom: `2 solid ${COR_SECUNDARIA}`, paddingBottom: 4 },
  subsectionTitle: { fontSize: 12, fontWeight: 'bold', color: COR_TEXTO, marginTop: 10, marginBottom: 4 },
  paragraph: { marginBottom: 6, textAlign: 'justify' },
  pilaresGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  pilarBox: { width: '50%', padding: 8, marginBottom: 5 },
  pilarLabel: { fontSize: 9, color: '#6b7280', fontWeight: 'bold' },
  pilarValue: { fontSize: 11, fontWeight: 'bold', color: COR_PRIMARIA },
  boxPositivo: { backgroundColor: '#d1fae5', padding: 10, borderRadius: 4, marginBottom: 6, borderLeft: `3 solid ${COR_SUCESSO}` },
  boxAlerta: { backgroundColor: '#fef3c7', padding: 10, borderRadius: 4, marginBottom: 6, borderLeft: `3 solid ${COR_DESTAQUE}` },
  boxCritico: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 4, marginBottom: 6, borderLeft: `3 solid ${COR_ERRO}` },
  boxScript: { backgroundColor: '#eff6ff', padding: 10, borderRadius: 4, marginBottom: 6, borderLeft: `3 solid ${COR_SECUNDARIA}` },
  objecaoCard: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 4, marginBottom: 8, borderTop: `2 solid ${COR_SECUNDARIA}` },
  objecaoTitle: { fontSize: 10, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 3 },
  objecaoLabel: { fontWeight: 'bold' },
  transcricaoBox: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 4, fontSize: 9, lineHeight: 1.6, color: '#374151' },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#6b7280', borderTop: '1 solid #e5e7eb', paddingTop: 8 },
  pageNumber: { position: 'absolute', bottom: 20, right: 40, fontSize: 8, color: '#6b7280' },
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
  try { return new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) }
  catch { return d }
}
const formatarTipo = (t: string) => ({
  'facebook_grupos': 'Facebook/Grupos',
  'simulador_empresa': 'Simulador Empresa',
  'simulador_facebook': 'Simulador Facebook',
  'ativacao_whatsapp': 'Ativação WhatsApp',
  'confirmacao_reuniao': 'Confirmação Reunião',
  'retorno': 'Retorno/Follow-up',
}[t] || t)

const PDFAnalise: React.FC<PDFAnaliseProps> = ({ callid, vendedor, cliente, telefone, duracaoSegundos, dataLigacao, tipoLigacao, audioUrl, transcricao, analise }) => {
  const pilares = analise?.quatro_pilares || {}
  const reuniao = analise?.reuniao || {}
  const qualificacao = analise?.qualificacao || {}
  const perfil = analise?.perfil_lead || {}
  const reversao = qualificacao?.reversao_facebook_grupos || null
  
  return (
    <Document>
      {/* PÁGINA 1 — RESUMO E DIAGNÓSTICO */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LR MULTIMARCAS</Text>
          <Text style={styles.headerSubtitle}>Sistema de Inteligência Comercial — Análise de Ligação</Text>
        </View>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Vendedor:</Text><Text style={styles.infoValue}>{vendedor}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Cliente:</Text><Text style={styles.infoValue}>{cliente}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Telefone:</Text><Text style={styles.infoValue}>{telefone}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Data/Hora:</Text><Text style={styles.infoValue}>{formatarData(dataLigacao)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Duração:</Text><Text style={styles.infoValue}>{formatarDuracao(duracaoSegundos)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Tipo:</Text><Text style={styles.infoValue}>{formatarTipo(tipoLigacao)}</Text></View>
        </View>
        
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>SCORE GERAL DA LIGAÇÃO</Text>
          <Text style={styles.scoreValue}>{analise?.score_geral || 0}/100</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Resumo Executivo</Text>
        <Text style={styles.paragraph}>{analise?.resumo_executivo || 'N/A'}</Text>
        
        <Text style={styles.sectionTitle}>4 Pilares ({pilares.pilares_coletados || 0}/4)</Text>
        <View style={styles.pilaresGrid}>
          <View style={styles.pilarBox}><Text style={styles.pilarLabel}>CRÉDITO (valor imóvel)</Text><Text style={styles.pilarValue}>{pilares.credito || '—'}</Text></View>
          <View style={styles.pilarBox}><Text style={styles.pilarLabel}>PARCELA (mensalidade)</Text><Text style={styles.pilarValue}>{pilares.parcela || '—'}</Text></View>
          <View style={styles.pilarBox}><Text style={styles.pilarLabel}>ENTRADA (recurso)</Text><Text style={styles.pilarValue}>{pilares.entrada || '—'}</Text></View>
          <View style={styles.pilarBox}><Text style={styles.pilarLabel}>MOMENTO (urgência)</Text><Text style={styles.pilarValue}>{pilares.momento || '—'}</Text></View>
        </View>
        
        <Text style={styles.sectionTitle}>Perfil e Reunião</Text>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Interesse:</Text><Text style={styles.infoValue}>{perfil.nivel_interesse || 'indefinido'}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Reunião:</Text><Text style={styles.infoValue}>{reuniao.marcou ? `Marcada (${reuniao.tipo || 'tipo indefinido'})` : 'Não marcada'}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Falar/Ouvir:</Text><Text style={styles.infoValue}>{qualificacao.proporcao_falar_ouvir || 'N/A'}</Text></View>
        
        {tipoLigacao === 'facebook_grupos' && reversao && (
          <>
            <Text style={styles.sectionTitle}>Reversão para Crédito</Text>
            <View style={styles.boxPositivo}>
              <Text style={{fontWeight: 'bold', marginBottom: 4}}>
                {reversao.aplicou_pergunta_reversao ? 'Aplicou pergunta-chave' : 'Não aplicou'} | Qualidade: {reversao.qualidade_reversao}
              </Text>
              <Text>{reversao.comentario_reversao}</Text>
            </View>
          </>
        )}
        
        <Text style={styles.sectionTitle}>Próximo Passo Sugerido</Text>
        <View style={styles.boxAlerta}><Text>{analise?.proximo_passo_sugerido || 'Definir próxima ação'}</Text></View>
        
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        <Text style={styles.footer} fixed>LR Multimarcas © 2026 — Sistema de IA — CallID: {callid}</Text>
      </Page>
      
      {/* PÁGINA 2 — COACHING */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Feedback Detalhado para o Vendedor</Text>
        
        {analise?.pontos_positivos?.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>O que fez muito bem:</Text>
            {analise.pontos_positivos.slice(0, 6).map((p: string, i: number) => (
              <View key={i} style={styles.boxPositivo}><Text>{i + 1}. {p}</Text></View>
            ))}
          </>
        )}
        
        {analise?.pontos_criticos?.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Pontos para melhorar:</Text>
            {analise.pontos_criticos.slice(0, 5).map((p: string, i: number) => (
              <View key={i} style={styles.boxCritico}><Text>{i + 1}. {p}</Text></View>
            ))}
          </>
        )}
        
        {analise?.alertas_criticos?.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Alertas críticos:</Text>
            {analise.alertas_criticos.slice(0, 5).map((a: string, i: number) => (
              <View key={i} style={styles.boxCritico}><Text>{a}</Text></View>
            ))}
          </>
        )}
        
        {analise?.objecoes_cliente?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Objeções + Como Contornar</Text>
            {analise.objecoes_cliente.slice(0, 6).map((obj: any, i: number) => (
              <View key={i} style={styles.objecaoCard}>
                <Text style={styles.objecaoTitle}>"{obj.objecao || 'N/A'}"</Text>
                {obj.significado_real && <Text style={styles.paragraph}><Text style={styles.objecaoLabel}>Significado real: </Text>{obj.significado_real}</Text>}
                {obj.resposta_vendedor && <Text style={styles.paragraph}><Text style={styles.objecaoLabel}>Resposta do vendedor: </Text>{obj.resposta_vendedor}</Text>}
                <View style={styles.boxScript}>
                  <Text style={styles.objecaoLabel}>Resposta IDEAL:</Text>
                  <Text>{obj.resposta_ideal || 'N/A'}</Text>
                </View>
              </View>
            ))}
          </>
        )}
        
        {analise?.feedback_vendedor && (
          <>
            <Text style={styles.sectionTitle}>Coaching Personalizado</Text>
            <Text style={styles.paragraph}>{analise.feedback_vendedor}</Text>
          </>
        )}
        
        {tipoLigacao === 'facebook_grupos' && analise?.script_proxima_ligacao && (
          <>
            <Text style={styles.sectionTitle}>Script Ideal Próxima Ligação Similar</Text>
            <View style={styles.boxScript}><Text>{analise.script_proxima_ligacao}</Text></View>
          </>
        )}
        
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        <Text style={styles.footer} fixed>LR Multimarcas © 2026 — Sistema de IA — CallID: {callid}</Text>
      </Page>
      
      {/* PÁGINA 3 — TRANSCRIÇÃO */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Transcrição Completa</Text>
        <Text style={[styles.paragraph, {fontSize: 9, color: '#6b7280', marginBottom: 10}]}>Áudio original disponível em: {audioUrl}</Text>
        <View style={styles.transcricaoBox}><Text>{transcricao || 'Transcrição não disponível'}</Text></View>
        
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        <Text style={styles.footer} fixed>LR Multimarcas © 2026 — Sistema de IA — CallID: {callid}</Text>
      </Page>
    </Document>
  )
}

export async function gerarPDFAnalise(props: PDFAnaliseProps): Promise<Buffer> {
  const blob = await pdf(<PDFAnalise {...props} />).toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
