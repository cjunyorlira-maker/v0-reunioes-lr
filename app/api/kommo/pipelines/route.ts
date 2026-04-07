import { NextResponse } from "next/server"

// Lista todos os pipelines e etapas do Kommo
export async function GET() {
  const token = process.env.KOMMO_ACCESS_TOKEN
  const subdomain = process.env.KOMMO_SUBDOMAIN

  if (!token || !subdomain) {
    return NextResponse.json({ error: "Kommo não configurado" }, { status: 500 })
  }

  try {
    const response = await fetch(`https://${subdomain}.kommo.com/api/v4/leads/pipelines`, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Erro na API do Kommo" }, { status: response.status })
    }

    const data = await response.json()
    const pipelines = data._embedded?.pipelines || []

    const formatted = pipelines.map((p: any) => ({
      id: p.id,
      nome: p.name,
      etapas: (p._embedded?.statuses || []).map((s: any) => ({
        id: s.id,
        nome: s.name,
        cor: s.color,
      })),
    }))

    return NextResponse.json({ pipelines: formatted })
  } catch (error) {
    console.error("[v0] Erro ao listar pipelines:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
