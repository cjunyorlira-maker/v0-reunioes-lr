import { NextResponse } from "next/server"

// ID do campo Atendente no Kommo
const CAMPO_ATENDENTE_ID = 1026479

export async function GET() {
  try {
    const token = process.env.KOMMO_ACCESS_TOKEN
    const subdomain = process.env.KOMMO_SUBDOMAIN
    
    if (!token || !subdomain) {
      return NextResponse.json(
        { error: "Configuração do Kommo não encontrada" },
        { status: 500 }
      )
    }

    // Busca os campos personalizados do Kommo
    const response = await fetch(
      `https://${subdomain}.kommo.com/api/v4/leads/custom_fields/${CAMPO_ATENDENTE_ID}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Kommo API Error]", response.status, errorText)
      return NextResponse.json(
        { error: "Erro ao buscar campo atendente", details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    console.log("[v0] Campo atendente retornado:", JSON.stringify(data, null, 2))
    
    // Extrai as opções do campo (enums)
    const atendentes = data.enums?.map((item: { id: number; value: string; sort: number }) => ({
      id: item.id,
      nome: item.value,
      sort: item.sort,
    })) || []
    
    console.log("[v0] Atendentes extraídos:", atendentes)

    // Ordena por sort
    atendentes.sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort)

    return NextResponse.json({
      success: true,
      campo_id: CAMPO_ATENDENTE_ID,
      campo_nome: data.name,
      atendentes,
    })

  } catch (error) {
    console.error("Erro ao buscar atendentes:", error)
    return NextResponse.json(
      { error: "Erro interno ao buscar atendentes" },
      { status: 500 }
    )
  }
}
