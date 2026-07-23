'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Mic, 
  Trash2,
  CheckCircle, 
  XCircle, 
  Star, 
  Eye,
  Loader2,
  AlertTriangle,
  ArrowRight,
  FileText,
  User,
  Building2,
  RotateCcw
} from 'lucide-react'
import { AudioRecorder } from './audio-recorder'
import { cn } from '@/lib/utils'

interface Atendimento {
  id: string
  lead_id: number
  kommo_id: string
  nome_lead: string
  responsavel: string
  atendente: string
  equipe: string
  audio_url: string | null
  duracao_segundos: number | null
  transcricao_completa: string | null
  resumo: string | null
  motivo_nao_fechamento: string | null
  score_geral: number | null
  score_abordagem: number | null
  score_financiamento: number | null
  score_consorcio: number | null
  score_fechamento: number | null
  pontos_positivos: string[] | null
  pontos_criticos: string[] | null
  feedback_coaching: string | null
  situacao_financeira: {
    tinha_entrada: boolean | null
    impeditivo_principal: string | null
    perfil_mapeado: boolean | null
  } | null
  garantiu_contemplacao: boolean | null
  usou_prova_social: {
    reclame_aqui: boolean | null
    site_empresa: boolean | null
    referencias_clientes: boolean | null
  } | null
  tecnicas_fechamento: {
    tentou_fechar: boolean | null
    quantidade_tentativas: number | null
    tecnicas_usadas: string[] | null
    resultado: string | null
  } | null
  proximo_passo_sugerido: string | null
  objecoes_cliente: Array<{
    objecao: string
    resposta_vendedor: string
    eficaz: boolean
  }> | null
  status: string
  fechou: boolean
  is_benchmark: boolean
  data_atendimento: string
  created_at: string
  atendimento_original_id?: string | null
  retorno_audio_url?: string | null
  retorno_transcricao?: string | null
  retorno_resumo?: string | null
  retorno_fechou?: boolean | null
  retorno_data?: string | null
  gravando?: boolean
  gravando_por?: string | null
}

interface AtendimentoCardProps {
  atendimento: Atendimento
  userEquipe?: string
  userName?: string
  onUpdate: () => void
}

const analiseEmojis: Record<string, string> = {
  'abordagem': '🎯',
  'empatia': '🤝',
  'clareza': '📝',
  'conhecimento': '🧠',
  'profissionalismo': '💼',
  'paciencia': '😊',
  'efetividade': '✅',
  'fechamento': '🎁',
}

export function AtendimentoCard({ atendimento, userEquipe, userName, onUpdate }: AtendimentoCardProps) {
  const [showRecorder, setShowRecorder] = useState(false)
  const [showRecorderRetorno, setShowRecorderRetorno] = useState(false)
  const [showAnalise, setShowAnalise] = useState(false)
  const [markingResult, setMarkingResult] = useState<'fechou' | 'nao_fechou' | null>(null)
  const [deletingAtendimento, setDeletingAtendimento] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const temAnalise = atendimento.score_geral !== null

  const statusColor = {
    'aguardando': 'from-amber-500 to-orange-600',
    'falha_audio': 'from-red-500 to-rose-600',
    'gravando': 'from-blue-500 to-cyan-600',
    'processando': 'from-purple-500 to-violet-600',
    'concluido': 'from-emerald-500 to-teal-600',
    'erro': 'from-red-500 to-rose-600'
  }[atendimento.status] || 'from-gray-500 to-gray-600'

  const statusLabel = {
    'aguardando': '⏳ Aguardando',
    'falha_audio': '🔇 Áudio sem fala',
    'gravando': '🎤 Gravando',
    'processando': '⚙️ Processando',
    'concluido': '✓ Concluído',
    'erro': '❌ Erro'
  }[atendimento.status] || 'Desconhecido'

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-white/50'
    if (score >= 8) return 'text-emerald-400'
    if (score >= 6) return 'text-amber-400'
    return 'text-red-400'
  }

  const handleMarkResult = async (fechou: boolean) => {
    setMarkingResult(fechou ? 'fechou' : 'nao_fechou')
    try {
      await fetch(`/api/atendimentos/${atendimento.id}/resultado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechou }),
      })
      onUpdate()
    } catch (err) {
      console.error('Erro ao marcar resultado:', err)
    } finally {
      setMarkingResult(null)
    }
  }

  const handleDeleteAtendimento = async () => {
    setDeletingAtendimento(true)
    try {
      console.log("[v0] Deletando atendimento:", atendimento.id)
      const response = await fetch(`/api/atendimentos/${atendimento.id}`, {
        method: 'DELETE',
      })
      
      console.log("[v0] Resposta do delete:", response.status, response.statusText)
      
      if (response.ok) {
        console.log("[v0] Atendimento deletado com sucesso")
        onUpdate()
      } else {
        const error = await response.json()
        console.error("[v0] Erro ao deletar:", error)
        alert(`Erro: ${error.error || 'Falha ao deletar'}`)
      }
    } catch (err) {
      console.error('[v0] Erro na chamada delete:', err)
      alert('Erro ao deletar atendimento')
    } finally {
      setDeletingAtendimento(false)
      setShowDeleteConfirm(false)
    }
  }

  const isFalhaAudio = atendimento.status === 'falha_audio'
  const isAguardando = atendimento.status === 'aguardando' || isFalhaAudio
  const isProcessando = atendimento.status === 'processando' || atendimento.status === 'gravando'
  const isConcluido = atendimento.status === 'concluido'

  return (
    <>
      <Card className={cn(
        'relative overflow-hidden border-white/10 transition-all duration-300 hover:scale-[1.02] hover:border-white/25',
        atendimento.fechou && 'border-emerald-500/30',
        atendimento.is_benchmark && 'ring-1 ring-amber-500/40',
        isProcessando && 'ring-1 ring-blue-500/30'
      )}
      style={{
        background: 'rgba(0,0,0,0.15)',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Linha colorida no topo */}
        <div className={`h-0.5 w-full bg-gradient-to-r ${statusColor}`} />

        {/* Indicador de Gravacao em Tempo Real */}
        {atendimento.gravando && (
          <div className='flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 border-b border-red-500/30'>
            <span className='relative flex h-2 w-2'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75'></span>
              <span className='relative inline-flex rounded-full h-2 w-2 bg-red-500'></span>
            </span>
            <p className='text-red-400 text-[11px] font-bold animate-pulse'>
              {atendimento.gravando_por || 'Alguem'} esta gravando...
            </p>
          </div>
        )}

        <CardContent className='p-3 space-y-2.5'>
          {/* Header: Status e Badges */}
          <div className='flex items-center justify-between gap-2'>
            <div className={`px-2 py-1 rounded-md bg-gradient-to-r ${statusColor} text-white text-[10px] font-bold`}>
              {statusLabel}
            </div>
            <div className='flex gap-1.5 flex-wrap'>
              {atendimento.is_benchmark && (
                <Badge className='bg-amber-500/25 text-amber-300 border-0 text-[9px] px-1.5 py-0'>
                  <Star className='w-2.5 h-2.5 mr-0.5' />
                  Benchmark
                </Badge>
              )}
              {isConcluido && temAnalise && (
                <Badge className='bg-emerald-500/25 text-emerald-300 border-0 text-[9px] px-1.5 py-0'>
                  Analisado
                </Badge>
              )}
              {isConcluido && atendimento.fechou === false && (
                <Badge className='bg-red-500/25 text-red-400 border-0 text-[9px] px-1.5 py-0'>
                  <XCircle className='w-2.5 h-2.5 mr-0.5' />
                  Nao Fechou
                </Badge>
              )}
              {isConcluido && atendimento.fechou === true && (
                <Badge className='bg-emerald-500/25 text-emerald-300 border-0 text-[9px] px-1.5 py-0'>
                  <CheckCircle className='w-2.5 h-2.5 mr-0.5' />
                  Fechou
                </Badge>
              )}
            </div>
          </div>

          {/* Nome do Lead */}
          <div>
            <h3 className='text-sm font-bold text-white leading-tight'>
              {atendimento.nome_lead || 'Sem nome'}
            </h3>
            <p className='text-[10px] text-white/40'>ID: {atendimento.kommo_id}</p>
          </div>

          {/* Atendente, Vendedor e Equipe */}
          <div className='p-2 rounded-lg bg-black/10 border border-white/5 space-y-1.5'>
            <div className='grid grid-cols-2 gap-2'>
              <div className='flex items-center gap-1.5'>
                <User className='w-3 h-3 text-[#d4af37] flex-shrink-0' />
                <div className='min-w-0'>
                  <p className='text-[9px] text-white/40 uppercase tracking-wide'>Atendente</p>
                  <p className='text-[11px] font-bold text-white truncate'>
                    {atendimento.atendente || 'Nao informado'}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-1.5'>
                <Building2 className='w-3 h-3 text-[#d4af37] flex-shrink-0' />
                <div className='min-w-0'>
                  <p className='text-[9px] text-white/40 uppercase tracking-wide'>Equipe</p>
                  <p className='text-[11px] font-bold text-white truncate'>
                    {atendimento.equipe || 'Padrao'}
                  </p>
                </div>
              </div>
            </div>
            {atendimento.responsavel && atendimento.responsavel !== atendimento.atendente && (
              <div className='flex items-center gap-1.5 pt-1.5 border-t border-white/5'>
                <User className='w-3 h-3 text-violet-400 flex-shrink-0' />
                <div className='min-w-0'>
                  <p className='text-[9px] text-white/40 uppercase tracking-wide'>Vendedor</p>
                  <p className='text-[11px] font-medium text-white/80 truncate'>
                    {atendimento.responsavel}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Score Geral - destaque */}
          {temAnalise && (
            <div className='px-2.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <p className='text-[9px] text-white/50 uppercase tracking-widest font-bold'>Score Geral</p>
                  <p className={cn('text-xl font-black leading-none mt-0.5', getScoreColor(atendimento.score_geral))}>
                    {atendimento.score_geral?.toFixed(1)}
                    <span className='text-sm text-white/40 font-normal ml-0.5'>/10</span>
                  </p>
                </div>
                <div className='flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-emerald-500 to-teal-500'
                    style={{ width: `${Math.min((atendimento.score_geral! / 10) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Resumo da analise - apenas para fechados ou fechou=null */}
          {atendimento.resumo && atendimento.fechou !== false && (
            <p className='text-[11px] text-white/70 line-clamp-2 bg-black/10 px-2.5 py-2 rounded-lg border border-white/5'>
              {atendimento.resumo}
            </p>
          )}

          {/* Motivo nao fechamento - apenas para fechados */}
          {atendimento.motivo_nao_fechamento && atendimento.fechou === true && (
            <div className='px-2.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20'>
              <p className='text-[10px] text-red-400 font-bold mb-0.5 flex items-center gap-1'>
                <AlertTriangle className='w-2.5 h-2.5' />
                Motivo do Nao Fechamento
              </p>
              <p className='text-[11px] text-white/70'>{atendimento.motivo_nao_fechamento}</p>
            </div>
          )}

          {/* Botoes de Acao */}
          <div className='flex flex-col gap-1.5 pt-1'>

            {/* Botoes Nao Fechados: Gravar Retorno + Analise em linha, Fechou embaixo */}
            {isConcluido && atendimento.fechou === false && (
              <div className='flex flex-col gap-1.5'>
                <div className='flex gap-1.5'>
                  {!showRecorderRetorno && (
                    <Button
                      onClick={() => setShowRecorderRetorno(true)}
                      size='sm'
                      className='flex-1 h-7 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-[11px] font-semibold rounded-md transition-all duration-300'
                    >
                      <RotateCcw className='w-3 h-3 mr-1' />
                      Gravar Retorno
                    </Button>
                  )}
                  {temAnalise && (
                    <Button
                      onClick={() => setShowAnalise(true)}
                      size='sm'
                      className='flex-1 h-7 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[11px] font-semibold rounded-md transition-all duration-300'
                    >
                      <Eye className='w-3 h-3 mr-1' />
                      Analise
                    </Button>
                  )}
                </div>
                {/* Botao Fechou em linha propria */}
                <Button
                  onClick={() => handleMarkResult(true)}
                  disabled={markingResult !== null}
                  size='sm'
                  className='w-full h-7 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 text-[11px] font-semibold rounded-md transition-all duration-300'
                >
                  {markingResult === 'fechou' ? (
                    <Loader2 className='w-3 h-3 mr-1 animate-spin' />
                  ) : (
                    <CheckCircle className='w-3 h-3 mr-1' />
                  )}
                  Marcar como Fechou
                </Button>
              </div>
            )}

            {/* Badge de falha de audio - regravar */}
            {isFalhaAudio && (
              <div className='mb-2 flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/15 px-2 py-1.5 text-[11px] font-semibold text-red-300'>
                <span aria-hidden>🔇</span>
                <span>Áudio sem fala — regravar</span>
              </div>
            )}

            {/* Linha final: Kommo + Gravar (aguardando) + Analise (demais) + Delete */}
            <div className='flex gap-1.5'>
              {/* Botao Kommo */}
              {atendimento.kommo_id && (
                <a
                  href={`https://crm2lrmultimarcascom.kommo.com/leads/detail/${atendimento.kommo_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className='h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-md border border-[rgba(107,79,187,0.4)] bg-[rgba(107,79,187,0.15)] hover:bg-[rgba(107,79,187,0.25)] hover:border-[rgba(107,79,187,0.6)] transition-all'
                  title="Abrir no Kommo"
                >
                  <img src="/images/kommo-logo.png" alt="Kommo" className="w-4 h-4" />
                </a>
              )}

              {/* Botao Gravar - aguardando */}
              {isAguardando && !showRecorder && (
                <Button
                  onClick={() => setShowRecorder(true)}
                  size='sm'
                  className='flex-1 h-7 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-[11px] font-semibold rounded-md transition-all duration-300'
                >
                  <Mic className='w-3 h-3 mr-1' />
                  Gravar
                </Button>
              )}

              {/* Botao Ver Analise - fechados ou fechou=null */}
              {temAnalise && isConcluido && atendimento.fechou !== false && (
                <Button
                  onClick={() => setShowAnalise(true)}
                  size='sm'
                  className='flex-1 h-7 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[11px] font-semibold rounded-md transition-all duration-300'
                >
                  <Eye className='w-3 h-3 mr-1' />
                  Analise
                </Button>
              )}

              {/* Botao Reverter para Nao Fechado - apenas fechados */}
              {isConcluido && atendimento.fechou === true && (
                <Button
                  onClick={() => handleMarkResult(false)}
                  disabled={markingResult !== null}
                  size='sm'
                  className='h-7 px-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 text-[11px] font-semibold rounded-md transition-all duration-300'
                  title='Reverter para Nao Fechado'
                >
                  {markingResult === 'nao_fechou' ? (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  ) : (
                    <RotateCcw className='w-3 h-3' />
                  )}
                </Button>
              )}

              {/* Botao Deletar - apenas Admin */}
              {userEquipe === 'Admin' && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 flex-shrink-0 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/15 border border-white/10'
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className='w-3 h-3' />
                </Button>
              )}
            </div>
          </div>

          {/* Confirmacao de Delete */}
          {showDeleteConfirm && (
            <div className='mt-2 p-2.5 rounded-lg bg-red-500/15 border border-red-500/25'>
              <p className='text-red-400 text-xs font-bold mb-1'>Confirmar exclusao?</p>
              <p className='text-white/60 text-[11px] mb-2'>Esta acao nao pode ser desfeita.</p>
              <div className='flex gap-1.5'>
                <Button
                  onClick={handleDeleteAtendimento}
                  disabled={deletingAtendimento}
                  size='sm'
                  className='flex-1 h-7 bg-red-500 hover:bg-red-600 text-white text-[11px]'
                >
                  {deletingAtendimento ? <Loader2 className='w-3 h-3 animate-spin' /> : 'Sim, Excluir'}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  size='sm'
                  variant='ghost'
                  className='flex-1 h-7 text-white/60 hover:text-white text-[11px]'
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Gravador de Áudio - Atendimento inicial */}
          {showRecorder && isAguardando && (
            <div className='mt-3 p-4 rounded-xl bg-blue-500/15 border border-blue-500/25'>
              <AudioRecorder
                atendimentoId={atendimento.id}
                userName={userName || atendimento.atendente || 'Alguem'}
                onComplete={() => {
                  setShowRecorder(false)
                  onUpdate()
                }}
                onCancel={() => setShowRecorder(false)}
              />
            </div>
          )}

          {/* Gravador de Retorno - no mesmo card */}
          {showRecorderRetorno && isConcluido && atendimento.fechou === false && (
            <div className='mt-3 p-4 rounded-xl bg-amber-500/15 border border-amber-500/25'>
              <p className='text-amber-400 text-xs font-bold mb-2 flex items-center gap-1'>
                <RotateCcw className='w-3 h-3' />
                Gravando Retorno
              </p>
              <AudioRecorder
                atendimentoId={atendimento.id}
                isRetorno={true}
                userName={userName || atendimento.atendente || 'Alguem'}
                onComplete={() => {
                  setShowRecorderRetorno(false)
                  onUpdate()
                }}
                onCancel={() => setShowRecorderRetorno(false)}
              />
            </div>
          )}

          {/* Processando */}
          {isProcessando && (
            <div className='flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400'>
              <Loader2 className='w-5 h-5 animate-spin' />
              <span className='text-sm font-medium'>Processando transcrição...</span>
            </div>
          )}

          {/* Marcar Resultado - Concluído */}
          {isConcluido && atendimento.fechou === null && (
            <div className='flex gap-2 pt-2'>
              <Button
                onClick={() => handleMarkResult(true)}
                disabled={markingResult !== null}
                className='flex-1 h-10 bg-emerald-500/25 text-emerald-400 hover:bg-emerald-500/35 border border-emerald-500/30 rounded-lg transition-all'
              >
                {markingResult === 'fechou' ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <>
                    <CheckCircle className='w-4 h-4 mr-1.5' />
                    Fechou
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleMarkResult(false)}
                disabled={markingResult !== null}
                className='flex-1 h-10 bg-red-500/25 text-red-400 hover:bg-red-500/35 border border-red-500/30 rounded-lg transition-all'
              >
                {markingResult === 'nao_fechou' ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <>
                    <XCircle className='w-4 h-4 mr-1.5' />
                    Não Fechou
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Análise Completa */}
      <Dialog open={showAnalise} onOpenChange={setShowAnalise}>
        <DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto bg-black/90 border border-white/15 backdrop-blur-2xl rounded-2xl'>
          <DialogHeader>
            <DialogTitle className='text-white text-xl font-black flex items-center gap-2'>
              <FileText className='w-6 h-6 text-emerald-400' />
              Análise Completa
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-4 mt-4'>
            {/* Header com Info */}
            <div className='p-4 rounded-xl bg-white/5 border border-white/10'>
              <p className='text-white font-bold text-base mb-2'>{atendimento.nome_lead}</p>
              <div className='grid grid-cols-2 gap-2 text-xs text-white/60'>
                <p>👤 {atendimento.responsavel}</p>
                <p>🏢 {atendimento.equipe}</p>
                <p>📅 {new Date(atendimento.data_atendimento).toLocaleDateString('pt-BR')}</p>
                <p>📊 Score: <span className={cn('font-bold', getScoreColor(atendimento.score_geral))}>{atendimento.score_geral}/10</span></p>
              </div>
            </div>

            {/* Score Detalhado */}
            <div className='p-4 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/25'>
              <h3 className='text-white font-bold mb-3 flex items-center gap-2'>
                📈 Scores Detalhados
              </h3>
              <div className='grid grid-cols-2 gap-3'>
                {[
                  { label: '🎯 Abordagem', score: atendimento.score_abordagem },
                  { label: '💼 Financiamento', score: atendimento.score_financiamento },
                  { label: '🏛️ Consórcio', score: atendimento.score_consorcio },
                  { label: '🎁 Fechamento', score: atendimento.score_fechamento },
                ].map((item, i) => (
                  <div key={i} className='p-2 rounded-lg bg-white/5'>
                    <p className='text-xs text-white/60 mb-1'>{item.label}</p>
                    <p className={cn('text-xl font-black', getScoreColor(item.score))}>
                      {item.score?.toFixed(1) || '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo */}
            {atendimento.resumo && (
              <div className='p-4 rounded-xl bg-white/5 border border-white/10'>
                <h3 className='text-white font-bold mb-2 flex items-center gap-2'>
                  📝 Resumo da Análise
                </h3>
                <p className='text-sm text-white/70 leading-relaxed'>{atendimento.resumo}</p>
              </div>
            )}

            {/* Pontos Positivos */}
            {atendimento.pontos_positivos && atendimento.pontos_positivos.length > 0 && (
              <div className='p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/25'>
                <h3 className='text-emerald-400 font-bold mb-3 flex items-center gap-2'>
                  ✅ Pontos Positivos
                </h3>
                <ul className='space-y-2'>
                  {atendimento.pontos_positivos.map((ponto, i) => (
                    <li key={i} className='flex items-start gap-2 text-sm text-white/70'>
                      <CheckCircle className='w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5' />
                      {ponto}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pontos a Melhorar */}
            {atendimento.pontos_criticos && atendimento.pontos_criticos.length > 0 && (
              <div className='p-4 rounded-xl bg-red-500/15 border border-red-500/25'>
                <h3 className='text-red-400 font-bold mb-3 flex items-center gap-2'>
                  🎯 Pontos a Melhorar
                </h3>
                <ul className='space-y-2'>
                  {atendimento.pontos_criticos.map((ponto, i) => (
                    <li key={i} className='flex items-start gap-2 text-sm text-white/70'>
                      <AlertTriangle className='w-4 h-4 text-red-400 flex-shrink-0 mt-0.5' />
                      {ponto}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Feedback Coaching */}
            {atendimento.feedback_coaching && (
              <div className='p-4 rounded-xl bg-blue-500/15 border border-blue-500/25'>
                <h3 className='text-blue-400 font-bold mb-2 flex items-center gap-2'>
                  💡 Feedback para o Vendedor
                </h3>
                <p className='text-sm text-white/70'>{atendimento.feedback_coaching}</p>
              </div>
            )}

            {/* Próximo Passo */}
            {atendimento.proximo_passo_sugerido && (
              <div className='p-4 rounded-xl bg-amber-500/15 border border-amber-500/25'>
                <h3 className='text-amber-400 font-bold mb-2 flex items-center gap-2'>
                  <ArrowRight className='w-4 h-4' />
                  Próximo Passo Sugerido
                </h3>
                <p className='text-sm text-white/70'>{atendimento.proximo_passo_sugerido}</p>
              </div>
            )}

            {/* Alerta Crítico */}
            {atendimento.garantiu_contemplacao && (
              <div className='p-4 rounded-xl bg-red-600/25 border-2 border-red-500/50'>
                <p className='text-red-300 font-bold flex items-center gap-2'>
                  <AlertTriangle className='w-5 h-5' />
                  ⚠️ ALERTA CRÍTICO: Vendedor garantiu data de contemplação!
                </p>
              </div>
            )}

            {/* Análise de Retorno */}
            {atendimento.retorno_resumo && (
              <div className='p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/30'>
                <h3 className='text-amber-400 font-bold mb-3 flex items-center gap-2'>
                  <RotateCcw className='w-5 h-5' />
                  Análise do Retorno
                </h3>
                <div className='space-y-3'>
                  <div>
                    <p className='text-xs text-white/60 mb-1'>Resultado:</p>
                    <p className='text-sm text-white font-bold'>
                      {atendimento.retorno_fechou ? '✅ FECHOU!' : '❌ Não fechou'}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-white/60 mb-1'>Resumo:</p>
                    <p className='text-sm text-white/70'>{atendimento.retorno_resumo}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botão Download PDF */}
            <div className='flex gap-2 pt-2'>
              <Button
                onClick={() => {
                  // Implementar download PDF com transcrição
                  const element = document.createElement('a')
                  const file = new Blob([`ATENDIMENTO COMPLETO\n\n${atendimento.nome_lead}\n\n${atendimento.transcricao_completa}`], {type: 'text/plain'})
                  element.href = URL.createObjectURL(file)
                  element.download = `transcricao_${atendimento.nome_lead.replace(/\s+/g, '_')}.txt`
                  document.body.appendChild(element)
                  element.click()
                  document.body.removeChild(element)
                }}
                size='sm'
                className='flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white'
              >
                📥 Baixar Transcrição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
