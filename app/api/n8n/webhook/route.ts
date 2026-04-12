import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("[v0] N8N Webhook OK:", body.nome)
    return NextResponse.json({ success: true, message: "Webhook recebido!" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: "Webhook ativo" })
}
