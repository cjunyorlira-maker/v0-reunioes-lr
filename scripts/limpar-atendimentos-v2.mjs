import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('[v0] URL:', supabaseUrl ? '✓' : '✗')
console.log('[v0] Key:', supabaseKey ? '✓' : '✗')

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
      .neq('id', 'null')
    
    if (error) {
      console.error('[v0] Erro ao deletar:', error.message)
      process.exit(1)
    }
    
    console.log(`[v0] ✅ ${count} atendimentos deletados com sucesso`)
    console.log('[v0] ✅ Limpeza concluída!')
  } catch (err) {
    console.error('[v0] Erro:', err)
    process.exit(1)
  }
}

limparAtendimentos()
