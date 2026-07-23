import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { after } from "next/server"

// Aceita audioUrl (formato antigo, 1 arquivo) OU audioParts (novo: partes de 30s do gravador blindado)
export async function POST(request: Request) {
  try {
    const { atendimentoId, audioUrl, audioParts, duracao, isRetorno } = await request.json()

    const parts: string[] = Array.isArray(audioParts) ? audioParts.filter(Boolean) : []
    const urlPrincipal = audioUrl || parts[0] || null

    if (!atendimentoId || (!audioUrl && parts.length === 0)) {
      console.error("[v0] Dados incompletos - atendimentoId:", atendimentoId)
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    console.log("[v0] Upload recebido - atendimentoId:", atendimentoId, "isRetorno:", isRetorno, "duracao:", duracao, "parts:", parts.length)

    const supabase = createSupabaseAdmin()

    if (isRetorno) {
      await supabase
        .from("atendimentos")
        .update({
          retorno_audio_url: urlPrincipal,
          retorno_data: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", atendimentoId)
    } else {
      await supabase
        .from("atendimentos")
        .update({
          audio_url: urlPrincipal,
          audio_parts: parts.length > 0 ? parts : null,
          duracao_segundos: parseInt(duracao) || 0,
          status: "processando",
          updated_at: new Date().toISOString(),
        })
        .eq("id", atendimentoId)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    const processorUrl = `${baseUrl}/api/atendimentos/processar`
    console.log("[v0] Agendando processamento async em:", processorUrl)

    after(async () => {
      console.log("[v0] Iniciando processamento via after()...")
      try {
        const res = await fetch(processorUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ atendimentoId, audioUrl: urlPrincipal, audioParts: parts, isRetorno }),
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
      audioUrl: urlPrincipal,
      parts: parts.length,
      message: "Audio registrado. Processamento iniciado.",
    })
  } catch (error: any) {
    console.error("[v0] Erro no upload:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}
