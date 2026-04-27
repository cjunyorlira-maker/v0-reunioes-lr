import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /api/pluga/* (webhooks from Pluga)
     * - /api/kommo/* (external API integrations)
     * - /api/n8n/* (webhooks from N8N)
     * - /api/webhook/* (generic webhooks)
     * - /api/audio/* (audio proxy for Kommo player)
     * - /api/atendimentos/processar (server-to-server async processing)
     * - /api/atendimentos/upload (audio upload)
     * - /api/atendimentos/auth (equipe/senha auth)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/pluga|api/kommo|api/n8n|api/webhook|api/audio|api/atendimentos/processar|api/atendimentos/upload|api/atendimentos/auth|api/atendimentos/blob-upload|api/vendas|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
