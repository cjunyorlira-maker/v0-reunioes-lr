import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { AnimatedBackground } from '@/components/ui/animated-background'
import './globals.css'

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans'
})

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  weight: ['600', '700'],
  variable: '--font-playfair'
})

export const metadata: Metadata = {
  title: 'Reuniões Agendadas — LR Multimarcas',
  description: 'Sistema de gerenciamento de reuniões e leads da LR Multimarcas',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#080808',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${dmSans.variable} ${playfair.variable} font-sans antialiased`}>
        <AnimatedBackground />
        <div className="relative z-10">
          {children}
        </div>
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
