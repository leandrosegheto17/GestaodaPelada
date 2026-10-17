# QA-REPORT

## TP-0001 — QA — 2026-10-16
APROVADA, 0 críticos/0 não críticos; dependências por pacote = SDD §2 (3 testes passam), strict, Node 22, READMEs, .env.example e .gitignore conferidos.

## TP-0002 — QA — 2026-10-16
APROVADA, 0 críticos e 1 não crítico (RTP-0001: alias `@pelada/api` em backend/scripts não barrado); 120 testes das checagens e pnpm lint verdes.

## TP-0004 — QA — 2026-10-16
APROVADA, 0 críticos e 0 não críticos; 14 woff2 válidos, 14 @font-face, OFL presente, sem Google Fonts fora das isenções, 3 telas e galeria renderizadas sem rede com Barlow correta.

## TP-0005 — QA — 2026-10-16
APROVADA; 0 críticos, 1 não crítico (RTP-0003: teste de enums não confere `situacao` das respostas); 381 testes e tsc verdes no contrato.

## TP-0007 — QA — 2026-10-16
APROVADA — 19/19 testes, tsc/eslint/checar-ids limpos, aceite e G-01/G-06/G-23 conferidos; 0 achados.

## TP-0011 — QA — 2026-10-16
APROVADA — RN-11/RN-12 conforme o aceite, 13 testes, tsc/eslint/prettier limpos; 0 críticos, 0 não críticos.

## TP-0012 — QA — 2026-10-16
APROVADA; 0 críticos, 1 não crítico (teste de slug duplicado, RTP-0004); 50 testes verdes, tsc/eslint limpos, aceite conforme ADR-016.

## TP-0015 — QA — 2026-10-16
APROVADA; 0 críticos/0 não críticos; 32 testes + lint/tsc/prettier limpos e CLI da trava verificada.

## TP-0147 — QA — 2026-10-16
APROVADA — previa.ts atende o aceite [PD]; 19 testes, tsc e prettier ok; 0 achados.

## TP-0149 — QA — 2026-10-16
APROVADA; 18/18 testes, tsc/eslint limpos, aceite RN-09A/I-32/P-28 coberto; 0 críticos, 0 não críticos.

## TP-0008 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0005, teste duplicado em src/); 35 testes e tsc verdes, aceite [PD] cumprido.

## TP-0009 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0007 teste duplicado em src/atividade); 27 testes verdes, tsc e eslint limpos.

## TP-0013 — QA — 2026-10-17
APROVADA — 39 testes verdes, tsc/eslint limpos, aceite cumprido (Hono, config, relógio SP, no-store, CSRF, erros padrão, wrangler.jsonc); 0 achados; wrangler dev manual não executado.

## TP-0088 — QA — 2026-10-17
APROVADA — 35 testes, build com chunks por rota, stylelint e tsc limpos, build falha com recurso inválido; 0 achados.

## TP-0150 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0006: teste duplicado em src/, 3ª ocorrência; falta exemplo literal de 19 aptos); 27 testes e tsc verdes.

## TP-0014 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0009: faltam teste de tipo e pid fora da transação); 7/7 testes contra Postgres local, lint/prettier/tsc ok.

## TP-0091 — QA — 2026-10-17
APROVADA — 73 testes ok, tsc/eslint limpos, aceite e plano de teste cobertos; 0 achados.

## TP-0092 — QA — 2026-10-17
APROVADA — 94 testes de src/formatacao passando (incl. TZ distinto), lint/tipos limpos, 0 achados.

## TP-0093 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; vitest src/rotulos 20/20 passando, módulo único derivado do contrato.

## TP-0095 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 26 testes vitest passando (axe, timers 300 ms, papéis da Faixa, ErroRede) e revisão do diff sem violação de convenção.
