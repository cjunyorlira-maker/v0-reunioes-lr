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
    const BLUE_DEL_REY = { r: 30, g: 64, b: 120 } // Azul del rey escuro

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    // Partículas
    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: "gold" | "blue"
      life: number
      maxLife: number
      opacity: number
    }

    const particles: Particle[] = []
    const maxParticles = 150 // Muitas partículas

    const createParticle = () => {
      const isGold = Math.random() > 0.4 // 60% dourado, 40% azul
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + 20,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 4 - 2,
        size: Math.random() * 4 + 2,
        color: isGold ? "gold" : "blue" as "gold" | "blue",
        life: 0,
        maxLife: Math.random() * 200 + 150,
        opacity: Math.random() * 0.8 + 0.2
      }
    }

    // Inicializa partículas
    for (let i = 0; i < maxParticles; i++) {
      const p = createParticle()
      p.y = Math.random() * canvas.height
      p.life = Math.random() * p.maxLife
      particles.push(p)
    }

    // Função de ruído para movimento orgânico
    const noise = (x: number, y: number, t: number) => {
      return (
        Math.sin(x * 0.01 + t) * 0.5 +
        Math.sin(y * 0.008 + t * 0.7) * 0.3 +
        Math.sin((x + y) * 0.005 + t * 0.5) * 0.2
      )
    }

    const animate = () => {
      if (!ctx || !canvas) return
      
      time += 0.008

      // Limpa com fade suave
      ctx.fillStyle = "rgba(8, 8, 8, 0.08)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Labaredas grandes - douradas e azuis
      const flameCount = 12
      for (let f = 0; f < flameCount; f++) {
        const baseX = (canvas.width / (flameCount - 1)) * f
        const isBlue = f % 3 === 0 // Cada 3ª labareda é azul
        
        const color = isBlue ? BLUE_DEL_REY : GOLD
        
        const points: { x: number; y: number }[] = []
        const segments = 80
        
        for (let i = 0; i <= segments; i++) {
          const progress = i / segments
          const y = canvas.height - (canvas.height * 1.3 * progress)
          const waveAmplitude = 40 + progress * 120
          const wave = noise(baseX, y, time + f * 0.5) * waveAmplitude
          const x = baseX + wave
          points.push({ x, y })
        }

        // Gradiente da labareda
        const gradient = ctx.createLinearGradient(baseX, canvas.height, baseX, 0)
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`)
        gradient.addColorStop(0.15, `rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`)
        gradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`)
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`)
        gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, 0.05)`)
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)

        ctx.beginPath()
        ctx.moveTo(points[0].x - 80, canvas.height)
        
        for (let i = 0; i < points.length; i++) {
          const point = points[i]
          const width = 80 * (1 - i / points.length) + 15
          
          if (i === 0) {
            ctx.lineTo(point.x - width, point.y)
          } else {
            const prev = points[i - 1]
            const cpX = (prev.x + point.x) / 2 - width
            const cpY = (prev.y + point.y) / 2
            ctx.quadraticCurveTo(prev.x - width, prev.y, cpX, cpY)
          }
        }
        
        for (let i = points.length - 1; i >= 0; i--) {
          const point = points[i]
          const width = 80 * (1 - i / points.length) + 15
          
          if (i === points.length - 1) {
            ctx.lineTo(point.x + width, point.y)
          } else {
            const next = points[i + 1]
            const cpX = (next.x + point.x) / 2 + width
            const cpY = (next.y + point.y) / 2
            ctx.quadraticCurveTo(next.x + width, next.y, cpX, cpY)
          }
        }
        
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()
      }

      // Atualiza e desenha partículas
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        
        // Movimento com turbulência
        p.x += p.vx + noise(p.x, p.y, time) * 2
        p.y += p.vy
        p.life++
        
        // Turbulência adicional
        p.vx += (Math.random() - 0.5) * 0.1
        
        // Reset quando sai da tela ou morre
        if (p.y < -50 || p.life > p.maxLife) {
          const newP = createParticle()
          particles[i] = newP
          continue
        }
        
        // Fade baseado na vida
        const lifeFade = 1 - (p.life / p.maxLife)
        const currentOpacity = p.opacity * lifeFade
        
        const color = p.color === "gold" ? GOLD : BLUE_DEL_REY
        
        // Brilho da partícula
        const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6)
        glowGradient.addColorStop(0, `rgba(${color.r + 40}, ${color.g + 40}, ${color.b + 40}, ${currentOpacity})`)
        glowGradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${currentOpacity * 0.4})`)
        glowGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()
        
        // Núcleo brilhante
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity * 0.8})`
        ctx.fill()
      }

      // Ondas de energia horizontais
      for (let w = 0; w < 6; w++) {
        const waveY = canvas.height - (canvas.height * 0.15) - w * (canvas.height * 0.12)
        const isBlueWave = w % 2 === 0
        const color = isBlueWave ? BLUE_DEL_REY : GOLD
        
        const waveGradient = ctx.createLinearGradient(0, waveY - 60, 0, waveY + 60)
        waveGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)
        waveGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.06 - w * 0.008})`)
        waveGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)
        
        ctx.beginPath()
        ctx.moveTo(0, waveY)
        
        for (let x = 0; x <= canvas.width; x += 8) {
          const y = waveY + Math.sin(x * 0.008 + time * 2 + w) * (20 + w * 8)
          ctx.lineTo(x, y)
        }
        
        ctx.lineTo(canvas.width, waveY + 60)
        ctx.lineTo(0, waveY + 60)
        ctx.closePath()
        ctx.fillStyle = waveGradient
        ctx.fill()
      }

      // Brilho ambiente combinado
      const ambientGradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height,
        0,
        canvas.width / 2,
        canvas.height,
        canvas.height
      )
      ambientGradient.addColorStop(0, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.12)`)
      ambientGradient.addColorStop(0.3, `rgba(${BLUE_DEL_REY.r}, ${BLUE_DEL_REY.g}, ${BLUE_DEL_REY.b}, 0.08)`)
      ambientGradient.addColorStop(0.6, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.04)`)
      ambientGradient.addColorStop(1, "rgba(8, 8, 8, 0)")
      
      ctx.fillStyle = ambientGradient
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
