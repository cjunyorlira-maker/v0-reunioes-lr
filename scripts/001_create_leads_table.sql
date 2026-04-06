-- Tabela de leads/reuniões para o Quadro de Reuniões LR Multimarcas
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  responsavel TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Imóvel',
  kommo_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'veio', 'nao')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_leads_data ON public.leads(data);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_kommo_id ON public.leads(kommo_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública (sem autenticação)
CREATE POLICY "leads_select_all" ON public.leads FOR SELECT USING (true);

-- Política para permitir inserção pública
CREATE POLICY "leads_insert_all" ON public.leads FOR INSERT WITH CHECK (true);

-- Política para permitir atualização pública
CREATE POLICY "leads_update_all" ON public.leads FOR UPDATE USING (true);

-- Política para permitir deleção pública
CREATE POLICY "leads_delete_all" ON public.leads FOR DELETE USING (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
