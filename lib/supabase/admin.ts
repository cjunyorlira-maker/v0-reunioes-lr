import { createClient } from "@supabase/supabase-js"

// Cliente Supabase com Service Role Key para rotas server-to-server
// Use APENAS em rotas de API que não tem sessão de usuário
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Supabase URL ou SERVICE_ROLE_KEY não configurados")
  }

  return createClient(url, serviceKey)
}
