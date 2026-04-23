import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validar que é um upload de atendimento
        if (!pathname.startsWith("atendimentos/")) {
          throw new Error("Caminho inválido para upload")
        }

        return {
          allowedContentTypes: ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB - sem limite prático
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
