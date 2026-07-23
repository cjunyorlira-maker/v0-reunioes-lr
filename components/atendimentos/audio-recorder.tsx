"use client"

// ═══════════════════════════════════════════════════════════════════
// GRAVADOR BLINDADO — Fase 1
// · Microfone FIXO da sala (salvo, com nome visível e alarme de troca)
// · Upload incremental a cada 30s (perda máxima: 30 segundos)
// · Backup local em IndexedDB (sobrevive a refresh/queda do Chrome)
// · Recuperação de gravação interrompida
// · Alarme de silêncio (15s sem som) + pré-teste do microfone
// · wakeLock (tela não dorme) + aviso ao fechar aba gravando
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from "react"
import { upload } from "@vercel/blob/client"
import { Mic, Square, Loader2, AlertTriangle, CheckCircle2, RefreshCw, Volume2, X } from "lucide-react"

const BAR_COUNT = 24
const CHUNK_MS = 30000            // 30s por parte
const SILENCE_LIMIT_MS = 15000    // 15s sem som → alarme
const SILENCE_RMS = 4             // limiar de silêncio (0-255)
const MIC_STORAGE_KEY = "atendimentos_mic_id"

// ── IndexedDB simples para backup local das partes ──
function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open("gravacoes-atendimentos", 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains("parts")) {
        db.createObjectStore("parts", { keyPath: "key" })
      }
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}
async function dbPut(key: string, value: any) {
  const db = await openDB()
  return new Promise<void>((res, rej) => {
    const tx = db.transaction("parts", "readwrite")
    tx.objectStore("parts").put({ key, ...value })
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
}
async function dbAll(prefix: string): Promise<any[]> {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction("parts", "readonly")
    const req = tx.objectStore("parts").getAll()
    req.onsuccess = () => res((req.result || []).filter((r: any) => r.key.startsWith(prefix)).sort((a: any, b: any) => a.seq - b.seq))
    req.onerror = () => rej(req.error)
  })
}
async function dbClear(prefix: string) {
  const db = await openDB()
  const all = await dbAll(prefix)
  const tx = db.transaction("parts", "readwrite")
  all.forEach((r: any) => tx.objectStore("parts").delete(r.key))
}

interface AudioRecorderProps {
  atendimentoId: string
  userName: string
  isRetorno?: boolean
  onComplete: () => void
  onCancel?: () => void
}

export function AudioRecorder({ atendimentoId, userName, isRetorno = false, onComplete, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState("")
  const [uploadProgress, setUploadProgress] = useState("")
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(3))
  const [showMotivational, setShowMotivational] = useState(false)

  // mic fixo da sala
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [micId, setMicId] = useState<string>("")
  const [micLabel, setMicLabel] = useState<string>("")
  const [showMicPicker, setShowMicPicker] = useState(false)

  // saúde da captação
  const [captando, setCaptando] = useState(true)
  const [preTeste, setPreTeste] = useState<"idle" | "testando" | "ok" | "mudo">("idle")

  // partes enviadas / recuperação
  const [partsEnviadas, setPartsEnviadas] = useState(0)
  const [recuperacao, setRecuperacao] = useState<{ qtd: number; segundos: number } | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const durationRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const silencioDesdeRef = useRef<number | null>(null)
  const wakeLockRef = useRef<any>(null)
  const seqRef = useRef(0)
  const partUrlsRef = useRef<{ seq: number; url: string }[]>([])
  const filaLocalRef = useRef<{ seq: number; blob: Blob }[]>([])   // partes que falharam no envio
  const paradoRef = useRef(false)

  const dbPrefix = `at-${atendimentoId}-`

  // ── microfones: enumerar e fixar o da sala ──
  const carregarMics = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devs.filter((d) => d.kind === "audioinput" && d.deviceId)
      setMics(audioInputs)
      const salvo = localStorage.getItem(MIC_STORAGE_KEY)
      const escolhido = audioInputs.find((d) => d.deviceId === salvo) || audioInputs[0]
      if (escolhido) {
        setMicId(escolhido.deviceId)
        setMicLabel(escolhido.label || "Microfone padrão")
      }
    } catch {}
  }, [])

  useEffect(() => {
    carregarMics()
    navigator.mediaDevices?.addEventListener?.("devicechange", carregarMics)
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", carregarMics)
  }, [carregarMics])

  // ── recuperação: partes órfãs de gravação interrompida ──
  useEffect(() => {
    ;(async () => {
      try {
        const orfas = await dbAll(dbPrefix)
        if (orfas.length > 0) setRecuperacao({ qtd: orfas.length, segundos: orfas.length * 30 })
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enviarPart = async (seq: number, blob: Blob): Promise<string | null> => {
    const filename = `atendimentos/${atendimentoId}/part-${String(seq).padStart(4, "0")}.webm`
    for (let tent = 1; tent <= 3; tent++) {
      try {
        const res = await upload(filename, blob, { access: "public", handleUploadUrl: "/api/atendimentos/blob-upload" })
        return res.url
      } catch {
        await new Promise((r) => setTimeout(r, 1500 * tent))
      }
    }
    return null
  }

  const processarChunk = async (seq: number, blob: Blob) => {
    // backup local primeiro (sobrevive a tudo), depois tenta subir
    try { await dbPut(`${dbPrefix}${seq}`, { seq, blob }) } catch {}
    const url = await enviarPart(seq, blob)
    if (url) {
      partUrlsRef.current.push({ seq, url })
      setPartsEnviadas(partUrlsRef.current.length)
    } else {
      filaLocalRef.current.push({ seq, blob })  // tenta de novo no final
    }
  }

  // ── visualizador + sentinela de silêncio ──
  const startVisualizer = useCallback((stream: MediaStream) => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const audioCtx = new AudioCtx()
    audioCtxRef.current = audioCtx
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.75
    source.connect(analyser)
    analyserRef.current = analyser
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(dataArray)
      const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
        const idx = Math.floor((i / BAR_COUNT) * dataArray.length)
        return 3 + (dataArray[idx] / 255) * 45
      })
      setBars(newBars)
      // sentinela de silêncio (RMS)
      const rms = dataArray.reduce((s, v) => s + v, 0) / dataArray.length
      const agora = Date.now()
      if (rms < SILENCE_RMS) {
        if (silencioDesdeRef.current === null) silencioDesdeRef.current = agora
        setCaptando(agora - silencioDesdeRef.current < SILENCE_LIMIT_MS)
      } else {
        silencioDesdeRef.current = null
        setCaptando(true)
      }
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null
    silencioDesdeRef.current = null
    setBars(Array(BAR_COUNT).fill(3))
    setCaptando(true)
  }, [])

  // ── pré-teste do microfone (3s antes de liberar o REC) ──
  const preTestarMic = async (): Promise<boolean> => {
    setPreTeste("testando")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: micId ? { exact: micId } : undefined, echoCancellation: true, noiseSuppression: true },
      })
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 128
      src.connect(an)
      const arr = new Uint8Array(an.frequencyBinCount)
      let maxRms = 0
      const t0 = Date.now()
      await new Promise<void>((res) => {
        const loop = () => {
          an.getByteFrequencyData(arr)
          const rms = arr.reduce((s, v) => s + v, 0) / arr.length
          if (rms > maxRms) maxRms = rms
          if (Date.now() - t0 < 2500) requestAnimationFrame(loop)
          else res()
        }
        loop()
      })
      stream.getTracks().forEach((t) => t.stop())
      ctx.close()
      const ok = maxRms >= SILENCE_RMS
      setPreTeste(ok ? "ok" : "mudo")
      return ok
    } catch {
      setPreTeste("mudo")
      return false
    }
  }

  // ── wakeLock ──
  const pedirWakeLock = async () => {
    try {
      wakeLockRef.current = await (navigator as any).wakeLock?.request?.("screen")
    } catch {}
  }
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible" && isRecording) pedirWakeLock() }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [isRecording])

  // ── aviso ao fechar aba gravando ──
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording || isUploading) { e.preventDefault(); e.returnValue = "" }
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [isRecording, isUploading])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      stopVisualizer()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      wakeLockRef.current?.release?.()
    }
  }, [stopVisualizer])

  const getSupportedMimeType = () => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || ""
  }

  // ═══ INICIAR ═══
  const startRecording = async () => {
    setError("")
    const micOk = await preTestarMic()
    if (!micOk) return   // banner de mic mudo aparece; usuário resolve e clica de novo

    setShowMotivational(true)
    setTimeout(() => setShowMotivational(false), 2000)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: micId ? { exact: micId } : undefined, echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      })
      streamRef.current = stream
      // atualiza o rótulo real em uso (e revela labels pós-permissão)
      carregarMics()

      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      seqRef.current = 0
      partUrlsRef.current = []
      filaLocalRef.current = []
      paradoRef.current = false
      setPartsEnviadas(0)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const seq = seqRef.current++
          processarChunk(seq, e.data)   // sobe a parte na hora (async)
        }
      }
      mediaRecorder.onstop = async () => {
        // aguarda um instante para o último ondataavailable disparar
        setTimeout(() => finalizarEnvio(), 400)
      }

      mediaRecorder.start(CHUNK_MS)   // ← parte a cada 30s
      setIsRecording(true)
      durationRef.current = 0
      setDuration(0)
      pedirWakeLock()

      fetch(`/api/atendimentos/${atendimentoId}/gravando`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gravando: true, gravando_por: userName }),
      }).catch(() => {})

      timerRef.current = setInterval(() => {
        durationRef.current += 1
        setDuration(durationRef.current)
      }, 1000)

      startVisualizer(stream)
    } catch (err: any) {
      if (err.name === "NotAllowedError") setError("Permissão do microfone negada. Permita o acesso e tente novamente.")
      else if (err.name === "NotFoundError") setError("Nenhum microfone encontrado.")
      else if (err.name === "OverconstrainedError") setError("O microfone salvo da sala não foi encontrado. Escolha outro no seletor.")
      else setError("Erro ao acessar microfone: " + err.message)
    }
  }

  // ═══ PARAR ═══
  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return
    paradoRef.current = true
    setIsRecording(false)
    setIsUploading(true)
    setUploadProgress("Finalizando as partes...")
    if (timerRef.current) clearInterval(timerRef.current)
    stopVisualizer()
    wakeLockRef.current?.release?.()
    mediaRecorderRef.current.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  // ═══ FINALIZAR: garante todas as partes no ar e registra ═══
  const finalizarEnvio = async () => {
    setIsUploading(true)
    setError("")
    try {
      // re-tenta as partes que ficaram na fila local
      setUploadProgress("Enviando partes restantes...")
      const fila = [...filaLocalRef.current]
      filaLocalRef.current = []
      for (const item of fila) {
        const url = await enviarPart(item.seq, item.blob)
        if (url) partUrlsRef.current.push({ seq: item.seq, url })
        else filaLocalRef.current.push(item)
      }
      if (filaLocalRef.current.length > 0) {
        throw new Error(`${filaLocalRef.current.length} parte(s) não subiram — verifique a internet e clique em TENTAR NOVAMENTE (o áudio está seguro neste computador).`)
      }

      const parts = [...partUrlsRef.current].sort((a, b) => a.seq - b.seq).map((p) => p.url)
      if (parts.length === 0) throw new Error("Nenhum áudio captado.")

      setUploadProgress("Iniciando processamento...")
      const response = await fetch("/api/atendimentos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atendimentoId, audioParts: parts, duracao: durationRef.current, isRetorno }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Erro ao registrar o áudio")
      }

      await dbClear(dbPrefix)   // backup local não é mais necessário
      fetch(`/api/atendimentos/${atendimentoId}/gravando`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gravando: false, gravando_por: null }),
      }).catch(() => {})
      onComplete()
    } catch (err: any) {
      console.error("[gravador] erro ao finalizar:", err)
      setError(err.message || "Erro ao enviar o áudio")
      setIsUploading(false)
    }
  }

  // ═══ RECUPERAR gravação interrompida (partes órfãs no IndexedDB) ═══
  const recuperarOrfas = async () => {
    setRecuperacao(null)
    setIsUploading(true)
    setUploadProgress("Recuperando gravação interrompida...")
    try {
      const orfas = await dbAll(dbPrefix)
      partUrlsRef.current = []
      filaLocalRef.current = []
      for (const o of orfas) {
        const url = await enviarPart(o.seq, o.blob)
        if (url) partUrlsRef.current.push({ seq: o.seq, url })
      }
      durationRef.current = orfas.length * 30
      await finalizarEnvio()
    } catch (err: any) {
      setError("Falha na recuperação: " + (err.message || ""))
      setIsUploading(false)
    }
  }
  const descartarOrfas = async () => { await dbClear(dbPrefix); setRecuperacao(null) }

  const trocarMic = (id: string, label: string) => {
    setMicId(id)
    setMicLabel(label)
    localStorage.setItem(MIC_STORAGE_KEY, id)
    setShowMicPicker(false)
    setPreTeste("idle")
  }

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  // ═══════════════════════ UI ═══════════════════════
  return (
    <div className="space-y-3">
      {/* recuperação de gravação interrompida */}
      {recuperacao && !isRecording && !isUploading && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-semibold text-amber-400">🎙 Gravação interrompida encontrada (~{Math.round(recuperacao.segundos / 60)}min salvos neste computador)</p>
          <div className="mt-2 flex gap-2">
            <button onClick={recuperarOrfas} className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-black">Enviar agora</button>
            <button onClick={descartarOrfas} className="rounded-md border border-white/20 px-3 py-1.5 text-xs">Descartar</button>
          </div>
        </div>
      )}

      {/* microfone da sala */}
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5 truncate">
          <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-white/60">Microfone:</span>
          <span className="truncate font-semibold">{micLabel || "—"}</span>
        </span>
        <button onClick={() => setShowMicPicker((v) => !v)} className="ml-2 shrink-0 rounded border border-white/15 px-2 py-0.5 text-[11px] hover:bg-white/10">trocar</button>
      </div>
      {showMicPicker && (
        <div className="rounded-lg border border-white/10 bg-black/40 p-2 text-xs">
          {mics.map((m) => (
            <button key={m.deviceId} onClick={() => trocarMic(m.deviceId, m.label || "Microfone")}
              className={`block w-full rounded px-2 py-1.5 text-left hover:bg-white/10 ${m.deviceId === micId ? "text-emerald-400 font-semibold" : ""}`}>
              {m.deviceId === micId ? "✓ " : ""}{m.label || "Microfone sem nome"}
            </button>
          ))}
        </div>
      )}

      {/* pré-teste mudo */}
      {preTeste === "mudo" && !isRecording && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><b>Nenhum som captado no teste.</b> Confira se o microfone da sala está ligado/conectado e tente de novo.</span>
        </div>
      )}
      {preTeste === "testando" && (
        <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 p-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Testando o microfone (2s)... fale algo!
        </div>
      )}

      {/* alarme de silêncio durante a gravação */}
      {isRecording && !captando && (
        <div className="animate-pulse rounded-lg border-2 border-red-500 bg-red-500/15 p-3 text-center text-sm font-bold text-red-400">
          ⚠ NENHUM SOM CAPTADO — verifique o microfone AGORA (a gravação continua, mas pode estar muda)
        </div>
      )}

      {showMotivational && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-center text-sm font-semibold text-emerald-400">
          🚀 Boa sorte, {userName}! Arrasa nesse atendimento!
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
          {error.includes("TENTAR NOVAMENTE") && (
            <button onClick={finalizarEnvio} className="mt-2 flex items-center gap-1 rounded-md bg-red-500 px-3 py-1.5 text-xs font-bold text-white">
              <RefreshCw className="h-3 w-3" /> TENTAR NOVAMENTE
            </button>
          )}
        </div>
      )}

      {/* visualizador */}
      {isRecording && (
        <div className="space-y-2">
          <div className="flex h-14 items-end justify-center gap-[3px]">
            {bars.map((h, i) => (
              <div key={i} className={`w-1.5 rounded-full transition-all duration-75 ${captando ? "bg-emerald-400" : "bg-red-500"}`} style={{ height: `${h}px` }} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-white/60">
            <span className={`flex items-center gap-1 ${captando ? "text-emerald-400" : "text-red-400"}`}>
              {captando ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {captando ? "captando áudio" : "SEM SOM"}
            </span>
            <span>·</span>
            <span>{partsEnviadas} parte(s) salvas na nuvem</span>
          </div>
        </div>
      )}

      {/* controles */}
      <div className="flex items-center justify-center gap-3">
        {!isRecording && !isUploading && (
          <button onClick={startRecording} disabled={preTeste === "testando"}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white shadow-lg hover:bg-red-500 disabled:opacity-50">
            <Mic className="h-5 w-5" /> GRAVAR ATENDIMENTO
          </button>
        )}
        {isRecording && (
          <>
            <span className="font-mono text-xl font-bold text-red-400">{formatDuration(duration)}</span>
            <button onClick={stopRecording} className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-bold hover:bg-white/20">
              <Square className="h-5 w-5 fill-current text-red-500" /> PARAR E ENVIAR
            </button>
          </>
        )}
        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" /> {uploadProgress}
          </div>
        )}
        {!isRecording && !isUploading && onCancel && (
          <button onClick={onCancel} className="flex items-center gap-1 rounded-xl border border-white/15 px-4 py-3 text-sm hover:bg-white/10">
            <X className="h-4 w-4" /> Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
