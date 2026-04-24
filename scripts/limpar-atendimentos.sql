-- Limpar todos os atendimentos da tabela
DELETE FROM public.atendimentos;

-- Verificar resultado
SELECT COUNT(*) as total_atendimentos FROM public.atendimentos;
