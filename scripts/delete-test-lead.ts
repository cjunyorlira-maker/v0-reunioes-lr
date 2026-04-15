import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteTestLead() {
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("nome", "teste celebração")

  if (error) {
    console.log("Erro ao deletar:", error.message)
    return
  }

  console.log("Lead deletado com sucesso!")
}

deleteTestLead()
