-- Tabela separada para qualificações (não cria cartão no quadro)
-- Armazena leads que chegaram em "Vendendo Reunião" para métricas

CREATE TABLE IF NOT EXISTS qualificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  kommo_id TEXT NOT NULL,
  kommo_lead_id TEXT,
  nome TEXT NOT NULL,
  responsavel TEXT,
  responsavel_id TEXT,
  equipe TEXT,
  origem TEXT,
  data_qualificacao DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(kommo_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_qualificacoes_data ON qualificacoes(data_qualificacao);
CREATE INDEX IF NOT EXISTS idx_qualificacoes_responsavel ON qualificacoes(responsavel);
CREATE INDEX IF NOT EXISTS idx_qualificacoes_equipe ON qualificacoes(equipe);
CREATE INDEX IF NOT EXISTS idx_qualificacoes_kommo_id ON qualificacoes(kommo_id);
