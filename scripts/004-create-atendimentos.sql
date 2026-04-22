-- =============================================================================
-- Migration: Criar tabela atendimentos
-- Descrição: Tabela para armazenar gravações de atendimentos com transcrição e análise
-- Data: 2026-04-21
-- =============================================================================

-- Criar tabela atendimentos (se não existir)
CREATE TABLE IF NOT EXISTS atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência ao lead
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  kommo_id TEXT,
  nome_lead TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  equipe TEXT NOT NULL,
  
  -- Dados do atendimento
  data_atendimento TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  duracao_segundos INTEGER DEFAULT 0,
  audio_url TEXT,
  
  -- Status: aguardando, gravando, processando, concluido, erro
  status TEXT DEFAULT 'aguardando',
  
  -- Transcrições
  transcricao_completa TEXT,
  transcricao_vendedor TEXT,
  transcricao_cliente TEXT,
  
  -- Análise Claude
  resumo TEXT,
  pontos_positivos TEXT[],
  pontos_criticos TEXT[],
  objecoes_cliente JSONB,
  feedback_coaching TEXT,
  
  -- Scores (0-100)
  score_geral NUMERIC,
  score_abordagem NUMERIC,
  score_financiamento NUMERIC,
  score_consorcio NUMERIC,
  score_fechamento NUMERIC,
  
  -- Resultado
  fechou BOOLEAN,
  motivo_nao_fechamento TEXT,
  is_benchmark BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_atendimentos_lead_id ON atendimentos(lead_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_equipe ON atendimentos(equipe);
CREATE INDEX IF NOT EXISTS idx_atendimentos_status ON atendimentos(status);
CREATE INDEX IF NOT EXISTS idx_atendimentos_created_at ON atendimentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_atendimentos_fechou ON atendimentos(fechou) WHERE fechou IS NOT NULL;

-- Criar tabela equipes_senhas (se não existir)
CREATE TABLE IF NOT EXISTS equipes_senhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Inserir senhas padrão das equipes (se não existirem)
INSERT INTO equipes_senhas (equipe, senha) VALUES
  ('Admin', 'admin123'),
  ('Equipe Lucas', 'lucas123'),
  ('Equipe Douglas', 'douglas123'),
  ('Equipe Renan', 'renan123')
ON CONFLICT (equipe) DO NOTHING;

-- Comentários
COMMENT ON TABLE atendimentos IS 'Gravações de atendimentos com transcrição Deepgram e análise Claude';
COMMENT ON COLUMN atendimentos.status IS 'aguardando | gravando | processando | concluido | erro';
COMMENT ON COLUMN atendimentos.is_benchmark IS 'Atendimentos que fecharam venda - usados para aprendizado';
COMMENT ON COLUMN atendimentos.objecoes_cliente IS 'JSON com objeções identificadas pelo Claude';
