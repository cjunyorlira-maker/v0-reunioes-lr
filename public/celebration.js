// LR Celebration - Extensão Chrome
// Escuta o Pusher e mostra celebração de agendamento com foto do vendedor

console.log('[LR] Extensão carregada!');

// Mapa completo de fotos dos vendedores
const FOTOS = {
  "Luis Henrique":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Luis-Henrique-r9vpDqJDGutJsK9HS89B4ucV0yGVKD.jpeg",
  "Luís Henrique":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Luis-Henrique-r9vpDqJDGutJsK9HS89B4ucV0yGVKD.jpeg",
  "Leonardo Freitas":  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Leonardo-Freitas-w1qU7SbMjNYHLHqGc66c8oAFmYDRlC.jpeg",
  "Alex Negreiros":    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Alex-Negreiros-j089DeDxr4GcRwXJHWk3eVVDD97TDV.jpeg",
  "Bianca Simoes":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Bianca-Simoes-PNhWqPH7wEmgmhRFV3nnN9mjHS1X1G.jpeg",
  "Bianca Simões":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Bianca-Simoes-PNhWqPH7wEmgmhRFV3nnN9mjHS1X1G.jpeg",
  "Yuri Pereira":      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Yuri-Pereira-DjE5KadXSFgcLiTFQ7ascxSpCiw39Z.jpeg",
  "Lucas Dionisio":    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Lucas-Dionisio-Kluj5V4vJBSVou4FWPddzY37jKkHqS.jpeg",
  "Lucas Dionísio":    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Lucas-Dionisio-Kluj5V4vJBSVou4FWPddzY37jKkHqS.jpeg",
  "Kleinver Seabra":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kleinver-Seabra-NhjTvka9YuEyRCahYJPzEKoXO9KijM.jpeg",
  "Rogerio Martins":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Rogerio-Martins-Vra3t5o5qB7DyS8F9Kwiq3T6xCgpA8.jpeg",
  "Rogério Martins":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Rogerio-Martins-Vra3t5o5qB7DyS8F9Kwiq3T6xCgpA8.jpeg",
  "Nathan Caue":       "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nathan-Caue-9Mp8yQMlehkE5CT59n8pF2qlms1LaU.jpeg",
  "Nathan Cauê":       "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nathan-Caue-9Mp8yQMlehkE5CT59n8pF2qlms1LaU.jpeg",
  "Amanda Souza":      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Amanda-Souza-9Csu6tKWbtzEMt7nkHj7uGTu3K4ed6.jpeg",
  "Emily Machado":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Emily%20Machado-D4i7BojDN5YdDB6nkiVqjYlEIMmAWS.jpeg",
  "Nicolas Moraes":    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nicolas-Moraes-FcFICPMQ1AH0ZiDhQM6w2kirOEKvAz.jpeg",
  "Emilaine Lins":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Emilaine-Lins-IHtg6XUZW8tutcxCcFiSHcHIIpizhF.jpeg",
  "Rafaella":          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Rafaella-Pe494UGelm3bperG5WhPLX05KVljd4.jpeg",
  "Rafaella Antunes":  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Rafaella-Pe494UGelm3bperG5WhPLX05KVljd4.jpeg",
  "Gisely Leal":       "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gisely-Leal-5wTy6ksudttiNXcDuBDxCpdHsOymvc.jpeg",
  "Lidiane":           "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Lidiane-qKbhEkmCjgITPygHkG2KADsq0kBgSm.jpeg",
  "Lidiane Fonseca":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Lidiane-qKbhEkmCjgITPygHkG2KADsq0kBgSm.jpeg",
  "Brayan Bertolai":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Brayan-Bertolai-iQkh1Fk7JH76kgAGhY2pFFVOONIiEs.jpeg",
  "Alexia":            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Alexia%20Cunha-v7SE61pG9nEJqarwMpM4OKfEeNMcEv.jpeg",
  "Alexia Cunha":      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Alexia%20Cunha-v7SE61pG9nEJqarwMpM4OKfEeNMcEv.jpeg",
  "Aléxia Cunha":      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Alexia%20Cunha-v7SE61pG9nEJqarwMpM4OKfEeNMcEv.jpeg",
  "Janaina Dantas":    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Janaina-Dantas-kEM2mc4xBxIcHDLswwjmIP1bkikLCT.jpeg",
  "Janaína Dantas":    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Janaina-Dantas-kEM2mc4xBxIcHDLswwjmIP1bkikLCT.jpeg",
};

function getFoto(nome) {
  if (!nome) return null;
  // Busca exata
  if (FOTOS[nome]) return FOTOS[nome];
  // Busca case-insensitive
  const lower = nome.trim().toLowerCase();
  const found = Object.entries(FOTOS).find(([k]) => k.toLowerCase() === lower);
  if (found) return found[1];
  // Busca por primeiros dois nomes
  const partes = lower.split(' ');
  if (partes.length >= 2) {
    const prefixo = partes.slice(0, 2).join(' ');
    const partial = Object.entries(FOTOS).find(([k]) => k.toLowerCase().startsWith(prefixo));
    if (partial) return partial[1];
  }
  return null;
}

// Mostrar celebração
function showCelebration(nome, fotoUrl) {
  // Evitar duplicatas
  if (document.getElementById('lr-celebration-overlay')) return;

  const foto = fotoUrl || getFoto(nome);
  const primeiroNome = nome ? nome.split(' ')[0].toUpperCase() : 'VENDEDOR';

  // Canvas confete
  const canvas = document.createElement('canvas');
  canvas.id = 'lr-celebration-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999997;pointer-events:none;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#22d3ee','#38bdf8','#60a5fa','#3b82f6','#6366f1','#a5f3fc','#e0f2fe','#ffffff','#34d399','#86efac'];
  const pieces = Array.from({length: 160}, () => ({
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

  // Animacao confete
  let frame;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.y > canvas.height * 0.85 ? 1 - (p.y - canvas.height * 0.85) / (canvas.height * 0.15) : 1;
      if (p.shape === 'rect') ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
      if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
    });
    frame = requestAnimationFrame(animate);
  };
  animate();

  // Card central
  const overlay = document.createElement('div');
  overlay.id = 'lr-celebration-overlay';
  overlay.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;text-align:center;color:white;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';

  const fotoHTML = foto
    ? `<img src="${foto}" alt="${nome}" style="width:140px;height:140px;border-radius:50%;object-fit:cover;border:4px solid #22d3ee;box-shadow:0 0 35px rgba(34,211,238,0.6);display:block;margin:0 auto 20px;">`
    : `<div style="width:140px;height:140px;border-radius:50%;background:linear-gradient(135deg,#22d3ee,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:900;margin:0 auto 20px;border:4px solid #22d3ee;">${primeiroNome.charAt(0)}</div>`;

  overlay.innerHTML = `
    <style>
      @keyframes lrZoomIn {
        from { transform: translate(-50%,-50%) scale(0.3); opacity: 0; }
        to   { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
      }
    </style>
    <div style="animation:lrZoomIn 0.4s ease-out;">
      <div style="font-size:48px;margin-bottom:16px;">📅</div>
      ${fotoHTML}
      <h2 style="font-size:36px;font-weight:900;margin:0;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${nome ? nome.toUpperCase() : 'VENDEDOR'}</h2>
      <p style="font-size:24px;color:#22d3ee;margin:10px 0 0;font-weight:bold;">AGENDAMENTO CONFIRMADO!</p>
      <div style="margin-top:20px;padding:10px 28px;background:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:30px;color:white;font-weight:bold;font-size:16px;display:inline-block;">
        + 1 Agendamento
      </div>
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin-top:20px;">Grand Prix LR</p>
    </div>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => {
    canvas.remove();
    overlay.remove();
    cancelAnimationFrame(frame);
  }, 5000);
}

// Conectar ao Pusher e escutar eventos em tempo real
const pusherScript = document.createElement('script');
pusherScript.src = 'https://js.pusher.com/8/pusher.min.js';
pusherScript.onload = function() {
  const pusher = new Pusher('d8d3dcd6383f500548ad', {
    cluster: 'mt1',
    forceTLS: true
  });

  const channel = pusher.subscribe('celebrations');

  channel.bind('agendamento', function(data) {
    console.log('[LR] Agendamento recebido via Pusher:', data);
    showCelebration(data.nome, data.foto);
  });

  console.log('[LR] Conectado ao Pusher! Aguardando agendamentos...');
};
document.head.appendChild(pusherScript);
