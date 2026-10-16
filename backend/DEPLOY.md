# Deploy, backup e operação

Runbook curto. Cada seção aponta para o arquivo que faz o trabalho; aqui ficam só a ordem e os comandos de quem
opera. Nenhuma senha, chave ou string de conexão vai neste arquivo.

## Deploy

- **Produção:** merge na `main` e aprovação manual no environment `producao` do GitHub.
- **Homologação:** disparo manual do workflow `deploy` (ambiente `teste`).
- O que o [`deploy.yml`](../.github/workflows/deploy.yml) faz, nesta ordem: cria o branch de restauração no Neon
  (`restauracao-<ambiente>-<run_id>`), gera o dump cifrado (artefato `dump-predeploy-<ambiente>-<run_id>`), roda
  `backend/scripts/migrar.ts --alvo`, confere que o cache do Hyperdrive está desligado e publica com
  `wrangler deploy`. Depois confere `GET /api/saude`.
- Só esse workflow chama `wrangler deploy` (conferido no CI por `checar-wrangler-deploy.mjs`).

## Voltar atrás

1. **Só o código:** `wrangler rollback` (e `--env teste` na homologação). O workflow já faz isso quando o deploy ou a
   checagem de saúde falha depois da migração.
2. **Se a migração estragou dado:** restaure o branch `restauracao-*` pelo console ou pela API do Neon e troque a
   origem do Hyperdrive para ele:
   `wrangler hyperdrive update <id> --origin-host <host> --origin-user <usuario> --origin-password <senha> --origin-database <banco> --caching-disabled`
   (digite a senha só no terminal; mantenha `--caching-disabled`).
3. Confira com `GET /api/saude` e com a contagem de linhas (seção seguinte).

## Restaurar um backup

1. Baixe o artefato: `gh run download <run_id> -n <nome-do-artefato>` (backup diário: `backup-AAAA-MM-DD-<run_id>`).
2. Decifre: `age -d -i <arquivo-da-chave> -o dump.pgdump <arquivo>.sql.age`. A chave (`AGE-SECRET-KEY-1…`) fica só no
   gerenciador de senhas.
3. Crie um branch novo no Neon (ou, no ensaio, um banco novo no Postgres local) e restaure com o `pg_restore` da
   versão do servidor: `pg_restore --no-owner --clean --if-exists -d "$URL_NOVA" dump.pgdump`.
4. Compare as contagens no banco antigo e no restaurado: `psql "$URL" -f backend/scripts/ops/contar-linhas.sql`.
5. Aponte o Hyperdrive para o branch novo (comando da seção anterior). Para voltar atrás, aponte a origem de volta.
6. Apague `dump.pgdump` e qualquer arquivo decifrado ao terminar.

## Conta do dono

Pelo script (usa a trava de host; confirma o e-mail):

```
pnpm exec tsx backend/scripts/dono.ts criar --alvo producao
pnpm exec tsx backend/scripts/dono.ts redefinir-senha --alvo producao
```

Pelo SQL Editor do Neon, quando o script não puder rodar. Troque `:'senha'` pela senha provisória **só no console** e
peça a troca no primeiro login (`senha_temporaria = true`):

```sql
BEGIN;
-- criar (primeira vez):
INSERT INTO contas (email, nome, senha_hash, senha_temporaria, e_dono, criada_em)
VALUES ('leandrosegheto17@gmail.com', 'Dono', crypt(:'senha', gen_salt('bf', 12)), true, true, now());
-- ou redefinir:
UPDATE contas SET senha_hash = crypt(:'senha', gen_salt('bf', 12)), senha_temporaria = true WHERE e_dono;
DELETE FROM sessoes WHERE conta_id = (SELECT id FROM contas WHERE e_dono);
INSERT INTO auditoria (autor_tipo, acao, entidade, entidade_id, momento, resumo)
SELECT 'infraestrutura', 'dono.senha_redefinida', 'conta', id::text, now(), '{}'::jsonb FROM contas WHERE e_dono;
COMMIT;
```

## Checagem mensal do backup

- `gh run list --workflow backup.yml -L 1` deve mostrar o último run verde; confirme que o workflow está ativo.
- Revise o painel de uso da Cloudflare e do Neon (limites do plano gratuito).
- A cada 3 meses, repita o ensaio de restauração com um dump do `teste` (nunca de produção) num Postgres local, num
  banco novo (`pelada_restauracao`), e compare as contagens.

## Troca de domínio

1. Defina `ENDERECO_NOVO` com o endereço novo (o app passa a mostrar o aviso e o service worker deixa de servir o shell).
2. Mantenha o endereço antigo no ar durante a transição com um Worker que responde 301 preservando caminho e query.
3. Publique a nova versão da TWA com o `assetlinks.json` do host novo.
4. Atualize `URL_PUBLICA` no environment do GitHub e faça um deploy.

## Anonimização sob pedido (LGPD)

Até a Fase 2 não há comando pronto: o script de anonimização é criado sob pedido, com registro em `auditoria`.
