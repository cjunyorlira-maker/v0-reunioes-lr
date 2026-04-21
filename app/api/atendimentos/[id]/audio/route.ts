import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Endpoint proxy para servir audio de Blob privado
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Buscar URL do audio no banco
    const { data: atendimento, error } = await supabase
      .from("atendimentos")
      .select("audio_url")
      .eq("id", id)
      .single()

    if (error || !atendimento?.audio_url) {
      return NextResponse.json({ error: "Audio nao encontrado" }, { status: 404 })
    }

    // Buscar audio do Blob (funciona com private store pois usa o token do servidor)
    const audioResponse = await fetch(atendimento.audio_url)
    if (!audioResponse.ok) {
      return NextResponse.json({ error: "Falha ao buscar audio" }, { status: 500 })
    }

    const audioBuffer = await audioResponse.arrayBuffer()

    // Retornar o audio com headers corretos
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/webm",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[v0] Erro ao servir audio:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
