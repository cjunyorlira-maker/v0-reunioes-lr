import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { after } from "next/server"

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

    const supabase = createSupabaseAdmin()

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

    // 3. Trigger async processing (Deepgram + Claude) usando after() para garantir execução
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    const processorUrl = `${baseUrl}/api/atendimentos/processar`
    console.log("[v0] Agendando processamento async em:", processorUrl)
    
    // after() garante que o código execute mesmo após o response ser enviado
    after(async () => {
      console.log("[v0] Iniciando processamento via after()...")
      try {
        const res = await fetch(processorUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ atendimentoId, audioUrl: blob.url }),
        })
        console.log("[v0] Resposta do processar:", res.status)
        const data = await res.json()
        console.log("[v0] Processamento concluido:", data)
      } catch (err) {
        console.error("[v0] Erro ao processar:", err)
      }
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
