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
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // 1. Upload audio to Vercel Blob
    const filename = `atendimentos/${atendimentoId}-${Date.now()}.webm`
    const blob = await put(filename, audio, {
      access: "public",
      contentType: audio.type || "audio/webm",
    })

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
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/atendimentos/processar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atendimentoId, audioUrl: blob.url }),
    }).catch(err => console.error("Erro ao iniciar processamento:", err))

    return NextResponse.json({ 
      success: true, 
      audioUrl: blob.url,
      message: "Audio enviado. Processamento iniciado." 
    })
  } catch (error) {
    console.error("Erro no upload:", error)
    return NextResponse.json({ error: "Erro ao fazer upload" }, { status: 500 })
  }
}
