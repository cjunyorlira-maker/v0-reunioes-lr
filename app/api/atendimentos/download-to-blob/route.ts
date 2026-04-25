import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

// Timeout maximo para download de arquivos grandes
export const maxDuration = 300

// Converter URLs do Google Drive para download direto
function convertGoogleDriveUrl(url: string): string {
  // Formato: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (driveMatch) {
    const fileId = driveMatch[1]
    console.log("[v0] Convertendo URL do Google Drive, fileId:", fileId)
    // Usar formato que permite download de arquivos grandes
    return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
  }
  
  // Formato alternativo: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
  if (openMatch) {
    const fileId = openMatch[1]
    return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
  }
  
  return url
}

export async function POST(request: Request) {
  try {
    const { sourceUrl, filename } = await request.json()

    if (!sourceUrl) {
      return NextResponse.json({ error: "URL de origem obrigatoria" }, { status: 400 })
    }

    console.log("[v0] Iniciando download de:", sourceUrl.substring(0, 60))

    // Converter URL do Google Drive se necessario
    const downloadUrl = convertGoogleDriveUrl(sourceUrl)
    console.log("[v0] URL de download:", downloadUrl.substring(0, 80))

    // Baixar o arquivo
    const response = await fetch(downloadUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!response.ok) {
      console.error("[v0] Erro ao baixar arquivo:", response.status, response.statusText)
      return NextResponse.json({ 
        error: `Erro ao baixar arquivo: ${response.status}`,
        details: response.statusText 
      }, { status: 400 })
    }

    const contentLength = response.headers.get("content-length")
    const contentType = response.headers.get("content-type") || "audio/mpeg"
    console.log("[v0] Tamanho do arquivo:", contentLength, "bytes, tipo:", contentType)

    // Obter o blob do arquivo
    const blob = await response.blob()
    console.log("[v0] Arquivo baixado, tamanho:", blob.size, "bytes")

    // Gerar nome do arquivo
    const finalFilename = filename || `audio-teste-${Date.now()}.mp3`

    // Fazer upload para o Vercel Blob
    console.log("[v0] Fazendo upload para Vercel Blob...")
    const blobResult = await put(finalFilename, blob, {
      access: "public",
      contentType: contentType,
    })

    console.log("[v0] Upload concluido! URL:", blobResult.url)

    return NextResponse.json({
      success: true,
      blobUrl: blobResult.url,
      size: blob.size,
      contentType: contentType,
    })
  } catch (error: any) {
    console.error("[v0] Erro no download-to-blob:", error)
    return NextResponse.json({ 
      error: "Erro ao processar arquivo",
      details: error?.message || "Unknown error"
    }, { status: 500 })
  }
}
