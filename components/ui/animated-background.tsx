"use client"

import { useEffect, useRef } from "react"

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let time = 0

    // Cores - Dourado e Azul Del Rey
    const GOLD = { r: 212, g: 175, b: 55 }
    const BLUE = { r: 30, g: 64, b: 120 }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    // Orbs flutuantes
    interface Orb {
      x: number
      y: number
      radius: number
      vx: number
      vy: number
      color: typeof GOLD | typeof BLUE
    }

    const orbs: Orb[] = []
    const orbCount = 6

    for (let i = 0; i < orbCount; i++) {
      orbs.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 200 + Math.random() * 300,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: i % 2 === 0 ? GOLD : BLUE
      })
    }

    // Partículas sutis
    interface Particle {
      x: number
      y: number
      size: number
      opacity: number
      speed: number
      color: typeof GOLD | typeof BLUE
    }

    const particles: Particle[] = []
    const particleCount = 50

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.3 + 0.1,
        speed: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? GOLD : BLUE
      })
    }

    const animate = () => {
      if (!ctx || !canvas) return
      
      time += 0.005

      // Fundo base
      ctx.fillStyle = "#080808"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Orbs com gradiente suave (blur effect)
      for (const orb of orbs) {
        // Movimento suave
        orb.x += orb.vx
        orb.y += orb.vy

        // Bounce nas bordas
        if (orb.x < -orb.radius) orb.x = canvas.width + orb.radius
        if (orb.x > canvas.width + orb.radius) orb.x = -orb.radius
        if (orb.y < -orb.radius) orb.y = canvas.height + orb.radius
        if (orb.y > canvas.height + orb.radius) orb.y = -orb.radius

        // Movimento ondulante
        const wobbleX = Math.sin(time + orb.radius) * 20
        const wobbleY = Math.cos(time * 0.7 + orb.radius) * 15

        const gradient = ctx.createRadialGradient(
          orb.x + wobbleX,
          orb.y + wobbleY,
          0,
          orb.x + wobbleX,
          orb.y + wobbleY,
          orb.radius
        )
        
        gradient.addColorStop(0, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, 0.08)`)
        gradient.addColorStop(0.5, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, 0.03)`)
        gradient.addColorStop(1, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, 0)`)

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Linhas de grid sutis
      ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.02)`
      ctx.lineWidth = 1
      
      const gridSize = 80
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Partículas flutuantes
      for (const p of particles) {
        p.y -= p.speed
        p.x += Math.sin(time * 2 + p.y * 0.01) * 0.3

        if (p.y < -10) {
          p.y = canvas.height + 10
          p.x = Math.random() * canvas.width
        }

        const pulse = Math.sin(time * 3 + p.x * 0.01) * 0.5 + 0.5
        const currentOpacity = p.opacity * (0.5 + pulse * 0.5)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${currentOpacity})`
        ctx.fill()
      }

      // Brilho sutil no rodapé
      const footerGlow = ctx.createLinearGradient(0, canvas.height - 200, 0, canvas.height)
      footerGlow.addColorStop(0, "rgba(8, 8, 8, 0)")
      footerGlow.addColorStop(0.5, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.02)`)
      footerGlow.addColorStop(1, `rgba(${BLUE.r}, ${BLUE.g}, ${BLUE.b}, 0.03)`)
      
      ctx.fillStyle = footerGlow
      ctx.fillRect(0, canvas.height - 200, canvas.width, 200)

      // Vinheta sutil
      const vignette = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.3,
        canvas.width / 2,
        canvas.height / 2,
        canvas.height
      )
      vignette.addColorStop(0, "rgba(8, 8, 8, 0)")
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.4)")
      
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      animationFrameId = requestAnimationFrame(animate)
    }

    resize()
    animate()

    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ 
        background: "#080808",
        zIndex: 0,
      }}
    />
  )
}
