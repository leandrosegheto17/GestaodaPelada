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

## TP-0019 — QA — 2026-10-17
APROVADA; 0 achados; 395 testes do contrato verdes, snapshot compatível e tsc limpo.

## TP-0020 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0021: enderecoNovo opcional); 34 testes verdes de publico/registro/snapshot.

## TP-0021 — QA — 2026-10-17
APROVADA; 28 testes e compatibilidade verdes, todos os JSONs do mockup cobertos, 0 achados (casos de admins em grupo.test.ts aceitável).

## TP-0023 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 39 testes de contrato passando, snapshot compatível, tsc limpo.

## TP-0024 — QA — 2026-10-17
APROVADA; 23 testes ok, snapshot compatível, tsc limpo; 0 achados.

## TP-0090 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; e2e de cabeçalhos 3/3 e contrato 395/395; sem-eval.ts justificado e sem quebra de contrato.

## TP-0109 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 136 testes ok, T02 0,00% pc/celular, T03 0,00% (sem regressão do ajuste de CSS em TelaMensagem).

## TP-0207 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0022: ConteudoPagina sem a classe .conteudo do mockup); 29 testes, axe e stylelint verdes.

## TP-0017 — QA — 2026-10-17
APROVADA - reteste workers saude/apoio-banco sai 0 sem Unhandled Rejection, node db verde (16/16), ouvinte de erro só no fechamento; 0 críticos, 0 não críticos.

## TP-0145 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 24/24 testes, compatibilidade e tsc ok.

## TP-0146 — QA — 2026-10-17
APROVADA; 31 testes e compatibilidade de snapshot verdes, 9 JSONs de respostas (incl. 2 novos) validam nos schemas; 0 críticos, 0 não críticos.

## TP-0186 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 30 testes passando, snapshot compatível, tsc limpo.

## TP-0022 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; dono.test 24/24, tsc e checar-compatibilidade verdes, RF-07 verificado por JSON Schema + strict.

## TP-0102 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 132 testes passando, ajuste de regex em teste não enfraquece a asserção.

## TP-0103 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 31 testes passando (seletor-situacao + rotulos), CSS conferido com o mockup.

## TP-0105 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 92 testes web verdes (guarda, destino, sessão) e tsc limpo.

## TP-0110 — QA — 2026-10-17
APROVADA — 41 testes ok, CV T03 0,00% em pc e celular, 0 achados.

## TP-0180 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 25 testes + compatibilidade de snapshot verdes, mockups e G-10 cobertos.

## TP-0173 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0023: alinhar mockup ao div[role=status]); 21 testes verdes, axe limpo.

## TP-0174 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0024: debounce próprio em vez de usarValorAtrasado); 24/24 testes, mockup trocar conforme o plano.

## TP-0106 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; layout-admin.test e rotas verdes; falha de layout-admin.privacidade.test é do teste de TP-0204 (body.innerHTML), não do LayoutAdmin.

## TP-0111 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0027: teste da Legenda oculta); visual T01 13/13 OK (<=0,06%); testes de basicos/tabela-ranking passam, falhas em layout-admin.privacidade são de outra tarefa.

## TP-0114 — QA — 2026-10-17
APROVADA — 35 testes passando, visual T04 vazio 0,00% pc/celular, UX-SPEC corrigida conforme decisão; 0 achados.

## TP-0118 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0026, CSS morto em Pagina.module.css); visual T08 ≤0,04% e T02/T03/T04/T05/T25 0,00%; T06 e 2 testes de senha falhando por causa externa (Faixa/TP-0111).

## TP-0182 — QA — 2026-10-17
APROVADA — 26/26 testes, vite build ok, jspdf em chunk separado (fora do entry), vite.config só afeta o bloco de teste; 0 achados.

## TP-0113 — QA — 2026-10-17
APROVADA — 0 críticos/0 não críticos; 56 testes passando e T01 instalar-iphone celular 0,00% (todos os estados OK).

## TP-0115 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 7/7 testes e comparação visual T05 vazio 0,00% (pc e celular), sucesso conferido com o mockup.

## TP-0116 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0031: falta teste de 72 caracteres); 51 testes passando, visual T06 vazio pc/celular 0,00%, PNGs abertos.

## TP-0119 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0034: mockup sem-jogadores ainda "Nenhuma ainda"); 130 testes ok e CV T09 <=0.11%, sem regressão em T01/T10/T15 pela mudança de `.seta`.

## TP-0120 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0029: mockup põe .barra-acao fora do main, T10 pc 1,48% só pelo botão); 101 testes ok, CV celular ≤ 0,07%.

## TP-0123 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0030: mockup T15 com barra fora do main e sem seta; vazio-inativos/pc 1,52% é defeito do mockup); 184 testes ok, CV T15 e PADRAO lista dentro de 1% exceto esse caso.

## TP-0124 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0033, mockup edicao sem ajuda do apelido); novo pc/celular 0,00%, edicao/sem-habilidades dependem de TP-0171; 2 falhas de SecaoNotas são do TP-0171.

## TP-0125 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0032: axe erro/salvo, describedby da ajuda, teste de rótulos); 34 testes ok, CV T18 sucesso 0,00% pc/celular, erro e salvo conferidos à mão.

## TP-0126 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0028: axe com diálogo aberto); 27 testes OK, visual T19 ≤ 0.51% e alturas iguais.

## TP-0127 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0036: mockup T20 estoura 390 px, app correto); 36 testes verdes, CV T20 pc 0,04%, PADRAO 0,53%/0,00%, celular T20 8,66% só pela largura do mockup.

## TP-0128 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; 14 testes ok e comparação visual T21 4/4 em 0,00%; CSS compartilhado só afeta TabelaSemanas (T21).

## TP-0129 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0037: mockup T26 sem seta e sessão do harness no vazio; RTP-0029 cobre barra-acao); 30 testes ok, gcTime 0 confirmado, CV 1,40/2,81/3,79/7,26% explicada só por mockup/harness.

## TP-0170 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; 18 testes ok, axe nos 4 estados, visual T17 ≤ 0,61% com alturas iguais.

## TP-0172 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0035: largura do cartão vazio 560 vs 512 px); 22/22 testes, visual vazio pc 0,41% e celular 0,00%.

## TP-0199 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0038: largura vazio-config e margens negativas do .semAcesso); CV T22 ok exceto vazio-mes pc 1,72% só pela .barra-acao do mockup (RTP-0029); 2 testes vermelhos são da TP-0200.

## TP-0201 — QA — 2026-10-17
APROVADA, 0 achados; visual ≤0,11% nos 4 casos, testes da tela e dos campos verdes, CampoTexto sem regressão nos consumidores (falhas em SecaoNotas/dono são de outras tarefas).

## TP-0204 — QA — 2026-10-17
APROVADA, 0 críticos e 0 não críticos; vitest 82/82 nos arquivos da tarefa, visual T07 pagina/dialogo pc/celular ≤ 0.02%, classe global `dialogo` sem impacto em outros diálogos.

## TP-0117 — QA — 2026-10-17
APROVADA — 12 testes passando, visual T25 vazio 0,00% pc/celular, erro/sucesso conferidos contra o mockup; 0 achados.

## TP-0121 — QA — 2026-10-17
APROVADA; 0 críticos, 2 não críticos (RTP-0044 ícone do erro no mockup, RTP-0045 FerramentasLista duplicado); 111 testes verdes, visual T11 ≤ 0,65% (edicao diverge esperado, TP-0122).

## TP-0130 — QA — 2026-10-17
APROVADA; 0 críticos, 2 não críticos (RTP-0039 harness T27 sem sessão de dono sem grupos: 7,72%/13,63% -> 0,05%/0,16% com a sessão certa; RTP-0042 testes faltantes); gcTime: 0 e .estreito confirmados, 6/6 testes.

## TP-0131 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0041, lacunas de teste); 48 testes ok, CV T28 sucesso 0,11% pc / 0,34% celular, extras de mockup e Campo.tsx aceitos.

## TP-0171 — QA — 2026-10-17
APROVADA — 53 testes ok; CV T16 acima de 1% em edicao/sem-habilidades por defeito do mockup (base.css, RTP-0040; Apelido RTP-0033), app correto; 0 críticos, 1 não crítico.

## TP-0175 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0043: teste de selos/trocas no sucesso e 8 px na ajuda do Não entra); 125 testes passando e 8 estados x 2 tamanhos conferidos visualmente.

## TP-0183 — QA — 2026-10-17
APROVADA — PDF 1 página, divergência medida 3,960% (sucesso) e 4,022% (mes-vazio) <= 4,5% (ADR-019), 794x1123 exatos, 1% mantido nas telas; 0 achados; vitest 26/26 e Playwright 2/2.
