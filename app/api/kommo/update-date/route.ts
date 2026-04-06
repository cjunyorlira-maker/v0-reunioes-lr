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

    // Converte a data para formato ISO 8601 que o Kommo espera: Y-m-d\TH:i:sP
    // Exemplo: "2026-04-08" -> "2026-04-08T12:00:00-03:00"
    const dataFormatada = `${data_reuniao}T12:00:00-03:00`
    
    console.log(`[v0] Atualizando data no Kommo: leadId=${leadId}, data=${data_reuniao} -> ${dataFormatada}, tipo=${tipo}, campo=${campoDataId}`)

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
            values: [{ value: dataFormatada }]
          }]
        }),
      }
    )

    const responseText = await response.text()
    console.log(`[v0] Resposta do Kommo: status=${response.status}, body=${responseText}`)
    
    if (!response.ok) {
      console.error("[Kommo API Error] Update date:", response.status, responseText)
      return NextResponse.json(
        { error: "Erro ao atualizar data no Kommo", details: responseText },
        { status: response.status }
      )
    }

    const data = responseText ? JSON.parse(responseText) : {}

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
