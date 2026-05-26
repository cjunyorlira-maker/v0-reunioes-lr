# Layout LR Multimarcas - Copie para outro projeto

Use este prompt no outro chat do v0:

---

## PROMPT PARA COPIAR:

```
Crie um projeto Next.js com o layout visual da LR Multimarcas com as seguintes características:

## DESIGN SYSTEM

### Tema 100% Dark
- Background principal: #0a0a0a / #080808
- Surface: #131313
- Surface2: #1a1a1a
- Accent dourado: #d4af37
- Text: #f5f0e8 / #fafafa
- Muted: #8a8070 / #737373

### Fontes
- Principal: Plus Jakarta Sans (weights: 400, 500, 600, 700, 800)
- Monospace (números): JetBrains Mono

### Cores de Status
- Verde: #22c55e (sucesso)
- Vermelho: #ef4444 (erro/danger)
- Âmbar: #f59e0b (warning)
- Azul: #3b82f6 (info)

## COMPONENTES VISUAIS

### 1. AnimatedBackground (Canvas)
Fundo animado com:
- Partículas flutuantes douradas e azuis (120 partículas, tamanho 10-35px)
- 5 orbs grandes com gradiente radial que se movem lentamente
- Efeito de brilho sutil no rodapé
- Cores: Dourado (#d4af37) e Azul Del Rey (#193264)

### 2. Header Premium
- Backdrop blur com borda dourada sutil
- Logo à esquerda
- Navegação de semanas com setas (ChevronLeft/ChevronRight)
- Botões com gradiente e efeito shine on hover:
  - Botão primário (dourado): background linear-gradient(135deg, #d4af37, #c9a227)
  - Botões coloridos com hover scale e translate-y
  - Efeito de luz passando (translate-x animation)

### 3. Cards Glass Morphism
```css
.glass-card {
  background: rgba(0,0,0,0.12);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.06);
}
.glass-card:hover {
  background: rgba(0,0,0,0.18);
  border-color: rgba(212,175,55,0.2);
}
```

### 4. Botões com Glow
- Efeito radial gradient no hover
- Classes: glow-green, glow-red, glow-gold, glow-cyan, glow-purple
- Shine effect com ::after pseudo-element

### 5. Scrollbar Customizada
- Thumb com cor dourada rgba(212,175,55,0.15)
- Track transparente
- Hover mais forte rgba(212,175,55,0.25)

## PÁGINA DE LOGIN

Card centralizado com:
- Background gradiente glass (from-white/[0.08] to-white/[0.03])
- Linha decorativa dourada no topo (w-24 h-1 gradient)
- Logo centralizada
- Inputs com fundo escuro e borda dourada sutil
- Botão de login com gradiente dourado completo
- Footer com texto muted

## ESTRUTURA DE ARQUIVOS

### app/layout.tsx
```tsx
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { AnimatedBackground } from '@/components/ui/animated-background'

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800']
})

const jetbrains = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-mono'
})

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${plusJakarta.variable} ${jetbrains.variable} font-sans antialiased`}>
        <AnimatedBackground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  )
}
```

### CSS Variables (globals.css)
```css
:root {
  --bg: #0a0a0a;
  --surface: #131313;
  --surface2: #1a1a1a;
  --accent: #d4af37;
  --accent2: #c9a227;
  --accent-bg: rgba(212, 175, 55, 0.08);
  --text: #fafafa;
  --text2: #e5e5e5;
  --muted-color: #737373;
  --border: rgba(255, 255, 255, 0.06);
  --border2: rgba(255, 255, 255, 0.1);
  
  --background: #0a0a0a;
  --foreground: #f5f0e8;
  --primary: #d4af37;
  --primary-foreground: #0a0a0a;
}

@theme inline {
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

## IMAGEM DO LOGO

A logo deve ficar em: /public/images/logo-lr.png
Dimensões recomendadas: 200x80px (ou proporcional)

## ANIMAÇÕES

```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  25% { transform: translateY(-20px) translateX(10px); opacity: 1; }
  50% { transform: translateY(-10px) translateX(-10px); opacity: 0.8; }
  75% { transform: translateY(-30px) translateX(5px); opacity: 0.4; }
}
```

## EXEMPLO DE BOTÃO PREMIUM

```tsx
<button
  className="group relative flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[12px] font-bold text-[#0a0a0a] transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden"
  style={{
    background: "linear-gradient(135deg, #d4af37, #c9a227)",
    boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
  }}
>
  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
  <Plus className="h-4 w-4 relative z-10" />
  <span className="relative z-10">Texto do Botão</span>
</button>
```

Crie a página inicial com esse visual e uma tela de login seguindo esse design system.
```

---

## OU COPIE OS ARQUIVOS DIRETAMENTE:

Se preferir copiar os arquivos, use estes:

1. **app/layout.tsx** - Layout raiz com fontes e background animado
2. **app/globals.css** - Todas as variáveis CSS e animações
3. **components/ui/animated-background.tsx** - Canvas com partículas douradas/azuis
4. **app/auth/login/page.tsx** - Página de login completa
5. **components/quadro/header.tsx** - Header com navegação e botões

Peça no outro chat: "Me passe os arquivos para criar esse layout" e cole este documento.
