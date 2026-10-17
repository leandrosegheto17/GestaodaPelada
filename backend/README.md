# Backend

Pacotes: `contrato` (schemas zod), `dominio` (regras puras) e `api` (Hono no Cloudflare Worker).

## Pré-requisitos

- Node 22 (`.nvmrc`)
- pnpm via corepack: `corepack enable`

## Comandos (na raiz do repositório)

```
pnpm install
pnpm lint
pnpm typecheck
pnpm -r test
```

Variáveis: copie `backend/.env.example` para `backend/.env` e preencha.

## Banco local

O Worker acessa o Postgres pelo binding `HYPERDRIVE`. Localmente, o `wrangler dev` usa o
`localConnectionString` do `wrangler.jsonc` (Postgres do Docker, host `localhost`).

- Scripts (`pnpm migrar`) leem `DATABASE_URL`; host que não seja local exige `--alvo producao|teste`.
- Testes da API que usam banco leem `DATABASE_URL_TESTE` (Postgres local descartável); sem ela, esses testes são pulados.

Para subir só o banco local: `docker compose up db`. Os testes da API criam o banco `pelada_teste`
nesse servidor e aplicam as migrações antes da suíte (`DATABASE_URL_TESTE` muda o endereço).

## Isolamento entre grupos

Toda rota nova do Hono entra em `backend/api/test/isolamento/casos.ts` na mesma tarefa que a cria:
a suíte lista as rotas do app e falha se alguma não tiver caso (ou se um caso apontar para rota que não existe).

## Conta do dono

`pnpm exec tsx backend/scripts/dono.ts criar` cria a conta do dono (e-mail de `DONO_EMAIL`) com senha temporária
exibida uma única vez; `redefinir-senha` recupera o acesso. Os dois pedem para digitar o e-mail do dono e usam a
trava de host (`--alvo producao` para o banco remoto). Nenhuma rota escreve o papel de dono.

## Seed local

`pnpm seed` (com `DATABASE_URL` apontando para o Postgres local) cria dados fictícios: os grupos
"Pelada de Quinta" e "Racha de Domingo", 25 jogadores com notas e 3 meses de partidas em datas fixas (até 2026-10-22, como no mockup).
É idempotente (apaga e recria só o que é do seed) e **só roda em host local**.

| Conta                                                           | E-mail                      | Senha              |
| --------------------------------------------------------------- | --------------------------- | ------------------ |
| Dono e admin dos dois grupos                                    | leandrosegheto17@gmail.com  | senha-de-teste-123 |
| Admin da Quinta, sem financeiro, aviso de privacidade não visto | marquinhos@exemplo.com.br   | senha-de-teste-123 |
| Admin do Domingo, com financeiro                                | carlos.racha@exemplo.com.br | senha-de-teste-123 |
| Senha temporária (troca obrigatória), sem grupo                 | rodrigo@exemplo.com.br      | Temporaria-teste-1 |
| Sem grupo                                                       | paulo@exemplo.com.br        | senha-de-teste-123 |

## Backup

O workflow `backup.yml` roda todo dia às 07:00 UTC (04:00 em São Paulo) e sob demanda. Ele faz `pg_dump` com o usuário
só de leitura, cifra o dump com `age` (`BACKUP_CHAVE` é uma identidade `AGE-SECRET-KEY-1…`) e guarda só o arquivo
cifrado como artefato por 30 dias.

- A falha do workflow agendado avisa por e-mail pelo GitHub: confira que as notificações de Actions estão ligadas.
- Para decifrar e restaurar, veja o `DEPLOY.md`.
- O dump contém dados pessoais (telefone, notas): nunca fica em claro e a chave fica no gerenciador de senhas.

## Deploy

O deploy só roda pelo workflow `deploy.yml` (push na `main` publica `producao`; o disparo manual publica `teste`).
A ordem é fixa: branch de restauração no Neon, dump cifrado, migração (`migrar.ts --alvo`), conferência do cache
desligado do Hyperdrive e `wrangler deploy`. Se algo falhar depois da migração, o workflow desfaz o deploy
(`wrangler rollback`) e imprime como restaurar o banco. O runbook completo está em `DEPLOY.md`.

Nenhum outro arquivo pode chamar `wrangler deploy`: `node backend/scripts/checagens/checar-wrangler-deploy.mjs`.
