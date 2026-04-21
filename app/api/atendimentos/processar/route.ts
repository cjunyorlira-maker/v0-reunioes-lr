import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

// Prompt do Claude para analise
const PROMPT_ANALISE = `Você é um especialista em análise de atendimentos comerciais onde financiamento e consórcio imobiliário são oferecidos. Analise a transcrição da reunião abaixo com os seguintes critérios:

## Critérios de Avaliação (0 a 10):

### 1. Abordagem Inicial (score_abordagem)
- Rapport e conexão com cliente
- Coleta de informações (perfil, necessidade, urgência)
- Escuta ativa

### 2. Apresentação do Financiamento (score_financiamento)
- Clareza na explicação
- Argumentação de benefícios
- Transição para consórcio quando financiamento não é viável

### 3. Apresentação do Consórcio (score_consorcio)
- Explicação do funcionamento
- Uso de provas sociais e casos de sucesso
- Resposta a objeções

### 4. Técnicas de Fechamento (score_fechamento)
- Criação de urgência
- Tentativas de fechamento
- Superação de objeções finais

## Retorne APENAS um JSON válido com esta estrutura:
{
  "score_geral": 7.5,
  "score_abordagem": 8.0,
  "score_financiamento": 7.0,
  "score_consorcio": 7.5,
  "score_fechamento": 6.5,
  "resumo": "Resumo executivo do atendimento em 2-3 frases",
  "pontos_positivos": ["ponto 1", "ponto 2", "ponto 3"],
  "pontos_criticos": ["ponto a melhorar 1", "ponto a melhorar 2"],
  "objecoes_cliente": [
    {"objecao": "texto da objecao", "resposta_vendedor": "como o vendedor respondeu", "avaliacao": "boa/ruim/ausente"}
  ],
  "motivo_nao_fechamento": "Principal motivo identificado ou null se fechou",
  "feedback_coaching": "Feedback direto e construtivo para o vendedor melhorar"
}

## Transcrição da Reunião:
`

export async function POST(request: Request) {
  try {
    const { atendimentoId, audioUrl } = await request.json()

    if (!atendimentoId || !audioUrl) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Transcrever com Deepgram
    console.log("[v0] Iniciando transcricao Deepgram...")
    const transcricao = await transcreverAudio(audioUrl)
    
    if (!transcricao) {
      await supabase
        .from("atendimentos")
        .update({ status: "erro", updated_at: new Date().toISOString() })
        .eq("id", atendimentoId)
      return NextResponse.json({ error: "Erro na transcricao" }, { status: 500 })
    }

    console.log("[v0] Transcricao concluida. Iniciando analise Claude...")

    // 2. Analisar com Claude
    const analise = await analisarComClaude(transcricao)

    // 3. Salvar resultados
    await supabase
      .from("atendimentos")
      .update({
        transcricao_completa: transcricao,
        resumo: analise?.resumo || null,
        motivo_nao_fechamento: analise?.motivo_nao_fechamento || null,
        score_geral: analise?.score_geral || null,
        score_abordagem: analise?.score_abordagem || null,
        score_financiamento: analise?.score_financiamento || null,
        score_consorcio: analise?.score_consorcio || null,
        score_fechamento: analise?.score_fechamento || null,
        pontos_positivos: analise?.pontos_positivos || null,
        pontos_criticos: analise?.pontos_criticos || null,
        objecoes_cliente: analise?.objecoes_cliente || null,
        feedback_coaching: analise?.feedback_coaching || null,
        status: "concluido",
        updated_at: new Date().toISOString(),
      })
      .eq("id", atendimentoId)

    console.log("[v0] Processamento concluido com sucesso")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro no processamento:", error)
    return NextResponse.json({ error: "Erro no processamento" }, { status: 500 })
  }
}

async function transcreverAudio(audioUrl: string): Promise<string | null> {
  try {
    if (!DEEPGRAM_API_KEY) {
      console.error("DEEPGRAM_API_KEY nao configurada")
      return null
    }

    const response = await fetch("https://api.deepgram.com/v1/listen?language=pt-BR&model=nova-2&diarize=true&punctuate=true&smart_format=true", {
      method: "POST",
      headers: {
        "Authorization": `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: audioUrl }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Erro Deepgram:", error)
      return null
    }

    const data = await response.json()
    
    // Extrair transcricao com diarizacao (speakers)
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript
    
    // Se tiver diarizacao, formatar com speakers
    const words = data.results?.channels?.[0]?.alternatives?.[0]?.words
    if (words && words.length > 0 && words[0].speaker !== undefined) {
      let formattedTranscript = ""
      let currentSpeaker = -1
      
      for (const word of words) {
        if (word.speaker !== currentSpeaker) {
          currentSpeaker = word.speaker
          formattedTranscript += `\n\n[${currentSpeaker === 0 ? "Vendedor" : "Cliente"}]: `
        }
        formattedTranscript += word.punctuated_word + " "
      }
      
      return formattedTranscript.trim()
    }
    
    return transcript || null
  } catch (error) {
    console.error("Erro na transcricao:", error)
    return null
  }
}

async function analisarComClaude(transcricao: string): Promise<any | null> {
  try {
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY nao configurada")
      return null
    }

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    })

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: PROMPT_ANALISE + transcricao,
        },
      ],
    })

    // Extrair JSON da resposta
    const content = response.content[0]
    if (content.type !== "text") return null

    const text = content.text
    
    // Tentar extrair JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("JSON nao encontrado na resposta do Claude")
      return null
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error("Erro na analise Claude:", error)
    return null
  }
}
