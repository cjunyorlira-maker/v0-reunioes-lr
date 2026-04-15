// ==UserScript==
// @name         Grand Prix LR - Celebração Agendamentos
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Mostra celebração de agendamento no Kommo CRM
// @author       LR Team
// @match        https://kommo.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  // Injetar estilos
  const style = document.createElement('style');
  style.textContent = `
    @keyframes zoomIn {
      from { transform: scale(0.3); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }
    @keyframes confetiFall {
      to {
        transform: translateY(100vh) rotateZ(360deg);
        opacity: 0;
      }
    }
    .kommo-celebration-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .kommo-celebration-bg {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
    }
    .kommo-celebration-card {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: zoomIn 0.4s ease-out;
    }
    .kommo-celebration-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      box-shadow: 0 0 40px rgba(34, 211, 238, 0.5);
      background: linear-gradient(135deg, #22d3ee, #3b82f6);
    }
    .kommo-celebration-photo {
      position: relative;
      margin-bottom: 20px;
      width: 144px;
      height: 144px;
    }
    .kommo-celebration-photo-glow {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      filter: blur(32px);
      opacity: 0.6;
      background: rgba(34, 211, 238, 0.5);
    }
    .kommo-celebration-photo img {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #22d3ee;
      box-shadow: 0 0 35px rgba(34, 211, 238, 0.6);
    }
    .kommo-celebration-photo-fallback {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      font-weight: 900;
      color: white;
      border: 4px solid #22d3ee;
      background: linear-gradient(135deg, #22d3ee, #3b82f6);
    }
    .kommo-celebration-title {
      font-size: 28px;
      font-weight: 900;
      color: white;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }
    .kommo-celebration-subtitle {
      font-size: 18px;
      font-weight: bold;
      color: #22d3ee;
      margin-top: 8px;
    }
    .kommo-celebration-badge {
      margin-top: 16px;
      padding: 8px 24px;
      border-radius: 50px;
      background: linear-gradient(135deg, #22d3ee, #3b82f6);
      color: white;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 0 20px rgba(34, 211, 238, 0.4);
    }
    .kommo-celebration-footer {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.2);
      margin-top: 20px;
    }
    .kommo-confetti {
      position: fixed;
      pointer-events: none;
      z-index: 999998;
    }
  `;
  document.head.appendChild(style);

  // Função para criar confete
  function createConfetti() {
    const container = document.createElement('div');
    container.className = 'kommo-celebration-overlay';
    
    // Background overlay
    const overlay = document.createElement('div');
    overlay.className = 'kommo-celebration-bg';
    container.appendChild(overlay);

    // Card
    const card = document.createElement('div');
    card.className = 'kommo-celebration-card';
    
    // Ícone calendário
    const icon = document.createElement('div');
    icon.className = 'kommo-celebration-icon';
    icon.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="6" width="24" height="22" rx="3" fill="white" opacity="0.15" stroke="white" stroke-width="2" />
        <line x1="4" y1="13" x2="28" y2="13" stroke="white" stroke-width="2" />
        <line x1="10" y1="3" x2="10" y2="9" stroke="white" stroke-width="2.5" stroke-linecap="round" />
        <line x1="22" y1="3" x2="22" y2="9" stroke="white" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="11" cy="20" r="2" fill="white" />
        <circle cx="16" cy="20" r="2" fill="white" />
        <circle cx="21" cy="20" r="2" fill="white" />
      </svg>
    `;
    card.appendChild(icon);

    // Photo
    const photoDiv = document.createElement('div');
    photoDiv.className = 'kommo-celebration-photo';
    photoDiv.innerHTML = `
      <div class="kommo-celebration-photo-glow"></div>
      <div class="kommo-celebration-photo-fallback">A</div>
    `;
    card.appendChild(photoDiv);

    // Title
    const title = document.createElement('h2');
    title.className = 'kommo-celebration-title';
    title.textContent = 'AMANDA SOUZA';
    card.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'kommo-celebration-subtitle';
    subtitle.textContent = 'AGENDAMENTO CONFIRMADO!';
    card.appendChild(subtitle);

    // Badge
    const badge = document.createElement('div');
    badge.className = 'kommo-celebration-badge';
    badge.textContent = '+ 1 Agendamento';
    card.appendChild(badge);

    // Footer
    const footer = document.createElement('p');
    footer.className = 'kommo-celebration-footer';
    footer.textContent = 'Grand Prix LR';
    card.appendChild(footer);

    container.appendChild(card);
    document.body.appendChild(container);

    // Som de sino
    playChime();

    // Canvas confete
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '999998';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#22d3ee','#38bdf8','#60a5fa','#3b82f6','#6366f1','#a5f3fc','#e0f2fe','#ffffff','#34d399','#86efac'];
    const pieces = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 8,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.15,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));

    let frame;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.y > canvas.height * 0.85 ? 1 - (p.y - canvas.height * 0.85) / (canvas.height * 0.15) : 1;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
      });
      frame = requestAnimationFrame(animate);
    };
    animate();

    // Remover após 5 segundos
    setTimeout(() => {
      container.remove();
      canvas.remove();
      cancelAnimationFrame(frame);
    }, 5000);
  }

  // Som de sino
  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playNote = (time, freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.8);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + 0.8);
      };
      playNote(0, 523);
      playNote(0.15, 659);
      playNote(0.3, 784);
      playNote(0.5, 1047);
      playNote(1.2, 523);
      playNote(1.35, 659);
      playNote(1.5, 784);
      playNote(1.7, 1047);
      playNote(2.8, 784);
      playNote(2.95, 1047);
      playNote(3.1, 1319);
    } catch (e) {
      console.log('[Kommo Celebration] Audio context error:', e);
    }
  }

  // Atalho de teclado: Ctrl+Shift+A
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
      e.preventDefault();
      createConfetti();
    }
  });

  console.log('[Kommo Celebration] Script carregado! Use Ctrl+Shift+A para testar celebração.');
})();
