-- Adiciona campos para analytics e controle de vendas
-- origem: de onde veio o lead (Campo Origem ID 797344 do Kommo)
-- venda_fechada: se o lead fechou a venda
-- retorno: se é um cliente retornando (não conta como novo)
-- created_at: data de criação do registro para calcular agendei do dia

-- Adicionar coluna origem (texto)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS origem TEXT;

-- Adicionar coluna venda_fechada (boolean)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS venda_fechada BOOLEAN DEFAULT FALSE;

-- Adicionar coluna retorno (boolean) - cliente que volta não conta como novo
ALTER TABLE leads ADD COLUMN IF NOT EXISTS retorno BOOLEAN DEFAULT FALSE;

-- Adicionar coluna created_at se não existir (para agendei do dia)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Criar índice para buscas por data de criação (agendei do dia)
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Criar índice para buscas por origem
CREATE INDEX IF NOT EXISTS idx_leads_origem ON leads(origem);

-- Criar índice para buscas por venda_fechada
CREATE INDEX IF NOT EXISTS idx_leads_venda_fechada ON leads(venda_fechada);
