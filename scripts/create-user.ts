import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: "agendamentos@lrmultimarcas.com",
    password: "Agendalr2025!",
    email_confirm: true,
  })

  if (error) {
    console.error("Erro ao criar usuário:", error.message)
    process.exit(1)
  }

  console.log("Usuário criado com sucesso!")
  console.log("Email:", data.user.email)
  console.log("ID:", data.user.id)
}

createUser()
