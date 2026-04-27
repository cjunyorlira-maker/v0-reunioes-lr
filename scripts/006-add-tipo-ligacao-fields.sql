-- scripts/006-add-tipo-ligacao-fields.sql
ALTER TABLE ligacoes
ADD COLUMN IF NOT EXISTS tipo_ligacao VARCHAR(50),
ADD COLUMN IF NOT EXISTS sip_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS reuniao_marcou BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reuniao_tipo VARCHAR(20),
ADD COLUMN IF NOT EXISTS nivel_interesse VARCHAR(20),
ADD COLUMN IF NOT EXISTS pilares_coletados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_abertura INTEGER,
ADD COLUMN IF NOT EXISTS score_qualificacao INTEGER,
ADD COLUMN IF NOT EXISTS score_abordagem_credito INTEGER,
ADD COLUMN IF NOT EXISTS score_conducao_reuniao INTEGER;

CREATE INDEX IF NOT EXISTS idx_ligacoes_tipo ON ligacoes(tipo_ligacao);
CREATE INDEX IF NOT EXISTS idx_ligacoes_status ON ligacoes(status);
CREATE INDEX IF NOT EXISTS idx_ligacoes_score ON ligacoes(score_geral);
