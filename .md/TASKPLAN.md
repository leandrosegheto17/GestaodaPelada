# TASKPLAN — ordem de execução e estado das tarefas

Gerado por `/organizar` (`python .claude/scripts/taskplan.py gerar`) e mantido pelo `/executar`,
que troca o estado da linha a cada etapa. O Status oficial continua no `TASK.md` (bloqueios `BK-`: no
arquivo do bloqueio); o detalhe de cada tarefa está em `.md/.taskplan/<ID>.md`. A ordem respeita as
dependências. Agente: `executor` (TP/RTP) ou `coordenador` (BK/SPK, com o usuário).

Atualizado: 2026-10-17 12:07

Resumo: Não executada 101 · Em execução 1 · Executada (aguarda teste) 1 · Testada (aguarda segurança) 9 · Aprovada 174 · Bloqueada 4 · total 290

Estados: Não executada → Em execução → Executada (aguarda teste) → Em teste → Testada (aguarda segurança) → Em validação de segurança → Aprovada (e, à parte, Bloqueada, Dividida e Despriorizada — esta fica sempre no fim da lista e é ignorada por /executar, /testar e /validar). `Aprovada` = QA ✔ e Sec ✔ (tarefas antigas só `Concluída` aparecem como Aprovada).

| # | Tarefa | Agente | Plano | Título | Lote | Dep | Estado |
|---|---|---|---|---|---|---|---|
| 1 | TP-0001 | executor | ✔ | Monorepo pnpm com os 4 pacotes, TypeScript estrito, ESLint, Prettier, Vitest, READMEs e... | L01 | — | Aprovada |
| 2 | TP-0002 | executor | ✔ | Lint de fronteiras e checagens de código (IDs de tarefa, URLs absolutas) | L01 | TP-0001 | Aprovada |
| 3 | TP-0003 | executor | ✔ | CI base (ci.yml) | L01 | TP-0001, TP-0002 | Aprovada |
| 4 | TP-0004 | executor | ✔ | Auto-hospedar as fontes do mockup (pendência da UX-SPEC §0) | L01 | — | Aprovada |
| 5 | TP-0005 | executor | ✔ | Contrato base: erro padrão, enums, limites e tipos primitivos | L01 | TP-0001 | Aprovada |
| 6 | TP-0006 | executor | ✔ | Ícone do app no mockup (lacuna L-3), para aprovação do usuário | L01 | — | Executada (aguarda teste) |
| 7 | TP-0007 | executor | ✔ | dominio/datas: mês, navegação de mês e dias de jogo sugeridos | L02 | TP-0001 | Aprovada |
| 8 | TP-0008 | executor | ✔ | dominio/pontuacao: pontos de uma presença e acumulado | L02 | TP-0007 | Aprovada |
| 9 | TP-0009 | executor | ✔ | dominio/atividade: ativo numa data, falta e "–" | L02 | TP-0007 | Aprovada |
| 10 | TP-0010 | executor | ✔ | dominio/ranking: ordem, PTS INICIAL, rodadas, PTS FINAL e limites de mês | L02 | TP-0007, TP-0008, TP-0009 | Aprovada |
| 11 | TP-0011 | executor | ✔ | dominio/nivel: nível (RN-11) e idade (RN-12) | L02 | TP-0001 | Aprovada |
| 12 | TP-0012 | executor | ✔ | dominio/slug: link legível do grupo | L02 | TP-0001 | Aprovada |
| 13 | TP-0013 | executor | ✔ | Esqueleto da API Hono, configuração, relógio de São Paulo e wrangler.jsonc | L03 | TP-0001, TP-0005 | Aprovada |
| 14 | TP-0015 | executor | ✔ | Runner de migrações migrar.ts com trava de host | L03 | TP-0001 | Aprovada |
| 15 | TP-0014 | executor | ✔ | Módulo de dados: cliente por requisição, Kysely interno e emTransacao | L03 | TP-0013, TP-0015 | Aprovada |
| 16 | TP-0016 | executor | ✔ | Guardas do banco no CI: migração aditiva e grupoId nos repositórios | L03 | TP-0003, TP-0015 | Aprovada |
| 17 | BK-0001 | coordenador | ✔ | Projeto workers do Vitest (vitest-pool-workers 0.23.0 / workerd 1.20260815.1) recusa compa | — | — | Aprovada |
| 18 | TP-0017 | executor | ✔ | Suporte de testes da API (pool de Workers + Postgres) e job api no CI | L03 | BK-0001, TP-0003, TP-0013, TP-0014, TP-0015 | Aprovada |
| 19 | TP-0018 | executor | ✔ | Snapshot e checagem de compatibilidade do contrato | L04 | TP-0003, TP-0005 | Aprovada |
| 20 | TP-0019 | executor | ✔ | contrato/sessao | L04 | TP-0005, TP-0018 | Aprovada |
| 21 | TP-0020 | executor | ✔ | contrato/publico (ranking e eventos), estrito | L04 | TP-0005, TP-0018 | Aprovada |
| 22 | TP-0021 | executor | ✔ | contrato/grupo e contrato/admins | L04 | TP-0005, TP-0018 | Aprovada |
| 23 | TP-0022 | executor | ✔ | contrato/dono | L04 | TP-0005, TP-0018, TP-0021 | Aprovada |
| 24 | TP-0023 | executor | ✔ | contrato/elenco (jogadores) | L05 | TP-0005, TP-0018 | Aprovada |
| 25 | TP-0024 | executor | ✔ | contrato/partidas, contrato/pesos e contrato/uso | L05 | TP-0005, TP-0018 | Aprovada |
| 26 | TP-0025 | executor | ✔ | Migração do contexto Acesso (contas, sessões, tentativas, pedidos de reset, auditoria) | L06 | TP-0015, TP-0016 | Aprovada |
| 27 | TP-0026 | executor | ✔ | Migração do contexto Grupos (grupos, vínculos de admin) | L06 | TP-0015, TP-0016, TP-0025 | Aprovada |
| 28 | TP-0027 | executor | ✔ | Repositório de contas (hash no Postgres) e infraestrutura/seguranca | L06 | TP-0014, TP-0016, TP-0017, TP-0025 | Aprovada |
| 29 | TP-0028 | executor | ✔ | Repositórios de sessões e de tentativas de login | L06 | TP-0014, TP-0016, TP-0017, TP-0025 | Aprovada |
| 30 | TP-0029 | executor | ✔ | Repositórios de grupos e de vínculos | L06 | TP-0014, TP-0016, TP-0017, TP-0026 | Aprovada |
| 31 | TP-0030 | executor | ✔ | Repositórios de pedidos de reset e de auditoria | L06 | TP-0014, TP-0016, TP-0017, TP-0025, TP-0026 | Aprovada |
| 32 | TP-0031 | executor | ✔ | Middleware de sessão e cookie __Host-sessao | L07 | TP-0013, TP-0027, TP-0028 | Aprovada |
| 33 | TP-0032 | executor | ✔ | Middlewares de grupo (vínculo, financeiro) e de dono | L07 | TP-0029, TP-0031 | Aprovada |
| 34 | TP-0033 | executor | ✔ | Suíte de isolamento entre grupos (C11) | L07 | TP-0017, TP-0031, TP-0032 | Testada (aguarda segurança) |
| 35 | TP-0034 | executor | ✔ | Endpoint POST /api/sessao/entrar | L07 | TP-0019, TP-0027, TP-0028, TP-0031, TP-0033 | Não executada |
| 36 | TP-0035 | executor | ✔ | Endpoint GET /api/sessao/eu | L07 | TP-0013, TP-0019, TP-0029, TP-0031, TP-0033 | Não executada |
| 37 | TP-0036 | executor | ✔ | Endpoint POST /api/sessao/sair | L07 | TP-0028, TP-0031, TP-0033 | Não executada |
| 38 | TP-0037 | executor | ✔ | Extração aplicacao/acesso/senhas (redefinir senha) | L08 | TP-0014, TP-0027, TP-0028, TP-0030 | Aprovada |
| 39 | TP-0038 | executor | ✔ | Extração aplicacao/acesso/admin-por-email (criar conta ou vincular) | L08 | TP-0027, TP-0029, TP-0030 | Aprovada |
| 40 | TP-0039 | executor | ✔ | Endpoint POST /api/sessao/esqueci-senha | L08 | TP-0019, TP-0027, TP-0030, TP-0033 | Não executada |
| 41 | TP-0040 | executor | ✔ | Endpoint POST /api/sessao/trocar-senha | L08 | TP-0019, TP-0027, TP-0028, TP-0030, TP-0031, TP-0033 | Não executada |
| 42 | TP-0041 | executor | ✔ | Script backend/scripts/dono.ts (criar e redefinir-senha) | L08 | TP-0027, TP-0030, TP-0037 | Testada (aguarda segurança) |
| 43 | TP-0042 | executor | ✔ | Migração do Elenco (jogadores, períodos de atividade) | L09 | TP-0015, TP-0016, TP-0026 | Aprovada |
| 44 | TP-0043 | executor | ✔ | Migração de habilidades e notas | L09 | TP-0015, TP-0016, TP-0042 | Aprovada |
| 45 | TP-0044 | executor | ✔ | Migração de pesos, partidas e presenças | L09 | TP-0015, TP-0016, TP-0042 | Aprovada |
| 46 | TP-0045 | executor | ✔ | Migração de eventos de uso | L09 | TP-0015, TP-0016, TP-0026 | Aprovada |
| 47 | TP-0046 | executor | ✔ | Repositório de jogadores e períodos | L10 | TP-0014, TP-0016, TP-0017, TP-0042, TP-0043, TP-0044 | Testada (aguarda segurança) |
| 48 | RTP-0073 | executor | ✔ | Jogadores: temPresencaDesde e testes de presença/relógio | L10 | TP-0046 | Não executada |
| 49 | TP-0047 | executor | ✔ | Repositório de habilidades e notas | L10 | TP-0014, TP-0016, TP-0017, TP-0043 | Testada (aguarda segurança) |
| 50 | TP-0048 | executor | ✔ | Repositório de pesos | L10 | TP-0014, TP-0016, TP-0017, TP-0044 | Testada (aguarda segurança) |
| 51 | TP-0049 | executor | ✔ | Repositório de partidas e presenças | L10 | TP-0014, TP-0016, TP-0017, TP-0044 | Testada (aguarda segurança) |
| 52 | TP-0050 | executor | ✔ | Repositório de eventos de uso | L10 | TP-0014, TP-0016, TP-0017, TP-0045 | Aprovada |
| 53 | TP-0051 | executor | ✔ | Script seed-local.ts com os dados do mockup | L10 | TP-0027, TP-0029, TP-0046, TP-0047, TP-0048, TP-0049 | Não executada |
| 54 | TP-0052 | executor | ✔ | Extração aplicacao/elenco/ativos (ativos numa data e no mês) | L11 | TP-0009, TP-0046 | Não executada |
| 55 | TP-0053 | executor | ✔ | Extração aplicacao/pontuacao/historico (histórico do grupo para o domínio) | L11 | TP-0010, TP-0046, TP-0048, TP-0049 | Não executada |
| 56 | TP-0055 | executor | ✔ | Endpoint GET /api/dono/grupos/:id | L11 | TP-0013, TP-0022, TP-0029, TP-0032, TP-0033 | Não executada |
| 57 | TP-0054 | executor | ✔ | Endpoint GET /api/dono/painel | L11 | TP-0022, TP-0029, TP-0030, TP-0032, TP-0033, TP-0055 | Não executada |
| 58 | TP-0056 | executor | ✔ | Endpoint POST /api/dono/grupos (criar grupo e 1º admin) | L11 | TP-0012, TP-0014, TP-0022, TP-0029, TP-0030, TP-0032, TP-0033, TP-0038, TP-0047, TP-0048, TP-0055 | Não executada |
| 59 | TP-0057 | executor | ✔ | Endpoint PATCH /api/dono/grupos/:id/situacao | L12 | TP-0022, TP-0029, TP-0032, TP-0033, TP-0055 | Não executada |
| 60 | TP-0058 | executor | ✔ | Endpoints POST /api/dono/grupos/:id/arquivar e /reativar | L12 | TP-0022, TP-0029, TP-0030, TP-0032, TP-0033, TP-0055 | Não executada |
| 61 | TP-0059 | executor | ✔ | Endpoint POST /api/dono/pedidos-reset/:id/resolver | L12 | TP-0022, TP-0030, TP-0032, TP-0033 | Não executada |
| 62 | TP-0060 | executor | ✔ | Endpoint POST /api/dono/contas/:id/redefinir-senha | L12 | TP-0022, TP-0032, TP-0033, TP-0037 | Não executada |
| 63 | TP-0061 | executor | ✔ | Endpoint GET /api/grupos/:g (grupo, permissões e resumo do início) | L13 | TP-0007, TP-0013, TP-0021, TP-0029, TP-0032, TP-0033, TP-0047, TP-0048, TP-0049, TP-0050, TP-0052 | Não executada |
| 64 | TP-0062 | executor | ✔ | Endpoint PATCH /api/grupos/:g | L13 | TP-0021, TP-0029, TP-0032, TP-0033, TP-0061 | Não executada |
| 65 | TP-0063 | executor | ✔ | Endpoint GET /api/grupos/:g/admins | L14 | TP-0021, TP-0029, TP-0032, TP-0033 | Não executada |
| 66 | TP-0064 | executor | ✔ | Endpoint POST /api/grupos/:g/admins | L14 | TP-0021, TP-0032, TP-0033, TP-0038 | Não executada |
| 67 | TP-0065 | executor | ✔ | Endpoint DELETE /api/grupos/:g/admins/:contaId | L14 | TP-0014, TP-0021, TP-0029, TP-0030, TP-0032, TP-0033 | Não executada |
| 68 | TP-0066 | executor | ✔ | Endpoint POST /api/grupos/:g/admins/:contaId/redefinir-senha | L14 | TP-0021, TP-0032, TP-0033, TP-0037 | Não executada |
| 69 | TP-0067 | executor | ✔ | Endpoint PATCH /api/grupos/:g/admins/:contaId/financeiro | L14 | TP-0021, TP-0029, TP-0030, TP-0032, TP-0033 | Não executada |
| 70 | TP-0068 | executor | ✔ | Endpoint GET /api/grupos/:g/jogadores | L15 | TP-0009, TP-0011, TP-0013, TP-0023, TP-0032, TP-0033, TP-0046, TP-0047 | Não executada |
| 71 | TP-0069 | executor | ✔ | Endpoint GET /api/grupos/:g/jogadores/:id | L15 | TP-0011, TP-0023, TP-0032, TP-0033, TP-0046, TP-0047 | Não executada |
| 72 | TP-0070 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores | L15 | TP-0013, TP-0023, TP-0032, TP-0033, TP-0046 | Não executada |
| 73 | TP-0071 | executor | ✔ | Endpoint PATCH /api/grupos/:g/jogadores/:id | L15 | TP-0009, TP-0023, TP-0032, TP-0033, TP-0046 | Não executada |
| 74 | TP-0072 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores/:id/inativar | L16 | TP-0009, TP-0013, TP-0023, TP-0032, TP-0033, TP-0046, TP-0069 | Não executada |
| 75 | TP-0073 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores/:id/reativar | L16 | TP-0009, TP-0013, TP-0023, TP-0032, TP-0033, TP-0046, TP-0069 | Não executada |
| 76 | TP-0074 | executor | ✔ | Endpoint DELETE /api/grupos/:g/jogadores/:id | L16 | TP-0023, TP-0030, TP-0032, TP-0033, TP-0046 | Não executada |
| 77 | TP-0075 | executor | ✔ | Endpoint GET /api/grupos/:g/pesos | L17 | TP-0024, TP-0032, TP-0033, TP-0048 | Não executada |
| 78 | TP-0076 | executor | ✔ | Endpoint POST /api/grupos/:g/pesos | L17 | TP-0013, TP-0024, TP-0030, TP-0032, TP-0033, TP-0048 | Não executada |
| 79 | TP-0077 | executor | ✔ | Endpoint GET /api/grupos/:g/partidas?mes= | L17 | TP-0007, TP-0013, TP-0024, TP-0032, TP-0033, TP-0049 | Não executada |
| 80 | TP-0078 | executor | ✔ | Endpoint GET /api/grupos/:g/partidas/nova?data= | L17 | TP-0007, TP-0013, TP-0024, TP-0029, TP-0032, TP-0033, TP-0049, TP-0052 | Não executada |
| 81 | TP-0079 | executor | ✔ | Endpoint GET /api/grupos/:g/partidas/:data | L17 | TP-0024, TP-0032, TP-0033, TP-0049, TP-0052 | Não executada |
| 82 | TP-0080 | executor | ✔ | Extração aplicacao/partidas/presencas (validação das marcações) | L18 | TP-0009, TP-0052 | Não executada |
| 83 | TP-0081 | executor | ✔ | Endpoint POST /api/grupos/:g/partidas | L18 | TP-0013, TP-0014, TP-0024, TP-0030, TP-0032, TP-0033, TP-0049, TP-0050, TP-0079, TP-0080 | Não executada |
| 84 | TP-0082 | executor | ✔ | Endpoint PUT /api/grupos/:g/partidas/:data | L18 | TP-0014, TP-0024, TP-0030, TP-0032, TP-0033, TP-0049, TP-0079, TP-0080 | Não executada |
| 85 | TP-0083 | executor | ✔ | Endpoint DELETE /api/grupos/:g/partidas/:data | L18 | TP-0014, TP-0024, TP-0030, TP-0032, TP-0033, TP-0049 | Não executada |
| 86 | TP-0084 | executor | ✔ | Endpoint GET /api/publico/:slug/ranking?mes= | L19 | TP-0010, TP-0013, TP-0020, TP-0029, TP-0033, TP-0053 | Não executada |
| 87 | TP-0085 | executor | ✔ | Endpoint POST /api/publico/:slug/eventos | L19 | TP-0020, TP-0029, TP-0033, TP-0050 | Não executada |
| 88 | TP-0086 | executor | ✔ | Endpoint GET /api/grupos/:g/uso | L19 | TP-0013, TP-0024, TP-0032, TP-0033, TP-0050 | Não executada |
| 89 | TP-0087 | executor | ✔ | Limite de taxa em /api/sessao/entrar e /api/publico/* | L19 | TP-0013, TP-0034, TP-0084 | Não executada |
| 90 | TP-0088 | executor | ✔ | App web: Vite, React 19, Router, TanStack Query, tokens e fontes do mockup, recursos po... | L20 | TP-0001, TP-0004 | Aprovada |
| 91 | TP-0089 | executor | ✔ | Base visual: Playwright, comparar-visual.mjs e job e2e | L20 | TP-0003, TP-0088 | Aprovada |
| 92 | TP-0090 | executor | ✔ | Cabeçalhos de segurança dos arquivos estáticos (_headers) | L20 | TP-0013, TP-0088, TP-0089 | Aprovada |
| 93 | TP-0091 | executor | ✔ | Cliente da API no web (src/dados) | L20 | TP-0005, TP-0088 | Aprovada |
| 94 | TP-0092 | executor | ✔ | Formatação pt-BR (src/formatacao) | L20 | TP-0005, TP-0088 | Aprovada |
| 95 | TP-0093 | executor | ✔ | Rótulos dos enums (src/rotulos) | L20 | TP-0005, TP-0088 | Aprovada |
| 96 | TP-0094 | executor | ✔ | docker-compose.yml (db, backend, frontend) | L21 | TP-0013, TP-0015, TP-0051, TP-0088 | Não executada |
| 97 | TP-0095 | executor | ✔ | Componentes básicos: Botão, Selo, Faixa, Esqueleto, Estado vazio, Tela de mensagem, Err... | L21 | TP-0088 | Aprovada |
| 98 | TP-0096 | executor | ✔ | Campos de formulário e resumo de erros | L21 | TP-0088, TP-0092, TP-0095 | Aprovada |
| 99 | TP-0097 | executor | ✔ | Controle segmentado, Interruptor e Caixa de seleção | L21 | TP-0088 | Aprovada |
| 100 | TP-0098 | executor | ✔ | Barra superior, barra de ação e "Pular para o conteúdo" | L21 | TP-0088, TP-0095 | Aprovada |
| 101 | TP-0099 | executor | ✔ | Diálogo base e folha inferior/menu | L21 | TP-0088, TP-0095 | Aprovada |
| 102 | TP-0100 | executor | ✔ | Diálogos D1 (senha exibida uma vez) e D2 (confirmação destrutiva) | L22 | TP-0095, TP-0096, TP-0099 | Aprovada |
| 103 | TP-0101 | executor | ✔ | Lista e item, navegador de mês e tabela de semanas | L22 | TP-0088, TP-0092, TP-0095 | Aprovada |
| 104 | TP-0102 | executor | ✔ | Tabela de ranking, marca de rodada e legenda | L22 | TP-0020, TP-0088, TP-0092, TP-0093 | Aprovada |
| 105 | TP-0103 | executor | ✔ | Seletor de situação e contagem fixa | L22 | TP-0024, TP-0088, TP-0093 | Aprovada |
| 106 | TP-0104 | executor | ✔ | Aviso "O app mudou de endereço" | L22 | TP-0095 | Aprovada |
| 107 | TP-0105 | executor | ✔ | Sessão no web e guarda de rotas | L23 | TP-0019, TP-0091 | Aprovada |
| 108 | TP-0106 | executor | ✔ | Layout do admin (barra, grupo ativo, menu da conta) | L23 | TP-0021, TP-0088, TP-0091, TP-0098, TP-0099, TP-0104, TP-0105 | Aprovada |
| 109 | TP-0107 | executor | ✔ | Armazenamento local (grupo lembrado, id anônimo, último ranking) | L23 | TP-0088 | Aprovada |
| 110 | TP-0108 | executor | ✔ | PWA: manifesto, service worker e atualização | L23 | TP-0006, TP-0088 | Não executada |
| 111 | TP-0109 | executor | ✔ | Tela T00/T02: entrada do app e "Abra o link do seu grupo" | L24 | TP-0088, TP-0089, TP-0095, TP-0107 | Aprovada |
| 112 | TP-0110 | executor | ✔ | Tela T03 e roteamento de /g/:slug | L24 | TP-0020, TP-0089, TP-0091, TP-0095, TP-0107 | Aprovada |
| 113 | TP-0111 | executor | ✔ | Tela T01: ranking público (rede) | L24 | TP-0020, TP-0088, TP-0089, TP-0091, TP-0095, TP-0098, TP-0101, TP-0102, TP-0104, TP-0110 | Aprovada |
| 114 | TP-0112 | executor | ✔ | T01 sem conexão, cache, grupo lembrado e evento de abertura | L24 | TP-0107, TP-0108, TP-0111 | Não executada |
| 115 | TP-0113 | executor | ✔ | T01 aviso de instalação no iPhone (D5) | L24 | TP-0089, TP-0107, TP-0111 | Aprovada |
| 116 | TP-0207 | executor | ✔ | Componentes de página do admin e das telas públicas (src/componentes/pagina/) | L25 | TP-0089, TP-0095 | Aprovada |
| 117 | TP-0114 | executor | ✔ | Tela T04: Entrar | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0105, TP-0207 | Aprovada |
| 118 | TP-0115 | executor | ✔ | Tela T05: Esqueci a senha | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0114, TP-0207 | Aprovada |
| 119 | TP-0116 | executor | ✔ | Tela T06: Nova senha obrigatória | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0105, TP-0114, TP-0207 | Aprovada |
| 120 | TP-0117 | executor | ✔ | Tela T25: Minha senha | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0105, TP-0106, TP-0114, TP-0116, TP-0207 | Aprovada |
| 121 | TP-0118 | executor | ✔ | Tela T08: Escolher grupo | L25 | TP-0089, TP-0095, TP-0101, TP-0105, TP-0207 | Aprovada |
| 122 | TP-0119 | executor | ✔ | Tela T09: Início do admin | L26 | TP-0021, TP-0089, TP-0092, TP-0095, TP-0101, TP-0106, TP-0111, TP-0207 | Aprovada |
| 123 | TP-0120 | executor | ✔ | Tela T10: Partidas | L26 | TP-0024, TP-0089, TP-0092, TP-0095, TP-0101, TP-0106, TP-0207 | Aprovada |
| 124 | TP-0121 | executor | ✔ | Tela T11: Lançar partida | L26 | TP-0024, TP-0089, TP-0095, TP-0096, TP-0097, TP-0098, TP-0103, TP-0106, TP-0119, TP-0207 | Aprovada |
| 125 | TP-0122 | executor | ✔ | Tela T11: editar e excluir partida | L26 | TP-0100, TP-0120, TP-0121 | Aprovada |
| 126 | TP-0123 | executor | ✔ | Tela T15: Jogadores | L27 | TP-0023, TP-0089, TP-0093, TP-0095, TP-0097, TP-0101, TP-0106, TP-0207 | Aprovada |
| 127 | TP-0124 | executor | ✔ | Tela T16: Ficha do jogador (dados e situação) | L27 | TP-0023, TP-0089, TP-0093, TP-0095, TP-0096, TP-0099, TP-0100, TP-0106, TP-0207 | Aprovada |
| 128 | TP-0125 | executor | ✔ | Tela T18: Pontuação | L27 | TP-0024, TP-0089, TP-0095, TP-0096, TP-0101, TP-0106, TP-0207 | Aprovada |
| 129 | TP-0126 | executor | ✔ | Tela T19: Admins do grupo | L27 | TP-0021, TP-0089, TP-0095, TP-0096, TP-0097, TP-0100, TP-0101, TP-0106, TP-0207 | Aprovada |
| 130 | TP-0127 | executor | ✔ | Tela T20: Dados do grupo e link | L27 | TP-0021, TP-0089, TP-0093, TP-0095, TP-0096, TP-0097, TP-0106, TP-0207 | Aprovada |
| 131 | TP-0128 | executor | ✔ | Tela T21: Uso do app | L27 | TP-0024, TP-0089, TP-0095, TP-0101, TP-0106, TP-0207 | Aprovada |
| 132 | TP-0129 | executor | ✔ | Tela T26: Área do dono | L28 | TP-0022, TP-0089, TP-0095, TP-0097, TP-0098, TP-0100, TP-0101, TP-0105, TP-0106, TP-0207 | Aprovada |
| 133 | TP-0130 | executor | ✔ | Tela T27: Novo grupo | L28 | TP-0022, TP-0089, TP-0093, TP-0095, TP-0096, TP-0097, TP-0098, TP-0100, TP-0105, TP-0129, TP-0207 | Aprovada |
| 134 | TP-0131 | executor | ✔ | Tela T28: Grupo (visão do dono) | L28 | TP-0022, TP-0089, TP-0093, TP-0095, TP-0096, TP-0098, TP-0100, TP-0101, TP-0105, TP-0129, TP-0207 | Aprovada |
| 135 | TP-0132 | executor | ✔ | [U] Neon: projeto novo em São Paulo (PI-1) — **tarefa manual do usuário** | L29 | — | Não executada |
| 136 | TP-0133 | executor | ✔ | [U] Cloudflare: subdomínio, token e Hyperdrive (PI-2, PI-3) | L29 | TP-0013, TP-0132 | Não executada |
| 137 | TP-0134 | executor | ✔ | [U] GitHub: secrets e environments (PI-4) | L29 | TP-0132, TP-0133 | Não executada |
| 138 | SPK-0001 | coordenador | — | Spike S-01: transação interativa pg sobre o Hyperdrive | L29 | TP-0014, TP-0133 | Não executada |
| 139 | TP-0136 | executor | ✔ | Workflow de backup diário (backup.yml) | L30 | TP-0134 | Não executada |
| 140 | TP-0135 | executor | ✔ | Workflow de deploy (deploy.yml) | L30 | TP-0003, TP-0013, TP-0015, TP-0133, TP-0134, TP-0136 | Não executada |
| 141 | TP-0137 | executor | ✔ | Runbook backend/DEPLOY.md e ensaio de restauração | L30 | TP-0041, TP-0135, TP-0136 | Não executada |
| 142 | TP-0138 | executor | ✔ | E2E de integração do I1 (API real) | L30 | TP-0034, TP-0035, TP-0040, TP-0056, TP-0061, TP-0070, TP-0078, TP-0081, TP-0084, TP-0089, TP-0094, TP-0111, TP-0114, TP-0116, TP-0119, TP-0121, TP-0123, TP-0124, TP-0129, TP-0130 | Não executada |
| 143 | TP-0139 | executor | ✔ | [U] Go-live do I1 | L30 | SPK-0001, TP-0036, TP-0039, TP-0041, TP-0054, TP-0055, TP-0057, TP-0058, TP-0059, TP-0060, TP-0062, TP-0063, TP-0064, TP-0065, TP-0066, TP-0067, TP-0068, TP-0069, TP-0071, TP-0072, TP-0073, TP-0074, TP-0075, TP-0076, TP-0077, TP-0079, TP-0082, TP-0083, TP-0085, TP-0086, TP-0087, TP-0090, TP-0109, TP-0112, TP-0113, TP-0115, TP-0117, TP-0118, TP-0120, TP-0122, TP-0125, TP-0126, TP-0127, TP-0128, TP-0131, TP-0135, TP-0137, TP-0138 | Não executada |
| 144 | TP-0140 | executor | ✔ | [U] Play Console: app com.gestaodapelada.app (PI-5) | L31 | — | Não executada |
| 145 | TP-0141 | executor | ✔ | /.well-known/assetlinks.json servido pelo Worker | L31 | TP-0088, TP-0140 | Não executada |
| 146 | TP-0142 | executor | ✔ | Projeto TWA (Bubblewrap) em frontend/twa | L31 | TP-0006, TP-0108, TP-0139, TP-0140, TP-0141 | Não executada |
| 147 | TP-0143 | executor | ✔ | [U] Teste fechado da Play (12 testadores, 14 dias) | L31 | TP-0139, TP-0141, TP-0142 | Não executada |
| 148 | TP-0144 | executor | ✔ | [U] Publicação da TWA em produção | L31 | TP-0143 | Não executada |
| 149 | TP-0145 | executor | ✔ | contrato/habilidades (catálogo e notas) | L32 | TP-0005, TP-0018 | Aprovada |
| 150 | TP-0146 | executor | ✔ | contrato/simulador | L32 | TP-0005, TP-0018 | Aprovada |
| 151 | TP-0147 | executor | ✔ | dominio/simulador/previa: número de times, composição e insuficiência | L32 | TP-0001 | Aprovada |
| 152 | TP-0148 | executor | ✔ | dominio/simulador/prioridade (RN-08) | L32 | TP-0007, TP-0010 | Aprovada |
| 153 | TP-0149 | executor | ✔ | dominio/simulador/classificacao (RN-09A) | L32 | TP-0001 | Aprovada |
| 154 | TP-0150 | executor | ✔ | dominio/simulador/indicadores (indicadores e pares) | L33 | TP-0011, TP-0149 | Aprovada |
| 155 | TP-0151 | executor | ✔ | dominio/simulador/distribuicao-dois (RN-10A) | L33 | TP-0149, TP-0150 | Aprovada |
| 156 | TP-0152 | executor | ✔ | dominio/simulador/distribuicao-varios (RN-10B) | L33 | TP-0147, TP-0150 | Aprovada |
| 157 | TP-0153 | executor | ✔ | dominio/simulador/avisos (RF-47) | L33 | TP-0147, TP-0150 | Aprovada |
| 158 | BK-0006 | coordenador | ✔ | Orçamento de CPU de sugerir estourado (2 times de 11, 30 aptos: mediana 3,9-4,8 ms vs limi | — | — | Não executada |
| 159 | TP-0154 | executor | ✔ | dominio/simulador/sugerir e teste de orçamento de CPU no CI | L33 | BK-0006, TP-0003, TP-0148, TP-0149, TP-0150, TP-0151, TP-0152, TP-0153 | Bloqueada |
| 160 | TP-0155 | executor | ✔ | Endpoint GET /api/grupos/:g/habilidades | L34 | TP-0032, TP-0033, TP-0047, TP-0145 | Não executada |
| 161 | TP-0156 | executor | ✔ | Endpoint POST /api/grupos/:g/habilidades | L34 | TP-0032, TP-0033, TP-0047, TP-0145 | Não executada |
| 162 | TP-0157 | executor | ✔ | Endpoint PATCH /api/grupos/:g/habilidades/:id | L34 | TP-0032, TP-0033, TP-0047, TP-0145 | Não executada |
| 163 | TP-0158 | executor | ✔ | Endpoint DELETE /api/grupos/:g/habilidades/:id | L34 | TP-0014, TP-0030, TP-0032, TP-0033, TP-0047, TP-0145 | Não executada |
| 164 | TP-0159 | executor | ✔ | Endpoint PUT /api/grupos/:g/jogadores/:id/notas/:habilidadeId | L34 | TP-0011, TP-0023, TP-0032, TP-0033, TP-0046, TP-0047, TP-0145 | Não executada |
| 165 | TP-0160 | executor | ✔ | Migração de escalações | L35 | TP-0015, TP-0016, TP-0026 | Aprovada |
| 166 | TP-0161 | executor | ✔ | Repositório de escalações | L35 | TP-0014, TP-0016, TP-0017, TP-0160 | Aprovada |
| 167 | TP-0162 | executor | ✔ | Endpoint GET /api/grupos/:g/simulador/contexto?data= | L35 | TP-0007, TP-0011, TP-0013, TP-0029, TP-0032, TP-0033, TP-0047, TP-0052, TP-0146 | Não executada |
| 168 | TP-0163 | executor | ✔ | Endpoint POST /api/grupos/:g/simulador/previa | L35 | TP-0032, TP-0033, TP-0146, TP-0147 | Não executada |
| 169 | TP-0164 | executor | ✔ | Extração aplicacao/simulador/entrada (aptos prontos para o domínio) | L35 | TP-0011, TP-0047, TP-0053, TP-0148, TP-0154 | Não executada |
| 170 | TP-0165 | executor | ✔ | Endpoint POST /api/grupos/:g/simulador/sugerir | L35 | TP-0032, TP-0033, TP-0146, TP-0154, TP-0163, TP-0164 | Não executada |
| 171 | TP-0166 | executor | ✔ | Endpoint POST /api/grupos/:g/simulador/avaliar | L36 | TP-0032, TP-0033, TP-0146, TP-0150, TP-0153, TP-0164 | Não executada |
| 172 | TP-0167 | executor | ✔ | Endpoint POST /api/grupos/:g/escalacoes | L36 | TP-0014, TP-0032, TP-0033, TP-0050, TP-0052, TP-0146, TP-0161 | Não executada |
| 173 | TP-0168 | executor | ✔ | Pré-marcação pela escalação em GET .../partidas/nova | L36 | TP-0078, TP-0161 | Não executada |
| 174 | TP-0169 | executor | ✔ | Resumo do início com a escalação confirmada | L36 | TP-0061, TP-0161 | Não executada |
| 175 | SPK-0002 | coordenador | — | Spike S-02: CPU do sugerir no Worker publicado | L36 | TP-0135, TP-0165 | Não executada |
| 176 | TP-0170 | executor | ✔ | Tela T17: Habilidades | L37 | TP-0089, TP-0095, TP-0096, TP-0100, TP-0101, TP-0106, TP-0145, TP-0207 | Aprovada |
| 177 | TP-0171 | executor | ✔ | Tela T16: seção de notas e nível | L37 | TP-0096, TP-0124, TP-0145 | Aprovada |
| 178 | TP-0172 | executor | ✔ | Tela T12: Simulador (entradas e prévia) | L37 | TP-0089, TP-0095, TP-0096, TP-0097, TP-0098, TP-0101, TP-0106, TP-0146, TP-0207 | Aprovada |
| 179 | TP-0173 | executor | ✔ | Cartão de time, tabela comparativa e lista de avisos | L37 | TP-0088, TP-0092, TP-0095, TP-0146 | Aprovada |
| 180 | TP-0174 | executor | ✔ | Ajuste manual do simulador: D3 e gancho de reavaliação | L37 | TP-0091, TP-0099, TP-0146 | Aprovada |
| 181 | TP-0175 | executor | ✔ | Tela T13: resultado com 2 times | L38 | TP-0089, TP-0098, TP-0100, TP-0106, TP-0172, TP-0173, TP-0174 | Aprovada |
| 182 | TP-0176 | executor | ✔ | Tela T14: resultado com 3 ou mais times | L38 | TP-0089, TP-0098, TP-0100, TP-0106, TP-0172, TP-0173, TP-0174, TP-0175 | Aprovada |
| 183 | TP-0177 | executor | ✔ | E2E de integração do I2 (API real) | L38 | TP-0138, TP-0162, TP-0163, TP-0165, TP-0166, TP-0167, TP-0168, TP-0172, TP-0175 | Não executada |
| 184 | TP-0178 | executor | ✔ | [U] Go-live do I2 | L38 | SPK-0002, TP-0139, TP-0155, TP-0156, TP-0157, TP-0158, TP-0159, TP-0169, TP-0170, TP-0171, TP-0176, TP-0177 | Não executada |
| 185 | TP-0179 | executor | ✔ | dominio/pdf: colunas do PDF e PTS INICIAL antes da 1ª coluna | L39 | TP-0010 | Aprovada |
| 186 | TP-0180 | executor | ✔ | contrato/pdf (estrito) | L39 | TP-0018, TP-0020 | Aprovada |
| 187 | TP-0181 | executor | ✔ | Endpoint GET /api/publico/:slug/pdf?mes= | L39 | TP-0013, TP-0029, TP-0033, TP-0053, TP-0179, TP-0180 | Não executada |
| 188 | TP-0182 | executor | ✔ | Gerador de PDF: desenho da folha | L39 | TP-0004, TP-0088, TP-0092, TP-0093, TP-0180 | Aprovada |
| 189 | BK-0002 | coordenador | ✔ | Comparação visual do PDF (P01) fica em 3,96% (sucesso) e 4,02% (mes-vazio) contra o limite | — | — | Aprovada |
| 190 | TP-0183 | executor | ✔ | Gerador de PDF: uma página, legenda e rodapé | L39 | BK-0002, TP-0182 | Aprovada |
| 191 | TP-0184 | executor | ✔ | T01: Exportar PDF (compartilhar ou baixar) | L39 | TP-0091, TP-0099, TP-0111, TP-0180, TP-0183 | Aprovada |
| 192 | TP-0185 | executor | ✔ | [U] Go-live do I3 e início da janela de 8 semanas | L40 | TP-0178, TP-0181, TP-0184 | Não executada |
| 193 | TP-0186 | executor | ✔ | contrato/financeiro | L41 | TP-0005, TP-0018 | Aprovada |
| 194 | TP-0187 | executor | ✔ | dominio/caixa: saldos e entrada vinculada | L41 | TP-0007 | Aprovada |
| 195 | TP-0188 | executor | ✔ | Migração do financeiro | L41 | TP-0015, TP-0016, TP-0042 | Aprovada |
| 196 | TP-0189 | executor | ✔ | Repositório do financeiro (e histórico do jogador com pagamentos) | L41 | TP-0014, TP-0016, TP-0017, TP-0046, TP-0074, TP-0188 | Não executada |
| 197 | TP-0190 | executor | ✔ | Endpoint GET /api/grupos/:g/financeiro/mes?mes= | L42 | TP-0013, TP-0032, TP-0033, TP-0052, TP-0186, TP-0187, TP-0189 | Não executada |
| 198 | TP-0191 | executor | ✔ | Endpoint PUT /api/grupos/:g/financeiro/config | L42 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 199 | TP-0192 | executor | ✔ | Endpoint POST /api/grupos/:g/financeiro/pagamentos (marcar) | L42 | TP-0014, TP-0030, TP-0032, TP-0033, TP-0186, TP-0187, TP-0189 | Não executada |
| 200 | TP-0193 | executor | ✔ | Endpoint DELETE /api/grupos/:g/financeiro/pagamentos/:jogadorId/:mes (desmarcar) | L42 | TP-0014, TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 201 | TP-0194 | executor | ✔ | Resumo do início com o saldo atual | L42 | TP-0061, TP-0187, TP-0189 | Não executada |
| 202 | TP-0195 | executor | ✔ | Endpoint POST /api/grupos/:g/financeiro/lancamentos | L43 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 203 | TP-0196 | executor | ✔ | Endpoint GET /api/grupos/:g/financeiro/lancamentos/:id | L43 | TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 204 | TP-0197 | executor | ✔ | Endpoint PUT /api/grupos/:g/financeiro/lancamentos/:id | L43 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 205 | TP-0198 | executor | ✔ | Endpoint DELETE /api/grupos/:g/financeiro/lancamentos/:id | L43 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 206 | TP-0199 | executor | ✔ | Tela T22: Financeiro do mês | L44 | TP-0089, TP-0092, TP-0095, TP-0101, TP-0106, TP-0186, TP-0207 | Aprovada |
| 207 | TP-0200 | executor | ✔ | Tela T22: marcar e desmarcar pagamento | L44 | TP-0097, TP-0100, TP-0199 | Aprovada |
| 208 | TP-0201 | executor | ✔ | Tela T23: Lançamento | L44 | TP-0089, TP-0095, TP-0096, TP-0097, TP-0098, TP-0100, TP-0106, TP-0186, TP-0207 | Aprovada |
| 209 | TP-0202 | executor | ✔ | Tela T24: Configuração do caixa | L44 | TP-0089, TP-0095, TP-0096, TP-0098, TP-0106, TP-0186, TP-0199, TP-0207 | Aprovada |
| 210 | TP-0203 | executor | ✔ | Endpoint POST /api/sessao/aviso-privacidade | L45 | TP-0019, TP-0027, TP-0031, TP-0033 | Não executada |
| 211 | TP-0204 | executor | ✔ | Tela T07: Aviso de privacidade (página e diálogo do 1º acesso) | L45 | TP-0089, TP-0095, TP-0099, TP-0105, TP-0106, TP-0207 | Aprovada |
| 212 | TP-0205 | executor | ✔ | E2E de integração do I4 (API real) | L45 | TP-0138, TP-0190, TP-0191, TP-0192, TP-0193, TP-0195, TP-0199, TP-0200, TP-0201, TP-0202 | Não executada |
| 213 | TP-0206 | executor | ✔ | [U] Go-live do I4 | L45 | TP-0185, TP-0194, TP-0196, TP-0197, TP-0198, TP-0203, TP-0204, TP-0205 | Não executada |
| 214 | RTP-0001 | executor | ✔ | Lint: backend/scripts importando @pelada/api por alias fura a zona (e falta o teste do... | L01 | TP-0002 | Aprovada |
| 215 | RTP-0003 | executor | ✔ | Teste de enums: conferir situacao de presença das respostas contra o enum | Refatoração Lote-L01 | TP-0005 | Aprovada |
| 216 | RTP-0015 | executor | ✔ | Fixar por SHA de commit as actions de terceiros dos workflows (gitleaks-action, pnpm/ac... | Refatoração Lote-L01 | TP-0003 | Aprovada |
| 217 | RTP-0002 | executor | ✔ | Lint: aliases contornam Date.now() (G-06) e document.cookie (G-09) | L01 | TP-0002 | Aprovada |
| 218 | RTP-0004 | executor | ✔ | Remover teste duplicado de slug em src/grupos | Refatoração Lote-L02 | TP-0012 | Aprovada |
| 219 | RTP-0005 | executor | — | Remover teste duplicado de pontuação em src/pontuacao | L02 | TP-0008 | Não executada |
| 220 | RTP-0007 | executor | — | Remover teste duplicado de atividade em src/atividade | L02 | TP-0009 | Não executada |
| 221 | RTP-0012 | executor | ✔ | distribuirVariosTimes: limitar o tamanho da entrada (orçamento de CPU) | Refatoração Lote-L33 | TP-0152 | Aprovada |
| 222 | RTP-0008 | executor | ✔ | Atualizar sharp e undici transitivos do wrangler/miniflare (pnpm audit alto) | Refatoração Lote-L03 | TP-0013 | Aprovada |
| 223 | RTP-0009 | executor | ✔ | Teste do módulo de dados: cobrir tipo público e pid fora da transação | Refatoração Lote-L03 | TP-0014 | Aprovada |
| 224 | RTP-0019 | executor | ✔ | checar-grupo-id: cobrir exports que não são function/arrow direta (classe, objeto, funç... | Refatoração Lote-L03 | TP-0016 | Aprovada |
| 225 | RTP-0057 | executor | ✔ | checar-grupo-id: cobrir alias, ternário, acesso a membro, namespace e arrow com satisfies | Refatoração Lote-L03 | RTP-0019 | Aprovada |
| 226 | RTP-0061 | executor | ✔ | checar-grupo-id: fechar contornos restantes (propriedade estática arrow, let sem inicia... | Refatoração Lote-L03 | RTP-0057 | Aprovada |
| 227 | RTP-0064 | executor | ✔ | checar-grupo-id: fechar construtor com corpo, arquivos fora da listagem e casts sobre dado | Refatoração Lote-L03 | RTP-0061 | Aprovada |
| 228 | RTP-0010 | executor | ✔ | Testes de distribuicao-varios: prova de todos candidatos ao incompleto e chave com idade | Refatoração Lote-33 | TP-0152 | Aprovada |
| 229 | RTP-0011 | executor | ✔ | distribuicao-dois: remover regra de saída duplicada (substituicoes) | Refatoração Lote-33 | TP-0151 | Aprovada |
| 230 | RTP-0013 | executor | ✔ | Foco preso: Shift+Tab a partir do título (focoNoTitulo) escapa do Dialogo | Refatoração Lote-L21 | TP-0099 | Aprovada |
| 231 | RTP-0016 | executor | ✔ | ResumoErros: aplicar o estilo .resumo (CSS morto em Campo.module.css) | Refatoração Lote-L21 | TP-0096 | Aprovada |
| 232 | RTP-0052 | executor | ✔ | ResumoErros: remover o ícone da faixa para igualar o mockup (T06 erro) | Refatoração Lote-L21 | RTP-0016 | Aprovada |
| 233 | RTP-0018 | executor | ✔ | Testes faltantes da compatibilidade do contrato (eDono em resposta/QUEBRAS, enum de ent... | Refatoração Lote-L04 | TP-0018 | Aprovada |
| 234 | RTP-0021 | executor | ✔ | RankingPublico: enderecoNovo obrigatório (url ou null) | Refatoração Lote-L04 | TP-0020 | Aprovada |
| 235 | RTP-0020 | executor | ✔ | Teste D1: cobrir indexedDB.open, classe monoespaçada e ausência da senha após desmontar | Refatoração Lote-L22 | TP-0100 | Aprovada |
| 236 | RTP-0022 | executor | ✔ | ConteudoPagina: copiar .conteudo do mockup (largura-conteudo) em vez de reaproveitar o... | 25 | TP-0207 | Aprovada |
| 237 | RTP-0026 | executor | ✔ | Pagina.module.css: regra @media de .conteudoEstreito anulada pela regra base | 25 | TP-0118 | Aprovada |
| 238 | RTP-0023 | executor | ✔ | Mockup: avisos como div[role=status] com ul dentro (alinhar ao código de TP-0173) | Refatoração Lote-37 | TP-0173 | Aprovada |
| 239 | RTP-0024 | executor | ✔ | useAjusteSimulador: reaproveitar usarValorAtrasado no debounce de 300 ms | Refatoração Lote-37 | TP-0174 | Aprovada |
| 240 | RTP-0025 | executor | ✔ | useAjusteSimulador: corpo inválido não pode deixar Confirmar habilitado | Refatoração Lote-37 | TP-0174 | Aprovada |
| 241 | RTP-0035 | executor | ✔ | T12 vazio: largura do cartão 560 px no app vs 512 px no mockup | Refatoração Lote-37 | TP-0172 | Aprovada |
| 242 | RTP-0027 | executor | ✔ | Teste da Legenda oculta sem partidas (T01) | Refatoração Lote-24 | TP-0111 | Aprovada |
| 243 | RTP-0028 | executor | ✔ | T19: teste axe com o diálogo D1/D2 aberto | Refatoração Lote-L27 | TP-0126 | Aprovada |
| 244 | RTP-0030 | executor | ✔ | Mockup T15: barra-acao dentro do main e seta nos itens (alinhar ao app) | Refatoração Lote-L27 | TP-0123 | Aprovada |
| 245 | RTP-0032 | executor | ✔ | T18: testes axe em erro/salvo, ajuda ligada e rótulos em src/rotulos | Refatoração Lote-L27 | TP-0125 | Aprovada |
| 246 | RTP-0033 | executor | ✔ | Mockup T16 edicao: apelido sem ajuda 'De 2 a 30 caracteres' (alinhar ao novo e ao app) | Refatoração Lote-L27 | TP-0124 | Aprovada |
| 247 | RTP-0036 | executor | ✔ | Mockup T20: URL do link estoura a janela de 390 px (adicionar overflow-wrap) | Refatoração Lote-L27 | TP-0127 | Aprovada |
| 248 | RTP-0053 | executor | ✔ | Mockup T16 inativo: apelido sem ajuda 'De 2 a 30 caracteres' (alinhar ao novo e à edição) | L27 | RTP-0033 | Aprovada |
| 249 | RTP-0029 | executor | ✔ | Mockup: .barra-acao dentro do main em T10, T13, T14, T15, T22 e T26 (como T11/T24) | Refatoração Lote-L26 | TP-0120 | Aprovada |
| 250 | RTP-0034 | executor | ✔ | Mockup T09 sem-jogadores: meta de Partidas 'Nenhuma ainda' -> 'Nenhuma em outubro' | Refatoração Lote-L26 | TP-0119 | Aprovada |
| 251 | RTP-0044 | executor | ✔ | Mockup: ícone de atenção no .campo__erro (como o app e base.css) | Refatoração Lote-L26 | TP-0121 | Aprovada |
| 252 | RTP-0045 | executor | ✔ | T11: usar FerramentasLista compartilhado em vez do local telas/partida/FerramentasLista | Refatoração Lote-L26 | TP-0121 | Aprovada |
| 253 | RTP-0046 | executor | ✔ | T11: validar o corpo com salvarPartidaCorpo antes de enviar o POST | Refatoração Lote-L26 | TP-0121 | Aprovada |
| 254 | RTP-0031 | executor | ✔ | T06: teste de 72 caracteres envia (limite superior) | Refatoração Lote-L25 | TP-0116 | Aprovada |
| 255 | RTP-0037 | executor | ✔ | Mockup T26: seta nos itens de grupo e sessão sem grupos no estado vazio | L28 | TP-0129 | Aprovada |
| 256 | RTP-0039 | executor | ✔ | Harness T27: sessão de dono sem grupos no estado vazio | Refatoração Lote-L28 | RTP-0037 | Aprovada |
| 257 | RTP-0042 | executor | ✔ | Testes da T27: Criando…/clique duplo, painel invalidado, 500, axe no D1 | Refatoração Lote-L28 | TP-0130 | Aprovada |
| 258 | RTP-0038 | executor | ✔ | T22: largura do vazio-config e margens negativas do SemAcessoFinanceiro acopladas ao la... | Refatoração Lote-L44 | TP-0199 | Aprovada |
| 259 | RTP-0047 | executor | ✔ | T24: largura do formulário 560 px no app vs 512 px no mockup (pc) | Refatoração Lote-L44 | TP-0202 | Aprovada |
| 260 | RTP-0048 | executor | ✔ | T22: valor do D2 de desmarcar não pode cair em config.mensalidadeCentavos | L44 | TP-0200 | Aprovada |
| 261 | RTP-0055 | executor | ✔ | T22: teste de desmarcar com mensalidade alterada depois (entrada ≠ config) | Refatoração Lote-L44 | RTP-0048 | Aprovada |
| 262 | RTP-0040 | executor | ✔ | Mockup base.css: .campo__entrada--nota perde para .campo__entrada (selects de nota esti... | Refatoração Lote-L37 | TP-0171 | Aprovada |
| 263 | RTP-0041 | executor | ✔ | T28: completar testes do plano (Ativo envia null, 422 da situação, reativar, rede, axe... | Refatoração Lote-28 | TP-0131 | Aprovada |
| 264 | RTP-0043 | executor | ✔ | T13: teste de página cobrir selos e trocas do sucesso; ajuda do Não entra 8 px abaixo d... | L38 | TP-0175 | Aprovada |
| 265 | RTP-0049 | executor | ✔ | T10: teste da faixa 'Partida de dd/mm excluída.' e UX-SPEC T11 (QA TP-0122) | Refatoração Lote-26 | TP-0122 | Aprovada |
| 266 | RTP-0050 | executor | ✔ | T01 PDF: completar testes (troca de mês, POST pdf_exportado real, axe das faixas) | Refatoração Lote-L39 | TP-0184 | Aprovada |
| 267 | RTP-0054 | executor | ✔ | Teste flaky 'toque antes da projeção chegar' (exportar-pdf) depende de delay de 150 ms | Refatoração Lote-L39 | RTP-0050 | Aprovada |
| 268 | RTP-0058 | executor | ✔ | dominio/pdf: testes do plano que faltam (mockup, troca de pesos, mês com mais de 12) | Refatoração Lote-L39 | TP-0179 | Aprovada |
| 269 | RTP-0051 | executor | ✔ | dominio/caixa: unificar testes duplicados | Refatoração Lote-L41 | TP-0187 | Aprovada |
| 270 | RTP-0056 | executor | ✔ | Documentar no banco que auditoria.resumo nunca recebe senha/token | Refatoração Lote-L06 | TP-0025 | Aprovada |
| 271 | RTP-0059 | executor | ✔ | sessoes: teste de uma consulta por chamada em buscarValidaEDeslizar | Refatoração Lote-L06 | TP-0028 | Aprovada |
| 272 | RTP-0060 | executor | ✔ | Teste de custo igual (e-mail existente vs inexistente) robusto sob carga | Refatoração Lote-L06 | TP-0027 | Aprovada |
| 273 | RTP-0065 | executor | ✔ | auditoria.registrar: recusar chaves sensíveis em qualquer posição do nome | Refatoração Lote-L06 | TP-0030 | Aprovada |
| 274 | RTP-0066 | executor | ✔ | Teste anti-enumeração: provar também o custo bcrypt do hash fixo | Refatoração Lote-L06 | RTP-0060 | Aprovada |
| 275 | RTP-0062 | executor | ✔ | Teste de escalações: datas e momento derivados do relógio fixo | Refatoração Lote-L35 | TP-0160 | Aprovada |
| 276 | RTP-0063 | executor | ✔ | Cookie de sessão duplicado: recusar em vez de usar o primeiro | Refatoração Lote-L07 | TP-0031 | Aprovada |
| 277 | RTP-0069 | executor | ✔ | Testes dos middlewares de grupo/dono: escopo troca_de_senha, /api/grupos//eco e arquivo... | Refatoração Lote-L07 | TP-0032 | Testada (aguarda segurança) |
| 278 | RTP-0074 | executor | ✔ | Suíte de isolamento: rota ALL visível e conferência de limpeza | L07 | TP-0033 | Não executada |
| 279 | RTP-0067 | executor | ✔ | Eventos de uso: completar testes do plano (tipos fechados, colunas gravadas, N+1, fábrica) | Refatoração Lote-L10 | TP-0050 | Em execução |
| 280 | RTP-0071 | executor | ✔ | Habilidades: usar seViolarUnico de comum.ts | L10 | TP-0047 | Não executada |
| 281 | RTP-0075 | executor | ✔ | Repositório de partidas: relógio fixo, fábrica de partidas e seViolarUnico | L10 | TP-0049 | Não executada |
| 282 | RTP-0068 | executor | ✔ | Teste de admin-por-email: asserir auditoria admin_vinculado e e-mail com caixa/espaços | Refatoração Lote-L08 | TP-0038 | Testada (aguarda segurança) |
| 283 | RTP-0072 | executor | ✔ | Checagem de escrita de e_dono: janela de 300 caracteres deixa passar INSERT/values longos | Refatoração Lote-L08 | TP-0041 | Não executada |
| 284 | RTP-0070 | executor | ✔ | Teste de partidas: relógio fixo e casos faltantes do plano | Refatoração Lote-L09 | TP-0044 | Testada (aguarda segurança) |
| 285 | BK-0003 | coordenador | ✔ | Exige push da branch ci-prova e PR real no remoto (ação manual/autorização do usuário); ro | — | — | Não executada |
| 286 | RTP-0014 | executor | ✔ | Executar a prova do CI em PR real (ci-prova) | Refatoração Lote-L01 | BK-0003, TP-0003 | Bloqueada |
| 287 | BK-0004 | coordenador | ✔ | Falta apagar backend/dominio/src/simulador/indicadores.test.ts (rm negado pela permissão) | — | — | Não executada |
| 288 | RTP-0006 | executor | ✔ | Remover teste duplicado de indicadores em src/simulador | Refatoração Lote-L33 | BK-0004, TP-0150 | Bloqueada |
| 289 | BK-0005 | coordenador | ✔ | Item (b) feito; item (a) exige PR real com job e2e verde (push/PR autorizado pelo usuário) | — | — | Não executada |
| 290 | RTP-0017 | executor | ✔ | Provar job e2e verde em PR real e cobrir dist/ ausente em visual.mjs | Refatoração Lote-L20 | BK-0005, TP-0089 | Bloqueada |
