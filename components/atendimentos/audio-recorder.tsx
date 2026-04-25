"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Loader2, X } from "lucide-react"
import { upload } from "@vercel/blob/client"

interface AudioRecorderProps {
  atendimentoId: string
  isRetorno?: boolean
  userName?: string
  onComplete: () => void
  onCancel: () => void
}

const BAR_COUNT = 24

export function AudioRecorder({ atendimentoId, isRetorno = false, userName = "Alguem", onComplete, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
  const [error, setError] = useState("")
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(3))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const durationRef = useRef<number>(0)
  const animFrameRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getSupportedMimeType = () => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "video/webm;codecs=opus",
      "video/webm",
      "audio/mp4",
    ]
    return types.find(type => MediaRecorder.isTypeSupported(type)) || ""
  }

  // Loop de animacao sincronizado com o microfone
  const startVisualizer = useCallback((stream: MediaStream) => {
    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 64
    analyser.smoothingTimeConstant = 0.75
    source.connect(analyser)
    analyserRef.current = analyser

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(dataArray)
      const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
        const idx = Math.floor((i / BAR_COUNT) * dataArray.length)
        // Normaliza 0-255 para 3-48px
        return 3 + (dataArray[idx] / 255) * 45
      })
      setBars(newBars)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null
    setBars(Array(BAR_COUNT).fill(3))
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      stopVisualizer()
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [stopVisualizer])

  const startRecording = async () => {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        await uploadAudio(blob)
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      durationRef.current = 0
      setDuration(0)

      // Marcar que está gravando (aparece em tempo real para todos)
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
      if (err.name === "NotAllowedError") {
        setError("Permissao do microfone negada. Permita o acesso e tente novamente.")
      } else if (err.name === "NotFoundError") {
        setError("Nenhum microfone encontrado.")
      } else {
        setError("Erro ao acessar microfone: " + err.message)
      }
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return
    mediaRecorderRef.current.stop()
    setIsRecording(false)
    stopVisualizer()
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    
    // Desmarcar gravando
    fetch(`/api/atendimentos/${atendimentoId}/gravando`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gravando: false, gravando_por: null }),
    }).catch(() => {})
  }

  const uploadAudio = async (audioBlob: Blob) => {
    setIsUploading(true)
    setError("")
    setUploadProgress("Enviando audio...")
    try {
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm"
      const ext = mimeType.includes("mp4") ? "mp4" : "webm"
      const filename = `atendimentos/${atendimentoId}-${Date.now()}.${ext}`

      const blob = await upload(filename, audioBlob, {
        access: "public",
        handleUploadUrl: "/api/atendimentos/blob-upload",
      })

      setUploadProgress("Iniciando processamento...")

      const response = await fetch("/api/atendimentos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atendimentoId, audioUrl: blob.url, duracao: durationRef.current, isRetorno }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Erro ao processar audio")
      }

      onComplete()
    } catch (err: any) {
      setError(err.message || "Erro ao enviar audio")
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      stopVisualizer()
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      // Voltar para aguardando se cancelar sem enviar
      fetch(`/api/atendimentos/${atendimentoId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "aguardando" }),
      }).catch(() => {})
    }
    onCancel()
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(12px)" }}>
        {/* Header colorido de estado */}
        <div className={`h-1 w-full transition-all duration-500 ${isRecording ? "bg-gradient-to-r from-red-500 to-rose-400" : isUploading ? "bg-gradient-to-r from-violet-500 to-purple-400" : "bg-gradient-to-r from-white/10 to-white/5"}`} />

        <div className="p-4 space-y-4">
          {/* Timer central */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRecording && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              <span className={`text-2xl font-mono font-bold tracking-widest ${isRecording ? "text-red-400" : "text-white/50"}`}>
                {formatDuration(duration)}
              </span>
            </div>
            <span className="text-xs text-white/50">
              {isRecording ? "Gravando..." : isUploading ? uploadProgress : "Pronto para gravar"}
            </span>
          </div>

          {/* Visualizador de ondas sincronizado */}
          <div className="flex items-center justify-center gap-[3px] h-14">
            {bars.map((h, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full transition-all duration-75"
                style={{
                  height: `${h}px`,
                  background: isRecording
                    ? `rgba(248,113,113,${0.4 + (h / 48) * 0.6})`
                    : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>

          {/* Botoes */}
          <div className="flex items-center gap-2">
            {!isRecording && !isUploading && (
              <>
                <Button
                  onClick={startRecording}
                  size="sm"
                  className="flex-1 h-9 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-semibold rounded-lg"
                >
                  <Mic className="w-3.5 h-3.5 mr-1.5" />
                  Iniciar Gravacao
                </Button>
                <Button
                  onClick={handleCancel}
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 rounded-lg text-white/40 hover:text-white hover:bg-white/10 border border-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}

            {isRecording && (
              <>
                <Button
                  onClick={stopRecording}
                  size="sm"
                  className="flex-1 h-9 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-semibold rounded-lg"
                >
                  <Square className="w-3.5 h-3.5 mr-1.5" />
                  Parar Gravacao
                </Button>
                <Button
                  onClick={handleCancel}
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}

            {isUploading && (
              <div className="flex-1 flex items-center justify-center gap-2 h-9 text-white/60 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                {uploadProgress}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {!isRecording && !isUploading && (
        <p className="text-[11px] text-white/30 text-center">
          Certifique-se de que o microfone esta conectado e permitido
        </p>
      )}
    </div>
  )
}
