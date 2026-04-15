// ==UserScript==
// @name         LR Celebration - Pusher
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Celebração em tempo real via Pusher
// @author       LR
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function() {
  'use strict';

  // Carregar biblioteca Pusher dinamicamente
  const script = document.createElement('script');
  script.src = 'https://js.pusher.com/8.0.0/pusher.min.js';
  script.onload = function() {
    // Inicializar Pusher
    const pusher = new window.Pusher('d8d3dcd6383f500548ad', {
      cluster: 'mt1',
      forceTLS: true
    });

    // Escutar canal
    const channel = pusher.subscribe('celebrations');
    
    channel.bind('agendamento', function(data) {
      showCelebration(data.nome, data.foto);
    });

    console.log('[LR Celebration] Conectado ao Pusher');
  };
  document.head.appendChild(script);

  function showCelebration(nome, foto) {
    // Overlay escuro
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.65);
      z-index: 999998;
    `;
    document.body.appendChild(overlay);

    // Canvas para confete
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 999998;
      pointer-events: none;
    `;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#22d3ee','#38bdf8','#60a5fa','#3b82f6','#6366f1','#a5f3fc','#e0f2fe','#ffffff','#34d399','#86efac'];
    const pieces = Array.from({length:160}, () => ({
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

    // Som
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playChime = (time, freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + time);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + time + 0.8);
        osc.start(audioCtx.currentTime + time);
        osc.stop(audioCtx.currentTime + time + 0.8);
      };
      playChime(0, 523); playChime(0.15, 659); playChime(0.3, 784); playChime(0.5, 1047);
      playChime(1.2, 523); playChime(1.35, 659); playChime(1.5, 784); playChime(1.7, 1047);
      playChime(2.8, 784); playChime(2.95, 1047); playChime(3.1, 1319);
    } catch(e) {}

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
        if(p.shape === 'rect') ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
        else { ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
        if(p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
      });
      frame = requestAnimationFrame(animate);
    };
    animate();

    // Card central
    const card = document.createElement('div');
    card.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 999999;
      text-align: center;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      animation: zoomInCelebration 0.4s ease-out;
    `;
    
    const fotoHtml = foto ? `<img src="${foto}" alt="${nome}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid #22d3ee;box-shadow:0 0 35px rgba(34,211,238,0.6);margin-bottom:15px;display:block;margin-left:auto;margin-right:auto;">` : '';
    
    card.innerHTML = `
      <div style="font-size:50px;margin-bottom:15px;">📅</div>
      ${fotoHtml}
      <h2 style="font-size:32px;font-weight:900;margin:0;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${nome.toUpperCase()}</h2>
      <p style="font-size:24px;color:#22d3ee;margin:10px 0 0 0;font-weight:bold;">AGENDAMENTO CONFIRMADO!</p>
      <div style="margin-top:20px;padding:10px 25px;background:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:30px;color:white;font-weight:bold;display:inline-block;">
        + 1 Agendamento
      </div>
    `;
    document.body.appendChild(card);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes zoomInCelebration {
        from { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
        to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
      overlay.remove();
      canvas.remove();
      card.remove();
      cancelAnimationFrame(frame);
    }, 5000);
  }
})();
