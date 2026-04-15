import { NextResponse } from "next/server"
import Pusher from "pusher"

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

export async function GET() {
  try {
    console.log("[v0] Disparando teste de celebracao...")
    
    await pusher.trigger("celebrations", "agendamento", {
      nome: "Teste Celebracao",
      foto: null,
      timestamp: new Date().toISOString(),
    })
    
    console.log("[v0] Celebracao de teste disparada com sucesso!")
    
    return NextResponse.json({ 
      success: true, 
      message: "Celebracao disparada com sucesso!" 
    })
  } catch (error) {
    console.error("[v0] Erro ao disparar celebracao:", error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}
