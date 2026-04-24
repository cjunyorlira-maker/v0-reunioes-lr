import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function limparAtendimentos() {
  try {
    const { data, error } = await supabase
      .from('atendimentos')
      .delete()
      .neq('id', '')

    if (error) {
      console.error('Erro ao deletar:', error.message)
      process.exit(1)
    }

    console.log('✅ Todos os atendimentos foram deletados!')
    process.exit(0)
  } catch (err) {
    console.error('Erro:', err)
    process.exit(1)
  }
}

limparAtendimentos()
