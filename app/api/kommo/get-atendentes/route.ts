import { NextResponse } from "next/server"

const KOMMO_TOKEN = process.env.KOMMO_TOKEN
const KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN || "crm2lrmultimarcascom"

// ID do campo Atendente no Kommo
const CAMPO_ATENDENTE_ID = 1026479

export async function GET() {
  try {
    if (!KOMMO_TOKEN) {
      return NextResponse.json(
        { error: "KOMMO_TOKEN não configurado" },
        { status: 500 }
      )
    }

    // Busca os campos personalizados do Kommo
    const response = await fetch(
      `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/custom_fields/${CAMPO_ATENDENTE_ID}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${KOMMO_TOKEN}`,
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
    
    // Extrai as opções do campo (enums)
    const atendentes = data.enums?.map((item: { id: number; value: string; sort: number }) => ({
      id: item.id,
      nome: item.value,
      sort: item.sort,
    })) || []

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
