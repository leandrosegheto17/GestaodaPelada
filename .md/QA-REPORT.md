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

## TP-0200 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0048: D2 com fallback na config); 29 testes passando, visual T22 OK (vazio-mes pc só RTP-0029), asserções dos 2 testes corrigidos preservadas.

## TP-0202 — QA — 2026-10-17
APROVADA — 16/16 testes, celular 0,00%; pc 1,50% por largura 560 vs 512 px (RTP-0047, baixa; não é o caso do RTP-0029); estado erro conferido por leitura; 0 críticos, 1 não crítico.

## TP-0122 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0049: teste da faixa na T10 e UX-SPEC); 46 testes ok, visual T11 edição 0,01%/0,11% mesma altura.

## TP-0176 — QA — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; vitest 20/20, t14.spec 2/2 (vite próprio), comparação visual sucesso/mover pc+celular conferida; 2 testes corrigidos mantêm as asserções.

## TP-0184 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0050, lacunas de teste); vitest 139/139 e visual T01 13/13 OK.

## RTP-0001 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; lint-fronteiras 57/57 e eslint . limpo, alias @pelada/api barrado em scripts fora dos 4 caminhos.

## RTP-0002 — QA — 2026-10-17
APROVADA — aliases de Date/document barrados no lint com casos de falha e passe; 57 testes e eslint verdes; 0 achados.

## RTP-0003 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; novo teste passa (8/8) e falha ao remover valor do enum (mutação).

## RTP-0004 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; vitest test/grupos 34 verdes, teste duplicado removido e casos migrados.

## RTP-0008 — QA — 2026-10-17
APROVADA — audit sem sharp/undici (resta só braces, fora de escopo), overrides no lockfile corretos, runtime workerd sobe; falhas da suíte são de outras tarefas; 0 críticos, 0 não críticos.

## RTP-0009 — QA — 2026-10-17
APROVADA; 8/8 testes e tsc ok, aceite (tipo público e pid dentro/fora) cumprido; 0 achados.

## RTP-0010 — QA — 2026-10-17
APROVADA — 66 testes passando, enumeração confirma elenco "todos candidatos" e chave lexicográfica; 0 achados.

## RTP-0011 — QA — 2026-10-17
APROVADA — regra de saída delegada a saidaNoIntervalo, equivalência confirmada, 67 testes/tsc/eslint ok; 0 achados.

## RTP-0012 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; teto de 60 aptos com RangeError, vitest 66/66, eslint e prettier limpos.

## RTP-0013 — QA — 2026-10-17
APROVADA — Shift+Tab a partir do título volta ao último focável; 35 testes, eslint e tsc limpos; 0 achados.

## RTP-0015 — QA — 2026-10-17
APROVADA — 2 actions de terceiros fixadas em SHA que confere com as tags; actionlint rc=0; 0 achados.

## RTP-0016 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (resumo do app com ícone ausente no mockup, RTP-0052); borda 2px e recuo da lista aplicados e conferidos em pc/celular, testes 24/24, stylelint 0.

## RTP-0018 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 405 testes do contrato verdes, 4 casos do aceite cobertos (eDono entrada/resposta, enum, CLI snapshot exit 1 com snapshot intacto).

## RTP-0019 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; sonda dos 3 casos falha fechado (status 1), 56/56 testes verdes (timeouts de 5s só sob carga paralela, verdes isolados).

## RTP-0020 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; 21 testes passando, indexedDB.open/setItem não chamados, senha presente antes e ausente após unmount, classe monoespaçada confirmada.

## RTP-0021 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; contrato 405 testes, snapshot e compatibilidade ok, enderecoNovo obrigatório e recusado quando ausente.

## RTP-0022 — QA — 2026-10-17
APROVADA — ConteudoPagina com classe própria igual ao .conteudo do mockup, teste e stylelint verdes; 0 achados.

## RTP-0023 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; sem `ul[role=status]` no mockup e T13/T14 pixel-idênticas (1280 e 390 px) antes e depois da troca.

## RTP-0024 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; debounce via usarValorAtrasado, 25 testes, eslint e tsc ok.

## RTP-0025 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; vitest ajuste-simulador 25/25 verde, tsc e eslint limpos, caso de corpo nulo coberto.

## RTP-0026 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; CSS corrigido, vitest 4 ok, visual T02/T03/T05/T08/T25 0,00% em pc e celular.

## RTP-0027 — QA — 2026-10-17
APROVADA; 2 casos de Legenda (sem/com partidas) cobrem o aceite, TelaRanking 15/15 passando; 0 achados.

## RTP-0028 — QA — 2026-10-17
APROVADA; 0 achados; 15/15 testes de src/telas/admins passam com os casos axe de D1 e D2 abertos.

## RTP-0029 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; `.barra-acao` dentro do main em t10/t13/t14/t15/t22/t26 (varredura limpa), T10 pc 0,02%/0,07% e celular 0,05%/0,07% (limite 1%).

## RTP-0030 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; CV de T15 0,00% nos 3 estados em pc e celular, barra-acao no main e seta nos itens conferidas.

## RTP-0031 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; vitest nova-senha 13/13 com caso de 72 caracteres (envios=1).

## RTP-0032 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; 60 testes passando, axe em erro e salvo, ajuda ligada por aria-describedby, rótulos em src/rotulos.

## RTP-0033 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0053: inativo sem ajuda do apelido); CV T16 edicao pc 0,18% / celular 0,41% com alturas iguais, Dados alinhada.

## RTP-0034 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; CV T09 celular (4 estados) OK, sem-jogadores 0,00% de divergência.

## RTP-0035 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; T12 vazio pc e celular 0,00% de divergência, cartão com 512 px, 22/22 testes do simulador.

## RTP-0036 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; T20 sucesso pc 0,04% e celular 0,12% com 390×924 nos dois lados.

## RTP-0037 — QA — 2026-10-17
APROVADA; 0 achados; CV T26 sucesso/vazio pc e celular <= 0.07%, alturas iguais, PNGs conferidos.

## RTP-0038 — QA — 2026-10-17
APROVADA — CV T22 vazio-config 0,00% (era 0,42), sem-permissao 0,00%, vitest 46 ok, sem `-112px` fixo; 0 achados.

## RTP-0040 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; T16 edicao pc 0,18% e celular 0,41% (<=1%), selects de nota em 88px com rótulo legível.

## RTP-0041 — QA — 2026-10-17
APROVADA; 18/18 testes passando, todos os casos do aceite cobertos, eslint/prettier limpos; 0 achados.

## RTP-0042 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; NovoGrupo.test.tsx 12/12 passando (3 reruns), aceite coberto.

## RTP-0044 — QA — 2026-10-17
APROVADA, 0 achados; 17/17 `p.campo__erro` com ícone igual ao do app; CV T11 data-futura e duplicada pc/celular 0,00%, mesma altura.

## RTP-0045 — QA — 2026-10-17
APROVADA; 0 achados; vitest partida+pagina 40/40 e CV T11 12/12 OK (máx. 0,65%), alturas iguais.

## RTP-0046 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 42 testes verdes, corpo inválido não chega à rede (msw=0) e cai em "Não salvou".

## RTP-0047 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; CV T24 pc 0,00% e celular 0,00%, largura 512 px, vitest 16/16.

## RTP-0048 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0055: teste de mensalidade alterada depois); mutação do fallback para config falha o teste novo, 30/30 verdes.

## RTP-0049 — QA — 2026-10-17
APROVADA; teste da faixa de exclusão (com/sem estado) verde (8/8) e UX-SPEC T11 atualizada; 0 achados.

## RTP-0050 — QA — 2026-10-17
APROVADA; 5 testes novos verdes (16/16 isolado, 3 execuções); 0 críticos, 1 não crítico (RTP-0054: teste antigo flaky por delay de 150 ms).

## TP-0010 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 11 testes + tsc/eslint/prettier ok, desempenho 40x104 < 5 ms.

## TP-0025 — QA — 2026-10-17
APROVADA — 7/7 testes de migração + 8/8 db, checagem aditiva verde, tsc/eslint limpos; 0 achados críticos, 0 não críticos.

## TP-0187 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0051, suítes de teste duplicadas); 25 testes verdes, tsc/eslint limpos, aceite e convenções conferidos.

## RTP-0043 — QA — 2026-10-17
APROVADA — 13/13 testes de PaginaResultado isolados; ajuda do Não entra agora no mesmo y do mockup (pc 1245=1245, altura 1499=1499; celular 1937=1937); 0 críticos, 0 não críticos.

## RTP-0039 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; CV T27 vazio 0,05% (pc) e 0,16% (celular), alturas iguais, verificado em build+preview próprio com PNGs abertos.

## RTP-0051 — QA — 2026-10-17
APROVADA - nenhum caso perdido na unificação (13 casos removidos têm equivalente), 17 testes verdes, 0 achados.

## RTP-0052 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; comparação visual T06 erro (pc e celular) com geometria idêntica ao mockup e sem ícone; 51 testes de basicos/campos passando.

## RTP-0053 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; linha 20 do T16 inativo idêntica à edição e ao app (grep).

## RTP-0054 — QA — 2026-10-17
APROVADA — teste sem dependência de tempo (promessa controlada), 20/20 sob carga de CPU em todos os núcleos, 44 testes da pasta verdes; 0 achados.

## RTP-0055 — QA — 2026-10-17
APROVADA — teste novo cobre mensalidade alterada (entrada ≠ config) e falha na mutação com a prioridade invertida; 31/31 verdes; 0 achados.

## RTP-0056 — QA — 2026-10-17
APROVADA; 10 migrações em ordem, reaplicação ok, 66/66 testes e checar-migracao-aditiva verdes, COMMENT confirmados em pg_description; 0 achados.

## RTP-0057 — QA — 2026-10-17
APROVADA — 7 formas de bypass do G-03 agora falham (exit 1), 63/63 testes e checagem real exit 0; 0 achados.

## TP-0026 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 5/5 testes e checagem aditiva verde no Postgres 55432.

## TP-0027 — QA — 2026-10-17
APROVADA — aceite cumprido no código (bcrypt 12, hash fixo, sem vazamento, token/senha temporária ok), 11/12 testes (o de custo igual falha sob carga); 0 críticos, 1 não crítico (RTP-0060: tornar o teste de custo determinístico).

## TP-0028 — QA — 2026-10-17
APROVADA — 9/9 testes e checagem de grupoId ok, aceite atendido; 0 críticos, 1 não crítico (RTP-0059: falta teste de uma consulta por chamada).

## TP-0148 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 40 testes (ranking/prioridade/pdf) e tsc ok, extração em ranking.ts sem regressão no TP-0010.

## TP-0179 — QA — 2026-10-17
APROVADA — colunas/ptsInicial/ptsFinal conferem com aceite e mockup, 27 testes passando; 0 críticos, 1 não crítico (RTP-0058: testes de mockup/troca de pesos); decisão pendente: mês >12 partidas (ADR-008 x aceite "até 12").

## RTP-0058 — QA — 2026-10-17
APROVADA; 32 testes passando, aceite (mockup, troca de pesos, 14 partidas = comportamento atual) coberto; 0 achados.

## RTP-0059 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; teste de 1 consulta por chamada passa (6/6) e falha sob mutação com 2 consultas.

## RTP-0060 — QA — 2026-10-17
APROVADA; teste de custo igual agora por contagem de crypt (6x8/8 sob carga, mutação de retorno antecipado falha como esperado); 0 críticos, 0 não críticos.

## RTP-0061 — QA — 2026-10-17
APROVADA — 86/86 testes, raiz real exit 0, 62/80 sondas novas barradas; 0 críticos, 3 médios (construtor com corpo, re-export de .test/.mts/.tsx, casts) na RTP-0064; Padrão repetido: G-03 por enumeração sintática (4ª vez).

## TP-0029 — QA — 2026-10-17
APROVADA — 12 testes passando (banco 55432 próprio), checar-grupo-id sai 0, aceite e isolamento por grupo confirmados; 0 críticos, 0 não críticos.

## TP-0030 — QA — 2026-10-17
APROVADA; 11/11 testes e checar-grupo-id (saída 0) passando, 0 achados críticos, 0 não críticos.

## TP-0031 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (cookie duplicado não recusado, RTP-0063); 16 testes + checar-grupo-id exit 0 + sondas de cookie malformado/sem prefixo.

## TP-0042 — QA — 2026-10-17
APROVADA — 10/10 testes da migração do Elenco e checagem aditiva verdes; 0 achados.

## TP-0045 — QA — 2026-10-17
APROVADA — 13 testes verdes em banco próprio e checagem aditiva ok; CHECKs por tipo e ausência de dado pessoal confirmados; 0 achados.

## TP-0160 — QA — 2026-10-17
APROVADA; 13/13 testes e checagem aditiva verdes; 0 críticos, 1 baixo (datas literais no teste, RTP-0062).

## RTP-0062 — QA — 2026-10-17
APROVADA; 13/13 passando, sem literal de data, datas derivadas do relogioFixo; 0 achados.

## RTP-0063 — QA — 2026-10-17
APROVADA; cookie `__Host-sessao` duplicado -> 401 (também em mw-grupo/mw-dono), cookie único segue 200, mutação derruba o teste; 0 achados.

## RTP-0064 — QA — 2026-10-17
APROVADA; 111/111 testes, raiz exit 0 em ~4,4 s, ~50 sondas novas de contorno todas barradas (exit 1), 0 achados.

## RTP-0065 — QA — 2026-10-17
APROVADA; regex sem âncora validada por mutação (4 testes falham com a antiga), nenhum chamador real usa chave que a nova regra recuse; 0 achados.

## RTP-0066 — QA — 2026-10-17
APROVADA; mutação cost 04 falha o caso, export de HASH_FIXO aceitável (constante não secreta, anotada como só-teste); 0 críticos, 0 não críticos.

## TP-0032 — QA — 2026-10-17
APROVADA; 12 testes passam, aceite central coberto; lacuna de teste (troca_de_senha, `/grupos//eco`, mw-dono.test.ts) virou RTP-0069; 0 críticos, 1 não crítico.

## TP-0037 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 5 testes passando (sessões, pedido, auditoria, atomicidade, sem senha em log); assinatura com `agora` e tipo local não divergem do aceite.

## TP-0038 — QA — 2026-10-17
APROVADA; mutações de AdminJaVinculado e nome guardado falham os testes, auditoria admin_vinculado sem asserção (RTP-0068); assinatura com Date/ExecutorDb e erro genérico na corrida aceitos; 0 críticos, 1 não crítico.

## TP-0043 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 7/7 testes de migração e checagem aditiva (10 migrações) verdes.

## TP-0044 — QA — 2026-10-17
APROVADA; 4/4 passando, aditiva ok; 0 críticos, 1 não crítico (RTP-0070: datas literais e 3 casos do plano sem teste).

## TP-0050 — QA — 2026-10-17
APROVADA - 5/5 testes, aceite central (fuso, distintos, 48 h, isolamento) coberto; 0 críticos, 1 não crítico (RTP-0067: ts-expect-error, N+1, fábrica, colunas); PENDENTE (a)-(c) adotado sem Coordenador.

## TP-0161 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; 5/5 testes + checar-grupo-id verdes; desvio (sem dataTexto/comum.ts) segue o padrão dos demais repositórios.

## TP-0188 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 10/10 testes de migração e checagem aditiva verdes, centavos inteiros e isolamento por grupo confirmados.

## RTP-0067 — QA — 2026-10-17
DEVOLVIDA - 1 crítico (os 4 @ts-expect-error são vacuosos: `M` indefinido mascara o erro, tsc passa mesmo com tipo aberto), 0 não críticos; demais testes (12/12, 1 consulta, colunas, isolamento A/B, fábrica) OK.

## RTP-0068 — QA — 2026-10-17
APROVADA — auditoria `admin_vinculado` asserida, mutação falha o caso, 7/7, lint/tsc limpos; 0 achados.

## RTP-0069 — QA — 2026-10-17
APROVADA — 18/18 testes passam, mutação em grupo.ts/dono.ts falha 5 casos incluindo os 3 de troca_de_senha; 0 achados.

## RTP-0070 — QA — 2026-10-17
APROVADA — 4/4 testes passando, zero literal `2026-`, três casos faltantes cobertos; 0 achados.

## TP-0041 — QA — 2026-10-17
APROVADA - checagem 14/14, dono.test 4/4 com Postgres, lint 0, repo real verde; 0 críticos, 1 não crítico (janela fixa de 300 caracteres na checagem de e_dono, RTP-0072).

## TP-0046 — QA — 2026-10-17
APROVADA — 17 testes, checar-grupo-id e tsc ok; 0 críticos, 3 não críticos (temPresencaDesde ausente, teste sem caso de presença, datas literais) -> RTP-0073.

## TP-0047 — QA — 2026-10-17
APROVADA — 7/7 testes da tarefa + 13 do domínio + checar-grupo-id OK; 0 críticos, 1 não crítico (duplica seViolarUnico de comum.ts -> RTP-0071).

## TP-0033 — QA — 2026-10-17
APROVADA — 68/68 testes e tsc OK em banco isolado, aceite cumprido; 0 críticos, 2 não críticos (rota ALL descartada, sem contagem de tabelas) na RTP-0074.

## TP-0048 — QA — 2026-10-17
APROVADA — pesos.test.ts 6/6 com banco real, checar-grupo-id ok, diff conforme convenções; 0 achados.

## TP-0049 — QA — 2026-10-17
APROVADA — 7/7 testes passando (banco próprio), checar-grupo-id limpo, critério de aceite coberto; 0 críticos, 3 não críticos (datas literais, seViolarUnico, fábrica de partidas) em RTP-0075.

## TP-0006 — QA — 2026-10-17
APROVADA — árvore sem marcadores de conflito, gerador código 0, IHDR 192/512/512/180, prévia renderizada (claro, escuro, circle(40%)) sem corte, contraste >= 5,41:1, aprovação do usuário registrada; 0 críticos, 1 não crítico (texto "Aguardando aprovação" desatualizado na prévia).

## RTP-0067 — QA — 2026-10-17
APROVADA (rodada 2) - 0 críticos, 0 não críticos; QA-1 resolvido: `M` declarado, remover as 4 diretivas gera exatamente 4 erros tsc reais (ip, nome, ranking_aberto sem dispositivoId, dispositivoId fora de ranking_aberto); 12/12 testes passando.

## RTP-0073 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; jogadores.test.ts 10/10, grep 2026- = 0, temPresencaDesde com filtro de grupo coberto.

## TP-0034 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0079: teste de log não cobre senha correta/token); sessao-entrar 13/13 e tentativas verdes, bloqueio/401/cookie/escopo conferidos.

## TP-0035 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; sessao-eu 8/8 e isolamento 70/70 verdes, 401/escopo/grupos arquivados/no-store/sem hash conferidos.

## TP-0036 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 74 testes (sair + isolamento) verdes em banco próprio, idempotência, escopo troca_de_senha, CSRF e encerramento só do aparelho confirmados.

## TP-0039 — QA — 2026-10-17
APROVADA — 0 críticos/0 não críticos; 9/9 testes da rota e isolamento 70/70 verdes, respostas idênticas para admin/inexistente/dono, nada gravado para não-admin.

## TP-0040 — QA — 2026-10-17
APROVADA — caso de uso 5 + rota 11 + isolamento 70 testes verdes, eslint 0; 0 achados críticos e 0 não críticos; atomicidade, sessões encerradas e G-08 comprovados.

## TP-0051 — QA — 2026-10-17
APROVADA - seed local idempotente, travado em host local, 6/6 testes + checagens ok; 0 críticos, 1 não crítico (RTP-0080: teste duplicado, falta rollback/trava positiva).

## TP-0052 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; dominio 24 + api 4 testes passando, isolamento por grupo e fronteiras de intervalo semiaberto conferidos.

## TP-0053 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0078: sem asserção automática do limite de 4 consultas); 5 testes verdes, isolamento entre grupos e adaptadores conferidos.

## TP-0055 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; rota e isolamento verdes (8 + 70 testes), tsc/eslint/checagens limpos.

## TP-0059 — QA — 2026-10-17
APROVADA — 77 testes verdes (rota + isolamento); 204/404/401/403, no-store e nova pendência conferidos; 0 críticos, 0 não críticos.

## TP-0060 — QA — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; pedidos-e-senhas 7/7 e isolamento 70/70 verdes, tsc/eslint limpos, 404 do dono idêntico ao de inexistente, senha `no-store` e fora de logs.

## TP-0063 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0081: falta teste de ordem por nome); 75 testes passando (rota, aplicação, isolamento), aceite e segurança conferidos.

## TP-0064 — QA — 2026-10-17
APROVADA — 86 testes verdes (rota + isolamento), aceite RF-13 coberto (201 criado/vinculado, 409, 422, no-store, sem financeiro); 0 achados.

## TP-0065 — QA — 2026-10-17
APROVADA — 20 testes da tarefa + 70 de isolamento verdes; transação com trava, 409s, auditoria e corte de acesso comprovados; 0 achados.

## TP-0066 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; redefinir-senha 6/6 + isolamento 70/70 verdes, ordem de checagens e 404 idêntico confirmados.

## TP-0067 — QA — 2026-10-17
APROVADA - 0 críticos/0 não críticos; 403 só por exigirFinanceiro, auditoria atômica, 409 própria conta, 11 testes + isolamento 70/70 verdes.

## TP-0068 — QA — 2026-10-17
APROVADA — GET /api/grupos/:g/jogadores cumpre o aceite (filtros, nível 1 casa, inativoDesde, ordem, 422/401/404/no-store, isolamento verde); 0 críticos, 0 não críticos.

## TP-0069 — QA — 2026-10-17
APROVADA — 0 críticos, 1 não crítico (RTP-0082: detalhe.test.ts não carrega no projeto node do vitest; passa no workers); rota/isolamento 100% e lógica do detalhe 5/5 verificadas.

## TP-0070 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; criar.test.ts (21) e test/isolamento (70) verdes, aceites de ano máximo, apelido sem caixa e período por data de entrada comprovados.

## RTP-0006 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; vitest indicadores+elenco 28/28 verde, duplicado removido.

## RTP-0007 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; vitest test/atividade 20 verdes, duplicado de src removido e casos exclusivos migrados.

## RTP-0074 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; isolamento 70/70 passando, meta-teste de app.all e conferência de contagem de tabelas verificados.

## RTP-0079 — QA — 2026-10-17
APROVADA — teste cobre senha errada, senha correta, token do cookie e caminho 429; 13/13 passando; 0 achados.

## TP-0054 — QA — 2026-10-17
APROVADA — painel do dono atende o aceite (RF-06/07, contrato estrito, isolamento verde), 80/80 testes; 0 críticos, 1 não crítico (RTP-0089: comparar forma com fixtures e afirmar 403 de troca_de_senha).

## TP-0056 — QA — 2026-10-17
APROVADA — aceite atendido e 75/75 testes passando; 0 críticos, 1 não crítico (RTP-0086: testes do plano ausentes: atomicidade em pesos/habilidades, corrida, 422 strict, 401/403)

## TP-0057 — QA — 2026-10-17
APROVADA — 0 críticos, 0 não críticos com RTP; 80/80 testes (gestao-de-grupos + isolamento), 5 situações/422/404/401/403/no-store/inalterados verificados.

## TP-0058 — QA — 2026-10-17
APROVADA — 87/87 testes (aplicação, rotas, isolamento) passando; aceite RF-03/ADR-005 cumprido; 0 críticos, 0 não críticos, sem RTP.

## TP-0061 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0087: faltam casos do plano em ler.test.ts); 94 testes verdes (rota, utilitários, dono, isolamento).

## TP-0071 — QA — 2026-10-17
APROVADA — 86 testes passando (editar/repo/isolamento), aceite L-11/RN-03/RN-05 verificado, 0 achados.

## TP-0072 — QA — 2026-10-17
APROVADA — 0 críticos, 1 não crítico (RTP-0092: lacunas de teste do plano e datas literais); 100 testes passando, aceite coberto.

## TP-0073 — QA — 2026-10-17
APROVADA — aceite e 91/91 testes passando; 0 críticos, 1 não crítico (falta asserção de acumulado mantido/ativosNaData, RTP-0090).

## TP-0074 — QA — 2026-10-17
APROVADA — 85 testes verdes (aplicação, rota e isolamento), 0 achados críticos / 0 não críticos, aceite e atomicidade/corrida comprovados.

## TP-0075 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 92 testes verdes (aplicação, rota workers e isolamento) cobrindo vigente/histórico, 404 idêntico e no-store.

## TP-0076 — QA — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; 89 testes (aplicação, rotas, isolamento) passando em banco próprio.

## TP-0077 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (teste duplicado -> RTP-0091); 78 testes verdes (rota + isolamento), aceite e limites de navegação conferidos.

## TP-0078 — QA — 2026-10-17
APROVADA — aceite atendido; 76/77 testes (1 falha é da TP-0168, fixture); 0 críticos, 1 não crítico (lacunas de teste, RTP-0088).

## TP-0079 — QA — 2026-10-17
APROVADA — GET partidas/:data cumpre o aceite (presenças, última alteração, união ativos+presenças, 404/401, isolamento); 0 achados; falha em teste de TP-0078 (escalacoes_n_check) fora do escopo.

## TP-0080 — QA — 2026-10-17
APROVADA; 5/5 testes (puros e com banco, inclusive outro grupo e Tx), 0 achados críticos/não críticos, lint/prettier limpos.

## TP-0083 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 77 testes (excluir + isolamento) verdes, cobrindo transação, rollback, auditoria, 404s, 401/403 e isolamento.

## TP-0084 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (cobertura de teste do plano reduzida → RTP-0094); comportamento verificado por teste temporário e 76 testes passando.

## TP-0085 — QA — 2026-10-17
APROVADA — 77 testes verdes (rota + isolamento), aceite (tipos fechados, 413 > 1 KB, sem IP/UA/nome, 204) coberto; 0 críticos, 0 não críticos.

## TP-0086 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 74 testes (uso + isolamento) passando, aceite e formas de uso.json/uso-vazio.json conferidos.

## TP-0094 — QA — 2026-10-17
APROVADA — compose config OK, 3 testes do proxy passando, diff conforme aceite/convenções; `up` ponta a ponta não executado (ambiente compartilhado), limitação registrada; 0 críticos, 0 não críticos.

## TP-0168 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0093: faltam testes inativado-depois e 409 com escalação); nova-e-ler.test.ts verde; falha em confirmar-escalacao.test.ts é de outra tarefa.

## TP-0169 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; ler+editar 19/19 verdes em Postgres próprio, escalação só na data do próximo jogo e isolada por grupo.

## TP-0062 — QA — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; 82 testes (editar + isolamento) passando, tsc/eslint limpos, slug e histórico preservados.

## TP-0108 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; vitest 73/73, build ok (155 precache, sem /api), Playwright 3/3; nome curto "Pelada" pendente de confirmação.

## TP-0155 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; listar 3/3 + isolamento 73/73 verdes, eslint limpo.

## TP-0156 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 87 testes (aplicação, rota, isolamento) passando em banco próprio, 422 idêntico ao mockup, ESLint limpo.

## TP-0157 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; 83 testes (rota, aplicação, isolamento) verdes, notas preservadas e isolamento por grupo comprovados.

## TP-0158 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 79 testes (aplicação+rota+isolamento) passando contra Postgres real.

## TP-0159 — QA — 2026-10-17
APROVADA — 86 testes verdes (unidade, rota, isolamento), lint/prettier/tsc limpos, 0 achados críticos, 0 não críticos.

## TP-0163 — QA — 2026-10-17
APROVADA, 0 achados; 91 testes passando (previa, descricao, rota, isolamento); textos fora do mockup aguardam confirmação do Coordenador.

## TP-0167 — QA — 2026-10-17
APROVADA — 85/85 testes verdes (inclui o caso de inativo corrigido), aceite atendido; 0 críticos, 1 não crítico (idsDaComposicao duplicada em 3 lugares) -> RTP-0097.

## TP-0181 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0096: lacunas de cobertura em pdf.test.ts); 80 testes verdes (pdf, publico, isolamento).

## TP-0162 — QA — 2026-10-17
APROVADA; 0 críticos, 0 novos não críticos; 10/10 testes da tarefa passam no projeto workers; falha no projeto node é a RTP-0082 já aberta.

## RTP-0071 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; habilidades.ts usa seViolarUnico, emUso=0, 7/7 testes no Postgres 55432.

## RTP-0072 — QA — 2026-10-17
APROVADA — checagem usa início da instrução sem janela fixa; 20 testes e checagem real (525 arquivos, exit 0) verdes; 0 achados.

## RTP-0075 — QA — 2026-10-17
APROVADA; 7/7 testes do repositório de partidas passando, sem literais de data, fábrica e seViolarUnico conferidos; 0 achados.

## RTP-0076 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; criar/substituir/excluir exigem Tx, repositorios/partidas 12/12 e tsc limpo (editar.test.ts oscila só por interferência de banco em paralelo).

## RTP-0077 — QA — 2026-10-17
APROVADA — 0 críticos/0 não críticos; vitest 20/20 e checagem real exit 0 (525 arquivos); só criarContaDono é exceção em contas.ts.

## RTP-0078 — QA — 2026-10-17
APROVADA — vitest pontuacao 5/5 passando; asserção de <= 4 consultas via plugin Kysely validada em execução real; 0 achados.

## RTP-0080 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; seed-local 11/11 passando, duplicata removida, rollback e trava positiva cobertos.

## RTP-0081 — QA — 2026-10-17
APROVADA; teste de ordenação por nome passa e cobre o aceite; 0 achados; suíte completa instável só por colisão do e-mail do dono com execuções paralelas no mesmo banco.

## RTP-0083 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; eslint falha ao importar seed-local em backend/api/src e passa em backend/scripts.

## RTP-0084 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; sessao-entrar.test.ts 14/14 com caso de 10 pedidos paralelos (5x401 + 5x429).

## RTP-0085 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0098: teste dos 5 erros estoura timeout de 5 s; 17/17 com --testTimeout=60000); bloqueio por conta e 429 verificados.

## RTP-0086 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; aplicação 9/9 e rotas 5/5 passando em rodada isolada, todos os itens do aceite cobertos; flakiness por `contas_email_unico` do e-mail fixo do dono com suítes paralelas (já em RTP-0008/0069), alheia à tarefa.

## RTP-0087 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0099 helper duplicado); ler.test.ts 7/7 passando (falhas intermitentes só por interferência de banco compartilhado).

## RTP-0088 — QA — 2026-10-17
APROVADA; casos do aceite presentes e linhas.test.ts verde; nova-e-ler só falhou por colisão de e-mail fixo com sessões paralelas (sem falha de asserção); 0 críticos, 0 não críticos.

## RTP-0089 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 3 testes do painel (forma vs mockups e 403 troca_de_senha) passam; falhas intermitentes só por colisão de e-mail no banco compartilhado com RTP paralelas.

## RTP-0090 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; teste "reativar mantém" passa 3/3 isolado (presença mantida, ativosNaData hoje inclui e hoje−1 exclui); falhas do arquivo inteiro são colisão de e-mail do dono no DB compartilhado.

## RTP-0091 — QA — 2026-10-17
APROVADA; duplicado removido, 1 arquivo de teste da rota, 0 achados; vitest instável por colisão de e-mail do dono com outras sessões em paralelo (ambiente).

## RTP-0092 — QA — 2026-10-17
APROVADA; 15/15 testes passando (após interferência de banco compartilhado em runs paralelos); 0 críticos, 0 não críticos.

## RTP-0095 — QA — 2026-10-17
APROVADA — portas 127.0.0.1 nos 3 serviços (compose config verificado), README atualizado; 0 achados; up --wait só validado por leitura.

## TP-0081 — QA — 2026-10-17
TP-0081 APROVADA; 6/6 testes da rota e caso POST do isolamento passam; 0 críticos, 1 não crítico (RTP-0100, lacunas de teste de concorrência/rollback do evento/422).

## TP-0082 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0101: teste de 404 sem consulta ao banco); editar 9/9 e isolamento 70/70 isolado.

## TP-0087 — QA — 2026-10-17
TP-0087 APROVADA com 2 achados não críticos (teste de login não idempotente e lacunas do plano) em RTP-0103; wrangler 10/60 raiz e env.teste ok, 429 antes do banco, IP não gravado.

## TP-0189 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (financeiro.ts 319 linhas -> RTP-0102); 24 testes de repositório + 5 de rota DELETE + checar-grupo-id verdes.

## RTP-0082 — QA — 2026-10-17
APROVADA — 0 críticos, 1 não crítico (RTP-0106: e-mail de dono fixo em montarCenario causa colisão contas_email_unico em paralelo); arquivos carregam e passam isoladamente (5/5 e 6/6).

## RTP-0093 — QA — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; nova-e-ler 13/13 em reexecução (inativado some da lista e 409 cobertos); falhas intermitentes só por contas_email_unico compartilhado.

## RTP-0094 — QA — 2026-10-17
APROVADA — publico-ranking (7) e publico.test (3) passam isolados; falha em rodada conjunta foi interferencia do banco compartilhado; 0 achados.

## TP-0203 — QA — 2026-10-17
APROVADA — aviso-privacidade (204, idempotente, strict, sessão completa) com 76 testes de rota/isolamento verdes; 0 achados.

## RTP-0098 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; `vitest run trocar-senha` sem flags passa (18 testes) com timeout explícito de 30 s no caso dos 5 erros.

## RTP-0099 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; vitest ler 38/38 passando e jogadoresEPartidas reutiliza criarPartida.

## RTP-0104 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0110: `o.e_dono = v` e valor-expressão escapam da heurística); vitest 45/45 e checador na raiz exit 0.

## RTP-0105 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; 18 testes passando, caso de 10 pedidos paralelos -> 5 recusadas + 5 bloqueadas, serialização por advisory lock por conta igual ao entrar.

## RTP-0106 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0111, montarCenario 2x no mesmo teste); elenco+simulador/contexto x3 verdes (40 testes) e isolamento (70) verde, sem contas_email_unico em paralelo.

## TP-0132 — QA — 2026-10-17
APROVADA — 0 críticos, 1 não crítico (branch Neon é `production`, não `main`: deploy.yml/SDD/TP-0133/TP-0135 → RTP-0113); evidência manual do usuário conferida contra o aceite, nenhum segredo no repositório, não reexecutável pelo QA.

## RTP-0096 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; pdf.test.ts 10/10 verde, todos os casos do aceite presentes.

## RTP-0101 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos; editar.test.ts 5/5 passando, 404 de :data inválida com zero chamadas ao db.

## RTP-0103 — QA — 2026-10-17
APROVADA — limite-taxa.test passa 2x seguidas no mesmo banco (10/10), lacunas do plano cobertas; 0 achados críticos, 0 não críticos.

## RTP-0107 — QA — 2026-10-17
APROVADA — maxAgeSeconds 7 dias no cache do ranking, teste novo passa; 0 críticos, 1 não crítico preexistente (ícones vs mockup) aberto como RTP-0116.

## RTP-0109 — QA — 2026-10-17
APROVADA — 0 achados; binding ausente em ambiente https registra "limitador ausente" uma vez sem IP, local silencioso; vitest limite-taxa 10/10.

## RTP-0110 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; vitest 37/37 e checagem na raiz saída 0.

## RTP-0112 — QA — 2026-10-17
APROVADA — vitest 37/37 e checagem na raiz exit 0; `//` e `--` em literal não escondem mais `e_dono`; 0 achados.

## RTP-0115 — QA — 2026-10-17
APROVADA; 0 achados; check-ignore devolve .pnpm-store e .tmp-out.txt (exit 0), nada rastreado.

## RTP-0097 — QA — 2026-10-17
BLOQUEIO por ambiente (pesos/cenário quebra 9 testes de rota do simulador); código correto, uma só definição, contrato 31/31, confirmar-escalacao e partidas verdes; 0 achados.

## TP-0112 — QA — 2026-10-17
APROVADA — 191 testes + 2 e2e offline + visual T01 13/13 verdes; 0 achados; 3 estados manuais conferidos por DOM contra o mockup.

## TP-0138 — QA — 2026-10-17
APROVADA; 7/7 do i1 passam contra o compose real; 0 críticos, 2 não críticos (RTP-0117 faixa "Jogador salvo", RTP-0118 senha temporária no trace); job CI não verificado em PR.

## TP-0196 — QA — 2026-10-17
BLOQUEIO de ambiente: 74 testes de lancamentos/ler+isolamento passam, mas afterAll do isolamento falha por linhas residuais (conta órfã em pelada_teste); 0 achados, rever após limpar o banco.

## RTP-0118 — QA — 2026-10-17
APROVADA; 0 achados; trace/screenshot/video em off no e2e-integracao, verificado por leitura do diff e do ci.yml.

## RTP-0119 — QA — 2026-10-17
APROVADA — compose lê DONO_EMAIL de ids.ts sem literal, `compose config` válido e substituição conferida no sh; 0 achados; `compose up`/i1 não executados (valor idêntico ao anterior).

## RTP-0120 — QA — 2026-10-17
APROVADA — aceite atendido (i--/--i não escondem e_dono), 46 testes passando e checagem na raiz exit 0; 0 achados.

## RTP-0121 — QA — 2026-10-17
APROVADA — 0 achados; 46 testes e a checagem na raiz (527 arquivos) passam, aceite coberto.

## TP-0133 — QA — 2026-10-17
APROVADA — id do Hyperdrive pelada-prod gravado (cache off, host direto), sem segredos no repo; desvios (subdomínio prod-ljs, sem homologação) por decisão do usuário e tratados no BK-0009.

## TP-0134 — QA — 2026-10-17
APROVADA — 7 secrets (6 no repositório, NEON_URL_MIGRACAO_PROD no environment producao com aprovação manual e só main), sem valores no repo; sem teste/NEON_URL_MIGRACAO_TESTE por decisão do usuário (BK-0009).

## RTP-0102 — QA — 2026-10-17
APROVADA — financeiro.ts dividido (35/197/93 linhas), exportações e testes idênticos à base; 0 críticos, 2 não críticos preexistentes (RTP-0123 tsc excluir.test, RTP-0124 pagamentos-marcar:57).

## RTP-0122 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; vitest 53 verdes, checagem real sai 0, sonda confirma bit a bit casa e leituras não.

## TP-0194 — QA — 2026-10-17
BLOQUEIO de ambiente (contas_email_unico em pelada_teste): código e testes conforme o plano na revisão, tsc limpo, 0 achados; reexecutar ler.test.ts com o banco limpo.

## TP-0196 — QA — 2026-10-17
BLOQUEIO de ambiente (rodada 2): pelada_teste com 25 contas residuais derruba os 4 testes por contas_email_unico; 0 achados, reexecutar após limpar o banco.

## TP-0154 — QA — 2026-10-17
DEVOLVIDA — 1 crítico (orçamento de CPU 2 times de 11 falha no p99 em 6/6 rodadas isoladas, mediana 3,3-3,75 ms, p99 4,2-5,3 ms vs 4 ms), 0 não críticos; sugerir.test 7/7, tsc e eslint do domínio limpos.

## TP-0190 — QA — 2026-10-17
BLOQUEIO de ambiente (conta Dono órfã, contas_email_unico): tsc ok e saldo-atual 4/4; mes.test 0/7 executados; diff sem achados (0 críticos, 0 não críticos); reexecutar após limpar o banco.

## TP-0192 — QA — 2026-10-17
APROVADA — 0 críticos/0 não críticos; pagamentos-marcar 8/8 e isolamento 70/70 verdes (falhas iniciais só por concorrência no pelada_teste); 204 em vez de 201 aceito (contrato sem resposta de sucesso, frontend espera 204).

## TP-0193 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; pagamentos-desmarcar 6/6 e isolamento 63/63 verdes, tsc/eslint limpos, rollback da auditoria coberto.

## TP-0191 — QA — 2026-10-17
APROVADA, 0 críticos/0 não críticos, 14/14 testes de config e 70/70 de isolamento passando (falhas intermitentes só por colisão de banco compartilhado entre sessões).

## TP-0154 — QA — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; orçamento 6/6 isoladas e 4/4 sob carga verdes (2x11 mediana 0,47 ms, p99 até 1,72; 6x5 mediana 0,78, p99 até 2,19; limiar 4 ms), 215/215 simulador, tsc/eslint limpos, reescrita equivalente.

## TP-0164 — QA — 2026-10-17
APROVADA — aceite cumprido, 38/38 testes passando; 0 críticos, 1 não crítico (RTP-0126: casos do plano sem teste).

## TP-0190 — QA — 2026-10-17
APROVADA: mes.test 7/7, saldo-atual 4/4 e isolamento 70/70 passam, tsc ok; diff sem achados (0 críticos, 0 não críticos).

## RTP-0097 — QA — 2026-10-17
BLOQUEIO por ambiente (montarCenario sem pesos quebra 9 testes de rota do simulador, reconfirmado na rodada 2); código correto, uma só definição, contrato 31/31, confirmar-escalacao e partidas verdes; 0 achados.

## RTP-0100 — QA — 2026-10-17
APROVADA; 12/12 testes de partidas/escrever passando cobrindo concorrência 201/409, rollback no evento e 422 de corpo; 0 achados.

## RTP-0108 — QA — 2026-10-17
APROVADA; 0 achados; vitest confirmar-escalacao + rota 16/16 com matriz de id repetido -> 422 e nada gravado.

## RTP-0111 — QA — 2026-10-17
APROVADA; 0 críticos/0 não críticos; pagamentos-marcar 8/8 verde 3x seguidas, um cenário por teste.

## RTP-0113 — QA — 2026-10-17
APROVADA; 0 achados; grep/actionlint/yaml ok, pai=production, branch Git main preservado.

## RTP-0116 — QA — 2026-10-17
APROVADA; pwa-config 9/9 verde e 4 PNGs idênticos ao mockup; 0 críticos, 0 não críticos.

## RTP-0123 — QA — 2026-10-17
APROVADA — tsc backend/api limpo e excluir.test.ts 5/5; diff de 1 linha ao tipo boolean, 0 achados.

## RTP-0124 — QA — 2026-10-17
APROVADA — pagamentos-marcar 8/8 verde, causa era o default do helper do teste; 0 achados.

## RTP-0125 — QA — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; teste de concorrência 2/2 em 3 execuções e lock advisory dentro de emTransacao confirmado.

## TP-0194 — QA — 2026-10-17
APROVADA: 11/11 testes verdes com banco limpo, tsc limpo, aceite (com/sem permissão, sem config, isolamento) coberto; 0 achados.

## TP-0195 — QA — 2026-10-17
APROVADA — 90/90 testes (rota, caso de uso, isolamento) e tsc ok; critério de aceite e auditoria sem descrição verificados; 0 achados.

## TP-0196 — QA — 2026-10-17
APROVADA (rodada 3): 74 testes de lancamentos/ler+isolamento verdes, tsc e biome limpos; 0 achados.

## TP-0197 — QA — 2026-10-17
APROVADA — 84/84 testes (aplicação, rota, isolamento) passando; 0 críticos, 0 não críticos; vínculo da mensalidade, 422 de tipo e auditoria atômica confirmados.

## TP-0198 — QA — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0127: mensagem do 409 sem apelido/mês); vitest lancamentos/excluir 9/9, isolamento 70/70, tsc/eslint limpos.

## RTP-0097 — QA — 2026-10-18
APROVADA na rodada 3; api 133/133 e contrato 31/31 verdes (incl. 422 de avaliar via rota), uma só definição de idsDaComposicao no contrato; 0 achados.

## RTP-0126 — QA — 2026-10-18
APROVADA; 8/8 testes e lint ok, quatro casos do plano cobertos; 0 críticos, 1 não crítico (RTP-0129: espião de consultas duplicado em 5 testes).

## RTP-0127 — QA — 2026-10-18
DEVOLVIDA - rota e aceite OK (4/4), mas 2 testes de aplicacao/lancamentos/excluir.test.ts quebraram (campo mensagem não esperado); 1 crítico, 0 não críticos.

## TP-0165 — QA — 2026-10-18
APROVADA — 85 testes passando (rota, adaptador, isolamento), lint/tsc/prettier limpos, determinismo, formas do contrato, 422/403/401/404 e log sem dado pessoal verificados; 0 achados.

## TP-0166 — QA — 2026-10-18
APROVADA; 0 críticos, 1 não crítico (RTP-0128: casos do plano de teste faltando); 137 testes simulador+isolamento passando.

## RTP-0127 — QA — 2026-10-18
APROVADA (rodada 2) - 88/88 testes de financeiro, tsc/eslint limpos, aceite do 409 com apelido e mês atendido; 0 críticos, 0 não críticos.

## RTP-0128 — QA — 2026-10-18
APROVADA; 0 críticos, 0 não críticos; vitest simulador-avaliar 14/14 e todos os casos (a)-(f) do plano cobertos.

## RTP-0129 — QA — 2026-10-18
APROVADA; 0 críticos/0 não críticos; 5 testes usam contarConsultas, nenhum espião pg copiado restante, vitest repositórios+pontuacao 112/112 verde.

## RTP-0130 — QA — 2026-10-18
APROVADA — alinhamento do recorte a pixel inteiro é correção legítima da medição (T16 sem-habilidades 4,60%/5,98% -> 0,00%), demais telas com recorte inalteradas e controles positivos (4 px, texto) ainda detectados; 0 críticos, 0 não críticos.

## RTP-0131 — QA — 2026-10-19
APROVADA; 0 críticos, 0 não críticos; sem `<form>` à mão fora de Formulario.tsx, `.formulario`/`.duasColunas` únicos, saude.py sem blocos Formulario*, visual 36/36 OK (máx. 0,65%), typecheck/eslint/stylelint ok, 316 testes passando.

## RTP-0132 — QA — 2026-10-19
APROVADA; 0 críticos/0 não críticos; ResultadoDois 144 linhas, saude.py sem blocos, typecheck/eslint/stylelint ok, vitest 45/45 sem asserção alterada; e2e T13/T14 não reexecutado (porta compartilhada).

## RTP-0133 — QA — 2026-10-19
APROVADA — hook único `useMesDaUrl` usado pelas 3 páginas, saude.py sem o bloco, tsc/eslint 0 e vitest 46/46; 0 achados.

## RTP-0134 — QA — 2026-10-19
APROVADA; 0 críticos/0 não críticos; 73 arquivos com print-config idêntico, checar-grupo-id com saída idêntica e mesmo tempo (~1,6 s) antes/depois, lint exit 0, saude §1 sem arquivos acima do limite.

## TP-0136 — QA — 2026-10-19
APROVADA — 0 críticos, 1 não crítico (RTP-0135: stderr do psql ecoa o host no log); script testado local com age/Postgres (cifra, decifra, chave errada, URL inválida, chave vazia), shellcheck e actionlint 0; run real no GitHub pendente do usuário.

## RTP-0136 — QA — 2026-10-19
APROVADA; 0 críticos, 0 não críticos; shellcheck/actionlint 0, dump cifrado só com age1… decifra e lista contas/grupos/partidas, valor AGE-SECRET-KEY-1…/vazio falha antes de conectar sem imprimir o valor.

## RTP-0135 — QA — 2026-10-19
APROVADA; 0 críticos, 0 não críticos; 4 URLs inválidas, falha do pg_dump (pipefail) e caminho feliz com age/pg_restore comprovados, grep de host/credenciais = 0, trap e SAIDA parcial limpos, shellcheck e actionlint em 0.

## TP-0135 — QA — 2026-10-19
DEVOLVIDA — 1 crítico (`pnpm exec wrangler` na raiz não acha o binário, que só existe em @pelada/api: passos hyperdrive/deploy/rollback não executam) e 3 não críticos (parser jsonc duplicado, `${{ }}` em run:, build após migração); Vitest 13/13, checagem rc=0, actionlint limpo; execução real em producao pendente do usuário.

## TP-0135 — QA — 2026-10-19
APROVADA (rodada 2) — C1 resolvido (wrangler via `pnpm --filter @pelada/api exec`, `-c ../../wrangler.jsonc` provado por `deploy --dry-run`), Vitest 16/16, checagem rc=0, actionlint limpo; pipe do `hyperdrive get` seguro no CI (Node 22) mas frágil a avisos do pnpm no stdout -> RTP-0139 (não crítico); RTP-0137/0138 seguem abertas; execução real em producao pendente do usuário.

## TP-0137 — QA — 2026-10-19
APROVADA, 0 críticos e 2 não críticos corrigidos na via rápida (flag `--origin-database` inexistente no `hyperdrive update`; aviso de senha/histórico no SQL do dono); ensaio local independente com 20 tabelas e contagens iguais, SQL do dono OK (bcrypt custo 12); ensaio com dump real de produção pendente do usuário.

## RTP-0137 — QA — 2026-10-19
APROVADA — parser único (wrangler-jsonc.ts) usado por teste e deploy.yml, falha fechado verificado, vitest 4+11, tsc/eslint/actionlint em 0; 0 críticos, 1 não crítico (id do hyperdrive sem pnpm --silent, ABRIR-RTP).

## RTP-0138 — QA — 2026-10-19
APROVADA — 0 críticos, 0 não críticos; sem `${{ }}` em run:, build do web único e antes de Neon/dump/migração (assets em frontend/web/dist intactos até o deploy), VITE inválida falha no build (rc=1) e válida passa, actionlint e checar-wrangler-deploy rc=0.

## RTP-0139 — QA — 2026-10-19
APROVADA — `--silent` correto (stdout só JSON mesmo com ruído do pnpm, falha do wrangler continua fechada, checar-wrangler 19 testes e actionlint em 0); 0 críticos, 1 não crítico fora do diff (ABRIR-RTP: `hyperdrive get --json` rejeitado pelo wrangler 4.151.0).

## RTP-0140 — QA — 2026-10-19
RTP-0140 APROVADA: regex tolera flags antes do subcomando, sem falso positivo nem ReDoS (<1 ms com 5000 repetições), repo rc=0, árvore com `wrangler -c x deploy` rc=1, Vitest 19/19, eslint ok; 0 achados.

## RTP-0141 — QA — 2026-10-19
APROVADA - checkout do deploy.yml com persist-credentials:false, sem git autenticado no job/actions/scripts, actionlint rc=0 e checar-wrangler-deploy rc=0; 0 críticos, 0 não críticos; ABRIR-RTP baixa: mesmo ajuste em backup.yml (tem segredos de produção) e, opcional, ci.yml.

## RTP-0142 — QA — 2026-10-19
APROVADA — 4/4 itens do aceite provados (gitignore via check-ignore, mitigação de histórico/ps, aviso --clean, 301 host fixo), TP-0137 sem regressão, prettier e checar-ids ok; 0 críticos, 3 baixos (caminho relativo do contar-linhas.sql após cd, chmod sem touch, comandos bash sem equivalente PowerShell) agrupados em 1 ABRIR-RTP.

## RTP-0143 — QA — 2026-10-19
APROVADA, 0 críticos e 2 não críticos (import.meta.main fail-open em Node < 22.18, provado com 22.12 rc=0; permissão Hyperdrive: Read sem documentação); 11 entradas do script, pipeline com curl falho/403/inalcançável rc=1 sem vazar token, 18/18 vitest, tsc/eslint/prettier/actionlint/checar-wrangler-deploy 0, `--json` = 0.

## RTP-0144 — QA — 2026-10-19
APROVADA, 0 críticos/0 não críticos; 5 checkouts (backup 1, ci 4) com persist-credentials false, nenhum passo usa git autenticado, actionlint rc=0, checar-wrangler-deploy rc=0.

## RTP-0145 — QA — 2026-10-19
APROVADA — 3 itens do aceite e regressão TP-0137/RTP-0142 OK, bash e PowerShell 5.1 executados de verdade (ACL só do usuário, SecureString sem eco), prettier e checar-ids rc=0; 0 críticos, 2 baixos (comando icacls quebrado em 2 linhas; falta equivalente do ~/.pgpass), 1 ABRIR-RTP.

## RTP-0146 — QA — 2026-10-19
APROVADA — 0 críticos / 0 não críticos; 12 ids inválidos rc=1 com stdout vazio, id real passa, regex ancorada (`\n` final rejeitado), vitest 32/32 + wrangler.test.ts 11/11, tsc/eslint 0.

## RTP-0147 — QA — 2026-10-19
RTP-0147 APROVADA: pages/triggers deploy, publish, flag entre aspas e wrangler-action falham rc=1 fora do deploy.yml; versions upload/deployments list/dev/rollback passam; raiz rc=0; ReDoS 0,135 s; Vitest 33/33; 0 críticos, 1 informativo (action com `command: whoami` também bloqueia).

## RTP-0148 — QA — 2026-10-19
APROVADA - 0 críticos, 1 não crítico (aceite 5 só falha o teste sob Node < 22.18; ABRIR-RTP de teste estático); fail-closed provado em Node 24 e 22.12 (11 entradas, só válido rc 0), sem --executar rc 1, CLI renomeada rc 1, curl falho para o passo; vitest 28, tsc/eslint/prettier/actionlint/wrangler/ids rc 0.

## RTP-0149 — QA — 2026-10-19
APROVADA, 0 críticos e 0 não críticos; prettier e checar-ids-tarefa em 0, icacls de uma linha executado com exit 0, pgpass.conf citado com formato sem segredo.

## RTP-0150 — QA — 2026-10-19
APROVADA; 0 críticos, 1 não crítico (RTP-0154: checar-urls-absolutas G-18 reprova a URL padrão no .sh); token hostil rc 1 sem arquivo nem requisição, actionlint e shellcheck rc 0, 3 testes passando.

## RTP-0151 — QA — 2026-10-19
APROVADA; 0 críticos, 0 não críticos; prettier e checar-ids em 0, limpeza PowerShell confirmada (variável e Env:URL deixam de existir).

## RTP-0152 — QA — 2026-10-19
APROVADA; 0 críticos, 1 não crítico (RTP-0155, prettier em arquivos.mjs); 51 testes passando, raiz rc 0, aceite e risco residual conferidos.

## RTP-0153 — QA — 2026-10-19
APROVADA — 0 críticos, 0 não críticos; mutação Node 24 (3 variantes) derruba o teste e revertida deixa 33 passando; tsc/eslint/prettier em 0.

## RTP-0154 — QA — 2026-10-19
APROVADA - 0 críticos, 2 não críticos (doc de CLOUDFLARE_API_BASE corrigida na via rápida; docker-compose.yml:47 virou RTP-0158); vitest 4/4, shellcheck e actionlint rc 0, checagem G-18 intacta.

## RTP-0155 — QA — 2026-10-19
APROVADA — só formatação do filter em arquivos.mjs; prettier rc 0, vitest 58/58, checagem na raiz rc 0; 0 achados.

## RTP-0156 — QA — 2026-10-19
APROVADA; prettier e checar-ids-tarefa em 0; passo 6 de DEPLOY.md cobre EFS só Pro+/Device Encryption no Home/VHD sem cifra no Home; 0 críticos, 0 não críticos.

## RTP-0157 — QA — 2026-10-19
APROVADA — 58/58 vitest, raiz rc 0, 6 casos de caixa mista rc 1 e Deploy.yml rc 1, deploy.yml exato rc 0, sem ReDoS, prettier ok; 0 críticos, 0 não críticos.

## RTP-0158 — QA — 2026-10-19
APROVADA — checar-urls-absolutas rc 0, `up --wait` e wrangler OK com banco limpo (projeto qa0158), i1 7/7 verde; falha de seed no volume do usuário é de estado, não da tarefa; 0 críticos, 0 não críticos.

## RTP-0159 — QA — 2026-10-19
APROVADA - 7/7 mutações sob Node 24 falham o teste, CLI sem diff, vitest 34/34, tsc/eslint/prettier 0; 0 achados.

## RTP-0160 — QA — 2026-10-19
APROVADA; 0 críticos, 0 não críticos; 13 bases hostis rc 1 sem curl nem eco, válida passa, vitest 17/17, shellcheck/actionlint/prettier/urls rc 0.

## RTP-0161 — QA — 2026-10-19
APROVADA - passo 6 do DEPLOY.md exige swap desligado (`swapoff -a`) ou cifrado para tmpfs e cita a guarda da chave de recuperação do Device Encryption; prettier e checar-ids em 0; RTP-0160 preservada; 0 achados.

## RTP-0162 — QA — 2026-10-19
APROVADA — 0 críticos, 0 não críticos; paridade com os node -e antigos confirmada em 16 cenários próprios (única diferença: branch sem name agora falha fechado), pipe/pipefail sem DELETE com lista vazia ou erro, install ocorre antes do passo; vitest 48, tsc, eslint, prettier, actionlint e checar-* em 0.

## TP-0139 — QA — 2026-10-19
DEVOLVIDA — 2 críticos (build de produção sem VITE_RECURSOS_DESLIGADOS: recursos desligados aparecem; itens 2-6 só declarados, campos de evidência em branco) e 2 não críticos (docs desatualizados → RTP-0163; reativação da TP-0139 sem `--desfazer`); run 39342078062 verde, saúde 200 e cabeçalhos OK.

## TP-0139 — QA — 2026-10-19
APROVADA — 0 críticos; F1 fechado por decisão, F2 risco aceito por escrito (RNF-03/RNF-07 sem prova; itens 2-6 só declarados); run 39342078062 verde, /api/saude 200; RTP-0163 (docs) e RTP-0164 (variável no aceite/deploy.yml), F4 reativação sem registro explícito.

## RTP-0014 — QA — 2026-10-19
CI da main verde (run 39355743642) com a prova do cenário 2 e do cache; sem achados.

## RTP-0017 — QA — 2026-10-19
e2e verde em PR real (run 39265054416) e teste de dist/ ausente passando (7/7); sem achados.

## TP-0177 — QA — 2026-10-19
APROVADA; 5/5 e2e do I2 passando no compose real (37 s); 0 críticos, 1 não crítico (RTP-0165: troca do ajuste não provada no corpo de escalacoes).

## TP-0205 — QA — 2026-10-20
APROVADA; 0 críticos, 2 não críticos (N1 coordenação: e2e só passa com o TP-0208 pendente no HEAD; N2 RTP-0166 2º DELETE não coberto); evidência: i1+i2+i4 19/19 contra o compose real, eslint/tsc/prettier limpos.

## RTP-0163 — QA — 2026-10-20
APROVADA; 0 achados; docs fiéis ao deploy.yml (workflow_dispatch, environment producao) e ao DEPLOY.md, ADR-020 com a barreira; falhas de seed-local (banco desligado) e banco.test.mjs (timeouts, também isolado) preexistentes.

## RTP-0164 — QA — 2026-10-20
APROVADA — 0 críticos, 0 não críticos; grep sem `VITE_RECURSOS_DESLIGADOS` em deploy.yml/DEPLOY.md/workflows, build do web sem a variável EXIT=0, recursos.ts (vazio = tudo ligado) garante comportamento inalterado; lógica opcional mantida, sem RTP.

## RTP-0165 — QA — 2026-10-20
APROVADA; 0 críticos, 0 não críticos; i2 5/5 contra compose real, troca provada via postDataJSON (nomeA no Time B, parceiro no A), eslint/prettier/tsc ok.

## RTP-0166 — QA — 2026-10-20
APROVADA; 0 críticos, 0 não críticos; i4 7/7 contra compose real, 2º DELETE = 404 (contrato TP-0193), saldo 35000 e sem mensalidade, eslint/prettier/tsc ok.

## TP-0208 — QA — 2026-10-20
APROVADA; 0 críticos, 1 não crítico (RTP-0167: PATCH sem pontuacaoInicial zera o valor, baixa); contrato 411, domínio 389, API 994 (+11 pulados), script 101, web 1047 passando; migração aditiva, checagens verdes, T16/T18 8 comparações OK (máx. 0,38%), nenhum dado real no diff.

## RTP-0167 — QA — 2026-10-20
APROVADA; 0 críticos, 0 não críticos; contrato 412, rota editar 9, tsc/eslint ok, snapshot novo coerente e demais intactos.

## RTP-0168 — QA — 2026-10-20
APROVADA - --correcoes (chuva/presencas) atende ao aceite; 125 testes, tsc, eslint, prettier e checar-ids verdes; 0 críticos, 0 não críticos.

## RTP-0173 — QA — 2026-10-20
APROVADA — aceite (1 a 7) validado, 129 testes + tsc/eslint/prettier OK, cálculo real 0 divergências; 0 críticos, 0 não críticos.

## RTP-0169 — QA — 2026-10-20
APROVADA, 0 críticos/0 não críticos; SDD §2 e G-01 batem com ZONAS e imports reais, lint exit 0, prettier limpo nos 2 arquivos.

## RTP-0170 — QA — 2026-10-20
APROVADA; 0 críticos, 0 não críticos; vitest app.test 17/17 (4 novos 200/401/404/500), tsc/eslint/prettier limpos; DAST não executado (fica para o /deploy).

## RTP-0171 — QA — 2026-10-20
APROVADA — SHAs conferidos com as tags via gh api, semgrep sem mutable-action-tag, install ok; 0 críticos, 1 não crítico (RTP-0176: minimumReleaseAge 1440 em vez de 10080, prazo 2026-10-29).

## RTP-0172 — QA — 2026-10-20
APROVADA; 0 críticos, 0 não críticos; git check-ignore casa as entradas e os brutos da auditoria, os versionados seguem rastreados e nenhum dado pessoal está no git.

## RTP-0174 — QA — 2026-10-20
APROVADA, 0 críticos e 0 não críticos; UX-SPEC (F4, D4, P01, T01/P01) bate com entregar.test.ts e exportar-pdf.test.tsx, sem resíduo de "compartilha no mesmo toque" e prettier limpo.

## RTP-0175 — QA — 2026-10-20
APROVADA, 0 críticos/0 não críticos; vitest pdf+ranking 71 ok, typecheck e prettier/eslint dos 3 arquivos ok, só comentários e títulos.

## RTP-0177 — QA — 2026-10-20
APROVADA; 0 críticos, 0 não críticos; prettier limpo, 3 chaves do pnpm e nosniff em /api/* conferidos, nenhum uses: sem SHA, G-24 aponta o script da RTP-0178.

## RTP-0178 — QA — 2026-10-20
APROVADA — 0 críticos, 0 não críticos; 20 testes verdes, script sai 0 no repositório e sai 1 com arquivo:linha em cópia adulterada (tag v4 e chave do pnpm removida); lint/prettier/tsc limpos.
