import { NextRequest, NextResponse } from "next/server"

// IDs dos campos de data no Kommo
const CAMPO_DATA_VIERAM_ID = 1026050
const CAMPO_DATA_NAO_VIERAM_ID = 1026052

export async function POST(request: NextRequest) {
  try {
    const { leadId, data_reuniao, tipo } = await request.json()
    
    // tipo: "veio" usa CAMPO_DATA_VIERAM_ID, outros usam CAMPO_DATA_NAO_VIERAM_ID
    const campoDataId = tipo === "veio" ? CAMPO_DATA_VIERAM_ID : CAMPO_DATA_NAO_VIERAM_ID

    const token = process.env.KOMMO_ACCESS_TOKEN
    const subdomain = process.env.KOMMO_SUBDOMAIN

    if (!token || !subdomain || !leadId || !data_reuniao) {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 }
      )
    }

    // Converte a data para timestamp Unix
    const dataObj = new Date(`${data_reuniao}T12:00:00`)
    const timestamp = Math.floor(dataObj.getTime() / 1000)

    // Faz a requisição PATCH para atualizar o campo de data
    const response = await fetch(
      `https://${subdomain}.kommo.com/api/v4/leads/${leadId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          custom_fields_values: [{
            field_id: campoDataId,
            values: [{ value: timestamp }]
          }]
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Kommo API Error] Update date:", response.status, errorText)
      return NextResponse.json(
        { error: "Erro ao atualizar data no Kommo", details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: `Data atualizada: ${data_reuniao} -> campo ${campoDataId}`,
      data,
    })
  } catch (error) {
    console.error("[Kommo API Error] Update date:", error)
    return NextResponse.json(
      { error: "Erro interno ao processar requisição" },
      { status: 500 }
    )
  }
}
