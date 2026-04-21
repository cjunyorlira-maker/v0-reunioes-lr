"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Lock, Mic, MicOff, Play, CheckCircle, XCircle, Clock, FileText, ArrowLeft } from "lucide-react"
import { AudioRecorder } from "@/components/atendimentos/audio-recorder"
import { AtendimentoCard } from "@/components/atendimentos/atendimento-card"
import Link from "next/link"

interface Atendimento {
  id: string
  lead_id: number
  kommo_id: string
  nome_lead: string
  responsavel: string
  equipe: string
  audio_url: string | null
  duracao_segundos: number | null
  transcricao_completa: string | null
  resumo: string | null
  motivo_nao_fechamento: string | null
  score_geral: number | null
  score_abordagem: number | null
  score_financiamento: number | null
  score_consorcio: number | null
  score_fechamento: number | null
  pontos_positivos: string[] | null
  pontos_criticos: string[] | null
  feedback_coaching: string | null
  status: string
  fechou: boolean
  is_benchmark: boolean
  data_atendimento: string
  created_at: string
}

const EQUIPES = ["Elite", "Guerreiros", "Gladiadores", "Samurais", "Legado", "Lobos", "TDM", "Admin"]

export default function AtendimentosPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [equipe, setEquipe] = useState("")
  const [senha, setSenha] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [loadingAtendimentos, setLoadingAtendimentos] = useState(false)

  // Verificar sessão salva
  useEffect(() => {
    const savedEquipe = localStorage.getItem("atendimentos_equipe")
    if (savedEquipe) {
      setEquipe(savedEquipe)
      setIsAuthenticated(true)
    }
  }, [])

  // Carregar atendimentos quando autenticado
  useEffect(() => {
    if (isAuthenticated && equipe) {
      fetchAtendimentos()
    }
  }, [isAuthenticated, equipe])

  const fetchAtendimentos = async () => {
    setLoadingAtendimentos(true)
    try {
      const res = await fetch(`/api/atendimentos?equipe=${equipe}`)
      const data = await res.json()
      if (data.atendimentos) {
        setAtendimentos(data.atendimentos)
      }
    } catch (err) {
      console.error("Erro ao carregar atendimentos:", err)
    } finally {
      setLoadingAtendimentos(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/atendimentos/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipe, senha }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erro ao autenticar")
        return
      }

      localStorage.setItem("atendimentos_equipe", equipe)
      setIsAuthenticated(true)
    } catch (err) {
      setError("Erro ao conectar com o servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("atendimentos_equipe")
    setIsAuthenticated(false)
    setEquipe("")
    setSenha("")
    setAtendimentos([])
  }

  // Tela de Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#12121a] border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Atendimentos</CardTitle>
            <p className="text-white/50 text-sm mt-2">
              Selecione sua equipe e digite a senha
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-2 block">Equipe</label>
                <Select value={equipe} onValueChange={setEquipe}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione a equipe" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a24] border-white/10">
                    {EQUIPES.map((eq) => (
                      <SelectItem key={eq} value={eq} className="text-white hover:bg-white/10">
                        {eq}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-white/70 mb-2 block">Senha</label>
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a senha (4 dígitos)"
                  maxLength={4}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={!equipe || senha.length !== 4 || loading}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/10">
              <Link href="/">
                <Button variant="ghost" className="w-full text-white/50 hover:text-white hover:bg-white/5">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Quadro
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela de Atendimentos
  const aguardando = atendimentos.filter((a) => a.status === "aguardando")
  const processando = atendimentos.filter((a) => a.status === "processando" || a.status === "gravando")
  const concluidos = atendimentos.filter((a) => a.status === "concluido")

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/5">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Atendimentos</h1>
              <p className="text-sm text-white/50">Equipe {equipe}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={fetchAtendimentos}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5"
            >
              Atualizar
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-white/50 hover:text-white hover:bg-white/5"
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#12121a] border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{aguardando.length}</p>
                <p className="text-xs text-white/50">Aguardando</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Mic className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{processando.length}</p>
                <p className="text-xs text-white/50">Em gravacao</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {concluidos.filter((a) => a.fechou).length}
                </p>
                <p className="text-xs text-white/50">Fechados</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {concluidos.filter((a) => !a.fechou).length}
                </p>
                <p className="text-xs text-white/50">Nao fechados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Atendimentos */}
        {loadingAtendimentos ? (
          <div className="text-center py-12 text-white/50">Carregando atendimentos...</div>
        ) : atendimentos.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">Nenhum atendimento encontrado</p>
            <p className="text-white/30 text-sm mt-1">
              Quando um lead for marcado como Veio, aparecera aqui
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Aguardando gravacao */}
            {aguardando.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Aguardando Gravacao ({aguardando.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {aguardando.map((atendimento) => (
                    <AtendimentoCard
                      key={atendimento.id}
                      atendimento={atendimento}
                      onUpdate={fetchAtendimentos}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Em processamento */}
            {processando.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-blue-400" />
                  Em Gravacao/Processamento ({processando.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {processando.map((atendimento) => (
                    <AtendimentoCard
                      key={atendimento.id}
                      atendimento={atendimento}
                      onUpdate={fetchAtendimentos}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Concluidos */}
            {concluidos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Concluidos ({concluidos.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {concluidos.map((atendimento) => (
                    <AtendimentoCard
                      key={atendimento.id}
                      atendimento={atendimento}
                      onUpdate={fetchAtendimentos}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
