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

## TP-0097 — QA — 2026-10-17
APROVADA — 14/14 testes de escolhas passando (teclado, switch, alvo 44px, axe), 0 achados.

## TP-0107 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 21/21 testes de armazenamento passando, eslint/prettier limpos, plano de teste integralmente coberto.

## TP-0151 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0011: contagem de substituições duplicada); 67 testes passando.

## TP-0152 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0010: testes mais fracos que o plano); 65 testes passando, casos 22/4, 20/4, 9/4 e propriedades cobertos.

## TP-0153 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 14 testes passando, aceites (a)-(d) cobertos, incluindo exemplo literal do mockup.

## TP-0098 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; vitest barras 11/11, axe limpo, CSS fiel ao mockup.

## TP-0099 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0013: foco escapa por Shift+Tab no título com focoNoTitulo, sem teste); 33 testes ok, lint ok.

## TP-0101 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 9 testes passando cobrindo todos os casos do plano, eslint limpo; visual fica nas telas T10/T21/T08.

## TP-0104 — QA — 2026-10-17
APROVADA; 27/27 testes (plano coberto, matriz adversarial e axe ok); 0 achados críticos, 0 não críticos.

## TP-0003 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0014: prova do CI em PR real pendente de push do usuário); actionlint/lint/typecheck/test:checagens/checagens de ID e URL = 0, format:check só por CRLF local do wrangler.jsonc.

## TP-0096 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (CSS .resumo não aplicado -> RTP-0016); 49 testes de componentes/campos+basicos passando, axe limpo, tsc/stylelint 0; UX-SPEC T23 confere com a decisão.

## TP-0016 — QA — 2026-10-17
APROVADA; 46/46 testes e ambos os scripts verdes na raiz, sondas adversariais extras falham fechado; 0 críticos, 0 não críticos.

## TP-0018 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0018, lacunas de teste); 29 testes e checar-compatibilidade exit 0.

## TP-0089 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0017: prova do job e2e em PR e teste de dist ausente); testes 6/6 e visual T02 sem ERRO.

## TP-0017 — QA — 2026-10-17
DEVOLVIDA - workers saude/apoio-banco passam (3/3), mas Unhandled Rejection "Stream was cancelled" faz o vitest sair com 1 e quebra o job api do CI; 1 crítico, 0 não críticos.

## TP-0100 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0020: cobertura de teste indexedDB/monoespaçada); 46 testes passando; mockup (--fonte-mono, X nos 3 HTML) conforme decisão.
