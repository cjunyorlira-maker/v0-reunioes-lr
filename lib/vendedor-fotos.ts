// Mapa de fotos dos vendedores — chave é o nome exato como aparece no Kommo/sistema
// As fotos são referenciadas pelo blob URL público
export const VENDEDOR_FOTOS: Record<string, string> = {
  "Marcos Vinicius":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Marcos-Vinicius-sfP2DTzp9TP0TygU7oQRZIX4gfIWyI.jpeg",
  "Marcos Vinícius":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Marcos-Vinicius-sfP2DTzp9TP0TygU7oQRZIX4gfIWyI.jpeg",
  "Nathan Caue":       "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nathan-Caue-h5uUDirfMWwFdZoABYfwOhURbwNdcD.jpeg",
  "Nathan Cauê":       "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nathan-Caue-h5uUDirfMWwFdZoABYfwOhURbwNdcD.jpeg",
  "Nicolas Moraes":    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nicolas-Moraes-bEYeG5CvaAyPZt1kc6JgqBsBhqtUoj.jpeg",
  "Edna Ragasini":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Edna-Ragasini-KEdZXLbyaOVxgbVz0u29S5DaPjFpVk.jpeg",
  "Lidiane Fonseca":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Lidiane-Fonseca-xfuzHuUb4JiMOhw1bx2jT6oIcf83lP.jpeg",
  "Rogerio Martins":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Rogerio-Martins-yw9buDU6JmITLaEwv7vN19zy73NtRK.jpeg",
  "Rogério Martins":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Rogerio-Martins-yw9buDU6JmITLaEwv7vN19zy73NtRK.jpeg",
  "Amanda Souza":      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Amanda-Souza-ZDIcakfsri2LlyS6IiGiYlKvzME9O0.jpeg",
  "Yuri Pereira":      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Yuri-Pereira-QmxrzUEH3LWZdBiPk0Hop1hS7DhZoX.jpeg",
  "Livia Rafaela":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Livia-Rafaela-CP3L3LNVHkJnq5NiuvwIKtp4gJtIwm.jpeg",
  "Lívia Rafaela":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Livia-Rafaela-CP3L3LNVHkJnq5NiuvwIKtp4gJtIwm.jpeg",
  "Bianca Simoes":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Bianca-Simoes-iqNAYrQx1g8AZyENQW6JJmlshDPA2h.jpeg",
  "Bianca Simões":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Bianca-Simoes-iqNAYrQx1g8AZyENQW6JJmlshDPA2h.jpeg",
  "Emily Machado":     "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Emily-Machado-ppVeZamDWpFyFz52PDG3H78S4Iuppt.jpeg",
  "Gisely Leal":       "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gisely-Leal-iPx7gpuxUWKBoYl8dYHw6V5rRax2ec.jpeg",
  "Rafaella Antunes":  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Rafaella-Antunes-GYWme90HgI9UeAxGZfDnelownFBTiG.jpeg",
  "Brayan Bertolai":   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Brayan-Bertolai-ehQRcY6c2xAZkR28ok2TSM15aQJGZZ.jpeg",
  "Emylly Lira":       "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Emylly-Lira-hTLxm5kwcMdAPJu2X9a25nHZuo7wLt.jpeg",
  "Alexia Cunha":      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Alexia-Cunha-dx5Vwl5ZlVh1sHpubgj3ukgvRCBmdI.jpeg",
  "Leonardo Freitas":  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Leonardo-Freitas-5mrjqBA87bowXvfQcWO6oac4OMZdUW.jpeg",
  "Janaina Dantas":    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Janaina-Dantas-7vuHiBH0blXb31pWTJmcOpjRbSKkKU.jpeg",
  "Janaína Dantas":    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Janaina-Dantas-7vuHiBH0blXb31pWTJmcOpjRbSKkKU.jpeg",
}

// Função auxiliar — busca a foto pelo nome, com fallback por primeiro nome
export function getFotoVendedor(nome: string): string | undefined {
  if (!nome) return undefined

  // Tentativa exata
  if (VENDEDOR_FOTOS[nome]) return VENDEDOR_FOTOS[nome]

  // Tentativa case-insensitive
  const nomeNorm = nome.trim().toLowerCase()
  const found = Object.entries(VENDEDOR_FOTOS).find(
    ([key]) => key.toLowerCase() === nomeNorm
  )
  if (found) return found[1]

  // Tentativa pelo primeiro nome + segundo nome (ignora sobrenomes extras)
  const partes = nomeNorm.split(" ")
  if (partes.length >= 2) {
    const prefixo = partes.slice(0, 2).join(" ")
    const foundPartial = Object.entries(VENDEDOR_FOTOS).find(
      ([key]) => key.toLowerCase().startsWith(prefixo)
    )
    if (foundPartial) return foundPartial[1]
  }

  return undefined
}
