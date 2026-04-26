import fetch from 'node-fetch';

// Dados de teste simulando uma ligação do TotalPhone
const testData = {
  duracao: "00:01:30",
  origem: "1021",  // Alex Negreiros
  destino: "5512999999999",
  direcao: "saida",
  data: "2026-04-26",
  timestamp: Math.floor(Date.now() / 1000),
  gravacao: "http://45.170.138.80/storage/recordings/test-call.mp3",
  callid: "test-call-" + Date.now()
};

async function testWebhook() {
  try {
    console.log("[v0] Enviando dados de teste para webhook...");
    console.log("[v0] Dados:", JSON.stringify(testData, null, 2));
    
    const response = await fetch("https://v0-reunioes-lr.vercel.app/api/webhook/totalphone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log("[v0] Status:", response.status);
    console.log("[v0] Response:", JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log("[v0] ✅ Webhook funcionou!");
    } else {
      console.log("[v0] ❌ Erro no webhook!");
    }
  } catch (error) {
    console.error("[v0] Erro ao chamar webhook:", error.message);
  }
}

testWebhook();
