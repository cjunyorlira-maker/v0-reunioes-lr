import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// POST - Marcar resultado do atendimento (fechou ou nao fechou)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { fechou } = await request.json()

    if (typeof fechou !== "boolean") {
      return NextResponse.json({ error: "Campo 'fechou' é obrigatório" }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    // Atualizar atendimento
    const { data, error } = await supabase
      .from("atendimentos")
      .update({
        fechou,
        is_benchmark: fechou, // Se fechou, marca como benchmark para aprendizado
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar resultado:", error)
      return NextResponse.json({ error: "Erro ao atualizar resultado" }, { status: 500 })
    }

    // Enviar nota para o Kommo quando marcar resultado (fechou ou nao fechou)
    if (data.kommo_id) {
      try {
        await enviarNotaKommo(data)
      } catch (err) {
        console.error("Erro ao enviar nota para Kommo:", err)
      }
    }

    return NextResponse.json({ success: true, atendimento: data })
  } catch (error) {
    console.error("Erro ao marcar resultado:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

async function enviarNotaKommo(atendimento: any) {
  // Preparar texto da nota
  const nota = `
📊 ANÁLISE DO ATENDIMENTO

✅ Resultado: ${atendimento.fechou ? "FECHOU" : "NÃO FECHOU"}
📈 Nota Geral: ${atendimento.score_geral?.toFixed(1) || "N/A"}/10

📋 Resumo:
${atendimento.resumo || "Não disponível"}

${!atendimento.fechou && atendimento.motivo_nao_fechamento ? `
❌ Motivo não fechamento:
${atendimento.motivo_nao_fechamento}
` : ""}

💡 Feedback:
${atendimento.feedback_coaching || "Não disponível"}
`.trim()

  // Enviar para API do Kommo
  const KOMMO_TOKEN = process.env.KOMMO_ACCESS_TOKEN
  const KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN

  if (!KOMMO_TOKEN || !KOMMO_SUBDOMAIN || !atendimento.kommo_id) return

  await fetch(`https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/${atendimento.kommo_id}/notes`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KOMMO_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{
      note_type: "common",
      params: { text: nota },
    }]),
  })
}
