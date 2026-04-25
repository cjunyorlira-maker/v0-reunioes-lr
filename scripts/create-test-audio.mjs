import fs from 'fs'

// Criar um arquivo WebM simulado de 100 minutos
// WebM é um container, vamos criar um arquivo com headers WebM válidos

const createWebMHeader = () => {
  // WebM EBML header
  const ebml = Buffer.from([
    0x1A, 0x45, 0xDF, 0xA3, // EBML ID
    0x84, // Size (4 bytes)
    0x01, 0x00, 0x00, 0x00, // Version
  ])

  const segment = Buffer.from([
    0x18, 0x53, 0x80, 0x67, // Segment ID
    0xFF, // Unknown size
  ])

  // Info element
  const info = Buffer.from([
    0x15, 0x49, 0xA9, 0x66, // Info ID
    0x8F, // Size
    0x2A, // Duration ID
    0x44, // Duration size
    0x44, 0x85, 0x80, 0x00, // 100 minutes = 6000000ms
  ])

  // Tracks element
  const tracks = Buffer.from([
    0x16, 0x54, 0xAE, 0x6B, // Tracks ID
    0x90, // Size
  ])

  return Buffer.concat([ebml, segment, info, tracks])
}

const header = createWebMHeader()
const audioData = Buffer.alloc(1024 * 1024 * 10) // 10MB de dados simulados
audioData.fill(0xFF) // Preenchido com dados

const webmFile = Buffer.concat([header, audioData])

fs.writeFileSync('/vercel/share/v0-project/public/audio-teste-100min.webm', webmFile)
console.log('✅ Arquivo de teste criado: /public/audio-teste-100min.webm')
console.log('Tamanho:', (webmFile.length / 1024 / 1024).toFixed(2), 'MB')
