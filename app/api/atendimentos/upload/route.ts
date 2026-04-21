import { createClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audio = formData.get("audio") as Blob
    const atendimentoId = formData.get("atendimentoId") as string
    const duracao = formData.get("duracao") as string

    if (!audio || !atendimentoId) {
      console.error("[v0] Dados incompletos - audio:", !!audio, "atendimentoId:", atendimentoId)
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    console.log("[v0] Upload iniciando - atendimentoId:", atendimentoId, "audioSize:", audio.size, "audioType:", audio.type)

    // 1. Upload audio to Vercel Blob
    const filename = `atendimentos/${atendimentoId}-${Date.now()}.webm`
    console.log("[v0] Enviando para Blob com filename:", filename)
    
    const blob = await put(filename, audio, {
      access: "private",
      contentType: audio.type || "audio/webm",
    })
    
    console.log("[v0] Blob upload success - url:", blob.url)

    const supabase = await createClient()

    // 2. Update atendimento with audio URL and status
    await supabase
      .from("atendimentos")
      .update({
        audio_url: blob.url,
        duracao_segundos: parseInt(duracao) || 0,
        status: "processando",
        updated_at: new Date().toISOString(),
      })
      .eq("id", atendimentoId)

    // 3. Trigger async processing (Deepgram + Claude)
    // This runs in background - don't await
    const processorUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/api/atendimentos/processar`
    console.log("[v0] Iniciando processamento async em:", processorUrl)
    
    fetch(processorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atendimentoId, audioUrl: blob.url }),
    }).then(res => {
      console.log("[v0] Resposta do processar:", res.status)
      return res.json()
    }).then(data => {
      console.log("[v0] Processamento iniciado com sucesso")
    }).catch(err => {
      console.error("[v0] Erro ao iniciar processamento:", err)
    })

    return NextResponse.json({ 
      success: true, 
      audioUrl: blob.url,
      message: "Audio enviado. Processamento iniciado." 
    })
  } catch (error: any) {
    console.error("[v0] Erro no upload:", error)
    console.error("[v0] Erro message:", error?.message)
    console.error("[v0] Erro stack:", error?.stack)
    return NextResponse.json({ 
      error: "Erro ao fazer upload", 
      details: error?.message || "Unknown error"
    }, { status: 500 })
  }
}
