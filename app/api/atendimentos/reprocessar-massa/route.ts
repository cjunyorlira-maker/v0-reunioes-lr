import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Reprocesso em massa: joga todos os recuperáveis na fila do watchdog (que puxa 5 a cada 10min).
export async function POST() {
  const supabase = createSupabaseAdmin()
  const antigo = new Date(Date.now() - 60 * 60 * 1000).toISOString() // updated_at velho → o watchdog pega já no próximo ciclo

  const { data: alvos } = await supabase
    .from("atendimentos")
    .select("id")
    .in("status", ["erro"])
    .or("audio_url.not.is.null,audio_parts.not.is.null")

  if (!alvos || alvos.length === 0) return NextResponse.json({ ok: true, enfileirados: 0 })

  const ids = alvos.map((a) => a.id)
  await supabase.from("atendimentos").update({
    status: "processando",
    tentativas_processamento: 0,
    updated_at: antigo,
  }).in("id", ids)

  return NextResponse.json({ ok: true, enfileirados: ids.length, mensagem: "O vigia processa 5 a cada 10 minutos." })
}
