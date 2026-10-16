# Frontend

Pacote `web` (React + Vite, PWA).

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

Variáveis: copie `frontend/.env.example` para `frontend/.env`.

## App web

```
pnpm --filter @pelada/web dev      # servidor de desenvolvimento
pnpm --filter @pelada/web build    # tipos + vite build (dist/)
```

- `src/estilos/tokens.css` e `public/fontes/` são cópia byte a byte do mockup (`.md/mockup`); não edite.
- Cor, fonte e sombra só por variáveis (`pnpm --filter @pelada/web lint:css`).
- `VITE_RECURSOS_DESLIGADOS`: lista (separada por vírgula) de recursos a desligar no build; nome inválido falha o build.

## Verificação visual e e2e

```
pnpm --filter @pelada/web exec playwright install chromium
pnpm --filter @pelada/web build
pnpm --filter @pelada/web visual --tela T02   # sem --tela usa e2e/telas-ativas.txt
pnpm --filter @pelada/web e2e
```

O relatório fica em `frontend/web/e2e/resultado/` (resumo.md e PNGs).

## Ambiente local com Docker

```
docker compose up        # db (5432), backend (8787, migra e semeia) e frontend (5173)
docker compose down -v   # apaga o banco e os volumes
```

Abra `http://localhost:5173`; o Vite repassa `/api` ao backend (mesma origem, como em produção).
O Postgres é descartável e a senha do compose é fictícia.
