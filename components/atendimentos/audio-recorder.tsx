"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioRecorderProps {
  atendimentoId: string
  onComplete: () => void
  onCancel: () => void
}

export function AudioRecorder({ atendimentoId, onComplete, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const durationRef = useRef<number>(0)  // Guardar duração em ref para upload

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const startRecording = async () => {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      })
      
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        })
        await uploadAudio(audioBlob)
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      
      // Reset duração
      durationRef.current = 0
      setDuration(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        durationRef.current += 1
        setDuration(durationRef.current)
      }, 1000)

    } catch (err: any) {
      console.error("Erro ao acessar microfone:", err)
      if (err.name === "NotAllowedError") {
        setError("Permissao do microfone negada. Por favor, permita o acesso ao microfone.")
      } else if (err.name === "NotFoundError") {
        setError("Nenhum microfone encontrado. Conecte um microfone e tente novamente.")
      } else {
        setError("Erro ao acessar microfone: " + err.message)
      }
    }
  }

  const MIN_DURATION_SECONDS = 30
  const MAX_DURATION_SECONDS = 30 * 60 // 30 minutos máximo

  // Auto-stop se atingir limite máximo
  useEffect(() => {
    if (isRecording && duration >= MAX_DURATION_SECONDS) {
      setError(`Limite máximo de ${MAX_DURATION_SECONDS / 60} minutos atingido. Gravação será encerrada.`)
      stopRecording()
    }
  }, [duration, isRecording])

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (duration < MIN_DURATION_SECONDS) {
        setError(`A gravação deve ter pelo menos ${MIN_DURATION_SECONDS} segundos. Atual: ${duration}s.`)
        return
      }

      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }

  const uploadAudio = async (audioBlob: Blob) => {
    setIsUploading(true)
    setError("")

    // Verificar tamanho do arquivo (limite 4MB para segurança)
    const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
    if (audioBlob.size > MAX_FILE_SIZE) {
      setError(`Arquivo muito grande (${(audioBlob.size / 1024 / 1024).toFixed(1)}MB). Máximo permitido: 4MB. Tente uma gravação mais curta.`)
      setIsUploading(false)
      return
    }

    try {
      // 1. Upload audio to Vercel Blob
      const formData = new FormData()
      formData.append("audio", audioBlob, `atendimento-${atendimentoId}.webm`)
      formData.append("atendimentoId", atendimentoId)
      formData.append("duracao", durationRef.current.toString())

      const response = await fetch("/api/atendimentos/upload", {
        method: "POST",
        body: formData,
      })

      // Tratamento robusto de erro
      if (!response.ok) {
        let errorMessage = "Erro ao fazer upload"
        try {
          const data = await response.json()
          errorMessage = data.error || data.details || errorMessage
        } catch {
          // Se não conseguir parsear JSON, ler como texto
          const text = await response.text()
          if (text.includes("Request Entity Too Large") || text.includes("413")) {
            errorMessage = "Arquivo muito grande. Tente uma gravação mais curta (máximo 15 minutos)."
          } else if (text.includes("timeout") || text.includes("504")) {
            errorMessage = "Tempo esgotado. Tente novamente."
          } else {
            errorMessage = `Erro do servidor: ${response.status}`
          }
        }
        throw new Error(errorMessage)
      }

      onComplete()
    } catch (err: any) {
      console.error("Erro ao fazer upload:", err)
      setError(err.message || "Erro ao enviar audio")
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
    onCancel()
  }

  return (
    <div className="space-y-3">
      {/* Recording UI */}
      <div className={cn(
        "p-4 rounded-xl border transition-all",
        isRecording 
          ? "bg-red-500/10 border-red-500/30" 
          : "bg-white/5 border-white/10"
      )}>
        {/* Timer */}
        <div className="text-center mb-4">
          <p className={cn(
            "text-3xl font-mono font-bold",
            isRecording ? "text-red-400" : "text-white/70"
          )}>
            {formatDuration(duration)}
          </p>
          <p className="text-xs text-white/50 mt-1">
            {isRecording
              ? duration < MIN_DURATION_SECONDS
                ? `Mínimo ${MIN_DURATION_SECONDS}s — faltam ${MIN_DURATION_SECONDS - duration}s`
                : duration > MAX_DURATION_SECONDS - 60
                ? `Atenção: limite em ${MAX_DURATION_SECONDS - duration}s`
                : `Gravando... (máx ${MAX_DURATION_SECONDS / 60} min)`
              : isUploading
              ? "Enviando..."
              : "Pronto para gravar"}
          </p>
          {/* Barra de progresso mínima */}
          {isRecording && duration < MIN_DURATION_SECONDS && (
            <div className="w-full mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-orange-400 rounded-full transition-all duration-1000"
                style={{ width: `${(duration / MIN_DURATION_SECONDS) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Visualizer (simple pulse animation when recording) */}
        {isRecording && (
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-400 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.random() * 20}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!isRecording && !isUploading && (
            <>
              <Button
                onClick={startRecording}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                <Mic className="w-4 h-4 mr-2" />
                Iniciar Gravacao
              </Button>
              <Button
                onClick={handleCancel}
                variant="ghost"
                className="text-white/50 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </>
          )}

          {isRecording && (
            <Button
              onClick={stopRecording}
              variant="destructive"
              disabled={duration < MIN_DURATION_SECONDS}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Square className="w-4 h-4 mr-2" />
              {duration < MIN_DURATION_SECONDS
                ? `Aguarde ${MIN_DURATION_SECONDS - duration}s...`
                : "Parar Gravacao"}
            </Button>
          )}

          {isUploading && (
            <div className="flex items-center gap-2 text-white/70">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processando audio...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tips */}
      {!isRecording && !isUploading && (
        <div className="text-xs text-white/40 text-center">
          Certifique-se de que o microfone esta conectado e funcionando
        </div>
      )}
    </div>
  )
}
