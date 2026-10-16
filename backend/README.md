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
