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

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-xl border border-white/10 p-4 ${className}`}
      style={{ background: "rgba(10,10,14,0.85)", backdropFilter: "blur(12px)", ...style }}>
      {children}
    </div>
  )
}

export function CentralDecisao({ atendimentos, onVerAtendimento, atendentesOficiais = [] }: { atendimentos: Atd[]; onVerAtendimento?: (nome: string) => void; atendentesOficiais?: string[] }) {
  const [aba, setAba] = useState<(typeof ABAS)[number]["id"]>("visao")
  const [expandido, setExpandido] = useState<string | null>(null)
  const [fEquipe, setFEquipe] = useState("all")
  const [fAtendente, setFAtendente] = useState("all")
  const [fTemp, setFTemp] = useState("all")

  // opções dos filtros (dos próprios dados)
  const opcoes = useMemo(() => {
    const eq = new Set<string>(), at = new Set<string>()
    atendentesOficiais.forEach((n) => { if (n) at.add(n) })
    atendimentos.forEach((a) => { if (a.equipe) eq.add(a.equipe); const n = a.atendente || a.responsavel; if (n) at.add(n) })
    return { equipes: [...eq].sort(), atendentes: [...at].sort() }
  }, [atendimentos, atendentesOficiais])

  // base filtrada da Central inteira
  const dados = useMemo(() => atendimentos.filter((a) =>
    (fEquipe === "all" || a.equipe === fEquipe) &&
    (fAtendente === "all" || (a.atendente || a.responsavel) === fAtendente) &&
    (fTemp === "all" || a.perfil_temperatura === fTemp)
  ), [atendimentos, fEquipe, fAtendente, fTemp])

  const concluidos = useMemo(() => dados.filter((a) => a.status === "concluido"), [dados])
  const com20 = useMemo(() => concluidos.filter((a) => a.perfil_temperatura), [concluidos])
  const fechados = useMemo(() => concluidos.filter((a) => a.fechou), [concluidos])
  const naoFechados = useMemo(() => concluidos.filter((a) => !a.fechou), [concluidos])

  // ── ranking por atendente ──
  const porAtendente = useMemo(() => {
    const map: Record<string, Atd[]> = {}
    concluidos.forEach((a) => {
      const k = a.atendente || "⚠ Sem atendente registrado"   // NUNCA herdar o vendedor: sem atendente = dado a corrigir, não mérito/culpa de ninguém
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
          perdas: lista.filter((a) => a.perda_evitavel === true).length,
          feedbacks: lista.map((a) => a.feedback_coaching).filter(Boolean),
          casos: lista.filter((a) => a.feedback_coaching).map((a) => ({ id: a.id, nome_lead: a.nome_lead, feedback: a.feedback_coaching, data: a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR") : "" })),
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
      const e = a.etiqueta_ia   // só a classificação da IA (Análise 2.0) — zero regex
      if (e) cont[e] = (cont[e] || 0) + 1
    })
    const ranking = Object.entries(cont).sort((a, b) => b[1] - a[1])
    const divergentes = naoFechados.filter((a) => a.motivo_declarado && a.motivo_real_inferido && a.motivo_declarado !== a.motivo_real_inferido)
    return { ranking, divergentes, total: naoFechados.length }
  }, [naoFechados])

  // ── prova social × conversão + comparativo semanal ──
  const insights = useMemo(() => {
    const usouProva = (a: Atd) => { const p = a.usou_prova_social; return !!(p && (p.reclame_aqui || p.site_empresa || p.referencias_clientes)) }
    const comProva = concluidos.filter(usouProva)
    const semProva = concluidos.filter((a) => a.usou_prova_social && !usouProva(a))
    const convProva = comProva.length ? comProva.filter((a) => a.fechou).length / comProva.length : null
    const convSem = semProva.length ? semProva.filter((a) => a.fechou).length / semProva.length : null

    const agora = Date.now()
    const seteDias = 7 * 24 * 3600 * 1000
    const semanaAtual = concluidos.filter((a) => agora - new Date(a.created_at).getTime() < seteDias)
    const semanaAnterior = concluidos.filter((a) => { const d = agora - new Date(a.created_at).getTime(); return d >= seteDias && d < 2 * seteDias })
    const media = (l: Atd[]) => { const c = l.filter((a) => a.score_geral != null); return c.length ? c.reduce((s, a) => s + a.score_geral, 0) / c.length : null }
    return {
      convProva, convSem, nProva: comProva.length, nSem: semProva.length,
      atual: { n: semanaAtual.length, fechados: semanaAtual.filter((a) => a.fechou).length, media: media(semanaAtual) },
      anterior: { n: semanaAnterior.length, fechados: semanaAnterior.filter((a) => a.fechou).length, media: media(semanaAnterior) },
    }
  }, [concluidos])

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
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${ativo ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "border border-white/10 bg-black/60 text-white/70 hover:bg-white/10"}`}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          )
        })}
        <span className="ml-auto self-center text-[11px] text-white/40">{com20.length}/{concluidos.length} com Análise 2.0</span>
      </div>

      {/* filtros da Central (valem pra todas as abas) */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select value={fEquipe} onChange={(e) => setFEquipe(e.target.value)} style={{ background: "rgba(10,10,14,0.9)" }} className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 outline-none">
          <option value="all">Todas as equipes</option>
          {opcoes.equipes.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={fAtendente} onChange={(e) => setFAtendente(e.target.value)} style={{ background: "rgba(10,10,14,0.9)" }} className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 outline-none">
          <option value="all">Todos os atendentes</option>
          {opcoes.atendentes.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={fTemp} onChange={(e) => setFTemp(e.target.value)} style={{ background: "rgba(10,10,14,0.9)" }} className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 outline-none">
          <option value="all">Todas as temperaturas</option>
          <option value="quente">🔥 Quente</option><option value="morno">🌤 Morno</option><option value="frio">❄️ Frio</option>
        </select>
        {(fEquipe !== "all" || fAtendente !== "all" || fTemp !== "all") && (
          <button onClick={() => { setFEquipe("all"); setFAtendente("all"); setFTemp("all") }} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 font-bold text-amber-400">limpar ✕</button>
        )}
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="border-emerald-500/20">
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">🗣 Prova social × conversão</p>
              {insights.convProva !== null && insights.convSem !== null ? (
                <p className="mt-1 text-sm">
                  Com prova social: <b className="text-emerald-400">{fmtPct(insights.convProva)}</b> ({insights.nProva} atds) · sem: <b className="text-red-400">{fmtPct(insights.convSem)}</b> ({insights.nSem})
                  {insights.convProva > insights.convSem && <span className="ml-1 text-emerald-300">— quem usa fecha {(insights.convProva / Math.max(insights.convSem, 0.01)).toFixed(1)}× mais. Argumento de treinamento com dado da própria loja.</span>}
                </p>
              ) : <p className="mt-1 text-xs text-white/40">aguardando mais dados com Análise 2.0</p>}
            </Card>
            <Card className="border-sky-500/20">
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">📅 Semana × semana</p>
              <p className="mt-1 text-sm">
                Atual: <b>{insights.atual.n}</b> atds · <b className="text-emerald-400">{insights.atual.fechados}</b> fechados · média <b>{nota(insights.atual.media)}</b>
                <span className="text-white/40"> | anterior: {insights.anterior.n} · {insights.anterior.fechados} · {nota(insights.anterior.media)}</span>
                {insights.atual.media != null && insights.anterior.media != null && (
                  <span className={`ml-1 font-bold ${insights.atual.media >= insights.anterior.media ? "text-emerald-400" : "text-red-400"}`}>
                    {insights.atual.media >= insights.anterior.media ? "↑" : "↓"}
                  </span>
                )}
              </p>
            </Card>
          </div>

          <p className="text-xs font-bold uppercase tracking-wider text-white/50">Matriz cliente × atendimento</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="border-red-500/40" style={{ background: "rgba(60,10,10,0.85)" }}>
              <p className="text-sm font-black text-red-400">🔴 PERDA EVITÁVEL — cliente com potencial, atendimento abaixo ({matriz.quentePerda.length})</p>
              <p className="mb-2 text-[11px] text-white/50">o quadrante do dinheiro deixado na mesa — prioridade máxima de coaching</p>
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {matriz.quentePerda.map((a) => (
                  <div key={a.id} onClick={() => onVerAtendimento?.(a.nome_lead)} className="cursor-pointer rounded-lg bg-black/60 p-2 text-xs transition-colors hover:bg-black/50">
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
            <div key={a.id} onClick={() => onVerAtendimento?.(a.nome_lead)} className="cursor-pointer">
            <Card className={i === 0 ? "border-amber-500/50 hover:bg-white/10" : "hover:bg-white/10"}>
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
            </div>
          ))}
        </div>
      )}

      {/* ═══ ATENDENTES (ranking justo) ═══ */}
      {aba === "atendentes" && (
        <div className="space-y-2">
          <p className="text-sm font-black">🥇 Ranking de Atendentes por Média <span className="text-[11px] font-normal text-white/40">— ordenado pela nota contextual (a nota diante do cliente que recebeu); sem contextual, usa a média geral · mínimo 2 atendimentos</span></p>
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
                  <div><p className={`font-black text-base ${r.perdas > 0 ? "text-red-400" : "text-white/30"}`}>{r.perdas}</p><p className="text-white/40">perdas evit.</p></div>
                  <div><p className={`font-black text-base ${r.prometeu > 0 ? "text-amber-400" : "text-white/30"}`}>{r.prometeu}</p><p className="text-white/40">⚠ promessas</p></div>
                </div>
                <button onClick={() => { setFAtendente(r.nome); setAba("visao") }} className="rounded border border-white/15 px-2 py-1 text-[10px] hover:bg-white/10">🔎 filtrar por ele</button>
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
              {expandido === r.nome && r.casos.length > 0 && (
                <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                  {r.casos.slice(-4).map((c: any) => (
                    <div key={c.id} className="rounded-lg bg-black/60 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{c.nome_lead} <span className="font-normal text-white/40">· {c.data}</span></span>
                        {onVerAtendimento && <button onClick={() => onVerAtendimento(c.nome_lead)} className="shrink-0 rounded border border-white/15 px-2 py-0.5 text-[10px] hover:bg-white/10">ver atendimento →</button>}
                      </div>
                      <p className="mt-1 flex gap-1.5 text-white/70"><Quote className="h-3 w-3 shrink-0 text-amber-400" />{c.feedback}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ═══ CONTEMPLAÇÃO (compliance) ═══ */}
      {aba === "contemplacao" && (() => {
        // índice: quem mais promete (por atendente)
        const porPessoa: Record<string, { total: number; comData: number }> = {}
        concluidos.filter((a) => a.garantiu_contemplacao === true).forEach((a) => {
          const k = a.atendente || "⚠ Sem atendente registrado"
          porPessoa[k] = porPessoa[k] || { total: 0, comData: 0 }
          porPessoa[k].total++
          if ((a.trechos_garantia || []).some((t: any) => t?.tipo === "deu_data")) porPessoa[k].comData++
        })
        const rankingPromessas = Object.entries(porPessoa).sort((x, y) => y[1].comData - x[1].comData || y[1].total - x[1].total)
        const maxTotal = Math.max(...rankingPromessas.map(([, v]) => v.total), 1)
        return (
        <div className="space-y-3">
          <Card className="border-amber-500/40">
            <p className="text-sm font-black text-amber-300">🚨 ÍNDICE DE PROMESSAS POR ATENDENTE — quem mais garante contemplação</p>
            <p className="mb-2 text-[11px] text-white/40">🔴 barra vermelha = deu DATA/PRAZO (o proibido) · 🟡 âmbar = criou expectativa</p>
            <div className="space-y-1.5">
              {rankingPromessas.map(([nome, v], i) => (
                <div key={nome} className="flex items-center gap-2 text-xs">
                  <span className={`w-5 text-right font-black ${i === 0 ? "text-red-400" : "text-white/50"}`}>{i + 1}º</span>
                  <span className="w-36 truncate font-bold">{nome}</span>
                  <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-red-500" style={{ width: `${(v.comData / maxTotal) * 100}%` }} />
                    <div className="h-full bg-amber-500/70" style={{ width: `${((v.total - v.comData) / maxTotal) * 100}%` }} />
                  </div>
                  <span className="w-28 text-right font-mono">
                    {v.comData > 0 && <b className="text-red-400">{v.comData} c/ data</b>}
                    {v.comData > 0 && " · "}{v.total} total
                  </span>
                </div>
              ))}
              {rankingPromessas.length === 0 && <p className="text-xs text-white/40">nenhuma promessa mapeada no recorte 🎉</p>}
            </div>
          </Card>
          {[
            { titulo: "🔴 FECHOU e recebeu DATA/PRAZO — bomba-relógio: alinhar expectativa JÁ", lista: contemplacao.fechouComData, cor: "border-red-500/50", bg: "rgba(60,10,10,0.85)" },
            { titulo: "🟡 FECHOU com expectativa criada (sem data) — monitorar", lista: contemplacao.fechouExpectativa, cor: "border-amber-500/40", bg: "rgba(55,40,5,0.85)" },
            { titulo: "🔵 NÃO fechou, mas prometeu — vício a corrigir no coaching", lista: contemplacao.naoFechouPrometeu, cor: "border-sky-500/30", bg: "rgba(8,20,35,0.85)" },
          ].map((g) => (
            <Card key={g.titulo} className={g.cor} style={{ background: g.bg }}>
              <p className="text-sm font-bold">{g.titulo} <span className="text-white/50">({g.lista.length})</span></p>
              <div className="mt-2 space-y-1.5">
                {g.lista.map((a: Atd) => (
                  <div key={a.id} className="rounded-lg bg-black/60 p-2 text-xs">
                    <button onClick={() => toggle(`c-${a.id}`)} onDoubleClick={() => onVerAtendimento?.(a.nome_lead)} title="duplo clique: ver atendimento" className="flex w-full items-center justify-between text-left">
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
        )
      })()}

      {/* ═══ AUTÓPSIA ═══ */}
      {aba === "autopsia" && (
        <div className="space-y-4">
          <Card>
            <p className="mb-2 text-sm font-bold">Motivos reais do não-fechamento <span className="text-white/40">— {naoFechados.filter((a) => a.etiqueta_ia).length} de {autopsia.total} com Análise 2.0 (cresce com a re-análise)</span></p>
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
                <div key={a.id} className="rounded-lg bg-black/60 p-2 text-xs">
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

      {/* ═══ PRÓXIMOS PASSOS (agrupado por vendedor — a pauta de ligação de cada um) ═══ */}
      {aba === "proximos" && (() => {
        const grupos: Record<string, Atd[]> = {}
        naoFechados.filter((a) => a.proximo_passo_sugerido).forEach((a) => {
          const k = a.atendente || "⚠ Sem atendente registrado"   // regra da casa: follow-up é de quem ATENDEU; sem registro = corrigir o cadastro
          ;(grupos[k] = grupos[k] || []).push(a)
        })
        return (
          <div className="space-y-3">
            {Object.entries(grupos).sort((x, y) => y[1].length - x[1].length).map(([vend, lista]) => (
              <Card key={vend}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black">{vend} <span className="font-normal text-white/40">({lista.length} follow-ups)</span></p>
                  <button onClick={() => {
                    const txt = `📞 Follow-ups — ${vend}\n` + lista.map((a) => `• ${a.nome_lead}: ${a.proximo_passo_sugerido}`).join("\n")
                    navigator.clipboard?.writeText(txt)
                  }} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20">📋 copiar lista</button>
                </div>
                <div className="mt-2 space-y-1.5">
                  {lista.map((a) => (
                    <p key={a.id} className="flex gap-1.5 text-xs"><Lightbulb className="h-3.5 w-3.5 shrink-0 text-emerald-400" /><span><b>{a.nome_lead}</b> <TempBadge t={a.perfil_temperatura} /> — <span className="text-emerald-300">{a.proximo_passo_sugerido}</span></span></p>
                  ))}
                </div>
              </Card>
            ))}
            <p className="text-[11px] text-white/40">agrupado por quem ATENDEU (dono do follow-up) · 📋 copiar lista → cola direto no WhatsApp</p>
          </div>
        )
      })()}
    </div>
  )
}
