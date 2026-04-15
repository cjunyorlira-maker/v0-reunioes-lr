import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteTestLead() {
  try {
    const { data, error } = await supabase
      .from('leads')
      .delete()
      .eq('nome', 'teste celebração')

    if (error) {
      console.error('Erro ao deletar:', error)
      process.exit(1)
    }

    console.log(`✓ Lead "teste celebração" deletado com sucesso!`)
    process.exit(0)
  } catch (err) {
    console.error('Erro:', err)
    process.exit(1)
  }
}

deleteTestLead()
