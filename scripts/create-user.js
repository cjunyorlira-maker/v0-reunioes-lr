const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY')
  process.exit(1)
}

async function createUser() {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({
      email: 'agendamentos@lrmultimarcas.com',
      password: 'Agendalr2025!',
      email_confirm: true
    })
  })

  const data = await response.json()
  
  if (response.ok) {
    console.log('Usuário criado com sucesso:', data.email)
  } else {
    console.error('Erro ao criar usuário:', data)
  }
}

createUser()
