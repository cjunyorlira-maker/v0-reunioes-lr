"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Play, CheckCircle2, XCircle, Clock, Upload } from "lucide-react"
import { toast } from "sonner"

// URLs de audios de teste publicos (podcasts longos)
const AUDIO_SAMPLES = [
  {
    name: "Arquivo Local - 100 min (WebM)",
    url: "/audio-teste-100min.webm",
    duracao: 6000, // 100 minutos
    local: true,
  },
  {
    name: "Podcast Curto (5 min)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duracao: 300, // 5 minutos
  },
  {
    name: "Audio Medio (30 min simulado)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duracao: 1800, // 30 minutos
  },
  {
    name: "Audio Longo (100 min simulado)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duracao: 6000, // 100 minutos
  },
]

export default function TesteAudioPage() {
  const [testResults, setTestResults] = useState<{
    status: "idle" | "running" | "success" | "error"
    message: string
    details?: any
    startTime?: number
    endTime?: number
  }>({ status: "idle", message: "" })
  
  const [selectedAudio, setSelectedAudio] = useState(AUDIO_SAMPLES[0]) // Audio local 100 min por padrao
  const [customUrl, setCustomUrl] = useState("")

  const runTest = async (audioUrl: string, duracao: number) => {
    setTestResults({ status: "running", message: "Iniciando teste...", startTime: Date.now() })

    try {
      // 1. Criar um atendimento de teste no banco
      setTestResults(prev => ({ ...prev, message: "Criando atendimento de teste..." }))
      
      const createRes = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_lead: "TESTE - Audio Longo",
          responsavel: "Sistema de Teste",
          equipe: "Teste",
          kommo_id: `teste-${Date.now()}`,
          data_atendimento: new Date().toISOString().split("T")[0],
        }),
      })

      if (!createRes.ok) {
        throw new Error("Falha ao criar atendimento de teste")
      }

      const { atendimento } = await createRes.json()
      const atendimentoId = atendimento.id

      setTestResults(prev => ({ 
        ...prev, 
        message: `Atendimento criado: ${atendimentoId}. Enviando audio para processamento...`,
        details: { atendimentoId }
      }))

      // 2. Simular o upload - registrar a URL do audio
      const uploadRes = await fetch("/api/atendimentos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atendimentoId,
          audioUrl,
          duracao,
        }),
      })

      if (!uploadRes.ok) {
        const error = await uploadRes.json()
        throw new Error(error.error || "Falha no upload")
      }

      setTestResults(prev => ({ 
        ...prev, 
        message: `Audio registrado! Aguardando processamento (Deepgram + Claude)... Isso pode levar varios minutos para audios longos.`,
      }))

      // 3. Polling para verificar status
      let attempts = 0
      const maxAttempts = 120 // 20 minutos max (a cada 10s)
      
      const checkStatus = async (): Promise<boolean> => {
        const statusRes = await fetch(`/api/atendimentos/${atendimentoId}`)
        if (!statusRes.ok) return false
        
        const data = await statusRes.json()
        const status = data.atendimento?.status

        setTestResults(prev => ({ 
          ...prev, 
          message: `Status: ${status} (tentativa ${attempts + 1}/${maxAttempts})`,
          details: { ...prev.details, currentStatus: status }
        }))

        if (status === "concluido") {
          setTestResults({
            status: "success",
            message: "Teste concluido com sucesso!",
            details: data.atendimento,
            startTime: testResults.startTime,
            endTime: Date.now(),
          })
          return true
        }

        if (status === "erro") {
          setTestResults({
            status: "error",
            message: "Processamento falhou",
            details: data.atendimento,
            startTime: testResults.startTime,
            endTime: Date.now(),
          })
          return true
        }

        return false
      }

      // Polling loop
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 10000)) // 10 segundos
        attempts++
        const done = await checkStatus()
        if (done) break
      }

      if (attempts >= maxAttempts) {
        setTestResults(prev => ({
          ...prev,
          status: "error",
          message: "Timeout - processamento demorou mais de 20 minutos",
          endTime: Date.now(),
        }))
      }

    } catch (error: any) {
      setTestResults({
        status: "error",
        message: error.message || "Erro desconhecido",
        endTime: Date.now(),
      })
      toast.error(error.message)
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#d4af37]">Teste de Audio Longo</h1>
          <p className="text-white/60 mt-2">
            Simula o processamento de um audio de ate 100+ minutos pelo Deepgram e Claude.
          </p>
        </div>

        {/* Selecao de Audio */}
        <div className="space-y-4 p-6 rounded-2xl border border-white/10" style={{ background: "rgba(0,0,0,0.3)" }}>
          <h2 className="text-lg font-semibold">Selecione o Audio de Teste</h2>
          
          <div className="space-y-2">
            {AUDIO_SAMPLES.map((sample) => (
              <button
                key={sample.name}
                onClick={() => setSelectedAudio(sample)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  selectedAudio.name === sample.name
                    ? "bg-[#d4af37]/20 border border-[#d4af37]/40"
                    : "bg-white/5 border border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{sample.name}</span>
                  <span className="text-sm text-white/50">
                    {Math.floor(sample.duracao / 60)} min
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            <label className="block text-sm text-white/60 mb-2">
              Ou use uma URL personalizada:
            </label>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://exemplo.com/audio.mp3"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-[#d4af37]/50 outline-none"
            />
          </div>
        </div>

        {/* Botao de Teste */}
        <Button
          onClick={() => {
            const url = customUrl || selectedAudio.url
            const duracao = customUrl ? 6000 : selectedAudio.duracao
            runTest(url, duracao)
          }}
          disabled={testResults.status === "running"}
          className="w-full h-14 bg-gradient-to-r from-[#d4af37] to-[#b8960c] hover:from-[#e5c04b] hover:to-[#c9a71d] text-black font-bold text-lg rounded-xl"
        >
          {testResults.status === "running" ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Iniciar Teste de {customUrl ? "URL Personalizada" : selectedAudio.name}
            </>
          )}
        </Button>

        {/* Resultados */}
        {testResults.status !== "idle" && (
          <div className={`p-6 rounded-2xl border ${
            testResults.status === "success" 
              ? "border-emerald-500/30 bg-emerald-500/10" 
              : testResults.status === "error"
                ? "border-red-500/30 bg-red-500/10"
                : "border-white/10 bg-white/5"
          }`}>
            <div className="flex items-start gap-3">
              {testResults.status === "running" && (
                <Loader2 className="w-6 h-6 text-[#d4af37] animate-spin flex-shrink-0 mt-0.5" />
              )}
              {testResults.status === "success" && (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              {testResults.status === "error" && (
                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              
              <div className="flex-1 space-y-3">
                <p className="font-medium">{testResults.message}</p>
                
                {testResults.startTime && testResults.endTime && (
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Clock className="w-4 h-4" />
                    Tempo total: {formatTime(testResults.endTime - testResults.startTime)}
                  </div>
                )}

                {testResults.details && testResults.status === "success" && (
                  <div className="mt-4 p-4 rounded-xl bg-black/30 space-y-2 text-sm">
                    <p><strong>Score Geral:</strong> {testResults.details.score_geral || "N/A"}/10</p>
                    <p><strong>Resumo:</strong> {testResults.details.resumo || "N/A"}</p>
                    <p><strong>Transcricao:</strong> {testResults.details.transcricao_completa?.substring(0, 200)}...</p>
                  </div>
                )}

                {testResults.details && testResults.status === "error" && (
                  <div className="mt-4 p-4 rounded-xl bg-red-500/10 text-sm text-red-300">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(testResults.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Informacoes */}
        <div className="text-sm text-white/40 space-y-2">
          <p><strong>Nota:</strong> O teste usa um audio publico de amostra. Para testar com audio real de 100 minutos, use a URL personalizada.</p>
          <p><strong>Limites:</strong> Vercel Hobby = 60s timeout | Vercel Pro = 300s timeout | Enterprise = 900s</p>
          <p><strong>Recomendacao:</strong> Para audios de 100+ minutos, use o plano Pro ou Enterprise.</p>
        </div>
      </div>
    </div>
  )
}
