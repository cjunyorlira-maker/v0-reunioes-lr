-- Tabela para receber eventos do Pluga (mudanças de etapa no Kommo)
-- Isso permite rastrear Qualificados, Agendei, etc. em tempo real

CREATE TABLE IF NOT EXISTS pluga_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo do evento (etapa para qual o lead foi movido)
  tipo TEXT NOT NULL, -- 'qualificado', 'agendei', 'vendendo_reuniao', 'veio', 'nao_veio', 'venda_fechada'
  
  -- Dados do lead
  lead_id TEXT, -- ID do lead no Kommo
  lead_nome TEXT,
  
  -- Responsável (vendedor)
  vendedor TEXT,
  vendedor_id TEXT,
  
  -- Equipe
  equipe TEXT,
  
  -- Atendente (se diferente do vendedor)
  atendente TEXT,
  
  -- Origem do lead
  origem TEXT,
  
  -- Data do evento (quando aconteceu no Kommo)
  data_evento DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dados extras do webhook (JSON)
  payload JSONB
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_pluga_eventos_tipo ON pluga_eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_pluga_eventos_data ON pluga_eventos(data_evento);
CREATE INDEX IF NOT EXISTS idx_pluga_eventos_vendedor ON pluga_eventos(vendedor);
CREATE INDEX IF NOT EXISTS idx_pluga_eventos_equipe ON pluga_eventos(equipe);
CREATE INDEX IF NOT EXISTS idx_pluga_eventos_created ON pluga_eventos(created_at DESC);

-- RLS
ALTER TABLE pluga_eventos ENABLE ROW LEVEL SECURITY;

-- Policies para acesso público (igual a tabela leads)
CREATE POLICY "pluga_eventos_select_all" ON pluga_eventos FOR SELECT USING (true);
CREATE POLICY "pluga_eventos_insert_all" ON pluga_eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "pluga_eventos_update_all" ON pluga_eventos FOR UPDATE USING (true);
CREATE POLICY "pluga_eventos_delete_all" ON pluga_eventos FOR DELETE USING (true);

-- Comentário na tabela
COMMENT ON TABLE pluga_eventos IS 'Eventos recebidos do Pluga para rastrear mudanças de etapa no Kommo';
