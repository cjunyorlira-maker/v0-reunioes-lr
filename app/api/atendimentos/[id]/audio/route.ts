import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { get } from "@vercel/blob"

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

    console.log("[v0] Proxy: buscando audio do Blob:", atendimento.audio_url.substring(0, 50))

    // Buscar audio do Blob usando get() (funciona com private store)
    const { stream, blob } = await get(atendimento.audio_url, { access: "private" })

    console.log("[v0] Proxy: audio encontrado, tamanho:", blob.size)

    // Retornar o stream diretamente
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": blob.contentType || "audio/webm",
        "Content-Length": blob.size.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[v0] Erro ao servir audio:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
