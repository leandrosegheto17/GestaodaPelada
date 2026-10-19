# Deploy, backup e operação

Runbook curto. Cada seção aponta para o arquivo que faz o trabalho; aqui ficam só a ordem e os comandos de quem
opera. Nenhuma senha, chave ou string de conexão vai neste arquivo.

## Deploy

- **Produção:** merge na `main` e aprovação manual no environment `producao` do GitHub.
- **Sem homologação** (ADR-020). Host: `https://pelada.prod-ljs.workers.dev`.
- O que o [`deploy.yml`](../.github/workflows/deploy.yml) faz, nesta ordem: cria o branch de restauração no Neon
  (`restauracao-<ambiente>-<run_id>`), gera o dump cifrado (artefato `dump-predeploy-<ambiente>-<run_id>`), roda
  `backend/scripts/migrar.ts --alvo producao`, confere que o cache do Hyperdrive está desligado e publica com
  `wrangler deploy`. Depois confere `GET /api/saude`.
- Só esse workflow chama `wrangler deploy` (conferido no CI por `checar-wrangler-deploy.mjs`).
- **Token da Cloudflare** (`CLOUDFLARE_API_TOKEN`): precisa de Workers (edição) para publicar e de
  `Account > Hyperdrive: Read` para a conferência do cache. Sem a segunda, o passo falha fechado e o deploy não segue.

## Voltar atrás

1. **Só o código:** `pnpm --filter @pelada/api exec wrangler rollback -c ../../wrangler.jsonc` (com
   `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no ambiente). O workflow já faz isso quando o deploy ou a
   checagem de saúde falha depois da migração.
2. **Se a migração estragou dado:** o branch `restauracao-producao-<run_id>` do Neon é uma cópia do banco de antes da
   migração (o workflow mantém os 2 mais novos). Use-o como origem, ou restaure o artefato
   `dump-predeploy-producao-<run_id>` num branch novo (seção seguinte). Depois troque a origem do Hyperdrive (o `id`
   está em `hyperdrive[0].id` do `wrangler.jsonc`):
   `pnpm --filter @pelada/api exec wrangler hyperdrive update <id> --origin-host <host> --origin-user <usuario> --origin-password <senha> --database <banco> --caching-disabled`
   (mantenha `--caching-disabled`, G-17). A senha na linha de comando fica no histórico do shell e aparece no `ps`
   enquanto o comando roda: use um terminal com `HISTCONTROL=ignorespace` e comece o comando por um espaço, e apague
   a entrada se ela foi gravada. No PowerShell, desligue o histórico da sessão antes com
   `Set-PSReadLineOption -HistorySaveStyle SaveNothing`. Nunca cole o comando em chat, e-mail ou arquivo do repositório.
3. Confira com `GET /api/saude` e com a contagem de linhas (seção seguinte).

## Restaurar um backup

Trabalhe fora do repositório: crie uma pasta temporária própria (por exemplo `mkdir -m 700 ~/restauracao-pelada` e
`cd` para ela; no PowerShell, `New-Item -ItemType Directory $HOME\restauracao-pelada` e depois
`icacls $HOME\restauracao-pelada /inheritance:r /grant:r "${env:USERNAME}:(OI)(CI)F"` para só você acessar a pasta) e grave nela o `.sql.age`, o `dump.pgdump` e o arquivo da identidade. O `.gitignore` também cobre
`*.pgdump`, `*.sql.age` e `identidade-age*` como rede de proteção, mas não conte só com ele: um `git add -A` na pasta
errada levaria dado pessoal ou a chave privada.

1. Baixe o artefato: `gh run download <run_id> -n <nome-do-artefato>` (backup diário `backup-AAAA-MM-DD-<run_id>`,
   do `backup.yml`; antes da migração `dump-predeploy-producao-<run_id>`, do `deploy.yml`). Sai um `<nome>.sql.age`.
2. Decifre: `age -d -i <arquivo-com-a-identidade> -o dump.pgdump <nome>.sql.age`. O secret `BACKUP_CHAVE` guarda só o
   destinatário público (`age1…`); a identidade privada (`AGE-SECRET-KEY-1…`) fica só no gerenciador de senhas:
   grave-a num arquivo temporário (nome `identidade-age.txt`) para o comando. Crie o arquivo já restrito antes de
   colar a chave: `(umask 077; touch identidade-age.txt)` no bash (o `chmod 600` só funciona depois que o arquivo
   existe), ou `New-Item identidade-age.txt` e depois `icacls identidade-age.txt /inheritance:r /grant:r "${env:USERNAME}:F"` no PowerShell (em uma linha só). Apague o arquivo depois.
3. Crie um branch novo no Neon (ou, no ensaio, um banco novo no Postgres local) e restaure com o `pg_restore` da
   versão do servidor: `pg_restore --no-owner --clean --if-exists -d "$URL_NOVA" dump.pgdump`.
   O `pg_restore` pode avisar de objetos que não existem (`--if-exists`); erros de verdade fazem o comando sair com
   código diferente de zero. **Atenção:** `--clean` apaga as tabelas do banco de destino antes de recriá-las. A
   `URL_NOVA` é sempre a de um branch ou banco novo e vazio, **nunca** a de produção nem a do `DATABASE_URL` de
   produção; confira o host da URL antes de rodar.
4. Compare as contagens no banco antigo e no restaurado: `psql "$URL" -f "<caminho do clone>/backend/scripts/ops/contar-linhas.sql"`
   (caminho completo do clone, porque você está na pasta fora do repositório; no PowerShell,
   `psql $env:URL -f "<caminho do clone>\backend\scripts\ops\contar-linhas.sql"`).
   A URL tem senha: guarde-a numa variável de ambiente lida de um prompt (`read -rs URL; export URL`, com
   `HISTCONTROL=ignorespace` e o comando iniciado por espaço; no PowerShell, `$s = Read-Host -AsSecureString` e
   `$env:URL = [System.Net.NetworkCredential]::new('', $s).Password`, com o histórico desligado como no passo 2 da
   seção anterior) ou use um arquivo de senhas (`~/.pgpass` com `chmod 600`; no Windows,
   `%APPDATA%\postgresql\pgpass.conf`, que fica na pasta do seu usuário), com a URL sem a senha, para ela não ir ao
   histórico nem ao `ps`. Cada linha do arquivo tem o formato `host:porta:banco:usuario:senha`, por exemplo
   `<host>:5432:<banco>:<usuario>:<senha>` (`*` vale como curinga nos quatro primeiros campos).
5. Aponte o Hyperdrive para o branch novo (comando da seção anterior). Para voltar atrás, aponte a origem de volta.
6. Apague `dump.pgdump`, o arquivo `.sql.age` e o arquivo com a identidade ao terminar. O dump tem dados pessoais:
   decifre só numa máquina do dono.

## Conta do dono

Pelo script, na raiz do repositório (usa a trava de host; pede para digitar o e-mail do dono; imprime a senha
temporária uma única vez). `DATABASE_URL` é a conexão direta de migração de produção, digitada só no terminal:

```
DONO_EMAIL=<e-mail do dono> DATABASE_URL=<conexão direta> pnpm exec tsx backend/scripts/dono.ts criar --alvo producao
DONO_EMAIL=<e-mail do dono> DATABASE_URL=<conexão direta> pnpm exec tsx backend/scripts/dono.ts redefinir-senha --alvo producao
```

Pelo SQL Editor do Neon, quando o script não puder rodar: o mesmo que o script faz (hash com `crypt` custo 12, senha
temporária, sessões encerradas, auditoria). Troque `<SENHA>` pela senha provisória **só no console** (não cole em chat,
e-mail nem arquivo) e peça a troca no primeiro login. A senha não pode ter apóstrofo (`'`). O histórico do SQL Editor
guarda o texto executado: apague a entrada depois de rodar. Rode **um** dos dois blocos.

Criar (primeira vez):

```sql
BEGIN;
WITH nova AS (
  INSERT INTO contas (email, nome, senha_hash, senha_temporaria, e_dono, criada_em)
  VALUES ('leandrosegheto17@gmail.com', 'Dono', crypt('<SENHA>', gen_salt('bf', 12)), true, true, now())
  RETURNING id
)
INSERT INTO auditoria (autor_tipo, acao, entidade, entidade_id, momento)
SELECT 'infraestrutura', 'dono_criado', 'conta', id::text, now() FROM nova;
COMMIT;
```

Redefinir a senha:

```sql
BEGIN;
UPDATE contas SET senha_hash = crypt('<SENHA>', gen_salt('bf', 12)), senha_temporaria = true WHERE e_dono;
DELETE FROM sessoes WHERE conta_id = (SELECT id FROM contas WHERE e_dono);
UPDATE pedidos_reset SET resolvido_em = now()
  WHERE resolvido_em IS NULL AND conta_id = (SELECT id FROM contas WHERE e_dono);
INSERT INTO auditoria (autor_tipo, acao, entidade, entidade_id, momento)
SELECT 'infraestrutura', 'senha_redefinida', 'conta', id::text, now() FROM contas WHERE e_dono;
COMMIT;
```

## Checagem mensal do backup

- `gh run list --workflow backup.yml -L 1` deve mostrar o último run verde; confirme que o workflow está ativo.
- Revise o painel de uso da Cloudflare e do Neon (limites do plano gratuito).
- A cada 3 meses, repita o ensaio de restauração com um dump de produção (artefato cifrado do backup) num Postgres local, num
  banco novo (`pelada_restauracao`), e compare as contagens.

## Troca de domínio

1. Defina `ENDERECO_NOVO` com o endereço novo (o app passa a mostrar o aviso e o service worker deixa de servir o shell).
2. Mantenha o endereço antigo no ar durante a transição com um Worker que responde 301 para um **host de destino fixo** (o endereço novo escrito no código ou em variável do
   próprio Worker, nunca lido de parâmetro, cabeçalho `Host` ou query da requisição: senão vira open redirect),
   preservando caminho e query.
3. Publique a nova versão da TWA com o `assetlinks.json` do host novo.
4. Atualize `URL_PUBLICA` no environment do GitHub e faça um deploy.

## Anonimização sob pedido (LGPD)

Até a Fase 2 não há comando pronto: o script de anonimização é criado sob pedido, com registro em `auditoria`.
