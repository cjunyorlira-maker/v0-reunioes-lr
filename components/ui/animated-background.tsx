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

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    // Função de ruído simplificada para criar efeito orgânico
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

      // Limpa com fade para criar trail effect
      ctx.fillStyle = "rgba(8, 8, 8, 0.15)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Labaredas principais - ondas de calor subindo
      const flameCount = 8
      for (let f = 0; f < flameCount; f++) {
        const baseX = (canvas.width / (flameCount - 1)) * f
        
        ctx.beginPath()
        ctx.moveTo(baseX, canvas.height)

        // Criar caminho ondulante para cada labareda
        const points: { x: number; y: number }[] = []
        const segments = 60
        
        for (let i = 0; i <= segments; i++) {
          const progress = i / segments
          const y = canvas.height - (canvas.height * 1.2 * progress)
          
          // Movimento ondulante que aumenta com a altura
          const waveAmplitude = 30 + progress * 80
          const wave = noise(baseX, y, time + f * 0.5) * waveAmplitude
          const x = baseX + wave
          
          points.push({ x, y })
        }

        // Desenha gradiente de labareda
        const gradient = ctx.createLinearGradient(baseX, canvas.height, baseX, 0)
        gradient.addColorStop(0, "rgba(212, 175, 55, 0.4)")
        gradient.addColorStop(0.2, "rgba(255, 170, 50, 0.25)")
        gradient.addColorStop(0.4, "rgba(255, 120, 30, 0.15)")
        gradient.addColorStop(0.6, "rgba(200, 80, 20, 0.08)")
        gradient.addColorStop(0.8, "rgba(150, 50, 20, 0.03)")
        gradient.addColorStop(1, "rgba(100, 30, 10, 0)")

        // Desenha a labareda como curva suave
        ctx.beginPath()
        ctx.moveTo(points[0].x - 60, canvas.height)
        
        for (let i = 0; i < points.length; i++) {
          const point = points[i]
          const width = 60 * (1 - i / points.length) + 10
          
          if (i === 0) {
            ctx.lineTo(point.x - width, point.y)
          } else {
            const prev = points[i - 1]
            const cpX = (prev.x + point.x) / 2 - width
            const cpY = (prev.y + point.y) / 2
            ctx.quadraticCurveTo(prev.x - width, prev.y, cpX, cpY)
          }
        }
        
        // Volta pelo outro lado
        for (let i = points.length - 1; i >= 0; i--) {
          const point = points[i]
          const width = 60 * (1 - i / points.length) + 10
          
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

      // Partículas de faísca subindo
      const sparkCount = 25
      for (let i = 0; i < sparkCount; i++) {
        const sparkTime = (time * 0.5 + i * 0.4) % 3
        const x = (canvas.width / sparkCount) * i + noise(i * 100, time * 50, time) * 100
        const y = canvas.height - sparkTime * (canvas.height * 0.5)
        const size = Math.max(0.5, 3 - sparkTime)
        const opacity = Math.max(0, 0.8 - sparkTime * 0.3)
        
        // Brilho da faísca
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 4)
        glowGradient.addColorStop(0, `rgba(255, 200, 100, ${opacity})`)
        glowGradient.addColorStop(0.5, `rgba(212, 175, 55, ${opacity * 0.3})`)
        glowGradient.addColorStop(1, "rgba(212, 175, 55, 0)")
        
        ctx.beginPath()
        ctx.arc(x, y, size * 4, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()
        
        // Centro brilhante
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 240, 200, ${opacity})`
        ctx.fill()
      }

      // Ondas de calor horizontais
      for (let w = 0; w < 4; w++) {
        const waveY = canvas.height - (canvas.height * 0.2) - w * (canvas.height * 0.15)
        const waveGradient = ctx.createLinearGradient(0, waveY - 50, 0, waveY + 50)
        waveGradient.addColorStop(0, "rgba(212, 175, 55, 0)")
        waveGradient.addColorStop(0.5, `rgba(212, 175, 55, ${0.04 - w * 0.008})`)
        waveGradient.addColorStop(1, "rgba(212, 175, 55, 0)")
        
        ctx.beginPath()
        ctx.moveTo(0, waveY)
        
        for (let x = 0; x <= canvas.width; x += 10) {
          const y = waveY + Math.sin(x * 0.01 + time * 2 + w) * (15 + w * 5)
          ctx.lineTo(x, y)
        }
        
        ctx.lineTo(canvas.width, waveY + 50)
        ctx.lineTo(0, waveY + 50)
        ctx.closePath()
        ctx.fillStyle = waveGradient
        ctx.fill()
      }

      // Brilho ambiente no fundo
      const ambientGradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height,
        0,
        canvas.width / 2,
        canvas.height,
        canvas.height * 0.8
      )
      ambientGradient.addColorStop(0, "rgba(212, 175, 55, 0.08)")
      ambientGradient.addColorStop(0.3, "rgba(180, 140, 40, 0.04)")
      ambientGradient.addColorStop(0.6, "rgba(150, 100, 30, 0.02)")
      ambientGradient.addColorStop(1, "rgba(100, 60, 20, 0)")
      
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
