"use client"

// ═══════════════════════════════════════════════════════════════════
// CENTRAL DE DECISÃO — o relatório novo (substitui o kanban antigo)
// Alimentado 100% pelos dados que a página já carrega (sem API nova).
// Tolerante a dados antigos: atendimentos sem Análise 2.0 entram no
// que der (score clássico) e ficam de fora do que exige os campos novos.
// ═══════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react"
import {
  Trophy, Users, TrendingDown, AlertTriangle, Microscope, Lightbulb,
  LayoutDashboard, Flame, Snowflake, CloudSun, ChevronDown, ChevronUp, Quote,
} from "lucide-react"

type Atd = any

const ABAS = [
  { id: "visao", label: "Visão", icon: LayoutDashboard },
  { id: "top10", label: "Top 10", icon: Trophy },
  { id: "atendentes", label: "Atendentes", icon: Users },
  { id: "melhorar", label: "A Melhorar", icon: TrendingDown },
  { id: "contemplacao", label: "Contemplação", icon: AlertTriangle },
  { id: "autopsia", label: "Autópsia", icon: Microscope },
  { id: "proximos", label: "Próx. Passos", icon: Lightbulb },
] as const

const ETIQUETA_LABEL: Record<string, string> = {
  sem_entrada: "Sem entrada", vai_levantar_entrada: "Vai levantar entrada", parcela: "Parcela alta",
  sem_perfil: "Sem perfil", sem_tomador_decisao: "Terceiro decisor", vai_pensar: "Vai pensar",
  tem_entrada_analisando: "Tem entrada, analisando", indecisao: "Indecisão", faltou_gas_vendedor: "Faltou gás do vendedor",
  concorrencia: "Concorrência", nao_quer_consorcio: "Não quer consórcio", experiencia_ruim: "Experiência ruim",
  nao_gostou_atendimento: "Não gostou do atendimento", cpf_consultado: "CPF/score",
}

const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`
const nota = (n: any) => (n === null || n === undefined ? "—" : Number(n).toFixed(1))

function TempBadge({ t }: { t?: string | null }) {
  if (t === "quente") return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-400"><Flame className="h-3 w-3" />quente</span>
  if (t === "morno") return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-400"><CloudSun className="h-3 w-3" />morno</span>
  if (t === "frio") return <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-400"><Snowflake className="h-3 w-3" />frio</span>
  return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/50">sem 2.0</span>
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}>{children}</div>
}

export function CentralDecisao({ atendimentos }: { atendimentos: Atd[] }) {
  const [aba, setAba] = useState<(typeof ABAS)[number]["id"]>("visao")
  const [expandido, setExpandido] = useState<string | null>(null)

  const concluidos = useMemo(() => atendimentos.filter((a) => a.status === "concluido"), [atendimentos])
  const com20 = useMemo(() => concluidos.filter((a) => a.perfil_temperatura), [concluidos])
  const fechados = useMemo(() => concluidos.filter((a) => a.fechou), [concluidos])
  const naoFechados = useMemo(() => concluidos.filter((a) => !a.fechou), [concluidos])

  // ── ranking por atendente ──
  const porAtendente = useMemo(() => {
    const map: Record<string, Atd[]> = {}
    concluidos.forEach((a) => {
      const k = a.atendente || a.responsavel || "Sem nome"   // avaliação é de quem ATENDEU (supervisor)
      ;(map[k] = map[k] || []).push(a)
    })
    return Object.entries(map)
      .map(([nome, lista]) => {
        const comScore = lista.filter((a) => a.score_geral != null)
        const comCtx = lista.filter((a) => a.nota_contextual != null)
        const aproveitou = lista.filter((a) => a.aproveitou_potencial === true).length
        const com20local = lista.filter((a) => a.aproveitou_potencial !== null && a.aproveitou_potencial !== undefined).length
        return {
          nome, total: lista.length,
          media: comScore.length ? comScore.reduce((s, a) => s + a.score_geral, 0) / comScore.length : null,
          mediaCtx: comCtx.length ? comCtx.reduce((s, a) => s + Number(a.nota_contextual), 0) / comCtx.length : null,
          fechados: lista.filter((a) => a.fechou).length,
          aproveitamento: com20local ? aproveitou / com20local : null,
          prometeu: lista.filter((a) => a.garantiu_contemplacao === true).length,
          feedbacks: lista.map((a) => a.feedback_coaching).filter(Boolean),
        }
      })
      .filter((r) => r.total >= 2)
  }, [concluidos])

  // ── matriz temperatura × desfecho ──
  const matriz = useMemo(() => {
    const cel = { quenteBom: [] as Atd[], quentePerda: [] as Atd[], frioBom: [] as Atd[], frioAtencao: [] as Atd[] }
    com20.forEach((a) => {
      const quente = a.perfil_temperatura === "quente" || a.perfil_temperatura === "morno"
      if (quente && (a.fechou || a.aproveitou_potencial)) cel.quenteBom.push(a)
      else if (quente && a.perda_evitavel) cel.quentePerda.push(a)
      else if (!quente && a.aproveitou_potencial) cel.frioBom.push(a)
      else if (!quente) cel.frioAtencao.push(a)
      else cel.quenteBom.push(a)
    })
    return cel
  }, [com20])

  // ── autópsia: etiquetas + declarado vs real ──
  const autopsia = useMemo(() => {
    const cont: Record<string, number> = {}
    naoFechados.forEach((a) => {
      const e = a.etiqueta_ia || a.etiqueta
      if (e) cont[e] = (cont[e] || 0) + 1
    })
    const ranking = Object.entries(cont).sort((a, b) => b[1] - a[1])
    const divergentes = naoFechados.filter((a) => a.motivo_declarado && a.motivo_real_inferido && a.motivo_declarado !== a.motivo_real_inferido)
    return { ranking, divergentes, total: naoFechados.length }
  }, [naoFechados])

  // ── contemplação (compliance) ──
  const contemplacao = useMemo(() => {
    const prometeu = concluidos.filter((a) => a.garantiu_contemplacao === true)
    return {
      fechouComData: prometeu.filter((a) => a.fechou && (a.trechos_garantia || []).some((t: any) => t?.tipo === "deu_data")),
      fechouExpectativa: prometeu.filter((a) => a.fechou && !(a.trechos_garantia || []).some((t: any) => t?.tipo === "deu_data")),
      naoFechouPrometeu: prometeu.filter((a) => !a.fechou),
    }
  }, [concluidos])

  const toggle = (id: string) => setExpandido(expandido === id ? null : id)

  return (
    <div className="space-y-4">
      {/* abas */}
      <div className="flex flex-wrap gap-2">
        {ABAS.map((t) => {
          const Icon = t.icon
          const ativo = aba === t.id
          return (
            <button key={t.id} onClick={() => setAba(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${ativo ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"}`}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          )
        })}
        <span className="ml-auto self-center text-[11px] text-white/40">{com20.length}/{concluidos.length} com Análise 2.0</span>
      </div>

      {/* ═══ VISÃO ═══ */}
      {aba === "visao" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card><p className="text-[11px] uppercase tracking-wider text-white/50">Concluídos</p><p className="mt-1 text-2xl font-black">{concluidos.length}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-white/50">Conversão</p><p className="mt-1 text-2xl font-black text-emerald-400">{concluidos.length ? fmtPct(fechados.length / concluidos.length) : "—"}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-white/50">Perdas evitáveis</p><p className="mt-1 text-2xl font-black text-red-400">{matriz.quentePerda.length}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-white/50">⚠ Prometeu contemplação</p><p className="mt-1 text-2xl font-black text-amber-400">{concluidos.filter((a) => a.garantiu_contemplacao).length}</p></Card>
          </div>

          <p className="text-xs font-bold uppercase tracking-wider text-white/50">Matriz cliente × atendimento</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="border-red-500/40 bg-red-500/10">
              <p className="text-sm font-black text-red-400">🔴 PERDA EVITÁVEL — cliente com potencial, atendimento abaixo ({matriz.quentePerda.length})</p>
              <p className="mb-2 text-[11px] text-white/50">o quadrante do dinheiro deixado na mesa — prioridade máxima de coaching</p>
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {matriz.quentePerda.map((a) => (
                  <div key={a.id} className="rounded-lg bg-black/30 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">{a.nome_lead}</span>
                      <span className="shrink-0 text-white/50">{a.atendente || a.responsavel}</span>
                    </div>
                    {a.motivo_real_inferido && <p className="mt-0.5 text-white/60">real: {a.motivo_real_inferido}</p>}
                  </div>
                ))}
                {matriz.quentePerda.length === 0 && <p className="text-xs text-white/40">nenhuma na seleção 🎉</p>}
              </div>
            </Card>
            <div className="grid grid-rows-3 gap-3">
              <Card className="border-emerald-500/30"><p className="text-sm font-bold text-emerald-400">✅ Potencial bem aproveitado</p><p className="text-2xl font-black">{matriz.quenteBom.length}</p></Card>
              <Card className="border-sky-500/30"><p className="text-sm font-bold text-sky-400">🟢 Cliente frio · fez o possível</p><p className="text-2xl font-black">{matriz.frioBom.length}</p></Card>
              <Card className="border-amber-500/30"><p className="text-sm font-bold text-amber-400">🟡 Cliente frio · atenção ao padrão</p><p className="text-2xl font-black">{matriz.frioAtencao.length}</p></Card>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOP 10 ═══ */}
      {aba === "top10" && (
        <div className="space-y-2">
          {concluidos.filter((a) => a.score_geral != null).sort((a, b) => b.score_geral - a.score_geral || (b.nota_contextual || 0) - (a.nota_contextual || 0)).slice(0, 10).map((a, i) => (
            <Card key={a.id} className={i === 0 ? "border-amber-500/50" : ""}>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-amber-400">{i + 1}º</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{a.nome_lead} <span className="font-normal text-white/50">· atendeu: {a.atendente || a.responsavel} · {a.equipe}</span></p>
                  <p className="text-xs text-white/50">{a.fechou ? "✅ fechou" : "não fechou"} · <TempBadge t={a.perfil_temperatura} /></p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-400">{nota(a.score_geral)}</p>
                  {a.nota_contextual != null && <p className="text-[11px] text-white/50">contextual {nota(a.nota_contextual)}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ═══ ATENDENTES (ranking justo) ═══ */}
      {aba === "atendentes" && (
        <div className="space-y-2">
          {[...porAtendente].sort((a, b) => (b.mediaCtx ?? b.media ?? 0) - (a.mediaCtx ?? a.media ?? 0)).map((r, i) => (
            <Card key={r.nome}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg font-black text-amber-400">{i + 1}º</span>
                <p className="min-w-0 flex-1 truncate font-bold">{r.nome} <span className="font-normal text-white/40">({r.total} atds)</span></p>
                <div className="flex gap-4 text-center text-xs">
                  <div><p className="font-black text-base">{nota(r.media)}</p><p className="text-white/40">média</p></div>
                  <div><p className="font-black text-base text-amber-300">{nota(r.mediaCtx)}</p><p className="text-white/40">contextual</p></div>
                  <div><p className="font-black text-base text-emerald-400">{r.fechados}</p><p className="text-white/40">fechados</p></div>
                  <div><p className="font-black text-base text-sky-400">{r.aproveitamento != null ? fmtPct(r.aproveitamento) : "—"}</p><p className="text-white/40">aproveitou</p></div>
                </div>
              </div>
            </Card>
          ))}
          <p className="text-[11px] text-white/40">contextual = a nota diante do cliente que recebeu · aproveitou = % em que extraiu o potencial do cliente (o ranking JUSTO)</p>
        </div>
      )}

      {/* ═══ A MELHORAR ═══ */}
      {aba === "melhorar" && (
        <div className="space-y-2">
          {[...porAtendente].filter((r) => r.total >= 3).sort((a, b) => (a.mediaCtx ?? a.media ?? 10) - (b.mediaCtx ?? b.media ?? 10)).slice(0, 6).map((r) => (
            <Card key={r.nome} className="border-amber-500/25">
              <button onClick={() => toggle(r.nome)} className="flex w-full items-center gap-3 text-left">
                <p className="min-w-0 flex-1 truncate font-bold">{r.nome}</p>
                <span className="text-xs text-white/50">{r.total} atds · média {nota(r.media)} · {r.fechados} fechados{r.prometeu > 0 ? ` · ⚠ ${r.prometeu} promessas` : ""}</span>
                {expandido === r.nome ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandido === r.nome && r.feedbacks.length > 0 && (
                <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                  {r.feedbacks.slice(-3).map((f: string, i: number) => (
                    <p key={i} className="flex gap-1.5 text-xs text-white/70"><Quote className="h-3 w-3 shrink-0 text-amber-400" />{f}</p>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ═══ CONTEMPLAÇÃO (compliance) ═══ */}
      {aba === "contemplacao" && (
        <div className="space-y-3">
          {[
            { titulo: "🔴 FECHOU e recebeu DATA/PRAZO — bomba-relógio: alinhar expectativa JÁ", lista: contemplacao.fechouComData, cor: "border-red-500/50 bg-red-500/10" },
            { titulo: "🟡 FECHOU com expectativa criada (sem data) — monitorar", lista: contemplacao.fechouExpectativa, cor: "border-amber-500/40 bg-amber-500/5" },
            { titulo: "🔵 NÃO fechou, mas prometeu — vício a corrigir no coaching", lista: contemplacao.naoFechouPrometeu, cor: "border-sky-500/30" },
          ].map((g) => (
            <Card key={g.titulo} className={g.cor}>
              <p className="text-sm font-bold">{g.titulo} <span className="text-white/50">({g.lista.length})</span></p>
              <div className="mt-2 space-y-1.5">
                {g.lista.map((a: Atd) => (
                  <div key={a.id} className="rounded-lg bg-black/30 p-2 text-xs">
                    <button onClick={() => toggle(`c-${a.id}`)} className="flex w-full items-center justify-between text-left">
                      <span className="truncate font-bold">{a.nome_lead} <span className="font-normal text-white/50">· atendeu: {a.atendente || a.responsavel}</span></span>
                      {(a.trechos_garantia || []).length > 0 && (expandido === `c-${a.id}` ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                    </button>
                    {expandido === `c-${a.id}` && (a.trechos_garantia || []).map((t: any, i: number) => (
                      <div key={i} className="mt-1.5 border-l-2 border-red-400/60 pl-2">
                        <p className="italic text-white/80">"{t.trecho}"</p>
                        {t.contexto && <p className="text-white/40">contexto: {t.contexto}</p>}
                      </div>
                    ))}
                  </div>
                ))}
                {g.lista.length === 0 && <p className="text-xs text-white/40">nenhum caso 🎉</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ═══ AUTÓPSIA ═══ */}
      {aba === "autopsia" && (
        <div className="space-y-4">
          <Card>
            <p className="mb-2 text-sm font-bold">Motivos reais do não-fechamento <span className="text-white/40">({autopsia.total} casos)</span></p>
            <div className="space-y-1.5">
              {autopsia.ranking.map(([et, qtd]) => (
                <div key={et} className="flex items-center gap-2 text-xs">
                  <span className="w-44 truncate">{ETIQUETA_LABEL[et] || et}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${(qtd / autopsia.total) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right font-mono font-bold">{qtd} · {fmtPct(qtd / autopsia.total)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-purple-500/30">
            <p className="mb-2 text-sm font-bold text-purple-300">🎭 Declarado ≠ Real — onde a desculpa social escondia outra coisa ({autopsia.divergentes.length})</p>
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {autopsia.divergentes.map((a) => (
                <div key={a.id} className="rounded-lg bg-black/30 p-2 text-xs">
                  <button onClick={() => toggle(`d-${a.id}`)} className="flex w-full items-center justify-between text-left">
                    <span className="min-w-0 flex-1"><b>{a.nome_lead}</b> disse: <i className="text-white/60">"{a.motivo_declarado}"</i> → real: <b className="text-purple-300">{a.motivo_real_inferido}</b></span>
                    {expandido === `d-${a.id}` ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                  {expandido === `d-${a.id}` && a.motivo_evidencia && (
                    <p className="mt-1 border-l-2 border-purple-400/60 pl-2 italic text-white/70">evidência: {a.motivo_evidencia}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ═══ PRÓXIMOS PASSOS ═══ */}
      {aba === "proximos" && (
        <div className="space-y-2">
          {naoFechados.filter((a) => a.proximo_passo_sugerido).slice(0, 30).map((a) => (
            <Card key={a.id}>
              <p className="text-sm font-bold">{a.nome_lead} <span className="font-normal text-white/50">· {a.responsavel} · {a.equipe}</span> <TempBadge t={a.perfil_temperatura} /></p>
              <p className="mt-1 flex gap-1.5 text-xs text-emerald-300"><Lightbulb className="h-3.5 w-3.5 shrink-0" />{a.proximo_passo_sugerido}</p>
            </Card>
          ))}
          <p className="text-[11px] text-white/40">a mina de retorno: cada linha é um follow-up sugerido pela IA que hoje morre dentro do card</p>
        </div>
      )}
    </div>
  )
}
