"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Play, CheckCircle2, XCircle, Clock, Download, Cloud, Upload } from "lucide-react"
import { toast } from "sonner"

// URL padrao do Google Drive para teste de 100 minutos
const DEFAULT_GDRIVE_URL = "https://drive.google.com/file/d/1Gq9TnlXmcCoAe9YZMBgxsjWeq2bKg0tM/view?usp=sharing"

type TestStep = "idle" | "downloading" | "uploading" | "creating" | "processing" | "polling" | "success" | "error"

export default function TesteAudioPage() {
  const [currentStep, setCurrentStep] = useState<TestStep>("idle")
  const [stepMessage, setStepMessage] = useState("")
  const [testResults, setTestResults] = useState<{
    status: TestStep
    message: string
    details?: any
    startTime?: number
    endTime?: number
    blobUrl?: string
  }>({ status: "idle", message: "" })
  
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_GDRIVE_URL)
  const [estimatedDuration, setEstimatedDuration] = useState(6000) // 100 minutos em segundos

  const runFullTest = async () => {
    const startTime = Date.now()
    setTestResults({ status: "downloading", message: "Iniciando teste...", startTime })

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // PASSO 1: Baixar do Google Drive e fazer upload para o Blob
      // ═══════════════════════════════════════════════════════════════════════
      setCurrentStep("downloading")
      setStepMessage("Baixando arquivo do Google Drive...")
      
      const downloadRes = await fetch("/api/atendimentos/download-to-blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl,
          filename: `podcast-teste-${Date.now()}.opus`,
        }),
      })

      if (!downloadRes.ok) {
        const error = await downloadRes.json()
        throw new Error(`Falha ao baixar: ${error.error || error.details || "Erro desconhecido"}`)
      }

      const { blobUrl, size } = await downloadRes.json()
      console.log("[v0] Arquivo baixado e enviado para Blob:", blobUrl, "Tamanho:", size)

      setCurrentStep("uploading")
      setStepMessage(`Arquivo enviado para Blob! (${(size / 1024 / 1024).toFixed(2)} MB)`)
      setTestResults(prev => ({ ...prev, blobUrl }))

      // ═══════════════════════════════════════════════════════════════════════
      // PASSO 2: Criar atendimento de teste no banco
      // ═══════════════════════════════════════════════════════════════════════
      setCurrentStep("creating")
      setStepMessage("Criando atendimento de teste no banco...")
      
      const testUuid = crypto.randomUUID()
      const createRes = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: testUuid,
          nome_lead: "TESTE - Podcast 100min",
          responsavel: "Sistema de Teste",
          equipe: "Teste",
          kommo_id: `teste-${Date.now()}`,
          data_atendimento: new Date().toISOString().split("T")[0],
        }),
      })

      if (!createRes.ok) {
        const error = await createRes.json()
        throw new Error(`Falha ao criar atendimento: ${error.error || "Erro desconhecido"}`)
      }

      const { atendimento } = await createRes.json()
      const atendimentoId = atendimento.id
      console.log("[v0] Atendimento criado:", atendimentoId)

      // ═══════════════════════════════════════════════════════════════════════
      // PASSO 3: Registrar audio e iniciar processamento
      // ═══════════════════════════════════════════════════════════════════════
      setCurrentStep("processing")
      setStepMessage("Enviando para processamento (Deepgram + Claude)...")
      
      const uploadRes = await fetch("/api/atendimentos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atendimentoId,
          audioUrl: blobUrl,
          duracao: estimatedDuration,
        }),
      })

      if (!uploadRes.ok) {
        const error = await uploadRes.json()
        throw new Error(`Falha ao registrar audio: ${error.error || "Erro desconhecido"}`)
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PASSO 4: Polling para verificar status
      // ═══════════════════════════════════════════════════════════════════════
      setCurrentStep("polling")
      setStepMessage("Aguardando processamento... (pode levar varios minutos para audios longos)")

      let attempts = 0
      const maxAttempts = 180 // 30 minutos max (a cada 10s)
      
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 10000)) // 10 segundos
        attempts++

        const statusRes = await fetch(`/api/atendimentos/${atendimentoId}`)
        if (!statusRes.ok) continue
        
        const data = await statusRes.json()
        const status = data.atendimento?.status

        setStepMessage(`Status: ${status} (verificacao ${attempts}/${maxAttempts})`)

        if (status === "concluido") {
          setCurrentStep("success")
          setTestResults({
            status: "success",
            message: "Teste concluido com sucesso!",
            details: data.atendimento,
            startTime,
            endTime: Date.now(),
            blobUrl,
          })
          toast.success("Teste concluido com sucesso!")
          return
        }

        if (status === "erro") {
          throw new Error("Processamento falhou - verifique os logs")
        }
      }

      throw new Error("Timeout - processamento demorou mais de 30 minutos")

    } catch (error: any) {
      console.error("[v0] Erro no teste:", error)
      setCurrentStep("error")
      setTestResults({
        status: "error",
        message: error.message || "Erro desconhecido",
        startTime,
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

  const isRunning = currentStep !== "idle" && currentStep !== "success" && currentStep !== "error"

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#d4af37]">Teste de Audio Longo (100 min)</h1>
          <p className="text-white/60 mt-2">
            Simula o fluxo REAL: Google Drive → Vercel Blob → Deepgram → Claude
          </p>
        </div>

        {/* Fluxo Visual */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <Step icon={<Download className="w-5 h-5" />} label="Download" active={currentStep === "downloading"} done={["uploading", "creating", "processing", "polling", "success"].includes(currentStep)} />
          <div className="flex-1 h-px bg-white/20 mx-2" />
          <Step icon={<Cloud className="w-5 h-5" />} label="Blob" active={currentStep === "uploading"} done={["creating", "processing", "polling", "success"].includes(currentStep)} />
          <div className="flex-1 h-px bg-white/20 mx-2" />
          <Step icon={<Upload className="w-5 h-5" />} label="Criar" active={currentStep === "creating"} done={["processing", "polling", "success"].includes(currentStep)} />
          <div className="flex-1 h-px bg-white/20 mx-2" />
          <Step icon={<Loader2 className="w-5 h-5" />} label="Processar" active={currentStep === "processing" || currentStep === "polling"} done={currentStep === "success"} />
        </div>

        {/* URL de Origem */}
        <div className="space-y-4 p-6 rounded-2xl border border-white/10" style={{ background: "rgba(0,0,0,0.3)" }}>
          <h2 className="text-lg font-semibold">URL do Arquivo de Audio</h2>
          
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/FILE_ID/view"
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-[#d4af37]/50 outline-none"
            disabled={isRunning}
          />
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-white/60 mb-2">Duracao estimada (minutos)</label>
              <input
                type="number"
                value={Math.floor(estimatedDuration / 60)}
                onChange={(e) => setEstimatedDuration(parseInt(e.target.value) * 60)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-[#d4af37]/50 outline-none"
                disabled={isRunning}
              />
            </div>
          </div>

          <p className="text-xs text-white/40">
            O arquivo sera baixado do Google Drive, enviado para o Vercel Blob, e processado pelo Deepgram + Claude.
          </p>
        </div>

        {/* Botao de Teste */}
        <Button
          onClick={runFullTest}
          disabled={isRunning || !sourceUrl}
          className="w-full h-14 bg-gradient-to-r from-[#d4af37] to-[#b8960c] hover:from-[#e5c04b] hover:to-[#c9a71d] text-black font-bold text-lg rounded-xl disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {stepMessage}
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Iniciar Teste Completo
            </>
          )}
        </Button>

        {/* Resultados */}
        {(currentStep === "success" || currentStep === "error") && (
          <div className={`p-6 rounded-2xl border ${
            currentStep === "success" 
              ? "border-emerald-500/30 bg-emerald-500/10" 
              : "border-red-500/30 bg-red-500/10"
          }`}>
            <div className="flex items-start gap-3">
              {currentStep === "success" && (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              {currentStep === "error" && (
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

                {testResults.blobUrl && (
                  <p className="text-sm text-white/60">
                    <strong>Blob URL:</strong> {testResults.blobUrl}
                  </p>
                )}

                {testResults.details && currentStep === "success" && (
                  <div className="mt-4 p-4 rounded-xl bg-black/30 space-y-2 text-sm">
                    <p><strong>Score Geral:</strong> {testResults.details.score_geral || "N/A"}/10</p>
                    <p><strong>Resumo:</strong> {testResults.details.resumo || "N/A"}</p>
                    <p><strong>Transcricao:</strong> {testResults.details.transcricao_completa?.substring(0, 300)}...</p>
                  </div>
                )}

                {testResults.details && currentStep === "error" && (
                  <div className="mt-4 p-4 rounded-xl bg-red-500/10 text-sm text-red-300">
                    <pre className="whitespace-pre-wrap text-xs">
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
          <p><strong>Fluxo:</strong> Google Drive → Download → Vercel Blob → API Upload → Deepgram → Claude → Resultado</p>
          <p><strong>Limites:</strong> Vercel Hobby = 60s | Pro = 300s | Enterprise = 900s timeout por requisicao</p>
          <p><strong>Nota:</strong> Para audios de 100+ minutos, o plano Pro ou Enterprise e recomendado.</p>
        </div>
      </div>
    </div>
  )
}

// Componente auxiliar para os passos
function Step({ icon, label, active, done }: { icon: React.ReactNode; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${
      done ? "text-emerald-400" : active ? "text-[#d4af37]" : "text-white/30"
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        done ? "bg-emerald-500/20" : active ? "bg-[#d4af37]/20 animate-pulse" : "bg-white/5"
      }`}>
        {done ? <CheckCircle2 className="w-5 h-5" /> : icon}
      </div>
      <span className="text-xs">{label}</span>
    </div>
  )
}
