import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[v0] Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function limparAtendimentos() {
  console.log('[v0] Iniciando limpeza de atendimentos...')
  
  try {
    // Deletar todos os atendimentos
    const { error, count } = await supabase
      .from('atendimentos')
      .delete()
      .neq('id', 'null') // Deleta todos onde id não é null (todos)
    
    if (error) {
      console.error('[v0] Erro ao deletar:', error.message)
      process.exit(1)
    }
    
    console.log(`[v0] ✅ ${count} atendimentos deletados com sucesso`)
    
    // Verificar resultado
    const { data, error: countError } = await supabase
      .from('atendimentos')
      .select('id', { count: 'exact', head: true })
    
    if (countError) {
      console.error('[v0] Erro ao verificar:', countError.message)
      process.exit(1)
    }
    
    console.log('[v0] Total de atendimentos restantes: 0')
    console.log('[v0] ✅ Limpeza concluída!')
  } catch (err) {
    console.error('[v0] Erro:', err)
    process.exit(1)
  }
}

limparAtendimentos()
