-- Adiciona campos para rastrear qualificados e agendamentos
-- data_qualificacao: quando o lead entrou na etapa "Vendendo Reunião" (campo 1026046 do Kommo)
-- data_agendei: quando o cartão foi criado (lead entrou em "Confirmar Reunião")

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS data_qualificacao DATE,
ADD COLUMN IF NOT EXISTS data_agendei DATE;

-- Índices para consultas por data
CREATE INDEX IF NOT EXISTS idx_leads_data_qualificacao ON leads(data_qualificacao);
CREATE INDEX IF NOT EXISTS idx_leads_data_agendei ON leads(data_agendei);

-- Preenche data_agendei com created_at para leads existentes
UPDATE leads 
SET data_agendei = DATE(created_at AT TIME ZONE 'America/Sao_Paulo')
WHERE data_agendei IS NULL AND created_at IS NOT NULL;
