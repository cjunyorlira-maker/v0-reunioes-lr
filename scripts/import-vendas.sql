-- Script para importar as 13 vendas de produção do Kommo
-- Executar este script para popular a tabela de vendas

-- Criar tabela de vendas se não existir
CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  kommo_id TEXT UNIQUE,
  nome_lead TEXT NOT NULL,
  valor_venda NUMERIC(12, 2) NOT NULL,
  responsavel TEXT NOT NULL,
  atendente TEXT NOT NULL,
  origem TEXT,
  tags TEXT,
  avaliacao TEXT, -- 'excelente', 'bom', null
  data_venda DATE NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_vendas_responsavel ON vendas(responsavel);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_origem ON vendas(origem);

-- Inserir as 13 vendas
INSERT INTO vendas (kommo_id, nome_lead, valor_venda, responsavel, atendente, origem, tags, avaliacao, data_venda, observacao)
VALUES
  ('22681322', 'Ana Maria - Cota 1568', 281657.00, 'Ana Gabrielly', 'Alex Negreiros', 'Facebook Grupos', '2070, Abr/26', NULL, '2026-04-17', 'Presencial'),
  ('22534266', 'Alberto - Cota 3298', 450651.00, 'Alex Negreiros', 'Alex Negreiros', 'Facebook Grupos', '2070, Abr/26', NULL, '2026-04-02', 'Presencial'),
  ('22519046', 'Marco - Cota 152', 73834.00, 'Alexia Cunha', 'Al', 'Tráfego Pago', '2079, Excelente, Abr/26', 'excelente', '2026-04-02', 'Presencial'),
  ('22510579', 'Rafael - Cota 461', 73834.00, 'Alexia Cunha', 'Alexia', 'Facebook Grupos', '2079, Abr/26', NULL, '2026-04-10', 'Presencial'),
  ('22481759', 'Alan - Cota 454', 337988.00, 'Bianca Isabela', 'Emily Machado', 'Facebook Grupos', '2070, Excelente, Abr/26', 'excelente', '2026-04-04', 'Presencial'),
  ('22459163', 'Samuel - Cota 742', 450651.00, 'Bianca Isabela', 'Emily', 'Facebook Grupos', '2070, Excelente, Abr/26', 'excelente', '2026-03-31', 'Presencial'),
  ('22458715', 'Rodrigo - Cota 913', 126572.00, 'João Victor', 'Leonardo Freitas', 'Indicação', '2079, Excelente, Abr/26', 'excelente', '2026-03-24', 'Presencial'),
  ('22458229', 'Valdir - Cota 178', 228250.00, 'Nicolas Moraes', 'JANAINA DANTAS', 'Tráfego Pago', '2059, Abr/26', NULL, '2026-04-06', 'Online'),
  ('22439867', 'Antonio/Maria - Cota 622', 394320.00, 'Amanda Souza', 'Emily Machado', 'Facebook Grupos', '2070, Excelente, Abr/26', 'excelente', '2026-04-10', 'Presencial'),
  ('22431435', 'Cecilia - Cota 1429', 563314.00, 'Ana Beatriz', 'Emily Machado', 'Facebook Grupos', '2070, Abr/26', NULL, '2026-03-31', 'Presencial'),
  ('22425581', 'Benedito/Larissa - Cota 821', 337988.00, 'Emily Machado', 'Klaiver Seabra', 'Facebook Grupos', '2070, Excelente, Abr/26', 'excelente', '2026-04-09', 'Presencial'),
  ('22333913', 'Ricardo - Cota 379', 563314.00, 'Nicolas Moraes', 'Janaina Dantas', 'Facebook Grupos', '2070, Excelente, Abr/26', 'excelente', '2026-03-31', 'Presencial'),
  ('22299276', 'Bruno - Cota 1308', 394320.00, 'Isabelly Ribeiro', 'Alex Negreiros', 'Simulador Empresa', '2070, Excelente, Abr/26', 'excelente', '2026-04-06', 'Online')
ON CONFLICT (kommo_id) DO UPDATE SET
  valor_venda = EXCLUDED.valor_venda,
  responsavel = EXCLUDED.responsavel,
  atendente = EXCLUDED.atendente,
  origem = EXCLUDED.origem,
  tags = EXCLUDED.tags,
  avaliacao = EXCLUDED.avaliacao,
  data_venda = EXCLUDED.data_venda,
  updated_at = NOW();
