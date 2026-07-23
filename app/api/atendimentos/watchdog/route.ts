import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse, after } from "next/server"

export const maxDuration = 60

// Vigia do pipeline: roda a cada 10min (cron). Reprocessa travados; 3 falhas → erro definitivo com causa.
export async function GET() {
  const supabase = createSupabaseAdmin()
  const limite = new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15min

  const { data: travados } = await supabase
    .from("atendimentos")
    .select("id, audio_url, audio_parts, tentativas_processamento, updated_at")
    .eq("status", "processando")
    .lt("updated_at", limite)
    .order("updated_at", { ascending: true })
    .limit(5)

  if (!travados || travados.length === 0) {
    return NextResponse.json({ ok: true, redisparados: 0, mensagem: "nada travado" })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  let redisparados = 0
  let desistidos = 0

  for (const at of travados) {
    const temAudio = !!at.audio_url || (Array.isArray(at.audio_parts) && at.audio_parts.length > 0)
    const tentativas = at.tentativas_processamento || 0

    if (!temAudio) {
      await supabase.from("atendimentos").update({
        status: "aguardando", gravando: false, gravando_por: null,
        resumo: "Processamento travou sem áudio registrado — grave novamente.",
        updated_at: new Date().toISOString(),
      }).eq("id", at.id)
      desistidos++
      continue
    }

    if (tentativas >= 3) {
      await supabase.from("atendimentos").update({
        status: "erro",
        resumo: "Falha definitiva após 3 tentativas automáticas de processamento. Use o reprocesso manual.",
        updated_at: new Date().toISOString(),
      }).eq("id", at.id)
      desistidos++
      continue
    }

    await supabase.from("atendimentos").update({
      tentativas_processamento: tentativas + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", at.id)

    const payload = { atendimentoId: at.id, audioUrl: at.audio_url, audioParts: at.audio_parts || [], isRetorno: false }
    after(async () => {
      try {
        await fetch(`${baseUrl}/api/atendimentos/processar`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        })
      } catch (e) { console.error("[watchdog] redisparo falhou", at.id, e) }
    })
    redisparados++
  }

  return NextResponse.json({ ok: true, redisparados, desistidos })
}
