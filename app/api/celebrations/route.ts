import Pusher from 'pusher'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, foto, tipo } = body

    // Dispara evento no Pusher
    await pusher.trigger('celebrations', 'agendamento', {
      nome,
      foto,
      tipo: tipo || 'agendamento',
      timestamp: new Date().toISOString(),
    })

    return Response.json({
      success: true,
      message: 'Celebração disparada para todos os dispositivos',
    })
  } catch (error) {
    console.error('Erro ao disparar celebração:', error)
    return Response.json(
      { error: 'Erro ao disparar celebração' },
      { status: 500 }
    )
  }
}
