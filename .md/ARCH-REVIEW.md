# Revisão de arquitetura

## Revisão 2026-10-18 — sob demanda (projeto inteiro, primeira revisão)

Números do saude.py: 3 arquivos acima do limite (2 código, 1 componente) · 24 blocos duplicados (250 linhas) · 3 IDs de tarefa (todos em `evidencia/`) · 2 pastas com acesso a dados (`backend/api/src`, `evidencia/s-01`) · 0 imports indevidos entre aplicações (web importa só `@pelada/contrato`) · 0 conversões forçadas. Comparação visual: 115 OK, 2 DIVERGE (T16 sem-habilidades); `tokens.css` do app idêntico ao do mockup.

**Há 1 achado de severidade Alta aberto (#1, RTP-0130): tela fora do limite do mockup. Bloqueia o `/deploy` até ser corrigido.**

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | T16 Ficha do jogador, estado sem-habilidades: título e selo da seção 1 px abaixo do mockup; 4,60% (PC) e 5,98% (celular) de pixels divergentes, limite 1% | 18 | Alta | `frontend/web/src/telas/jogador/SecaoNotas.tsx`, `jogador.module.css` | RTP-0130 |
| 2 | Cinco+ formulários reescrevem o `<form noValidate aria-busy onSubmit>` que o `Formulario` compartilhado já faz, e `.formulario`/`.duasColunas` estão copiados em 8 módulos CSS | 4 | Média | `telas/{lancamento,pontuacao,grupo,jogador,config-caixa,partida,admins,...}/Formulario*.tsx`, `*.module.css`; `componentes/pagina/Formulario.tsx` | RTP-0131 |
| 3 | ResultadoDois e ResultadoVarios repetem confirmar escalação, faixas de erro e diálogo de refazer; ResultadoVarios importa constante da tela irmã; ResultadoDois com 207 linhas | 4, 5, 8 | Média | `telas/simulador-resultado/ResultadoDois.tsx:60-116,183-205`, `ResultadoVarios.tsx:46-91,121-143` | RTP-0132 |
| 4 | Validação do `?mes=` malformado copiada em Ranking, Partidas e Financeiro | 4 | Média | `telas/ranking/PaginaRanking.tsx:23-33`, `telas/partidas/PaginaPartidas.tsx:33-43`, `telas/financeiro/PaginaFinanceiro.tsx:34-44` | RTP-0133 |
| 5 | `eslint.config.mjs` (304) e `checar-grupo-id.mjs` (301) acima de 300 linhas | 8 | Baixa | `eslint.config.mjs`, `backend/scripts/checagens/checar-grupo-id.mjs` | RTP-0134 |

Descartados (falso positivo):
- IDs de tarefa em `evidencia/s-01/{preparar.sql,rodar.mjs,worker.ts}` e acesso a dados em `evidencia/s-01`: pasta de evidência do spike, fora do código de produção e do empacotamento.
- Comentários "que admitem cópia" (8): falam de partida duplicada/repetida (regra de negócio) e do espelho de armazenamento do PWA; nenhum diz que o código foi copiado.
- Blocos restantes do §2 (9 não listados): consequência dos mesmos Formulario*/Pagina* acima, cobertos por RTP-0131 e RTP-0133.
- Acesso a dados em `backend/api/src` (89 ocorrências): confirmado, o `saude.py` agrupa por pasta de partida; o G-02 é verificado por ESLint (`pg`/`kysely` proibidos fora de `infraestrutura/db/`) e `checar-grupo-id.mjs`.
- Imports entre pacotes (§6a): todos conformes ao SDD (api e web importam `@pelada/contrato`; só a api importa `@pelada/dominio`); as linhas com origem `.` são arquivos de configuração/scripts da raiz.

Sem achado nos itens: 1, 2, 3, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17 (CI: `ci.yml` roda as checagens `checar-*`, `checar-compatibilidade`, gitleaks, e2e e `visual`; `deploy.yml` tem o `hyperdrive get` do G-17; guardrails com coluna "Como verificar" automática). Itens 11, 13 e 14 foram olhados por amostragem do relatório, sem leitura exaustiva de cabeçalhos.
