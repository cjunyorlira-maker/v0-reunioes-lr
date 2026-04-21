import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { equipe, senha } = await request.json()

    if (!equipe || !senha) {
      return NextResponse.json({ error: "Equipe e senha são obrigatórios" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("equipes_senhas")
      .select("*")
      .eq("equipe", equipe)
      .eq("senha", senha)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
    }

    return NextResponse.json({ success: true, equipe: data.equipe })
  } catch (error) {
    console.error("Erro ao autenticar equipe:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
