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
