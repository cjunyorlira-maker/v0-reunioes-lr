-- Adiciona campo data_original para rastrear a data original da reunião antes de remarcações
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_original DATE;

-- Copia os valores de data para data_original (para leads existentes)
UPDATE leads SET data_original = data WHERE data_original IS NULL;
