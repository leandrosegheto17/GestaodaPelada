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
