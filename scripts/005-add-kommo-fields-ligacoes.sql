-- scripts/005-add-kommo-fields-ligacoes.sql
ALTER TABLE ligacoes
ADD COLUMN IF NOT EXISTS kommo_lead_id BIGINT,
ADD COLUMN IF NOT EXISTS kommo_contact_id BIGINT,
ADD COLUMN IF NOT EXISTS kommo_user_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_ligacoes_kommo_lead_id ON ligacoes(kommo_lead_id);
