import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { after } from "next/server"

export async function POST(request: Request) {
  try {
    const { atendimentoId, audioUrl, duracao } = await request.json()

    if (!atendimentoId || !audioUrl) {
      console.error("[v0] Dados incompletos - atendimentoId:", atendimentoId, "audioUrl:", audioUrl)
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    console.log("[v0] Upload recebido - atendimentoId:", atendimentoId, "audioUrl:", audioUrl, "duracao:", duracao)

    const supabase = createSupabaseAdmin()

    // Update atendimento with audio URL and status
    await supabase
      .from("atendimentos")
      .update({
        audio_url: audioUrl,
        duracao_segundos: parseInt(duracao) || 0,
        status: "processando",
        updated_at: new Date().toISOString(),
      })
      .eq("id", atendimentoId)

    // Trigger async processing (Deepgram + Claude) usando after() para garantir execução
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
          body: JSON.stringify({ atendimentoId, audioUrl }),
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
      audioUrl: audioUrl,
      message: "Audio registrado. Processamento iniciado." 
    })
  } catch (error: any) {
    console.error("[v0] Erro no upload:", error)
    return NextResponse.json({ 
      error: "Erro ao fazer upload", 
      details: error?.message || "Unknown error"
    }, { status: 500 })
  }
}
