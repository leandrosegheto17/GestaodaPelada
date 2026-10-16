-- Conta as linhas de cada tabela de `public` (inclui `migracoes_aplicadas`). Só leitura.
-- Uso: psql "$URL" -f backend/scripts/ops/contar-linhas.sql
-- Rode no banco de origem e no restaurado e compare as duas listas.
SELECT format('SELECT %L AS tabela, count(*) AS linhas FROM public.%I', table_name, table_name)
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name
\gexec
