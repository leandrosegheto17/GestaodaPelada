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
