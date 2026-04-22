import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Se o erro for de refresh token inválido, limpa os cookies de auth
      if (error.code === 'refresh_token_not_found' || error.message?.includes('Refresh Token')) {
        // Limpa todos os cookies de auth do Supabase
        const cookieNames = request.cookies.getAll().map(c => c.name)
        cookieNames.forEach(name => {
          if (name.startsWith('sb-') || name.includes('supabase')) {
            supabaseResponse.cookies.delete(name)
          }
        })
      }
    } else {
      user = data.user
    }
  } catch {
    // Em caso de erro, continua sem usuário
    user = null
  }

  // Rotas públicas que não precisam de autenticação
  // Inclui rotas de API que são chamadas server-to-server (sem cookies de sessão)
  const publicRoutes = [
    '/auth/login', 
    '/auth/error', 
    '/api/webhook',
    '/api/atendimentos/processar',  // chamada server-to-server do upload
    '/api/atendimentos/upload',     // chamada do cliente mas processa async
    '/api/atendimentos/auth',       // login por equipe/senha (sem sessão Supabase)
    '/api/n8n',
    '/api/kommo',
  ]
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  
  // Se não está logado e não é rota pública, redireciona para login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }
  
  // Se está logado e tentando acessar login, redireciona para home
  if (user && request.nextUrl.pathname === '/auth/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
