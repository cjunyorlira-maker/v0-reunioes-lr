-- Adiciona colunas extras na tabela pluga_eventos
-- lead_nome: nome do lead
-- origem: origem do lead (campo 797344 do Kommo)

ALTER TABLE pluga_eventos ADD COLUMN IF NOT EXISTS lead_nome TEXT;
ALTER TABLE pluga_eventos ADD COLUMN IF NOT EXISTS origem TEXT;

-- Cria índice para filtrar por origem
CREATE INDEX IF NOT EXISTS idx_pluga_eventos_origem ON pluga_eventos(origem);
