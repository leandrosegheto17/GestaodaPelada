# TASKPLAN — ordem de execução e estado das tarefas

Gerado por `/organizar` (`python .claude/scripts/taskplan.py gerar`) e mantido pelo `/executar`,
que troca o estado da linha a cada etapa. O Status oficial continua no `TASK.md` (bloqueios `BK-`: no
arquivo do bloqueio); o detalhe de cada tarefa está em `.md/.taskplan/<ID>.md`. A ordem respeita as
dependências. Agente: `executor` (TP/RTP) ou `coordenador` (BK/SPK, com o usuário).

Atualizado: 2026-10-22 13:27

Resumo: Não executada 3 · Em execução 1 · Aprovada 446 · Bloqueada 1 · Despriorizada 5 · total 456

Estados: Não executada → Em execução → Executada (aguarda teste) → Em teste → Testada (aguarda segurança) → Em validação de segurança → Aprovada (e, à parte, Bloqueada, Dividida e Despriorizada — esta fica sempre no fim da lista e é ignorada por /executar, /testar e /validar). `Aprovada` = QA ✔ e Sec ✔ (tarefas antigas só `Concluída` aparecem como Aprovada).

| # | Tarefa | Agente | Plano | Título | Lote | Dep | Estado |
|---|---|---|---|---|---|---|---|
| 1 | TP-0001 | executor | ✔ | Monorepo pnpm com os 4 pacotes, TypeScript estrito, ESLint, Prettier, Vitest, READMEs e... | L01 | — | Aprovada |
| 2 | TP-0002 | executor | ✔ | Lint de fronteiras e checagens de código (IDs de tarefa, URLs absolutas) | L01 | TP-0001 | Aprovada |
| 3 | TP-0003 | executor | ✔ | CI base (ci.yml) | L01 | TP-0001, TP-0002 | Aprovada |
| 4 | TP-0004 | executor | ✔ | Auto-hospedar as fontes do mockup (pendência da UX-SPEC §0) | L01 | — | Aprovada |
| 5 | TP-0005 | executor | ✔ | Contrato base: erro padrão, enums, limites e tipos primitivos | L01 | TP-0001 | Aprovada |
| 6 | TP-0006 | executor | ✔ | Ícone do app no mockup (lacuna L-3), para aprovação do usuário | L01 | — | Aprovada |
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
| 34 | TP-0033 | executor | ✔ | Suíte de isolamento entre grupos (C11) | L07 | TP-0017, TP-0031, TP-0032 | Aprovada |
| 35 | TP-0034 | executor | ✔ | Endpoint POST /api/sessao/entrar | L07 | TP-0019, TP-0027, TP-0028, TP-0031, TP-0033 | Aprovada |
| 36 | RTP-0079 | executor | ✔ | Teste de log de sessao-entrar: cobrir senha correta e token | Refatoração Lote-L07 | TP-0034 | Aprovada |
| 37 | TP-0035 | executor | ✔ | Endpoint GET /api/sessao/eu | L07 | TP-0013, TP-0019, TP-0029, TP-0031, TP-0033 | Aprovada |
| 38 | TP-0036 | executor | ✔ | Endpoint POST /api/sessao/sair | L07 | TP-0028, TP-0031, TP-0033 | Aprovada |
| 39 | TP-0037 | executor | ✔ | Extração aplicacao/acesso/senhas (redefinir senha) | L08 | TP-0014, TP-0027, TP-0028, TP-0030 | Aprovada |
| 40 | TP-0038 | executor | ✔ | Extração aplicacao/acesso/admin-por-email (criar conta ou vincular) | L08 | TP-0027, TP-0029, TP-0030 | Aprovada |
| 41 | TP-0039 | executor | ✔ | Endpoint POST /api/sessao/esqueci-senha | L08 | TP-0019, TP-0027, TP-0030, TP-0033 | Aprovada |
| 42 | TP-0040 | executor | ✔ | Endpoint POST /api/sessao/trocar-senha | L08 | TP-0019, TP-0027, TP-0028, TP-0030, TP-0031, TP-0033 | Aprovada |
| 43 | TP-0041 | executor | ✔ | Script backend/scripts/dono.ts (criar e redefinir-senha) | L08 | TP-0027, TP-0030, TP-0037 | Aprovada |
| 44 | TP-0042 | executor | ✔ | Migração do Elenco (jogadores, períodos de atividade) | L09 | TP-0015, TP-0016, TP-0026 | Aprovada |
| 45 | TP-0043 | executor | ✔ | Migração de habilidades e notas | L09 | TP-0015, TP-0016, TP-0042 | Aprovada |
| 46 | TP-0044 | executor | ✔ | Migração de pesos, partidas e presenças | L09 | TP-0015, TP-0016, TP-0042 | Aprovada |
| 47 | TP-0045 | executor | ✔ | Migração de eventos de uso | L09 | TP-0015, TP-0016, TP-0026 | Aprovada |
| 48 | TP-0046 | executor | ✔ | Repositório de jogadores e períodos | L10 | TP-0014, TP-0016, TP-0017, TP-0042, TP-0043, TP-0044 | Aprovada |
| 49 | RTP-0073 | executor | ✔ | Jogadores: temPresencaDesde e testes de presença/relógio | L10 | TP-0046 | Aprovada |
| 50 | TP-0047 | executor | ✔ | Repositório de habilidades e notas | L10 | TP-0014, TP-0016, TP-0017, TP-0043 | Aprovada |
| 51 | TP-0048 | executor | ✔ | Repositório de pesos | L10 | TP-0014, TP-0016, TP-0017, TP-0044 | Aprovada |
| 52 | TP-0049 | executor | ✔ | Repositório de partidas e presenças | L10 | TP-0014, TP-0016, TP-0017, TP-0044 | Aprovada |
| 53 | TP-0050 | executor | ✔ | Repositório de eventos de uso | L10 | TP-0014, TP-0016, TP-0017, TP-0045 | Aprovada |
| 54 | TP-0051 | executor | ✔ | Script seed-local.ts com os dados do mockup | L10 | TP-0027, TP-0029, TP-0046, TP-0047, TP-0048, TP-0049 | Aprovada |
| 55 | TP-0052 | executor | ✔ | Extração aplicacao/elenco/ativos (ativos numa data e no mês) | L11 | TP-0009, TP-0046 | Aprovada |
| 56 | TP-0053 | executor | ✔ | Extração aplicacao/pontuacao/historico (histórico do grupo para o domínio) | L11 | TP-0010, TP-0046, TP-0048, TP-0049 | Aprovada |
| 57 | TP-0055 | executor | ✔ | Endpoint GET /api/dono/grupos/:id | L11 | TP-0013, TP-0022, TP-0029, TP-0032, TP-0033 | Aprovada |
| 58 | TP-0054 | executor | ✔ | Endpoint GET /api/dono/painel | L11 | TP-0022, TP-0029, TP-0030, TP-0032, TP-0033, TP-0055 | Aprovada |
| 59 | TP-0056 | executor | ✔ | Endpoint POST /api/dono/grupos (criar grupo e 1º admin) | L11 | TP-0012, TP-0014, TP-0022, TP-0029, TP-0030, TP-0032, TP-0033, TP-0038, TP-0047, TP-0048, TP-0055 | Aprovada |
| 60 | TP-0057 | executor | ✔ | Endpoint PATCH /api/dono/grupos/:id/situacao | L12 | TP-0022, TP-0029, TP-0032, TP-0033, TP-0055 | Aprovada |
| 61 | TP-0058 | executor | ✔ | Endpoints POST /api/dono/grupos/:id/arquivar e /reativar | L12 | TP-0022, TP-0029, TP-0030, TP-0032, TP-0033, TP-0055 | Aprovada |
| 62 | TP-0059 | executor | ✔ | Endpoint POST /api/dono/pedidos-reset/:id/resolver | L12 | TP-0022, TP-0030, TP-0032, TP-0033 | Aprovada |
| 63 | TP-0060 | executor | ✔ | Endpoint POST /api/dono/contas/:id/redefinir-senha | L12 | TP-0022, TP-0032, TP-0033, TP-0037 | Aprovada |
| 64 | TP-0061 | executor | ✔ | Endpoint GET /api/grupos/:g (grupo, permissões e resumo do início) | L13 | TP-0007, TP-0013, TP-0021, TP-0029, TP-0032, TP-0033, TP-0047, TP-0048, TP-0049, TP-0050, TP-0052 | Aprovada |
| 65 | TP-0062 | executor | ✔ | Endpoint PATCH /api/grupos/:g | L13 | TP-0021, TP-0029, TP-0032, TP-0033, TP-0061 | Aprovada |
| 66 | TP-0063 | executor | ✔ | Endpoint GET /api/grupos/:g/admins | L14 | TP-0021, TP-0029, TP-0032, TP-0033 | Aprovada |
| 67 | TP-0064 | executor | ✔ | Endpoint POST /api/grupos/:g/admins | L14 | TP-0021, TP-0032, TP-0033, TP-0038 | Aprovada |
| 68 | TP-0065 | executor | ✔ | Endpoint DELETE /api/grupos/:g/admins/:contaId | L14 | TP-0014, TP-0021, TP-0029, TP-0030, TP-0032, TP-0033 | Aprovada |
| 69 | TP-0066 | executor | ✔ | Endpoint POST /api/grupos/:g/admins/:contaId/redefinir-senha | L14 | TP-0021, TP-0032, TP-0033, TP-0037 | Aprovada |
| 70 | TP-0067 | executor | ✔ | Endpoint PATCH /api/grupos/:g/admins/:contaId/financeiro | L14 | TP-0021, TP-0029, TP-0030, TP-0032, TP-0033 | Aprovada |
| 71 | TP-0068 | executor | ✔ | Endpoint GET /api/grupos/:g/jogadores | L15 | TP-0009, TP-0011, TP-0013, TP-0023, TP-0032, TP-0033, TP-0046, TP-0047 | Aprovada |
| 72 | TP-0069 | executor | ✔ | Endpoint GET /api/grupos/:g/jogadores/:id | L15 | TP-0011, TP-0023, TP-0032, TP-0033, TP-0046, TP-0047 | Aprovada |
| 73 | TP-0070 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores | L15 | TP-0013, TP-0023, TP-0032, TP-0033, TP-0046 | Aprovada |
| 74 | TP-0071 | executor | ✔ | Endpoint PATCH /api/grupos/:g/jogadores/:id | L15 | TP-0009, TP-0023, TP-0032, TP-0033, TP-0046 | Aprovada |
| 75 | TP-0072 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores/:id/inativar | L16 | TP-0009, TP-0013, TP-0023, TP-0032, TP-0033, TP-0046, TP-0069 | Aprovada |
| 76 | TP-0073 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores/:id/reativar | L16 | TP-0009, TP-0013, TP-0023, TP-0032, TP-0033, TP-0046, TP-0069 | Aprovada |
| 77 | TP-0074 | executor | ✔ | Endpoint DELETE /api/grupos/:g/jogadores/:id | L16 | TP-0023, TP-0030, TP-0032, TP-0033, TP-0046 | Aprovada |
| 78 | TP-0075 | executor | ✔ | Endpoint GET /api/grupos/:g/pesos | L17 | TP-0024, TP-0032, TP-0033, TP-0048 | Aprovada |
| 79 | TP-0076 | executor | ✔ | Endpoint POST /api/grupos/:g/pesos | L17 | TP-0013, TP-0024, TP-0030, TP-0032, TP-0033, TP-0048 | Aprovada |
| 80 | TP-0077 | executor | ✔ | Endpoint GET /api/grupos/:g/partidas?mes= | L17 | TP-0007, TP-0013, TP-0024, TP-0032, TP-0033, TP-0049 | Aprovada |
| 81 | TP-0078 | executor | ✔ | Endpoint GET /api/grupos/:g/partidas/nova?data= | L17 | TP-0007, TP-0013, TP-0024, TP-0029, TP-0032, TP-0033, TP-0049, TP-0052 | Aprovada |
| 82 | TP-0079 | executor | ✔ | Endpoint GET /api/grupos/:g/partidas/:data | L17 | TP-0024, TP-0032, TP-0033, TP-0049, TP-0052 | Aprovada |
| 83 | TP-0080 | executor | ✔ | Extração aplicacao/partidas/presencas (validação das marcações) | L18 | TP-0009, TP-0052 | Aprovada |
| 84 | TP-0081 | executor | ✔ | Endpoint POST /api/grupos/:g/partidas | L18 | TP-0013, TP-0014, TP-0024, TP-0030, TP-0032, TP-0033, TP-0049, TP-0050, TP-0079, TP-0080 | Aprovada |
| 85 | TP-0082 | executor | ✔ | Endpoint PUT /api/grupos/:g/partidas/:data | L18 | TP-0014, TP-0024, TP-0030, TP-0032, TP-0033, TP-0049, TP-0079, TP-0080 | Aprovada |
| 86 | TP-0083 | executor | ✔ | Endpoint DELETE /api/grupos/:g/partidas/:data | L18 | TP-0014, TP-0024, TP-0030, TP-0032, TP-0033, TP-0049 | Aprovada |
| 87 | TP-0084 | executor | ✔ | Endpoint GET /api/publico/:slug/ranking?mes= | L19 | TP-0010, TP-0013, TP-0020, TP-0029, TP-0033, TP-0053 | Aprovada |
| 88 | TP-0085 | executor | ✔ | Endpoint POST /api/publico/:slug/eventos | L19 | TP-0020, TP-0029, TP-0033, TP-0050 | Aprovada |
| 89 | TP-0086 | executor | ✔ | Endpoint GET /api/grupos/:g/uso | L19 | TP-0013, TP-0024, TP-0032, TP-0033, TP-0050 | Aprovada |
| 90 | TP-0087 | executor | ✔ | Limite de taxa em /api/sessao/entrar e /api/publico/* | L19 | TP-0013, TP-0034, TP-0084 | Aprovada |
| 91 | TP-0088 | executor | ✔ | App web: Vite, React 19, Router, TanStack Query, tokens e fontes do mockup, recursos po... | L20 | TP-0001, TP-0004 | Aprovada |
| 92 | TP-0089 | executor | ✔ | Base visual: Playwright, comparar-visual.mjs e job e2e | L20 | TP-0003, TP-0088 | Aprovada |
| 93 | TP-0090 | executor | ✔ | Cabeçalhos de segurança dos arquivos estáticos (_headers) | L20 | TP-0013, TP-0088, TP-0089 | Aprovada |
| 94 | TP-0091 | executor | ✔ | Cliente da API no web (src/dados) | L20 | TP-0005, TP-0088 | Aprovada |
| 95 | TP-0092 | executor | ✔ | Formatação pt-BR (src/formatacao) | L20 | TP-0005, TP-0088 | Aprovada |
| 96 | TP-0093 | executor | ✔ | Rótulos dos enums (src/rotulos) | L20 | TP-0005, TP-0088 | Aprovada |
| 97 | TP-0094 | executor | ✔ | docker-compose.yml (db, backend, frontend) | L21 | TP-0013, TP-0015, TP-0051, TP-0088 | Aprovada |
| 98 | TP-0095 | executor | ✔ | Componentes básicos: Botão, Selo, Faixa, Esqueleto, Estado vazio, Tela de mensagem, Err... | L21 | TP-0088 | Aprovada |
| 99 | TP-0096 | executor | ✔ | Campos de formulário e resumo de erros | L21 | TP-0088, TP-0092, TP-0095 | Aprovada |
| 100 | TP-0097 | executor | ✔ | Controle segmentado, Interruptor e Caixa de seleção | L21 | TP-0088 | Aprovada |
| 101 | TP-0098 | executor | ✔ | Barra superior, barra de ação e "Pular para o conteúdo" | L21 | TP-0088, TP-0095 | Aprovada |
| 102 | TP-0099 | executor | ✔ | Diálogo base e folha inferior/menu | L21 | TP-0088, TP-0095 | Aprovada |
| 103 | TP-0100 | executor | ✔ | Diálogos D1 (senha exibida uma vez) e D2 (confirmação destrutiva) | L22 | TP-0095, TP-0096, TP-0099 | Aprovada |
| 104 | TP-0101 | executor | ✔ | Lista e item, navegador de mês e tabela de semanas | L22 | TP-0088, TP-0092, TP-0095 | Aprovada |
| 105 | TP-0102 | executor | ✔ | Tabela de ranking, marca de rodada e legenda | L22 | TP-0020, TP-0088, TP-0092, TP-0093 | Aprovada |
| 106 | TP-0103 | executor | ✔ | Seletor de situação e contagem fixa | L22 | TP-0024, TP-0088, TP-0093 | Aprovada |
| 107 | TP-0104 | executor | ✔ | Aviso "O app mudou de endereço" | L22 | TP-0095 | Aprovada |
| 108 | TP-0105 | executor | ✔ | Sessão no web e guarda de rotas | L23 | TP-0019, TP-0091 | Aprovada |
| 109 | TP-0106 | executor | ✔ | Layout do admin (barra, grupo ativo, menu da conta) | L23 | TP-0021, TP-0088, TP-0091, TP-0098, TP-0099, TP-0104, TP-0105 | Aprovada |
| 110 | TP-0107 | executor | ✔ | Armazenamento local (grupo lembrado, id anônimo, último ranking) | L23 | TP-0088 | Aprovada |
| 111 | TP-0108 | executor | ✔ | PWA: manifesto, service worker e atualização | L23 | TP-0006, TP-0088 | Aprovada |
| 112 | TP-0109 | executor | ✔ | Tela T00/T02: entrada do app e "Abra o link do seu grupo" | L24 | TP-0088, TP-0089, TP-0095, TP-0107 | Aprovada |
| 113 | TP-0110 | executor | ✔ | Tela T03 e roteamento de /g/:slug | L24 | TP-0020, TP-0089, TP-0091, TP-0095, TP-0107 | Aprovada |
| 114 | TP-0111 | executor | ✔ | Tela T01: ranking público (rede) | L24 | TP-0020, TP-0088, TP-0089, TP-0091, TP-0095, TP-0098, TP-0101, TP-0102, TP-0104, TP-0110 | Aprovada |
| 115 | TP-0112 | executor | ✔ | T01 sem conexão, cache, grupo lembrado e evento de abertura | L24 | TP-0107, TP-0108, TP-0111 | Aprovada |
| 116 | TP-0113 | executor | ✔ | T01 aviso de instalação no iPhone (D5) | L24 | TP-0089, TP-0107, TP-0111 | Aprovada |
| 117 | TP-0207 | executor | ✔ | Componentes de página do admin e das telas públicas (src/componentes/pagina/) | L25 | TP-0089, TP-0095 | Aprovada |
| 118 | TP-0114 | executor | ✔ | Tela T04: Entrar | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0105, TP-0207 | Aprovada |
| 119 | TP-0115 | executor | ✔ | Tela T05: Esqueci a senha | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0114, TP-0207 | Aprovada |
| 120 | TP-0116 | executor | ✔ | Tela T06: Nova senha obrigatória | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0105, TP-0114, TP-0207 | Aprovada |
| 121 | TP-0117 | executor | ✔ | Tela T25: Minha senha | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0105, TP-0106, TP-0114, TP-0116, TP-0207 | Aprovada |
| 122 | TP-0118 | executor | ✔ | Tela T08: Escolher grupo | L25 | TP-0089, TP-0095, TP-0101, TP-0105, TP-0207 | Aprovada |
| 123 | TP-0119 | executor | ✔ | Tela T09: Início do admin | L26 | TP-0021, TP-0089, TP-0092, TP-0095, TP-0101, TP-0106, TP-0111, TP-0207 | Aprovada |
| 124 | TP-0120 | executor | ✔ | Tela T10: Partidas | L26 | TP-0024, TP-0089, TP-0092, TP-0095, TP-0101, TP-0106, TP-0207 | Aprovada |
| 125 | TP-0121 | executor | ✔ | Tela T11: Lançar partida | L26 | TP-0024, TP-0089, TP-0095, TP-0096, TP-0097, TP-0098, TP-0103, TP-0106, TP-0119, TP-0207 | Aprovada |
| 126 | TP-0122 | executor | ✔ | Tela T11: editar e excluir partida | L26 | TP-0100, TP-0120, TP-0121 | Aprovada |
| 127 | TP-0123 | executor | ✔ | Tela T15: Jogadores | L27 | TP-0023, TP-0089, TP-0093, TP-0095, TP-0097, TP-0101, TP-0106, TP-0207 | Aprovada |
| 128 | TP-0124 | executor | ✔ | Tela T16: Ficha do jogador (dados e situação) | L27 | TP-0023, TP-0089, TP-0093, TP-0095, TP-0096, TP-0099, TP-0100, TP-0106, TP-0207 | Aprovada |
| 129 | TP-0125 | executor | ✔ | Tela T18: Pontuação | L27 | TP-0024, TP-0089, TP-0095, TP-0096, TP-0101, TP-0106, TP-0207 | Aprovada |
| 130 | TP-0126 | executor | ✔ | Tela T19: Admins do grupo | L27 | TP-0021, TP-0089, TP-0095, TP-0096, TP-0097, TP-0100, TP-0101, TP-0106, TP-0207 | Aprovada |
| 131 | TP-0127 | executor | ✔ | Tela T20: Dados do grupo e link | L27 | TP-0021, TP-0089, TP-0093, TP-0095, TP-0096, TP-0097, TP-0106, TP-0207 | Aprovada |
| 132 | TP-0128 | executor | ✔ | Tela T21: Uso do app | L27 | TP-0024, TP-0089, TP-0095, TP-0101, TP-0106, TP-0207 | Aprovada |
| 133 | TP-0129 | executor | ✔ | Tela T26: Área do dono | L28 | TP-0022, TP-0089, TP-0095, TP-0097, TP-0098, TP-0100, TP-0101, TP-0105, TP-0106, TP-0207 | Aprovada |
| 134 | TP-0130 | executor | ✔ | Tela T27: Novo grupo | L28 | TP-0022, TP-0089, TP-0093, TP-0095, TP-0096, TP-0097, TP-0098, TP-0100, TP-0105, TP-0129, TP-0207 | Aprovada |
| 135 | TP-0131 | executor | ✔ | Tela T28: Grupo (visão do dono) | L28 | TP-0022, TP-0089, TP-0093, TP-0095, TP-0096, TP-0098, TP-0100, TP-0101, TP-0105, TP-0129, TP-0207 | Aprovada |
| 136 | TP-0132 | executor | ✔ | [U] Neon: projeto novo em São Paulo (PI-1) — **tarefa manual do usuário** | L29 | — | Aprovada |
| 137 | BK-0008 | coordenador | ✔ | Rodar o roteiro Cloudflare (subdomínio, token, wrangler hyperdrive create pelada-prod/pela | — | — | Aprovada |
| 138 | TP-0133 | executor | ✔ | [U] Cloudflare: subdomínio, token e Hyperdrive (PI-2, PI-3) | L29 | BK-0008, TP-0013, TP-0132 | Aprovada |
| 139 | TP-0134 | executor | ✔ | [U] GitHub: secrets e environments (PI-4) | L29 | TP-0132, TP-0133 | Aprovada |
| 140 | SPK-0001 | coordenador | ✔ | Spike S-01: transação interativa pg sobre o Hyperdrive | L29 | TP-0014, TP-0133 | Aprovada |
| 141 | BK-0010 | coordenador | ✔ | Decidir a cifra do backup: o Coordenador mandou openssl aes-256-cbc/pbkdf2, mas o repo usa | — | — | Aprovada |
| 142 | TP-0136 | executor | ✔ | Workflow de backup diário (backup.yml) | L30 | BK-0010, TP-0134 | Aprovada |
| 143 | TP-0135 | executor | ✔ | Workflow de deploy (deploy.yml) | L30 | TP-0003, TP-0013, TP-0015, TP-0133, TP-0134, TP-0136 | Aprovada |
| 144 | TP-0137 | executor | ✔ | Runbook backend/DEPLOY.md e ensaio de restauração | L30 | TP-0041, TP-0135, TP-0136 | Aprovada |
| 145 | TP-0138 | executor | ✔ | E2E de integração do I1 (API real) | L30 | TP-0034, TP-0035, TP-0040, TP-0056, TP-0061, TP-0070, TP-0078, TP-0081, TP-0084, TP-0089, TP-0094, TP-0111, TP-0114, TP-0116, TP-0119, TP-0121, TP-0123, TP-0124, TP-0129, TP-0130 | Aprovada |
| 146 | TP-0139 | executor | ✔ | [U] Go-live do I1 | L30 | SPK-0001, TP-0036, TP-0039, TP-0041, TP-0054, TP-0055, TP-0057, TP-0058, TP-0059, TP-0060, TP-0062, TP-0063, TP-0064, TP-0065, TP-0066, TP-0067, TP-0068, TP-0069, TP-0071, TP-0072, TP-0073, TP-0074, TP-0075, TP-0076, TP-0077, TP-0079, TP-0082, TP-0083, TP-0085, TP-0086, TP-0087, TP-0090, TP-0109, TP-0112, TP-0113, TP-0115, TP-0117, TP-0118, TP-0120, TP-0122, TP-0125, TP-0126, TP-0127, TP-0128, TP-0131, TP-0135, TP-0137, TP-0138 | Aprovada |
| 147 | TP-0145 | executor | ✔ | contrato/habilidades (catálogo e notas) | L32 | TP-0005, TP-0018 | Aprovada |
| 148 | TP-0146 | executor | ✔ | contrato/simulador | L32 | TP-0005, TP-0018 | Aprovada |
| 149 | TP-0147 | executor | ✔ | dominio/simulador/previa: número de times, composição e insuficiência | L32 | TP-0001 | Aprovada |
| 150 | TP-0148 | executor | ✔ | dominio/simulador/prioridade (RN-08) | L32 | TP-0007, TP-0010 | Aprovada |
| 151 | TP-0149 | executor | ✔ | dominio/simulador/classificacao (RN-09A) | L32 | TP-0001 | Aprovada |
| 152 | TP-0150 | executor | ✔ | dominio/simulador/indicadores (indicadores e pares) | L33 | TP-0011, TP-0149 | Aprovada |
| 153 | TP-0151 | executor | ✔ | dominio/simulador/distribuicao-dois (RN-10A) | L33 | TP-0149, TP-0150 | Aprovada |
| 154 | TP-0152 | executor | ✔ | dominio/simulador/distribuicao-varios (RN-10B) | L33 | TP-0147, TP-0150 | Aprovada |
| 155 | TP-0153 | executor | ✔ | dominio/simulador/avisos (RF-47) | L33 | TP-0147, TP-0150 | Aprovada |
| 156 | BK-0006 | coordenador | ✔ | Orçamento de CPU de sugerir estourado (2 times de 11, 30 aptos: mediana 3,9-4,8 ms vs limi | — | — | Aprovada |
| 157 | TP-0154 | executor | ✔ | dominio/simulador/sugerir e teste de orçamento de CPU no CI | L33 | BK-0006, TP-0003, TP-0148, TP-0149, TP-0150, TP-0151, TP-0152, TP-0153 | Aprovada |
| 158 | TP-0155 | executor | ✔ | Endpoint GET /api/grupos/:g/habilidades | L34 | TP-0032, TP-0033, TP-0047, TP-0145 | Aprovada |
| 159 | TP-0156 | executor | ✔ | Endpoint POST /api/grupos/:g/habilidades | L34 | TP-0032, TP-0033, TP-0047, TP-0145 | Aprovada |
| 160 | TP-0157 | executor | ✔ | Endpoint PATCH /api/grupos/:g/habilidades/:id | L34 | TP-0032, TP-0033, TP-0047, TP-0145 | Aprovada |
| 161 | TP-0158 | executor | ✔ | Endpoint DELETE /api/grupos/:g/habilidades/:id | L34 | TP-0014, TP-0030, TP-0032, TP-0033, TP-0047, TP-0145 | Aprovada |
| 162 | TP-0159 | executor | ✔ | Endpoint PUT /api/grupos/:g/jogadores/:id/notas/:habilidadeId | L34 | TP-0011, TP-0023, TP-0032, TP-0033, TP-0046, TP-0047, TP-0145 | Aprovada |
| 163 | TP-0160 | executor | ✔ | Migração de escalações | L35 | TP-0015, TP-0016, TP-0026 | Aprovada |
| 164 | TP-0161 | executor | ✔ | Repositório de escalações | L35 | TP-0014, TP-0016, TP-0017, TP-0160 | Aprovada |
| 165 | TP-0162 | executor | ✔ | Endpoint GET /api/grupos/:g/simulador/contexto?data= | L35 | TP-0007, TP-0011, TP-0013, TP-0029, TP-0032, TP-0033, TP-0047, TP-0052, TP-0146 | Aprovada |
| 166 | TP-0163 | executor | ✔ | Endpoint POST /api/grupos/:g/simulador/previa | L35 | TP-0032, TP-0033, TP-0146, TP-0147 | Aprovada |
| 167 | TP-0164 | executor | ✔ | Extração aplicacao/simulador/entrada (aptos prontos para o domínio) | L35 | TP-0011, TP-0047, TP-0053, TP-0148, TP-0154 | Aprovada |
| 168 | TP-0165 | executor | ✔ | Endpoint POST /api/grupos/:g/simulador/sugerir | L35 | TP-0032, TP-0033, TP-0146, TP-0154, TP-0163, TP-0164 | Aprovada |
| 169 | TP-0166 | executor | ✔ | Endpoint POST /api/grupos/:g/simulador/avaliar | L36 | TP-0032, TP-0033, TP-0146, TP-0150, TP-0153, TP-0164 | Aprovada |
| 170 | TP-0167 | executor | ✔ | Endpoint POST /api/grupos/:g/escalacoes | L36 | TP-0014, TP-0032, TP-0033, TP-0050, TP-0052, TP-0146, TP-0161 | Aprovada |
| 171 | TP-0168 | executor | ✔ | Pré-marcação pela escalação em GET .../partidas/nova | L36 | TP-0078, TP-0161 | Aprovada |
| 172 | TP-0169 | executor | ✔ | Resumo do início com a escalação confirmada | L36 | TP-0061, TP-0161 | Aprovada |
| 173 | SPK-0002 | coordenador | ✔ | Spike S-02: CPU do sugerir no Worker publicado | L36 | TP-0135, TP-0165 | Aprovada |
| 174 | TP-0170 | executor | ✔ | Tela T17: Habilidades | L37 | TP-0089, TP-0095, TP-0096, TP-0100, TP-0101, TP-0106, TP-0145, TP-0207 | Aprovada |
| 175 | TP-0171 | executor | ✔ | Tela T16: seção de notas e nível | L37 | TP-0096, TP-0124, TP-0145 | Aprovada |
| 176 | TP-0172 | executor | ✔ | Tela T12: Simulador (entradas e prévia) | L37 | TP-0089, TP-0095, TP-0096, TP-0097, TP-0098, TP-0101, TP-0106, TP-0146, TP-0207 | Aprovada |
| 177 | TP-0173 | executor | ✔ | Cartão de time, tabela comparativa e lista de avisos | L37 | TP-0088, TP-0092, TP-0095, TP-0146 | Aprovada |
| 178 | TP-0174 | executor | ✔ | Ajuste manual do simulador: D3 e gancho de reavaliação | L37 | TP-0091, TP-0099, TP-0146 | Aprovada |
| 179 | TP-0175 | executor | ✔ | Tela T13: resultado com 2 times | L38 | TP-0089, TP-0098, TP-0100, TP-0106, TP-0172, TP-0173, TP-0174 | Aprovada |
| 180 | TP-0176 | executor | ✔ | Tela T14: resultado com 3 ou mais times | L38 | TP-0089, TP-0098, TP-0100, TP-0106, TP-0172, TP-0173, TP-0174, TP-0175 | Aprovada |
| 181 | TP-0177 | executor | ✔ | E2E de integração do I2 (API real) | L38 | TP-0138, TP-0162, TP-0163, TP-0165, TP-0166, TP-0167, TP-0168, TP-0172, TP-0175 | Aprovada |
| 182 | TP-0178 | executor | ✔ | [U] Go-live do I2 | L38 | SPK-0002, TP-0139, TP-0155, TP-0156, TP-0157, TP-0158, TP-0159, TP-0169, TP-0170, TP-0171, TP-0176, TP-0177 | Aprovada |
| 183 | TP-0179 | executor | ✔ | dominio/pdf: colunas do PDF e PTS INICIAL antes da 1ª coluna | L39 | TP-0010 | Aprovada |
| 184 | TP-0180 | executor | ✔ | contrato/pdf (estrito) | L39 | TP-0018, TP-0020 | Aprovada |
| 185 | TP-0181 | executor | ✔ | Endpoint GET /api/publico/:slug/pdf?mes= | L39 | TP-0013, TP-0029, TP-0033, TP-0053, TP-0179, TP-0180 | Aprovada |
| 186 | TP-0182 | executor | ✔ | Gerador de PDF: desenho da folha | L39 | TP-0004, TP-0088, TP-0092, TP-0093, TP-0180 | Aprovada |
| 187 | BK-0002 | coordenador | ✔ | Comparação visual do PDF (P01) fica em 3,96% (sucesso) e 4,02% (mes-vazio) contra o limite | — | — | Aprovada |
| 188 | TP-0183 | executor | ✔ | Gerador de PDF: uma página, legenda e rodapé | L39 | BK-0002, TP-0182 | Aprovada |
| 189 | TP-0184 | executor | ✔ | T01: Exportar PDF (compartilhar ou baixar) | L39 | TP-0091, TP-0099, TP-0111, TP-0180, TP-0183 | Aprovada |
| 190 | TP-0185 | executor | ✔ | [U] Go-live do I3 e início da janela de 8 semanas | L40 | TP-0178, TP-0181, TP-0184 | Aprovada |
| 191 | TP-0186 | executor | ✔ | contrato/financeiro | L41 | TP-0005, TP-0018 | Aprovada |
| 192 | TP-0187 | executor | ✔ | dominio/caixa: saldos e entrada vinculada | L41 | TP-0007 | Aprovada |
| 193 | TP-0188 | executor | ✔ | Migração do financeiro | L41 | TP-0015, TP-0016, TP-0042 | Aprovada |
| 194 | TP-0189 | executor | ✔ | Repositório do financeiro (e histórico do jogador com pagamentos) | L41 | TP-0014, TP-0016, TP-0017, TP-0046, TP-0074, TP-0188 | Aprovada |
| 195 | TP-0190 | executor | ✔ | Endpoint GET /api/grupos/:g/financeiro/mes?mes= | L42 | TP-0013, TP-0032, TP-0033, TP-0052, TP-0186, TP-0187, TP-0189 | Aprovada |
| 196 | TP-0191 | executor | ✔ | Endpoint PUT /api/grupos/:g/financeiro/config | L42 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Aprovada |
| 197 | TP-0192 | executor | ✔ | Endpoint POST /api/grupos/:g/financeiro/pagamentos (marcar) | L42 | TP-0014, TP-0030, TP-0032, TP-0033, TP-0186, TP-0187, TP-0189 | Aprovada |
| 198 | TP-0193 | executor | ✔ | Endpoint DELETE /api/grupos/:g/financeiro/pagamentos/:jogadorId/:mes (desmarcar) | L42 | TP-0014, TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Aprovada |
| 199 | BK-0011 | coordenador | ✔ | Banco pelada_teste com conta residual (contas_email_unico em montarCenario): ler.test.ts f | — | — | Aprovada |
| 200 | TP-0194 | executor | ✔ | Resumo do início com o saldo atual | L42 | BK-0011, TP-0061, TP-0187, TP-0189 | Aprovada |
| 201 | TP-0195 | executor | ✔ | Endpoint POST /api/grupos/:g/financeiro/lancamentos | L43 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Aprovada |
| 202 | TP-0196 | executor | ✔ | Endpoint GET /api/grupos/:g/financeiro/lancamentos/:id | L43 | TP-0032, TP-0033, TP-0186, TP-0189 | Aprovada |
| 203 | TP-0197 | executor | ✔ | Endpoint PUT /api/grupos/:g/financeiro/lancamentos/:id | L43 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Aprovada |
| 204 | TP-0198 | executor | ✔ | Endpoint DELETE /api/grupos/:g/financeiro/lancamentos/:id | L43 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Aprovada |
| 205 | TP-0199 | executor | ✔ | Tela T22: Financeiro do mês | L44 | TP-0089, TP-0092, TP-0095, TP-0101, TP-0106, TP-0186, TP-0207 | Aprovada |
| 206 | TP-0200 | executor | ✔ | Tela T22: marcar e desmarcar pagamento | L44 | TP-0097, TP-0100, TP-0199 | Aprovada |
| 207 | TP-0201 | executor | ✔ | Tela T23: Lançamento | L44 | TP-0089, TP-0095, TP-0096, TP-0097, TP-0098, TP-0100, TP-0106, TP-0186, TP-0207 | Aprovada |
| 208 | TP-0202 | executor | ✔ | Tela T24: Configuração do caixa | L44 | TP-0089, TP-0095, TP-0096, TP-0098, TP-0106, TP-0186, TP-0199, TP-0207 | Aprovada |
| 209 | TP-0203 | executor | ✔ | Endpoint POST /api/sessao/aviso-privacidade | L45 | TP-0019, TP-0027, TP-0031, TP-0033 | Aprovada |
| 210 | TP-0204 | executor | ✔ | Tela T07: Aviso de privacidade (página e diálogo do 1º acesso) | L45 | TP-0089, TP-0095, TP-0099, TP-0105, TP-0106, TP-0207 | Aprovada |
| 211 | TP-0205 | executor | ✔ | E2E de integração do I4 (API real) | L45 | TP-0138, TP-0190, TP-0191, TP-0192, TP-0193, TP-0195, TP-0199, TP-0200, TP-0201, TP-0202 | Aprovada |
| 212 | TP-0206 | executor | ✔ | [U] Go-live do I4 | L45 | TP-0185, TP-0194, TP-0196, TP-0197, TP-0198, TP-0203, TP-0204, TP-0205 | Aprovada |
| 213 | TP-0208 | executor | ✔ | Adequação ao legado | L46 | TP-0008, TP-0010, TP-0023, TP-0024, TP-0042, TP-0044, TP-0046, TP-0047, TP-0048, TP-0049, TP-0051, TP-0070, TP-0071, TP-0076, TP-0084, TP-0124, TP-0125, TP-0148, TP-0179 | Aprovada |
| 214 | TP-0209 | executor | ✔ | Data de início como regra de pontuação | L47 | TP-0208 | Aprovada |
| 215 | RTP-0182 | executor | ✔ | QUEBRAS.md: registrar que jogadorDetalhe.inicioPontuacao (e pontuacaoInicial) são recus... | Refatoração L47 | TP-0209 | Aprovada |
| 216 | TP-0210 | executor | ✔ | dominio/cobertura-periodos: presença bloqueia a correção, só no que a correção retira | L48 | TP-0007, TP-0009 | Aprovada |
| 217 | TP-0211 | executor | ✔ | dominio/periodos-corrigiveis: tipo do período e o que se pode corrigir | L48 | TP-0009 | Aprovada |
| 218 | TP-0212 | executor | ✔ | dominio/avaliar-periodos: a validação única de RF-79 (corrigir, reativar com retorno, i... | L48 | TP-0007, TP-0009, TP-0210, TP-0211 | Aprovada |
| 219 | TP-0213 | executor | ✔ | dominio/previa-periodos: prévia do efeito de uma correção, reaproveitando previaDoInicio | L48 | TP-0009, TP-0010, TP-0209 | Aprovada |
| 220 | TP-0214 | executor | ✔ | Repositório: id do período e corrigirPeriodo | L48 | TP-0046, TP-0209 | Aprovada |
| 221 | TP-0215 | executor | ✔ | contrato/elenco-periodos: lista, corpo e prévia dos períodos, e dataRetorno opcional no... | L48 | TP-0018, TP-0023, TP-0209 | Aprovada |
| 222 | TP-0216 | executor | ✔ | aplicacao/elenco: mensagens pt-BR das recusas de período | L49 | TP-0212 | Aprovada |
| 223 | TP-0217 | executor | ✔ | aplicacao/elenco: avaliação comum do pedido de períodos (a única porta da prévia, da gr... | L49 | TP-0053, TP-0212, TP-0213, TP-0214, TP-0216 | Aprovada |
| 224 | TP-0218 | executor | ✔ | Endpoint GET /api/grupos/:g/jogadores/:id/periodos | L49 | TP-0013, TP-0032, TP-0033, TP-0069, TP-0211, TP-0214, TP-0215 | Aprovada |
| 225 | TP-0219 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores/:id/periodos/:periodoId/previa | L49 | TP-0013, TP-0032, TP-0033, TP-0215, TP-0217 | Aprovada |
| 226 | BK-0016 | coordenador | ✔ | avaliarPedidoDePeriodos (TP-0217) não devolve ja_ativo para reativar: jogador ativo cairia | — | — | Em execução |
| 227 | TP-0220 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores/:id/reativar/previa | L49 | BK-0016, TP-0013, TP-0032, TP-0033, TP-0215, TP-0217 | Aprovada |
| 228 | TP-0221 | executor | ✔ | Endpoint PUT /api/grupos/:g/jogadores/:id/periodos/:periodoId (corrigir saída e retorno) | L50 | TP-0013, TP-0030, TP-0032, TP-0033, TP-0209, TP-0214, TP-0215, TP-0217 | Aprovada |
| 229 | BK-0017 | coordenador | ✔ | Banco pelada_teste com conta órfã 'Dono' (id 59dcf429-813e-46c0-8f06-f47c074d0bb7, e-mail | — | — | Aprovada |
| 230 | TP-0222 | executor | ✔ | POST /reativar com dataRetorno opcional e auditoria do retorno retroativo | L50 | BK-0017, TP-0013, TP-0030, TP-0033, TP-0073, TP-0215, TP-0217 | Aprovada |
| 231 | TP-0223 | executor | ✔ | Inativar passa a usar a validação única (mensagens com data limite) | L50 | TP-0033, TP-0072, TP-0217, TP-0222 | Aprovada |
| 232 | TP-0224 | executor | ✔ | "Alterar data de início" recusa com a data limite da saída do 1º período | L50 | TP-0209, TP-0216, TP-0221 | Aprovada |
| 233 | TP-0225 | executor | ✔ | Teste de regressão: correção de período chega a todos os consumidores sem mudar ponto | L50 | TP-0069, TP-0078, TP-0079, TP-0084, TP-0162, TP-0181, TP-0190, TP-0221, TP-0222 | Aprovada |
| 234 | TP-0226 | executor | ✔ | Checagem automática da G-26 (correção de período só em transação com jogador travado e... | L50 | TP-0002, TP-0221, TP-0222, TP-0223 | Aprovada |
| 235 | TP-0227 | executor | ✔ | T16: lista "Períodos de atividade" na seção Situação | L51 | TP-0089, TP-0091, TP-0092, TP-0093, TP-0101, TP-0124, TP-0209, TP-0215 | Aprovada |
| 236 | TP-0228 | executor | ✔ | Componente PreviaPeriodos (texto da prévia de D6 e D7) | L51 | TP-0092, TP-0095, TP-0215 | Aprovada |
| 237 | TP-0229 | executor | ✔ | T16: diálogo D7 "Corrigir datas" | L51 | TP-0099, TP-0215, TP-0227, TP-0228 | Aprovada |
| 238 | TP-0230 | executor | ✔ | T16: diálogo D6 "Reativar" com data de retorno | L51 | TP-0215, TP-0227, TP-0228, TP-0229 | Aprovada |
| 239 | TP-0231 | executor | ✔ | T16: recusas com data limite em "Inativar" e "Alterar data de início" | L51 | TP-0124, TP-0209, TP-0215 | Aprovada |
| 240 | RTP-0001 | executor | ✔ | Lint: backend/scripts importando @pelada/api por alias fura a zona (e falta o teste do... | L01 | TP-0002 | Aprovada |
| 241 | RTP-0003 | executor | ✔ | Teste de enums: conferir situacao de presença das respostas contra o enum | Refatoração Lote-L01 | TP-0005 | Aprovada |
| 242 | BK-0003 | coordenador | ✔ | Exige push da branch ci-prova e PR real no remoto (ação manual/autorização do usuário); ro | — | — | Aprovada |
| 243 | RTP-0014 | executor | ✔ | Executar a prova do CI em PR real (ci-prova) | Refatoração Lote-L01 | BK-0003, TP-0003 | Aprovada |
| 244 | RTP-0015 | executor | ✔ | Fixar por SHA de commit as actions de terceiros dos workflows (gitleaks-action, pnpm/ac... | Refatoração Lote-L01 | TP-0003 | Aprovada |
| 245 | RTP-0002 | executor | ✔ | Lint: aliases contornam Date.now() (G-06) e document.cookie (G-09) | L01 | TP-0002 | Aprovada |
| 246 | RTP-0004 | executor | ✔ | Remover teste duplicado de slug em src/grupos | Refatoração Lote-L02 | TP-0012 | Aprovada |
| 247 | RTP-0005 | executor | ✔ | Remover teste duplicado de pontuação em src/pontuacao | L02 | TP-0008 | Aprovada |
| 248 | RTP-0007 | executor | ✔ | Remover teste duplicado de atividade em src/atividade | L02 | TP-0009 | Aprovada |
| 249 | BK-0004 | coordenador | ✔ | Falta apagar backend/dominio/src/simulador/indicadores.test.ts (rm negado pela permissão) | — | — | Aprovada |
| 250 | RTP-0006 | executor | ✔ | Remover teste duplicado de indicadores em src/simulador | Refatoração Lote-L33 | BK-0004, TP-0150 | Aprovada |
| 251 | RTP-0012 | executor | ✔ | distribuirVariosTimes: limitar o tamanho da entrada (orçamento de CPU) | Refatoração Lote-L33 | TP-0152 | Aprovada |
| 252 | RTP-0008 | executor | ✔ | Atualizar sharp e undici transitivos do wrangler/miniflare (pnpm audit alto) | Refatoração Lote-L03 | TP-0013 | Aprovada |
| 253 | RTP-0009 | executor | ✔ | Teste do módulo de dados: cobrir tipo público e pid fora da transação | Refatoração Lote-L03 | TP-0014 | Aprovada |
| 254 | RTP-0019 | executor | ✔ | checar-grupo-id: cobrir exports que não são function/arrow direta (classe, objeto, funç... | Refatoração Lote-L03 | TP-0016 | Aprovada |
| 255 | RTP-0057 | executor | ✔ | checar-grupo-id: cobrir alias, ternário, acesso a membro, namespace e arrow com satisfies | Refatoração Lote-L03 | RTP-0019 | Aprovada |
| 256 | RTP-0061 | executor | ✔ | checar-grupo-id: fechar contornos restantes (propriedade estática arrow, let sem inicia... | Refatoração Lote-L03 | RTP-0057 | Aprovada |
| 257 | RTP-0064 | executor | ✔ | checar-grupo-id: fechar construtor com corpo, arquivos fora da listagem e casts sobre dado | Refatoração Lote-L03 | RTP-0061 | Aprovada |
| 258 | RTP-0010 | executor | ✔ | Testes de distribuicao-varios: prova de todos candidatos ao incompleto e chave com idade | Refatoração Lote-33 | TP-0152 | Aprovada |
| 259 | RTP-0011 | executor | ✔ | distribuicao-dois: remover regra de saída duplicada (substituicoes) | Refatoração Lote-33 | TP-0151 | Aprovada |
| 260 | RTP-0013 | executor | ✔ | Foco preso: Shift+Tab a partir do título (focoNoTitulo) escapa do Dialogo | Refatoração Lote-L21 | TP-0099 | Aprovada |
| 261 | RTP-0016 | executor | ✔ | ResumoErros: aplicar o estilo .resumo (CSS morto em Campo.module.css) | Refatoração Lote-L21 | TP-0096 | Aprovada |
| 262 | RTP-0052 | executor | ✔ | ResumoErros: remover o ícone da faixa para igualar o mockup (T06 erro) | Refatoração Lote-L21 | RTP-0016 | Aprovada |
| 263 | RTP-0095 | executor | ✔ | docker-compose: publicar portas só em 127.0.0.1 (Postgres com senha fictícia, wrangler... | L21 | TP-0094 | Aprovada |
| 264 | BK-0005 | coordenador | ✔ | Item (b) feito; item (a) exige PR real com job e2e verde (push/PR autorizado pelo usuário) | — | — | Aprovada |
| 265 | RTP-0017 | executor | ✔ | Provar job e2e verde em PR real e cobrir dist/ ausente em visual.mjs | Refatoração Lote-L20 | BK-0005, TP-0089 | Aprovada |
| 266 | RTP-0018 | executor | ✔ | Testes faltantes da compatibilidade do contrato (eDono em resposta/QUEBRAS, enum de ent... | Refatoração Lote-L04 | TP-0018 | Aprovada |
| 267 | RTP-0021 | executor | ✔ | RankingPublico: enderecoNovo obrigatório (url ou null) | Refatoração Lote-L04 | TP-0020 | Aprovada |
| 268 | RTP-0020 | executor | ✔ | Teste D1: cobrir indexedDB.open, classe monoespaçada e ausência da senha após desmontar | Refatoração Lote-L22 | TP-0100 | Aprovada |
| 269 | RTP-0022 | executor | ✔ | ConteudoPagina: copiar .conteudo do mockup (largura-conteudo) em vez de reaproveitar o... | 25 | TP-0207 | Aprovada |
| 270 | RTP-0026 | executor | ✔ | Pagina.module.css: regra @media de .conteudoEstreito anulada pela regra base | 25 | TP-0118 | Aprovada |
| 271 | RTP-0023 | executor | ✔ | Mockup: avisos como div[role=status] com ul dentro (alinhar ao código de TP-0173) | Refatoração Lote-37 | TP-0173 | Aprovada |
| 272 | RTP-0024 | executor | ✔ | useAjusteSimulador: reaproveitar usarValorAtrasado no debounce de 300 ms | Refatoração Lote-37 | TP-0174 | Aprovada |
| 273 | RTP-0025 | executor | ✔ | useAjusteSimulador: corpo inválido não pode deixar Confirmar habilitado | Refatoração Lote-37 | TP-0174 | Aprovada |
| 274 | RTP-0035 | executor | ✔ | T12 vazio: largura do cartão 560 px no app vs 512 px no mockup | Refatoração Lote-37 | TP-0172 | Aprovada |
| 275 | RTP-0027 | executor | ✔ | Teste da Legenda oculta sem partidas (T01) | Refatoração Lote-24 | TP-0111 | Aprovada |
| 276 | RTP-0028 | executor | ✔ | T19: teste axe com o diálogo D1/D2 aberto | Refatoração Lote-L27 | TP-0126 | Aprovada |
| 277 | RTP-0030 | executor | ✔ | Mockup T15: barra-acao dentro do main e seta nos itens (alinhar ao app) | Refatoração Lote-L27 | TP-0123 | Aprovada |
| 278 | RTP-0032 | executor | ✔ | T18: testes axe em erro/salvo, ajuda ligada e rótulos em src/rotulos | Refatoração Lote-L27 | TP-0125 | Aprovada |
| 279 | RTP-0033 | executor | ✔ | Mockup T16 edicao: apelido sem ajuda 'De 2 a 30 caracteres' (alinhar ao novo e ao app) | Refatoração Lote-L27 | TP-0124 | Aprovada |
| 280 | RTP-0036 | executor | ✔ | Mockup T20: URL do link estoura a janela de 390 px (adicionar overflow-wrap) | Refatoração Lote-L27 | TP-0127 | Aprovada |
| 281 | RTP-0053 | executor | ✔ | Mockup T16 inativo: apelido sem ajuda 'De 2 a 30 caracteres' (alinhar ao novo e à edição) | L27 | RTP-0033 | Aprovada |
| 282 | RTP-0029 | executor | ✔ | Mockup: .barra-acao dentro do main em T10, T13, T14, T15, T22 e T26 (como T11/T24) | Refatoração Lote-L26 | TP-0120 | Aprovada |
| 283 | RTP-0034 | executor | ✔ | Mockup T09 sem-jogadores: meta de Partidas 'Nenhuma ainda' -> 'Nenhuma em outubro' | Refatoração Lote-L26 | TP-0119 | Aprovada |
| 284 | RTP-0044 | executor | ✔ | Mockup: ícone de atenção no .campo__erro (como o app e base.css) | Refatoração Lote-L26 | TP-0121 | Aprovada |
| 285 | RTP-0045 | executor | ✔ | T11: usar FerramentasLista compartilhado em vez do local telas/partida/FerramentasLista | Refatoração Lote-L26 | TP-0121 | Aprovada |
| 286 | RTP-0046 | executor | ✔ | T11: validar o corpo com salvarPartidaCorpo antes de enviar o POST | Refatoração Lote-L26 | TP-0121 | Aprovada |
| 287 | RTP-0031 | executor | ✔ | T06: teste de 72 caracteres envia (limite superior) | Refatoração Lote-L25 | TP-0116 | Aprovada |
| 288 | RTP-0037 | executor | ✔ | Mockup T26: seta nos itens de grupo e sessão sem grupos no estado vazio | L28 | TP-0129 | Aprovada |
| 289 | RTP-0039 | executor | ✔ | Harness T27: sessão de dono sem grupos no estado vazio | Refatoração Lote-L28 | RTP-0037 | Aprovada |
| 290 | RTP-0042 | executor | ✔ | Testes da T27: Criando…/clique duplo, painel invalidado, 500, axe no D1 | Refatoração Lote-L28 | TP-0130 | Aprovada |
| 291 | RTP-0038 | executor | ✔ | T22: largura do vazio-config e margens negativas do SemAcessoFinanceiro acopladas ao la... | Refatoração Lote-L44 | TP-0199 | Aprovada |
| 292 | RTP-0047 | executor | ✔ | T24: largura do formulário 560 px no app vs 512 px no mockup (pc) | Refatoração Lote-L44 | TP-0202 | Aprovada |
| 293 | RTP-0048 | executor | ✔ | T22: valor do D2 de desmarcar não pode cair em config.mensalidadeCentavos | L44 | TP-0200 | Aprovada |
| 294 | RTP-0055 | executor | ✔ | T22: teste de desmarcar com mensalidade alterada depois (entrada ≠ config) | Refatoração Lote-L44 | RTP-0048 | Aprovada |
| 295 | RTP-0040 | executor | ✔ | Mockup base.css: .campo__entrada--nota perde para .campo__entrada (selects de nota esti... | Refatoração Lote-L37 | TP-0171 | Aprovada |
| 296 | RTP-0041 | executor | ✔ | T28: completar testes do plano (Ativo envia null, 422 da situação, reativar, rede, axe... | Refatoração Lote-28 | TP-0131 | Aprovada |
| 297 | RTP-0043 | executor | ✔ | T13: teste de página cobrir selos e trocas do sucesso; ajuda do Não entra 8 px abaixo d... | L38 | TP-0175 | Aprovada |
| 298 | RTP-0049 | executor | ✔ | T10: teste da faixa 'Partida de dd/mm excluída.' e UX-SPEC T11 (QA TP-0122) | Refatoração Lote-26 | TP-0122 | Aprovada |
| 299 | RTP-0050 | executor | ✔ | T01 PDF: completar testes (troca de mês, POST pdf_exportado real, axe das faixas) | Refatoração Lote-L39 | TP-0184 | Aprovada |
| 300 | RTP-0054 | executor | ✔ | Teste flaky 'toque antes da projeção chegar' (exportar-pdf) depende de delay de 150 ms | Refatoração Lote-L39 | RTP-0050 | Aprovada |
| 301 | RTP-0058 | executor | ✔ | dominio/pdf: testes do plano que faltam (mockup, troca de pesos, mês com mais de 12) | Refatoração Lote-L39 | TP-0179 | Aprovada |
| 302 | RTP-0096 | executor | ✔ | pdf.test.ts: cobrir lacunas do plano de teste de GET publico/:slug/pdf | Refatoração Lote-L39 | TP-0181 | Aprovada |
| 303 | RTP-0051 | executor | ✔ | dominio/caixa: unificar testes duplicados | Refatoração Lote-L41 | TP-0187 | Aprovada |
| 304 | RTP-0102 | executor | ✔ | Dividir repositorios/financeiro.ts (319 linhas) em config, pagamentos e lançamentos | Refatoração Lote-L41 | TP-0189 | Aprovada |
| 305 | RTP-0123 | executor | ✔ | Corrigir tsc em excluir.test.ts:80 (mensalidade: null vs boolean) | Refatoração Lote-L41 | RTP-0102 | Aprovada |
| 306 | RTP-0124 | executor | ✔ | pagamentos-marcar.test.ts:57 falha: 'sem configuração financeira' gera lançamento de me... | Refatoração Lote-L41 | RTP-0102 | Aprovada |
| 307 | RTP-0056 | executor | ✔ | Documentar no banco que auditoria.resumo nunca recebe senha/token | Refatoração Lote-L06 | TP-0025 | Aprovada |
| 308 | RTP-0059 | executor | ✔ | sessoes: teste de uma consulta por chamada em buscarValidaEDeslizar | Refatoração Lote-L06 | TP-0028 | Aprovada |
| 309 | RTP-0060 | executor | ✔ | Teste de custo igual (e-mail existente vs inexistente) robusto sob carga | Refatoração Lote-L06 | TP-0027 | Aprovada |
| 310 | RTP-0065 | executor | ✔ | auditoria.registrar: recusar chaves sensíveis em qualquer posição do nome | Refatoração Lote-L06 | TP-0030 | Aprovada |
| 311 | RTP-0066 | executor | ✔ | Teste anti-enumeração: provar também o custo bcrypt do hash fixo | Refatoração Lote-L06 | RTP-0060 | Aprovada |
| 312 | RTP-0062 | executor | ✔ | Teste de escalações: datas e momento derivados do relógio fixo | Refatoração Lote-L35 | TP-0160 | Aprovada |
| 313 | RTP-0126 | executor | ✔ | Teste de montarEntradaSimulador: completar casos do plano (nota de outro grupo, idade j... | Refatoração Lote-L35 | TP-0164 | Aprovada |
| 314 | RTP-0129 | executor | ✔ | Testes: trocar os 5 espiões de pg.Client.query copiados por contarConsultas | Refatoração Lote-L35 | RTP-0126 | Aprovada |
| 315 | RTP-0063 | executor | ✔ | Cookie de sessão duplicado: recusar em vez de usar o primeiro | Refatoração Lote-L07 | TP-0031 | Aprovada |
| 316 | RTP-0069 | executor | ✔ | Testes dos middlewares de grupo/dono: escopo troca_de_senha, /api/grupos//eco e arquivo... | Refatoração Lote-L07 | TP-0032 | Aprovada |
| 317 | RTP-0074 | executor | ✔ | Suíte de isolamento: rota ALL visível e conferência de limpeza | L07 | TP-0033 | Aprovada |
| 318 | RTP-0084 | executor | ✔ | Entrar: bloqueio por e-mail sem atomicidade entre consulta e registro de falha | Refatoração Lote-L07 | TP-0034 | Aprovada |
| 319 | RTP-0067 | executor | ✔ | Eventos de uso: completar testes do plano (tipos fechados, colunas gravadas, N+1, fábrica) | Refatoração Lote-L10 | TP-0050 | Aprovada |
| 320 | RTP-0071 | executor | ✔ | Habilidades: usar seViolarUnico de comum.ts | L10 | TP-0047 | Aprovada |
| 321 | RTP-0075 | executor | ✔ | Repositório de partidas: relógio fixo, fábrica de partidas e seViolarUnico | L10 | TP-0049 | Aprovada |
| 322 | RTP-0076 | executor | ✔ | Repositório de partidas: criar/substituir exigem Tx | L10 | TP-0049 | Aprovada |
| 323 | RTP-0080 | executor | ✔ | Seed local: teste duplicado, rollback e trava positiva sem cobertura | L10 | TP-0051 | Aprovada |
| 324 | RTP-0083 | executor | ✔ | Regra de lint: apagarDadosDoSeed só importável por backend/scripts | L10 | TP-0051 | Aprovada |
| 325 | RTP-0068 | executor | ✔ | Teste de admin-por-email: asserir auditoria admin_vinculado e e-mail com caixa/espaços | Refatoração Lote-L08 | TP-0038 | Aprovada |
| 326 | RTP-0072 | executor | ✔ | Checagem de escrita de e_dono: janela de 300 caracteres deixa passar INSERT/values longos | Refatoração Lote-L08 | TP-0041 | Aprovada |
| 327 | RTP-0077 | executor | ✔ | Checagem de escrita de e_dono: exceção cobre o arquivo contas.ts inteiro, não só criarC... | L08 | TP-0041 | Aprovada |
| 328 | RTP-0085 | executor | ✔ | Trocar senha: limitar tentativas da senha atual no escopo completo | L08 | TP-0040 | Aprovada |
| 329 | RTP-0098 | executor | ✔ | Teste de trocar-senha: caso dos 5 erros estoura o timeout padrão de 5 s | L08 | RTP-0085 | Aprovada |
| 330 | RTP-0105 | executor | ✔ | Trocar senha: serializar a checagem de bloqueio da senha atual (corrida entre consulta... | L08 | RTP-0085 | Aprovada |
| 331 | RTP-0104 | executor | ✔ | checar-escrita-e-dono: ';' dentro de string ou objeto pré-montado esconde a escrita de... | L08 | RTP-0072 | Aprovada |
| 332 | RTP-0110 | executor | ✔ | checar-escrita-e-dono: atribuição o.e_dono = v e valor-expressão em chave de objeto esc... | Refatoração Lote-L08 | RTP-0104 | Aprovada |
| 333 | RTP-0112 | executor | ✔ | checar-escrita-e-dono: '//' ou '--' dentro de literal de texto apaga o resto da linha e... | Refatoração Lote-L08 | RTP-0104 | Aprovada |
| 334 | RTP-0121 | executor | ✔ | checar-escrita-e-dono: atribuição por colchete, composta (//=) e valor-expressão com ch... | Refatoração Lote-L08 | RTP-0110 | Aprovada |
| 335 | RTP-0122 | executor | ✔ | checar-escrita-e-dono: atribuição composta bit a bit (/=, &=, ^=, >>=) escapa | Refatoração Lote-L08 | RTP-0121 | Aprovada |
| 336 | RTP-0070 | executor | ✔ | Teste de partidas: relógio fixo e casos faltantes do plano | Refatoração Lote-L09 | TP-0044 | Aprovada |
| 337 | RTP-0078 | executor | ✔ | Asserção automática do limite de 4 consultas em carregarHistoricoGrupo | L11 | TP-0053 | Aprovada |
| 338 | RTP-0086 | executor | ✔ | Completar testes do POST /api/dono/grupos conforme o plano (atomicidade por passo, corr... | Refatoração Lote-L11 | TP-0056 | Aprovada |
| 339 | RTP-0089 | executor | ✔ | Teste do painel do dono: forma contra dono-painel*.json e 403 de troca_de_senha | L11 | TP-0054 | Aprovada |
| 340 | RTP-0081 | executor | ✔ | Teste de ordem por nome em GET /api/grupos/:g/admins | Refatoração Lote-L14 | TP-0063 | Aprovada |
| 341 | RTP-0082 | executor | ✔ | Testes de aplicação com db-worker rodam no projeto node do vitest | L15 | TP-0069 | Aprovada |
| 342 | RTP-0106 | executor | ✔ | montarCenario usa e-mail de dono fixo: testes de aplicação colidem em contas_email_unic... | Refatoração Lote-L15 | RTP-0082 | Aprovada |
| 343 | RTP-0111 | executor | ✔ | montarCenario chamado duas vezes no mesmo teste colide em contas_email_unico (pagamento... | Refatoração Lote-L15 | RTP-0106 | Aprovada |
| 344 | RTP-0087 | executor | ✔ | Testes da rota GET /api/grupos/:g: cobrir sexta, saídas, mês/semana e grupo B | Refatoração Lote-L13 | TP-0061 | Aprovada |
| 345 | RTP-0099 | executor | ✔ | ler.test.ts: jogadoresEPartidas reutiliza o helper criarPartida | Refatoração Lote-L13 | RTP-0087 | Aprovada |
| 346 | RTP-0088 | executor | ✔ | Testes de partidas/nova: cobrir lacunas do plano da TP-0078 | Refatoração Lote-L17 | TP-0078 | Aprovada |
| 347 | RTP-0091 | executor | ✔ | Remover teste duplicado de GET partidas (partidas/listar.test.ts) | L17 | TP-0077 | Aprovada |
| 348 | RTP-0090 | executor | ✔ | Teste de reativar: acumulado mantido e ativosNaData | Refatoração Lote-L16 | TP-0073 | Aprovada |
| 349 | RTP-0092 | executor | ✔ | Testes de inativar: cobrir bordas e efeito do plano do TP-0072 | Refatoração Lote-L16 | TP-0072 | Aprovada |
| 350 | RTP-0093 | executor | ✔ | Testes de partida nova: inativado depois e 409 com escalação (TP-0168) | Refatoração Lote-L36 | TP-0168 | Aprovada |
| 351 | RTP-0097 | executor | ✔ | Unificar a enumeração de ids da composição (idsDaComposicao duplicada em 3 lugares) | L36 | TP-0167 | Aprovada |
| 352 | RTP-0108 | executor | ✔ | Confirmar escalação: recusar id repetido na composição (422) | Refatoração Lote-L36 | TP-0167 | Aprovada |
| 353 | RTP-0128 | executor | ✔ | Teste de simulador/avaliar: completar casos do plano | Refatoração Lote-L36 | TP-0166 | Aprovada |
| 354 | RTP-0094 | executor | ✔ | Testes do ranking público: cobrir o plano do TP-0084 em publico-ranking.test.ts | L19 | TP-0084 | Aprovada |
| 355 | RTP-0103 | executor | ✔ | limite-taxa.test: idempotência do login e lacunas do plano (IP distinto, no-store, POST... | Refatoração Lote-L19 | TP-0087 | Aprovada |
| 356 | RTP-0109 | executor | ✔ | Limitador de taxa: binding ausente em produção desliga o limite sem aviso | Refatoração Lote-L19 | TP-0087 | Aprovada |
| 357 | RTP-0100 | executor | ✔ | Testes do POST partidas: concorrência, falha no evento e 422 de corpo | Refatoração Lote-L18 | TP-0081 | Aprovada |
| 358 | RTP-0101 | executor | ✔ | Teste do PUT partidas: 404 de :data malformada sem consulta ao banco | L18 | TP-0082 | Aprovada |
| 359 | RTP-0107 | executor | ✔ | sw.ts: validade máxima (maxAgeSeconds) no cache do ranking público | L23 | TP-0108 | Aprovada |
| 360 | RTP-0116 | executor | ✔ | Teste de ícones PWA falha: public/icones diferem do mockup byte a byte | Refatoração Lote-L23 | TP-0108 | Aprovada |
| 361 | RTP-0113 | executor | ✔ | Alinhar o nome do branch de produção do Neon (production) em deploy.yml, SDD e tarefas... | Refatoração Lote-L29 | TP-0132 | Aprovada |
| 362 | BK-0007 | coordenador | ✔ | Rotacionar senhas pelada_app/pelada_backup no console do Neon (ALTER ROLE nos branches pro | — | — | Aprovada |
| 363 | RTP-0114 | executor | ✔ | Rotacionar senhas de pelada_app/pelada_backup do Neon antes do primeiro uso real | Refatoração Lote-L29 | BK-0007, TP-0132 | Aprovada |
| 364 | RTP-0115 | executor | ✔ | Ignorar .pnpm-store/ e .tmp-out.txt no .gitignore | Refatoração Lote-L29 | TP-0132 | Aprovada |
| 365 | RTP-0117 | executor | ✔ | Faixa 'Jogador salvo' não aparece após cadastrar jogador (state não lido) | Refatoração Lote-L30 | TP-0124 | Aprovada |
| 366 | RTP-0118 | executor | ✔ | Trace do e2e de integração guarda a senha temporária (resposta de POST /api/dono/grupos) | Refatoração Lote-L30 | TP-0138 | Aprovada |
| 367 | RTP-0119 | executor | ✔ | docker-compose repete o e-mail real do dono em literal | Refatoração Lote-L30 | TP-0138 | Aprovada |
| 368 | RTP-0120 | executor | ✔ | checar-escrita-e-dono: '--' de código (i--) é tratado como comentário SQL e esconde e_dono | Refatoração Lote-L30 | RTP-0112 | Aprovada |
| 369 | RTP-0125 | executor | ✔ | Auditoria da config financeira: ler config anterior com trava (FOR UPDATE) | Refatoração Lote-L42 | TP-0191 | Aprovada |
| 370 | RTP-0127 | executor | ✔ | DELETE lançamento: 409 sem apelido e mês na mensagem (decidido na §1.4) | Refatoração Lote-L43 | TP-0198 | Aprovada |
| 371 | RTP-0130 | executor | ✔ | T16 Ficha do jogador (sem-habilidades): voltar ao mockup (seção de habilidades 1 px des... | Refatoração Revisão 2026-10-18 | — | Aprovada |
| 372 | RTP-0131 | executor | ✔ | Formulários de tela usam o Formulario compartilhado e um só .formulario/.duasColunas [M... | Refatoração Revisão 2026-10-18 | — | Aprovada |
| 373 | RTP-0132 | executor | ✔ | ResultadoDois/ResultadoVarios: extrair confirmação, faixas de erro e diálogo de refazer... | Refatoração Revisão 2026-10-18 | — | Aprovada |
| 374 | RTP-0133 | executor | ✔ | Hook único useMesDaUrl para ?mes= malformado (Ranking, Partidas, Financeiro) [Média] | Refatoração Revisão 2026-10-18 | — | Aprovada |
| 375 | RTP-0134 | executor | ✔ | eslint.config.mjs e checar-grupo-id.mjs abaixo de 300 linhas [Baixa] | Refatoração Revisão 2026-10-18 | — | Aprovada |
| 376 | RTP-0135 | executor | ✔ | dump-cifrado: não deixar o psql/pg_dump ecoar o host do Neon no log público | Refatoração Lote-30 | TP-0136 | Aprovada |
| 377 | RTP-0136 | executor | ✔ | backup: guardar só o destinatário público age no secret (não a identidade privada) | Refatoração Lote-30 | TP-0136 | Aprovada |
| 378 | RTP-0137 | executor | ✔ | deploy.yml: ler o id do Hyperdrive com o parser do teste de configuração (sem duplicar) | Refatoração Lote-30 | TP-0135 | Aprovada |
| 379 | RTP-0138 | executor | ✔ | deploy.yml: rollback sem interpolação em run: e build do web antes da migração | Refatoração Lote-30 | TP-0135 | Aprovada |
| 380 | RTP-0139 | executor | ✔ | deploy.yml: saída do hyperdrive get sem ruído do pnpm antes do JSON.parse | Refatoração Lote-30 | TP-0135 | Aprovada |
| 381 | RTP-0140 | executor | ✔ | checar-wrangler-deploy: reconhecer wrangler com flags antes do subcomando deploy | Refatoração Lote-30 | TP-0135 | Aprovada |
| 382 | RTP-0141 | executor | ✔ | deploy.yml: checkout com persist-credentials false | Refatoração Lote-30 | TP-0135 | Aprovada |
| 383 | RTP-0142 | executor | ✔ | DEPLOY.md: higiene de segredo e dado pessoal nos comandos do runbook | Refatoração Lote-30 | TP-0137 | Aprovada |
| 384 | RTP-0143 | executor | ✔ | deploy.yml: passo do Hyperdrive compatível com o wrangler 4.151.0 (sem --json) e id com... | Refatoração Lote-30 | TP-0135 | Aprovada |
| 385 | RTP-0144 | executor | ✔ | backup.yml e ci.yml: checkout com persist-credentials false | Refatoração Lote-30 | RTP-0141 | Aprovada |
| 386 | RTP-0145 | executor | ✔ | DEPLOY.md: comandos da restauração sem caminho quebrado e com opção para PowerShell | Refatoração Lote-30 | RTP-0142 | Aprovada |
| 387 | RTP-0146 | executor | ✔ | hyperdrive-id: validar o formato do id (32 hex) antes de imprimir | Refatoração Lote-30 | RTP-0137 | Aprovada |
| 388 | RTP-0147 | executor | ✔ | checar-wrangler-deploy: cobrir pages deploy, triggers deploy, publish e wrangler-action... | Refatoração Lote-30 | RTP-0140 | Aprovada |
| 389 | RTP-0148 | executor | ✔ | verificar-cache-hyperdrive: nao depender de import.meta.main (fail-open em Node < 22.18... | Refatoração Lote-30 | RTP-0143 | Aprovada |
| 390 | RTP-0149 | executor | ✔ | DEPLOY.md: icacls da identidade em uma linha e equivalente do pgpass no Windows | Refatoração Lote-30 | RTP-0145 | Aprovada |
| 391 | RTP-0150 | executor | ✔ | deploy.yml: enviar o token da Cloudflare ao curl sem poder injetar diretivas | Refatoração Lote-30 | RTP-0143 | Aprovada |
| 392 | RTP-0154 | executor | ✔ | checar-urls-absolutas reprova consultar-hyperdrive.sh: base da API da Cloudflare no cod... | 30 | RTP-0150 | Aprovada |
| 393 | RTP-0152 | executor | ✔ | checar-wrangler-deploy: varrer Dockerfile, Makefile, justfile, ps1, cmd, bat e py e cob... | Refatoração Lote-30 | RTP-0147 | Aprovada |
| 394 | RTP-0155 | executor | ✔ | arquivos.mjs: quebrar linha do filter para o prettier (introduzida na RTP-0152) | 30 | RTP-0152 | Aprovada |
| 395 | RTP-0151 | executor | ✔ | DEPLOY.md: limpar a senha da sessao PowerShell e reconhecer que apagar em NTFS/SSD nao... | Refatoração Lote-30 | RTP-0145 | Aprovada |
| 396 | RTP-0153 | executor | ✔ | verificar-cache-hyperdrive: teste estatico que impede import.meta.main e guarda condici... | Refatoração Lote-30 | RTP-0148 | Aprovada |
| 397 | RTP-0156 | executor | ✔ | DEPLOY.md: avisar que EFS não existe no Windows Home e dar alternativa para o dump deci... | Refatoração Lote-30 | RTP-0151 | Aprovada |
| 398 | RTP-0157 | executor | ✔ | checar-wrangler-deploy: ignorar maiúsculas em extensões e nomes (.BAT, .PS1, .YML, dock... | Refatoração Lote-30 | RTP-0152 | Aprovada |
| 399 | RTP-0158 | executor | ✔ | docker-compose.yml:47 reprovado por checar-urls-absolutas (URL_PUBLICA com URL literal,... | 30 | TP-0094 | Aprovada |
| 400 | RTP-0159 | executor | ✔ | verificar-cache-hyperdrive: endurecer teste estatico da CLI contra guarda em bloco e im... | 30 | RTP-0153 | Aprovada |
| 401 | RTP-0160 | executor | ✔ | consultar-hyperdrive: validar a base da API (https e host da Cloudflare) antes de envia... | Refatoração Lote-30 | RTP-0154 | Aprovada |
| 402 | RTP-0161 | executor | ✔ | DEPLOY.md: alternativa tmpfs do passo 6 avisar de swap em disco e Device Encryption sem... | Refatoração Lote-30 | RTP-0156 | Aprovada |
| 403 | RTP-0163 | executor | ✔ | Alinhar docs ao deploy só manual: SDD §3, ADR-020, backend/README, aceite da TP-0135 e... | Refatoração Lote-30 | TP-0139 | Aprovada |
| 404 | RTP-0164 | executor | ✔ | Alinhar ao go-live sem VITE_RECURSOS_DESLIGADOS: remover a variável do deploy.yml/DEPLO... | 30 | TP-0139 | Aprovada |
| 405 | RTP-0162 | executor | ✔ | deploy.yml: lógica do branch de restauração do Neon em script testado (hoje node -e inl... | Refatoração Revisão 2026-10-19 | — | Aprovada |
| 406 | RTP-0165 | executor | ✔ | I2: provar a troca do ajuste e a composição enviada ao confirmar | Refatoração Lote-38 | TP-0177 | Aprovada |
| 407 | RTP-0166 | executor | ✔ | I4: provar que desmarcar duas vezes não duplica a remoção (2º DELETE) | Refatoração Lote-45 | TP-0205 | Aprovada |
| 408 | RTP-0167 | executor | ✔ | PATCH de jogador sem pontuacaoInicial não zera a pontuação inicial | Refatoração Lote-46 | TP-0208 | Aprovada |
| 409 | RTP-0168 | executor | ✔ | Importar-legado: arquivo de correções (--correcoes) para chuva em datas e presenças cor... | Refatoração Lote-46 | TP-0208 | Aprovada |
| 410 | RTP-0173 | executor | ✔ | Importar-legado: correção de presença em rodada mista conta como correção do usuário (r... | Refatoração Lote-46 | TP-0208 | Aprovada |
| 411 | RTP-0169 | executor | ✔ | SDD §2: tabela de pacotes diz o que backend/scripts realmente importa (@pelada/dominio... | Refatoração Revisão 2026-10-20 | — | Aprovada |
| 412 | RTP-0174 | executor | ✔ | UX-SPEC: fluxo F4 e diálogo D4 descrevem o Exportar PDF como o app faz hoje | Refatoração Revisão 2026-10-20 | — | Aprovada |
| 413 | RTP-0175 | executor | ✔ | Comentários e títulos de teste do Exportar PDF ainda dizem que o compartilhamento é direto | Refatoração Revisão 2026-10-20 | — | Aprovada |
| 414 | RTP-0177 | executor | ✔ | SDD §7 e GUARDRAILS: requisito de cadeia de suprimento (ações por SHA, política do pnpm... | Refatoração Revisão 2026-10-20 | — | Aprovada |
| 415 | RTP-0178 | executor | ✔ | Checagem de CI: ações do GitHub só por SHA e política do pnpm presente (G-24) | Refatoração Revisão 2026-10-20 | RTP-0177 | Aprovada |
| 416 | RTP-0179 | executor | ✔ | checar-acoes-fixadas: recusar uses: ./ com .. e detectar uses em flow style (G-24) | Refatoração Revisão 2026-10-20 | RTP-0178 | Aprovada |
| 417 | BK-0015 | coordenador | ✔ | Migração 202610210000_contrai_posicao e testes prontos (sem commit), mas a edição de backe | — | — | Aprovada |
| 418 | RTP-0180 | executor | ✔ | Contrair o CHECK jogadores_posicao_check às 7 posições do contrato (migração -- contrair:) | Refatoração Revisão 2026-10-20 | BK-0015 | Aprovada |
| 419 | RTP-0181 | executor | ✔ | QUEBRAS.md: corrigir o plano de dois deploys das 4 linhas de pesos (texto copiado das d... | Refatoração Revisão 2026-10-20 | RTP-0180 | Aprovada |
| 420 | RTP-0170 | executor | ✔ | Adicionar X-Content-Type-Options: nosniff nas respostas JSON de /api/* | Refatoração Segurança 2026-10-20 | — | Aprovada |
| 421 | RTP-0171 | executor | ✔ | Fixar por SHA as ações do GitHub e adotar block-exotic-sub-dependencies, minimum-releas... | Refatoração Segurança 2026-10-20 | — | Aprovada |
| 422 | RTP-0176 | executor | ✔ | Subir minimumReleaseAge de 1440 para 10080 no pnpm-workspace.yaml e remover o achado se... | Refatoração Segurança 2026-10-20 | RTP-0171 | Aprovada |
| 423 | RTP-0172 | executor | ✔ | Cobrir no .gitignore o arquivo de entrada da importação do legado (dados pessoais) | Refatoração Segurança 2026-10-20 | — | Aprovada |
| 424 | RTP-0183 | executor | ✔ | Data de início em vigor: uma função só (api e verificar-inicio repetem o fallback) | Refatoração Revisão 2026-10-21 | — | Aprovada |
| 425 | RTP-0184 | executor | ✔ | PaginaJogador.tsx: voltar ao limite de 200 linhas (213) | Refatoração Revisão 2026-10-21 | — | Aprovada |
| 426 | RTP-0186 | executor | ✔ | Trocar o texto do – do ranking e da legenda do PDF para 'Fora do grupo ou antes da data... | Refatoração Revisão 2026-10-21 | — | Aprovada |
| 427 | RTP-0187 | executor | ✔ | Teste do mapeamento periodos_um_aberto -> JaAtivo em corrigirPeriodo (TP-0214) | L48 | TP-0214 | Aprovada |
| 428 | RTP-0189 | executor | ✔ | Remover 'as unknown as' do stub do Kysely em periodos-corrigir.test.ts (eslint no-restr... | Refatoração Revisão 2026-10-21 | — | Aprovada |
| 429 | RTP-0185 | executor | ✔ | Data de início da pontuação sem limite inferior: 0000-01-01 devolve 500 | Refatoração Segurança 2026-10-21 | — | Aprovada |
| 430 | RTP-0188 | executor | ✔ | PreviaPeriodos: formatar 'passa a Y' com formatarPontos e testar pontosEscritos (TP-0228) | Refatoração Lote-L51 | TP-0228 | Aprovada |
| 431 | RTP-0190 | executor | ✔ | Faixa: botão de texto herda a cor da faixa (Tentar de novo vinho, como o mockup) | L51 | TP-0229 | Aprovada |
| 432 | RTP-0191 | executor | ✔ | comparar-visual: roteiros para os estados manuais (corrigir*, inicio-*, reativar*) | L51 | TP-0229 | Aprovada |
| 433 | RTP-0194 | executor | ✔ | comparar-visual: roteiros dos estados pós-sucesso reativado e corrigido de T16 (achado... | Refatoração Lote-L51 | TP-0230 | Aprovada |
| 434 | RTP-0195 | executor | ✔ | comparar-visual.mjs acima de 300 linhas: extrair a execução de passos e o registro de r... | Refatoração Lote-L51 | RTP-0191 | Aprovada |
| 435 | RTP-0192 | executor | ✔ | Teste: auditoria jogador_periodo_corrigido ausente das rotas públicas e do PDF (achado... | Refatoração Lote-L50 | TP-0221 | Aprovada |
| 436 | RTP-0193 | executor | ✔ | reativar: reaproveitar a mensagem de sobreposição em vez de repetir o texto (achado do... | Refatoração Lote-L50 | TP-0222 | Aprovada |
| 437 | RTP-0196 | executor | ✔ | Teste de rota da regra (g) no inativar: saída do 1º período antes da data de início (or... | Refatoração Lote-L50 | TP-0223 | Aprovada |
| 438 | BK-0018 | coordenador | ✔ | Decidir a regra: presença gravada fora de período (legado, I-48/PR-25) conta no acumulado | — | — | Aprovada |
| 439 | RTP-0198 | executor | ✔ | Inativar: avaliar e gravar dentro de transação com trava do jogador (achado DevSecOps d... | Refatoração Lote-L50 | TP-0223 | Aprovada |
| 440 | RTP-0199 | executor | ✔ | Teste de ordem da G-26 para editarInicio (achado do QA de TP-0226) | Refatoração Lote-L50 | TP-0226 | Aprovada |
| 441 | RTP-0200 | executor | ✔ | Lançamento de presença trava os jogadores (serializa com inativar/reativar/correção) | Refatoração Lote-L50 | RTP-0198 | Aprovada |
| 442 | RTP-0201 | executor | ✔ | G-26 desatualizada: lista só periodos-corrigir e reativar, mas inativar, inicio-editar... | Refatoração Revisão 2026-10-22 | — | Aprovada |
| 443 | RTP-0202 | executor | ✔ | Editar partida trava jogadores sem teste de ordem (Baixa) | Refatoração Revisão 2026-10-22 | — | Aprovada |
| 444 | RTP-0203 | executor | ✔ | Consolidar o preparo repetido e as checagens de ordem em g26/ordem.test.ts | Refatoração Revisão 2026-10-22 (2) | — | Não executada |
| 445 | RTP-0204 | executor | ✔ | Remover resíduo ler.test.ts.tmp.* e ignorar *.tmp.* no .gitignore | Refatoração Revisão 2026-10-22 (2) | — | Não executada |
| 446 | BK-0009 | coordenador | ✔ | Ajustar SDD/ADR-010/URL_PUBLICA/CORS/deploy.yml ao domínio prod-ljs.workers.dev e aos acei | — | — | Aprovada |
| 447 | BK-0012 | coordenador | ✔ | Quando e onde registrar a contração do CHECK de posicao (tirar defensor/meio_campo de joga | — | — | Aprovada |
| 448 | BK-0013 | coordenador | ✔ | ADR-008 §3 decide gerar e chamar navigator.share no mesmo gesto; o app agora sempre mostra | — | — | Aprovada |
| 449 | BK-0014 | coordenador | ✔ | Texto do '–' no ranking e no PDF (hoje só 'Ainda não fazia parte do grupo') também vale pa | — | — | Aprovada |
| 450 | BK-0019 | coordenador | ✔ | Código e testes de domínio prontos (82 verdes, tsc ok), mas regressao-periodos.test.ts (AP | — | — | Não executada |
| 451 | RTP-0197 | executor | ✔ | Decidir: presença gravada fora de período (legado, I-48/PR-25) conta no acumulado mas a... | Refatoração Lote-L50 | BK-0018, BK-0019, TP-0225 | Bloqueada |
| 452 | TP-0140 | executor | ✔ | [U] Play Console: app com.gestaodapelada.app (PI-5) | L31 | — | Despriorizada |
| 453 | TP-0141 | executor | ✔ | /.well-known/assetlinks.json servido pelo Worker | L31 | TP-0088, TP-0140 | Despriorizada |
| 454 | TP-0142 | executor | ✔ | Projeto TWA (Bubblewrap) em frontend/twa | L31 | TP-0006, TP-0108, TP-0139, TP-0140, TP-0141 | Despriorizada |
| 455 | TP-0143 | executor | ✔ | [U] Teste fechado da Play (12 testadores, 14 dias) | L31 | TP-0139, TP-0141, TP-0142 | Despriorizada |
| 456 | TP-0144 | executor | ✔ | [U] Publicação da TWA em produção | L31 | TP-0143 | Despriorizada |
