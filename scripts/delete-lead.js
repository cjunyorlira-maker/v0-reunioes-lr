import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function deleteTestLead() {
  try {
    const { data, error } = await supabase
      .from("leads")
      .delete()
      .ilike("nome", "%teste celebra%");

    if (error) {
      console.log("Erro ao deletar:", error);
      return;
    }

    console.log("Lead 'teste celebração' deletado com sucesso!");
  } catch (err) {
    console.error("Erro:", err);
  }
}

deleteTestLead();
