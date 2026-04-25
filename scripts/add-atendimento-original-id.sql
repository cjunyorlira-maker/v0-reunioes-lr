-- Adicionar coluna atendimento_original_id para vincular retornos
-- Esta coluna permite que um atendimento seja um retorno de outro atendimento

ALTER TABLE atendimentos 
ADD COLUMN atendimento_original_id UUID REFERENCES atendimentos(id) ON DELETE SET NULL;

-- Criar índice para facilitar buscas de retornos
CREATE INDEX idx_atendimentos_original_id ON atendimentos(atendimento_original_id);

-- Criar índice para facilitar buscas de retornos de um atendimento específico
CREATE INDEX idx_atendimentos_lead_e_original ON atendimentos(lead_id, atendimento_original_id);
