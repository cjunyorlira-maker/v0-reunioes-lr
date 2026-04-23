import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

/**
 * Esta rota é usada pelo cliente para fazer upload direto de áudio para o Blob.
 * O cliente chama essa rota para obter permissão de upload antes de enviar o arquivo.
 * 
 * Fluxo:
 * 1. Cliente chama POST com o pathname
 * 2. Servidor valida e retorna tokens de upload
 * 3. Cliente faz upload direto do arquivo para o Blob usando os tokens
 * 4. Cliente recebe a URL do arquivo
 */

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.ATENTIMENTOS_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        // Validar que é um upload de atendimento
        if (!pathname.startsWith("atendimentos/")) {
          throw new Error("Caminho inválido para upload. Deve começar com 'atendimentos/'")
        }

        return {
          allowedContentTypes: [
            "audio/webm",
            "audio/mp4",
            "audio/mpeg",
            "audio/ogg",
            "audio/wav",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[v0] Blob upload completo:", blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("[v0] Erro no blob-upload:", error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
