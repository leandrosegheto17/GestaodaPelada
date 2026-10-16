# TASKPLAN — ordem de execução e estado das tarefas

Gerado por `/organizar` (`python .claude/scripts/taskplan.py gerar`) e mantido pelo `/executar`,
que troca o estado da linha a cada etapa. O Status oficial continua no `TASK.md` (bloqueios `BK-`: no
arquivo do bloqueio); o detalhe de cada tarefa está em `.md/.taskplan/<ID>.md`. A ordem respeita as
dependências. Agente: `executor` (TP/RTP) ou `coordenador` (BK/SPK, com o usuário).

Atualizado: 2026-10-16 18:11

Resumo: Não executada 103 · Executada (aguarda teste) 105 · total 208

Estados: Não executada → Em execução → Executada (aguarda teste) → Em teste → Testada (aguarda segurança) → Em validação de segurança → Aprovada (e, à parte, Bloqueada, Dividida e Despriorizada — esta fica sempre no fim da lista e é ignorada por /executar, /testar e /validar). `Aprovada` = QA ✔ e Sec ✔ (tarefas antigas só `Concluída` aparecem como Aprovada).

| # | Tarefa | Agente | Plano | Título | Lote | Dep | Estado |
|---|---|---|---|---|---|---|---|
| 1 | TP-0001 | executor | ✔ | Monorepo pnpm com os 4 pacotes, TypeScript estrito, ESLint, Prettier, Vitest, READMEs e... | L01 | — | Executada (aguarda teste) |
| 2 | TP-0002 | executor | ✔ | Lint de fronteiras e checagens de código (IDs de tarefa, URLs absolutas) | L01 | TP-0001 | Executada (aguarda teste) |
| 3 | TP-0003 | executor | ✔ | CI base (ci.yml) | L01 | TP-0001, TP-0002 | Executada (aguarda teste) |
| 4 | TP-0004 | executor | ✔ | Auto-hospedar as fontes do mockup (pendência da UX-SPEC §0) | L01 | — | Executada (aguarda teste) |
| 5 | TP-0005 | executor | ✔ | Contrato base: erro padrão, enums, limites e tipos primitivos | L01 | TP-0001 | Executada (aguarda teste) |
| 6 | TP-0006 | executor | ✔ | Ícone do app no mockup (lacuna L-3), para aprovação do usuário | L01 | — | Executada (aguarda teste) |
| 7 | TP-0007 | executor | ✔ | dominio/datas: mês, navegação de mês e dias de jogo sugeridos | L02 | TP-0001 | Executada (aguarda teste) |
| 8 | TP-0008 | executor | ✔ | dominio/pontuacao: pontos de uma presença e acumulado | L02 | TP-0007 | Executada (aguarda teste) |
| 9 | TP-0009 | executor | ✔ | dominio/atividade: ativo numa data, falta e "–" | L02 | TP-0007 | Executada (aguarda teste) |
| 10 | TP-0010 | executor | ✔ | dominio/ranking: ordem, PTS INICIAL, rodadas, PTS FINAL e limites de mês | L02 | TP-0007, TP-0008, TP-0009 | Executada (aguarda teste) |
| 11 | TP-0011 | executor | ✔ | dominio/nivel: nível (RN-11) e idade (RN-12) | L02 | TP-0001 | Executada (aguarda teste) |
| 12 | TP-0012 | executor | ✔ | dominio/slug: link legível do grupo | L02 | TP-0001 | Executada (aguarda teste) |
| 13 | TP-0013 | executor | ✔ | Esqueleto da API Hono, configuração, relógio de São Paulo e wrangler.jsonc | L03 | TP-0001, TP-0005 | Executada (aguarda teste) |
| 14 | TP-0014 | executor | ✔ | Módulo de dados: cliente por requisição, Kysely interno e emTransacao | L03 | TP-0013 | Executada (aguarda teste) |
| 15 | TP-0015 | executor | ✔ | Runner de migrações migrar.ts com trava de host | L03 | TP-0001 | Executada (aguarda teste) |
| 16 | TP-0016 | executor | ✔ | Guardas do banco no CI: migração aditiva e grupoId nos repositórios | L03 | TP-0003, TP-0015 | Executada (aguarda teste) |
| 17 | TP-0017 | executor | ✔ | Suporte de testes da API (pool de Workers + Postgres) e job api no CI | L03 | TP-0003, TP-0013, TP-0014, TP-0015 | Executada (aguarda teste) |
| 18 | TP-0018 | executor | ✔ | Snapshot e checagem de compatibilidade do contrato | L04 | TP-0003, TP-0005 | Executada (aguarda teste) |
| 19 | TP-0019 | executor | ✔ | contrato/sessao | L04 | TP-0005, TP-0018 | Executada (aguarda teste) |
| 20 | TP-0020 | executor | ✔ | contrato/publico (ranking e eventos), estrito | L04 | TP-0005, TP-0018 | Executada (aguarda teste) |
| 21 | TP-0021 | executor | ✔ | contrato/grupo e contrato/admins | L04 | TP-0005, TP-0018 | Executada (aguarda teste) |
| 22 | TP-0022 | executor | ✔ | contrato/dono | L04 | TP-0005, TP-0018, TP-0021 | Executada (aguarda teste) |
| 23 | TP-0023 | executor | ✔ | contrato/elenco (jogadores) | L05 | TP-0005, TP-0018 | Executada (aguarda teste) |
| 24 | TP-0024 | executor | ✔ | contrato/partidas, contrato/pesos e contrato/uso | L05 | TP-0005, TP-0018 | Executada (aguarda teste) |
| 25 | TP-0025 | executor | ✔ | Migração do contexto Acesso (contas, sessões, tentativas, pedidos de reset, auditoria) | L06 | TP-0015, TP-0016 | Executada (aguarda teste) |
| 26 | TP-0026 | executor | ✔ | Migração do contexto Grupos (grupos, vínculos de admin) | L06 | TP-0015, TP-0016, TP-0025 | Executada (aguarda teste) |
| 27 | TP-0027 | executor | ✔ | Repositório de contas (hash no Postgres) e infraestrutura/seguranca | L06 | TP-0014, TP-0016, TP-0017, TP-0025 | Executada (aguarda teste) |
| 28 | TP-0028 | executor | ✔ | Repositórios de sessões e de tentativas de login | L06 | TP-0014, TP-0016, TP-0017, TP-0025 | Executada (aguarda teste) |
| 29 | TP-0029 | executor | ✔ | Repositórios de grupos e de vínculos | L06 | TP-0014, TP-0016, TP-0017, TP-0026 | Executada (aguarda teste) |
| 30 | TP-0030 | executor | ✔ | Repositórios de pedidos de reset e de auditoria | L06 | TP-0014, TP-0016, TP-0017, TP-0025, TP-0026 | Executada (aguarda teste) |
| 31 | TP-0031 | executor | ✔ | Middleware de sessão e cookie __Host-sessao | L07 | TP-0013, TP-0027, TP-0028 | Executada (aguarda teste) |
| 32 | TP-0032 | executor | ✔ | Middlewares de grupo (vínculo, financeiro) e de dono | L07 | TP-0029, TP-0031 | Executada (aguarda teste) |
| 33 | TP-0033 | executor | ✔ | Suíte de isolamento entre grupos (C11) | L07 | TP-0017, TP-0031, TP-0032 | Executada (aguarda teste) |
| 34 | TP-0034 | executor | ✔ | Endpoint POST /api/sessao/entrar | L07 | TP-0019, TP-0027, TP-0028, TP-0031, TP-0033 | Executada (aguarda teste) |
| 35 | TP-0035 | executor | ✔ | Endpoint GET /api/sessao/eu | L07 | TP-0013, TP-0019, TP-0029, TP-0031, TP-0033 | Executada (aguarda teste) |
| 36 | TP-0036 | executor | ✔ | Endpoint POST /api/sessao/sair | L07 | TP-0028, TP-0031, TP-0033 | Executada (aguarda teste) |
| 37 | TP-0037 | executor | ✔ | Extração aplicacao/acesso/senhas (redefinir senha) | L08 | TP-0014, TP-0027, TP-0028, TP-0030 | Executada (aguarda teste) |
| 38 | TP-0038 | executor | ✔ | Extração aplicacao/acesso/admin-por-email (criar conta ou vincular) | L08 | TP-0027, TP-0029, TP-0030 | Executada (aguarda teste) |
| 39 | TP-0039 | executor | ✔ | Endpoint POST /api/sessao/esqueci-senha | L08 | TP-0019, TP-0027, TP-0030, TP-0033 | Executada (aguarda teste) |
| 40 | TP-0040 | executor | ✔ | Endpoint POST /api/sessao/trocar-senha | L08 | TP-0019, TP-0027, TP-0028, TP-0030, TP-0031, TP-0033 | Executada (aguarda teste) |
| 41 | TP-0041 | executor | ✔ | Script backend/scripts/dono.ts (criar e redefinir-senha) | L08 | TP-0027, TP-0030, TP-0037 | Executada (aguarda teste) |
| 42 | TP-0042 | executor | ✔ | Migração do Elenco (jogadores, períodos de atividade) | L09 | TP-0015, TP-0016, TP-0026 | Executada (aguarda teste) |
| 43 | TP-0043 | executor | ✔ | Migração de habilidades e notas | L09 | TP-0015, TP-0016, TP-0042 | Executada (aguarda teste) |
| 44 | TP-0044 | executor | ✔ | Migração de pesos, partidas e presenças | L09 | TP-0015, TP-0016, TP-0042 | Executada (aguarda teste) |
| 45 | TP-0045 | executor | ✔ | Migração de eventos de uso | L09 | TP-0015, TP-0016, TP-0026 | Executada (aguarda teste) |
| 46 | TP-0046 | executor | ✔ | Repositório de jogadores e períodos | L10 | TP-0014, TP-0016, TP-0017, TP-0042 | Executada (aguarda teste) |
| 47 | TP-0047 | executor | ✔ | Repositório de habilidades e notas | L10 | TP-0014, TP-0016, TP-0017, TP-0043 | Executada (aguarda teste) |
| 48 | TP-0048 | executor | ✔ | Repositório de pesos | L10 | TP-0014, TP-0016, TP-0017, TP-0044 | Executada (aguarda teste) |
| 49 | TP-0049 | executor | ✔ | Repositório de partidas e presenças | L10 | TP-0014, TP-0016, TP-0017, TP-0044 | Executada (aguarda teste) |
| 50 | TP-0050 | executor | ✔ | Repositório de eventos de uso | L10 | TP-0014, TP-0016, TP-0017, TP-0045 | Executada (aguarda teste) |
| 51 | TP-0051 | executor | ✔ | Script seed-local.ts com os dados do mockup | L10 | TP-0027, TP-0029, TP-0046, TP-0047, TP-0048, TP-0049 | Executada (aguarda teste) |
| 52 | TP-0052 | executor | ✔ | Extração aplicacao/elenco/ativos (ativos numa data e no mês) | L11 | TP-0009, TP-0046 | Executada (aguarda teste) |
| 53 | TP-0053 | executor | ✔ | Extração aplicacao/pontuacao/historico (histórico do grupo para o domínio) | L11 | TP-0010, TP-0046, TP-0048, TP-0049 | Executada (aguarda teste) |
| 54 | TP-0054 | executor | ✔ | Endpoint GET /api/dono/painel | L11 | TP-0022, TP-0029, TP-0030, TP-0032, TP-0033 | Executada (aguarda teste) |
| 55 | TP-0055 | executor | ✔ | Endpoint GET /api/dono/grupos/:id | L11 | TP-0013, TP-0022, TP-0029, TP-0032, TP-0033 | Executada (aguarda teste) |
| 56 | TP-0056 | executor | ✔ | Endpoint POST /api/dono/grupos (criar grupo e 1º admin) | L11 | TP-0012, TP-0014, TP-0022, TP-0029, TP-0030, TP-0032, TP-0033, TP-0038, TP-0047, TP-0048 | Executada (aguarda teste) |
| 57 | TP-0057 | executor | ✔ | Endpoint PATCH /api/dono/grupos/:id/situacao | L12 | TP-0022, TP-0029, TP-0032, TP-0033 | Executada (aguarda teste) |
| 58 | TP-0058 | executor | ✔ | Endpoints POST /api/dono/grupos/:id/arquivar e /reativar | L12 | TP-0022, TP-0029, TP-0030, TP-0032, TP-0033 | Executada (aguarda teste) |
| 59 | TP-0059 | executor | ✔ | Endpoint POST /api/dono/pedidos-reset/:id/resolver | L12 | TP-0022, TP-0030, TP-0032, TP-0033 | Executada (aguarda teste) |
| 60 | TP-0060 | executor | ✔ | Endpoint POST /api/dono/contas/:id/redefinir-senha | L12 | TP-0022, TP-0032, TP-0033, TP-0037 | Executada (aguarda teste) |
| 61 | TP-0061 | executor | ✔ | Endpoint GET /api/grupos/:g (grupo, permissões e resumo do início) | L13 | TP-0007, TP-0013, TP-0021, TP-0029, TP-0032, TP-0033, TP-0047, TP-0048, TP-0049, TP-0050, TP-0052 | Executada (aguarda teste) |
| 62 | TP-0062 | executor | ✔ | Endpoint PATCH /api/grupos/:g | L13 | TP-0021, TP-0029, TP-0032, TP-0033 | Executada (aguarda teste) |
| 63 | TP-0063 | executor | ✔ | Endpoint GET /api/grupos/:g/admins | L14 | TP-0021, TP-0029, TP-0032, TP-0033 | Executada (aguarda teste) |
| 64 | TP-0064 | executor | ✔ | Endpoint POST /api/grupos/:g/admins | L14 | TP-0021, TP-0032, TP-0033, TP-0038 | Executada (aguarda teste) |
| 65 | TP-0065 | executor | ✔ | Endpoint DELETE /api/grupos/:g/admins/:contaId | L14 | TP-0014, TP-0021, TP-0029, TP-0030, TP-0032, TP-0033 | Executada (aguarda teste) |
| 66 | TP-0066 | executor | ✔ | Endpoint POST /api/grupos/:g/admins/:contaId/redefinir-senha | L14 | TP-0021, TP-0032, TP-0033, TP-0037 | Executada (aguarda teste) |
| 67 | TP-0067 | executor | ✔ | Endpoint PATCH /api/grupos/:g/admins/:contaId/financeiro | L14 | TP-0021, TP-0029, TP-0030, TP-0032, TP-0033 | Executada (aguarda teste) |
| 68 | TP-0068 | executor | ✔ | Endpoint GET /api/grupos/:g/jogadores | L15 | TP-0009, TP-0011, TP-0013, TP-0023, TP-0032, TP-0033, TP-0046, TP-0047 | Executada (aguarda teste) |
| 69 | TP-0069 | executor | ✔ | Endpoint GET /api/grupos/:g/jogadores/:id | L15 | TP-0011, TP-0023, TP-0032, TP-0033, TP-0046, TP-0047 | Executada (aguarda teste) |
| 70 | TP-0070 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores | L15 | TP-0013, TP-0023, TP-0032, TP-0033, TP-0046 | Executada (aguarda teste) |
| 71 | TP-0071 | executor | ✔ | Endpoint PATCH /api/grupos/:g/jogadores/:id | L15 | TP-0009, TP-0023, TP-0032, TP-0033, TP-0046 | Executada (aguarda teste) |
| 72 | TP-0072 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores/:id/inativar | L16 | TP-0009, TP-0013, TP-0023, TP-0032, TP-0033, TP-0046 | Executada (aguarda teste) |
| 73 | TP-0073 | executor | ✔ | Endpoint POST /api/grupos/:g/jogadores/:id/reativar | L16 | TP-0009, TP-0013, TP-0023, TP-0032, TP-0033, TP-0046 | Executada (aguarda teste) |
| 74 | TP-0074 | executor | ✔ | Endpoint DELETE /api/grupos/:g/jogadores/:id | L16 | TP-0023, TP-0030, TP-0032, TP-0033, TP-0046 | Executada (aguarda teste) |
| 75 | TP-0075 | executor | ✔ | Endpoint GET /api/grupos/:g/pesos | L17 | TP-0024, TP-0032, TP-0033, TP-0048 | Executada (aguarda teste) |
| 76 | TP-0076 | executor | ✔ | Endpoint POST /api/grupos/:g/pesos | L17 | TP-0013, TP-0024, TP-0030, TP-0032, TP-0033, TP-0048 | Executada (aguarda teste) |
| 77 | TP-0077 | executor | ✔ | Endpoint GET /api/grupos/:g/partidas?mes= | L17 | TP-0007, TP-0013, TP-0024, TP-0032, TP-0033, TP-0049 | Executada (aguarda teste) |
| 78 | TP-0078 | executor | ✔ | Endpoint GET /api/grupos/:g/partidas/nova?data= | L17 | TP-0007, TP-0013, TP-0024, TP-0029, TP-0032, TP-0033, TP-0049, TP-0052 | Executada (aguarda teste) |
| 79 | TP-0079 | executor | ✔ | Endpoint GET /api/grupos/:g/partidas/:data | L17 | TP-0024, TP-0032, TP-0033, TP-0049, TP-0052 | Executada (aguarda teste) |
| 80 | TP-0080 | executor | ✔ | Extração aplicacao/partidas/presencas (validação das marcações) | L18 | TP-0009, TP-0052 | Executada (aguarda teste) |
| 81 | TP-0081 | executor | ✔ | Endpoint POST /api/grupos/:g/partidas | L18 | TP-0013, TP-0014, TP-0024, TP-0030, TP-0032, TP-0033, TP-0049, TP-0050, TP-0080 | Executada (aguarda teste) |
| 82 | TP-0082 | executor | ✔ | Endpoint PUT /api/grupos/:g/partidas/:data | L18 | TP-0014, TP-0024, TP-0030, TP-0032, TP-0033, TP-0049, TP-0080 | Executada (aguarda teste) |
| 83 | TP-0083 | executor | ✔ | Endpoint DELETE /api/grupos/:g/partidas/:data | L18 | TP-0014, TP-0024, TP-0030, TP-0032, TP-0033, TP-0049 | Executada (aguarda teste) |
| 84 | TP-0084 | executor | ✔ | Endpoint GET /api/publico/:slug/ranking?mes= | L19 | TP-0010, TP-0013, TP-0020, TP-0029, TP-0033, TP-0053 | Executada (aguarda teste) |
| 85 | TP-0085 | executor | ✔ | Endpoint POST /api/publico/:slug/eventos | L19 | TP-0020, TP-0029, TP-0033, TP-0050 | Executada (aguarda teste) |
| 86 | TP-0086 | executor | ✔ | Endpoint GET /api/grupos/:g/uso | L19 | TP-0013, TP-0024, TP-0032, TP-0033, TP-0050 | Executada (aguarda teste) |
| 87 | TP-0087 | executor | ✔ | Limite de taxa em /api/sessao/entrar e /api/publico/* | L19 | TP-0013, TP-0034, TP-0084 | Executada (aguarda teste) |
| 88 | TP-0088 | executor | ✔ | App web: Vite, React 19, Router, TanStack Query, tokens e fontes do mockup, recursos po... | L20 | TP-0001, TP-0004 | Executada (aguarda teste) |
| 89 | TP-0089 | executor | ✔ | Base visual: Playwright, comparar-visual.mjs e job e2e | L20 | TP-0003, TP-0088 | Executada (aguarda teste) |
| 90 | TP-0090 | executor | ✔ | Cabeçalhos de segurança dos arquivos estáticos (_headers) | L20 | TP-0013, TP-0088, TP-0089 | Executada (aguarda teste) |
| 91 | TP-0091 | executor | ✔ | Cliente da API no web (src/dados) | L20 | TP-0005, TP-0088 | Executada (aguarda teste) |
| 92 | TP-0092 | executor | ✔ | Formatação pt-BR (src/formatacao) | L20 | TP-0005, TP-0088 | Executada (aguarda teste) |
| 93 | TP-0093 | executor | ✔ | Rótulos dos enums (src/rotulos) | L20 | TP-0005, TP-0088 | Executada (aguarda teste) |
| 94 | TP-0094 | executor | ✔ | docker-compose.yml (db, backend, frontend) | L21 | TP-0013, TP-0015, TP-0051, TP-0088 | Executada (aguarda teste) |
| 95 | TP-0095 | executor | ✔ | Componentes básicos: Botão, Selo, Faixa, Esqueleto, Estado vazio, Tela de mensagem, Err... | L21 | TP-0088 | Executada (aguarda teste) |
| 96 | TP-0096 | executor | ✔ | Campos de formulário e resumo de erros | L21 | TP-0088, TP-0092 | Executada (aguarda teste) |
| 97 | TP-0097 | executor | ✔ | Controle segmentado, Interruptor e Caixa de seleção | L21 | TP-0088 | Executada (aguarda teste) |
| 98 | TP-0098 | executor | ✔ | Barra superior, barra de ação e "Pular para o conteúdo" | L21 | TP-0088, TP-0095 | Executada (aguarda teste) |
| 99 | TP-0099 | executor | ✔ | Diálogo base e folha inferior/menu | L21 | TP-0088, TP-0095 | Executada (aguarda teste) |
| 100 | TP-0100 | executor | ✔ | Diálogos D1 (senha exibida uma vez) e D2 (confirmação destrutiva) | L22 | TP-0095, TP-0096, TP-0099 | Executada (aguarda teste) |
| 101 | TP-0101 | executor | ✔ | Lista e item, navegador de mês e tabela de semanas | L22 | TP-0088, TP-0092, TP-0095 | Executada (aguarda teste) |
| 102 | TP-0102 | executor | ✔ | Tabela de ranking, marca de rodada e legenda | L22 | TP-0020, TP-0088, TP-0092, TP-0093 | Executada (aguarda teste) |
| 103 | TP-0103 | executor | ✔ | Seletor de situação e contagem fixa | L22 | TP-0024, TP-0088, TP-0093 | Executada (aguarda teste) |
| 104 | TP-0104 | executor | ✔ | Aviso "O app mudou de endereço" | L22 | TP-0095 | Executada (aguarda teste) |
| 105 | TP-0105 | executor | ✔ | Sessão no web e guarda de rotas | L23 | TP-0019, TP-0091 | Executada (aguarda teste) |
| 106 | TP-0106 | executor | ✔ | Layout do admin (barra, grupo ativo, menu da conta) | L23 | TP-0021, TP-0088, TP-0091, TP-0098, TP-0099, TP-0104, TP-0105 | Não executada |
| 107 | TP-0107 | executor | ✔ | Armazenamento local (grupo lembrado, id anônimo, último ranking) | L23 | TP-0088 | Não executada |
| 108 | TP-0108 | executor | ✔ | PWA: manifesto, service worker e atualização | L23 | TP-0006, TP-0088 | Não executada |
| 109 | TP-0109 | executor | ✔ | Tela T00/T02: entrada do app e "Abra o link do seu grupo" | L24 | TP-0088, TP-0089, TP-0095, TP-0107 | Não executada |
| 110 | TP-0110 | executor | ✔ | Tela T03 e roteamento de /g/:slug | L24 | TP-0020, TP-0089, TP-0091, TP-0095, TP-0107 | Não executada |
| 111 | TP-0111 | executor | ✔ | Tela T01: ranking público (rede) | L24 | TP-0020, TP-0088, TP-0089, TP-0091, TP-0095, TP-0098, TP-0101, TP-0102, TP-0104, TP-0110 | Não executada |
| 112 | TP-0112 | executor | ✔ | T01 sem conexão, cache, grupo lembrado e evento de abertura | L24 | TP-0107, TP-0108, TP-0111 | Não executada |
| 113 | TP-0113 | executor | ✔ | T01 aviso de instalação no iPhone (D5) | L24 | TP-0089, TP-0107, TP-0111 | Não executada |
| 114 | TP-0114 | executor | ✔ | Tela T04: Entrar | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0105 | Não executada |
| 115 | TP-0115 | executor | ✔ | Tela T05: Esqueci a senha | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096 | Não executada |
| 116 | TP-0116 | executor | ✔ | Tela T06: Nova senha obrigatória | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0105 | Não executada |
| 117 | TP-0117 | executor | ✔ | Tela T25: Minha senha | L25 | TP-0019, TP-0089, TP-0091, TP-0095, TP-0096, TP-0105 | Não executada |
| 118 | TP-0118 | executor | ✔ | Tela T08: Escolher grupo | L25 | TP-0089, TP-0095, TP-0101, TP-0105 | Não executada |
| 119 | TP-0119 | executor | ✔ | Tela T09: Início do admin | L26 | TP-0021, TP-0089, TP-0092, TP-0095, TP-0101, TP-0106 | Não executada |
| 120 | TP-0120 | executor | ✔ | Tela T10: Partidas | L26 | TP-0024, TP-0089, TP-0092, TP-0095, TP-0101, TP-0106 | Não executada |
| 121 | TP-0121 | executor | ✔ | Tela T11: Lançar partida | L26 | TP-0024, TP-0089, TP-0095, TP-0096, TP-0097, TP-0098, TP-0103, TP-0106 | Não executada |
| 122 | TP-0122 | executor | ✔ | Tela T11: editar e excluir partida | L26 | TP-0100, TP-0121 | Não executada |
| 123 | TP-0123 | executor | ✔ | Tela T15: Jogadores | L27 | TP-0023, TP-0089, TP-0093, TP-0095, TP-0097, TP-0101, TP-0106 | Não executada |
| 124 | TP-0124 | executor | ✔ | Tela T16: Ficha do jogador (dados e situação) | L27 | TP-0023, TP-0089, TP-0093, TP-0095, TP-0096, TP-0099, TP-0100, TP-0106 | Não executada |
| 125 | TP-0125 | executor | ✔ | Tela T18: Pontuação | L27 | TP-0024, TP-0089, TP-0095, TP-0096, TP-0101, TP-0106 | Não executada |
| 126 | TP-0126 | executor | ✔ | Tela T19: Admins do grupo | L27 | TP-0021, TP-0089, TP-0095, TP-0096, TP-0097, TP-0100, TP-0101, TP-0106 | Não executada |
| 127 | TP-0127 | executor | ✔ | Tela T20: Dados do grupo e link | L27 | TP-0021, TP-0089, TP-0093, TP-0095, TP-0096, TP-0097, TP-0106 | Não executada |
| 128 | TP-0128 | executor | ✔ | Tela T21: Uso do app | L27 | TP-0024, TP-0089, TP-0095, TP-0101, TP-0106 | Não executada |
| 129 | TP-0129 | executor | ✔ | Tela T26: Área do dono | L28 | TP-0022, TP-0089, TP-0095, TP-0097, TP-0098, TP-0100, TP-0101, TP-0105 | Não executada |
| 130 | TP-0130 | executor | ✔ | Tela T27: Novo grupo | L28 | TP-0022, TP-0089, TP-0093, TP-0095, TP-0096, TP-0097, TP-0098, TP-0100, TP-0105 | Não executada |
| 131 | TP-0131 | executor | ✔ | Tela T28: Grupo (visão do dono) | L28 | TP-0022, TP-0089, TP-0093, TP-0095, TP-0096, TP-0098, TP-0100, TP-0101, TP-0105 | Não executada |
| 132 | TP-0132 | executor | ✔ | [U] Neon: projeto novo em São Paulo (PI-1) — **tarefa manual do usuário** | L29 | — | Não executada |
| 133 | TP-0133 | executor | ✔ | [U] Cloudflare: subdomínio, token e Hyperdrive (PI-2, PI-3) | L29 | TP-0013, TP-0132 | Não executada |
| 134 | TP-0134 | executor | ✔ | [U] GitHub: secrets e environments (PI-4) | L29 | TP-0132, TP-0133 | Não executada |
| 135 | SPK-0001 | coordenador | — | Spike S-01: transação interativa pg sobre o Hyperdrive | L29 | TP-0014, TP-0133 | Não executada |
| 136 | TP-0135 | executor | ✔ | Workflow de deploy (deploy.yml) | L30 | TP-0003, TP-0013, TP-0015, TP-0133, TP-0134 | Não executada |
| 137 | TP-0136 | executor | ✔ | Workflow de backup diário (backup.yml) | L30 | TP-0134 | Não executada |
| 138 | TP-0137 | executor | ✔ | Runbook backend/DEPLOY.md e ensaio de restauração | L30 | TP-0041, TP-0135, TP-0136 | Não executada |
| 139 | TP-0138 | executor | ✔ | E2E de integração do I1 (API real) | L30 | TP-0034, TP-0035, TP-0040, TP-0056, TP-0061, TP-0070, TP-0078, TP-0081, TP-0084, TP-0089, TP-0094, TP-0111, TP-0114, TP-0116, TP-0119, TP-0121, TP-0123, TP-0124, TP-0129, TP-0130 | Não executada |
| 140 | TP-0139 | executor | ✔ | [U] Go-live do I1 | L30 | SPK-0001, TP-0036, TP-0039, TP-0041, TP-0054, TP-0055, TP-0057, TP-0058, TP-0059, TP-0060, TP-0062, TP-0063, TP-0064, TP-0065, TP-0066, TP-0067, TP-0068, TP-0069, TP-0071, TP-0072, TP-0073, TP-0074, TP-0075, TP-0076, TP-0077, TP-0079, TP-0082, TP-0083, TP-0085, TP-0086, TP-0087, TP-0090, TP-0109, TP-0112, TP-0113, TP-0115, TP-0117, TP-0118, TP-0120, TP-0122, TP-0125, TP-0126, TP-0127, TP-0128, TP-0131, TP-0135, TP-0137, TP-0138 | Não executada |
| 141 | TP-0140 | executor | ✔ | [U] Play Console: app com.gestaodapelada.app (PI-5) | L31 | — | Não executada |
| 142 | TP-0141 | executor | ✔ | /.well-known/assetlinks.json servido pelo Worker | L31 | TP-0088, TP-0140 | Não executada |
| 143 | TP-0142 | executor | ✔ | Projeto TWA (Bubblewrap) em frontend/twa | L31 | TP-0006, TP-0108, TP-0139, TP-0140 | Não executada |
| 144 | TP-0143 | executor | ✔ | [U] Teste fechado da Play (12 testadores, 14 dias) | L31 | TP-0139, TP-0141, TP-0142 | Não executada |
| 145 | TP-0144 | executor | ✔ | [U] Publicação da TWA em produção | L31 | TP-0143 | Não executada |
| 146 | TP-0145 | executor | ✔ | contrato/habilidades (catálogo e notas) | L32 | TP-0005, TP-0018 | Não executada |
| 147 | TP-0146 | executor | ✔ | contrato/simulador | L32 | TP-0005, TP-0018 | Não executada |
| 148 | TP-0147 | executor | ✔ | dominio/simulador/previa: número de times, composição e insuficiência | L32 | TP-0001 | Não executada |
| 149 | TP-0148 | executor | ✔ | dominio/simulador/prioridade (RN-08) | L32 | TP-0007, TP-0010 | Não executada |
| 150 | TP-0149 | executor | ✔ | dominio/simulador/classificacao (RN-09A) | L32 | TP-0001 | Não executada |
| 151 | TP-0150 | executor | ✔ | dominio/simulador/indicadores (indicadores e pares) | L33 | TP-0011, TP-0149 | Não executada |
| 152 | TP-0151 | executor | ✔ | dominio/simulador/distribuicao-dois (RN-10A) | L33 | TP-0149, TP-0150 | Não executada |
| 153 | TP-0152 | executor | ✔ | dominio/simulador/distribuicao-varios (RN-10B) | L33 | TP-0147, TP-0150 | Não executada |
| 154 | TP-0153 | executor | ✔ | dominio/simulador/avisos (RF-47) | L33 | TP-0147, TP-0150 | Não executada |
| 155 | TP-0154 | executor | ✔ | dominio/simulador/sugerir e teste de orçamento de CPU no CI | L33 | TP-0003, TP-0148, TP-0149, TP-0150, TP-0151, TP-0152, TP-0153 | Não executada |
| 156 | TP-0155 | executor | ✔ | Endpoint GET /api/grupos/:g/habilidades | L34 | TP-0032, TP-0033, TP-0047, TP-0145 | Não executada |
| 157 | TP-0156 | executor | ✔ | Endpoint POST /api/grupos/:g/habilidades | L34 | TP-0032, TP-0033, TP-0047, TP-0145 | Não executada |
| 158 | TP-0157 | executor | ✔ | Endpoint PATCH /api/grupos/:g/habilidades/:id | L34 | TP-0032, TP-0033, TP-0047, TP-0145 | Não executada |
| 159 | TP-0158 | executor | ✔ | Endpoint DELETE /api/grupos/:g/habilidades/:id | L34 | TP-0014, TP-0030, TP-0032, TP-0033, TP-0047, TP-0145 | Não executada |
| 160 | TP-0159 | executor | ✔ | Endpoint PUT /api/grupos/:g/jogadores/:id/notas/:habilidadeId | L34 | TP-0011, TP-0023, TP-0032, TP-0033, TP-0046, TP-0047, TP-0145 | Não executada |
| 161 | TP-0160 | executor | ✔ | Migração de escalações | L35 | TP-0015, TP-0016, TP-0026 | Não executada |
| 162 | TP-0161 | executor | ✔ | Repositório de escalações | L35 | TP-0014, TP-0016, TP-0017, TP-0160 | Não executada |
| 163 | TP-0162 | executor | ✔ | Endpoint GET /api/grupos/:g/simulador/contexto?data= | L35 | TP-0007, TP-0011, TP-0013, TP-0029, TP-0032, TP-0033, TP-0047, TP-0052, TP-0146 | Não executada |
| 164 | TP-0163 | executor | ✔ | Endpoint POST /api/grupos/:g/simulador/previa | L35 | TP-0032, TP-0033, TP-0146, TP-0147 | Não executada |
| 165 | TP-0164 | executor | ✔ | Extração aplicacao/simulador/entrada (aptos prontos para o domínio) | L35 | TP-0011, TP-0047, TP-0053, TP-0148 | Não executada |
| 166 | TP-0165 | executor | ✔ | Endpoint POST /api/grupos/:g/simulador/sugerir | L35 | TP-0032, TP-0033, TP-0146, TP-0154, TP-0164 | Não executada |
| 167 | TP-0166 | executor | ✔ | Endpoint POST /api/grupos/:g/simulador/avaliar | L36 | TP-0032, TP-0033, TP-0146, TP-0150, TP-0153, TP-0164 | Não executada |
| 168 | TP-0167 | executor | ✔ | Endpoint POST /api/grupos/:g/escalacoes | L36 | TP-0014, TP-0032, TP-0033, TP-0050, TP-0146, TP-0161 | Não executada |
| 169 | TP-0168 | executor | ✔ | Pré-marcação pela escalação em GET .../partidas/nova | L36 | TP-0078, TP-0161 | Não executada |
| 170 | TP-0169 | executor | ✔ | Resumo do início com a escalação confirmada | L36 | TP-0061, TP-0161 | Não executada |
| 171 | SPK-0002 | coordenador | — | Spike S-02: CPU do sugerir no Worker publicado | L36 | TP-0135, TP-0165 | Não executada |
| 172 | TP-0170 | executor | ✔ | Tela T17: Habilidades | L37 | TP-0089, TP-0095, TP-0096, TP-0100, TP-0101, TP-0106, TP-0145 | Não executada |
| 173 | TP-0171 | executor | ✔ | Tela T16: seção de notas e nível | L37 | TP-0096, TP-0124, TP-0145 | Não executada |
| 174 | TP-0172 | executor | ✔ | Tela T12: Simulador (entradas e prévia) | L37 | TP-0089, TP-0095, TP-0096, TP-0097, TP-0098, TP-0101, TP-0106, TP-0146 | Não executada |
| 175 | TP-0173 | executor | ✔ | Cartão de time, tabela comparativa e lista de avisos | L37 | TP-0088, TP-0092, TP-0095, TP-0146 | Não executada |
| 176 | TP-0174 | executor | ✔ | Ajuste manual do simulador: D3 e gancho de reavaliação | L37 | TP-0091, TP-0099, TP-0146 | Não executada |
| 177 | TP-0175 | executor | ✔ | Tela T13: resultado com 2 times | L38 | TP-0089, TP-0098, TP-0100, TP-0106, TP-0172, TP-0173, TP-0174 | Não executada |
| 178 | TP-0176 | executor | ✔ | Tela T14: resultado com 3 ou mais times | L38 | TP-0089, TP-0098, TP-0100, TP-0106, TP-0172, TP-0173, TP-0174 | Não executada |
| 179 | TP-0177 | executor | ✔ | E2E de integração do I2 (API real) | L38 | TP-0138, TP-0162, TP-0163, TP-0165, TP-0166, TP-0167, TP-0168, TP-0172, TP-0175 | Não executada |
| 180 | TP-0178 | executor | ✔ | [U] Go-live do I2 | L38 | SPK-0002, TP-0139, TP-0155, TP-0156, TP-0157, TP-0158, TP-0159, TP-0169, TP-0170, TP-0171, TP-0176, TP-0177 | Não executada |
| 181 | TP-0179 | executor | ✔ | dominio/pdf: colunas do PDF e PTS INICIAL antes da 1ª coluna | L39 | TP-0010 | Não executada |
| 182 | TP-0180 | executor | ✔ | contrato/pdf (estrito) | L39 | TP-0018, TP-0020 | Não executada |
| 183 | TP-0181 | executor | ✔ | Endpoint GET /api/publico/:slug/pdf?mes= | L39 | TP-0013, TP-0029, TP-0033, TP-0053, TP-0179, TP-0180 | Não executada |
| 184 | TP-0182 | executor | ✔ | Gerador de PDF: desenho da folha | L39 | TP-0004, TP-0088, TP-0092, TP-0093, TP-0180 | Não executada |
| 185 | TP-0183 | executor | ✔ | Gerador de PDF: uma página, legenda e rodapé | L39 | TP-0182 | Não executada |
| 186 | TP-0184 | executor | ✔ | T01: Exportar PDF (compartilhar ou baixar) | L39 | TP-0091, TP-0099, TP-0111, TP-0180, TP-0183 | Não executada |
| 187 | TP-0185 | executor | ✔ | [U] Go-live do I3 e início da janela de 8 semanas | L40 | TP-0178, TP-0181, TP-0184 | Não executada |
| 188 | TP-0186 | executor | ✔ | contrato/financeiro | L41 | TP-0005, TP-0018 | Não executada |
| 189 | TP-0187 | executor | ✔ | dominio/caixa: saldos e entrada vinculada | L41 | TP-0007 | Não executada |
| 190 | TP-0188 | executor | ✔ | Migração do financeiro | L41 | TP-0015, TP-0016, TP-0042 | Não executada |
| 191 | TP-0189 | executor | ✔ | Repositório do financeiro (e histórico do jogador com pagamentos) | L41 | TP-0014, TP-0016, TP-0017, TP-0046, TP-0074, TP-0188 | Não executada |
| 192 | TP-0190 | executor | ✔ | Endpoint GET /api/grupos/:g/financeiro/mes?mes= | L42 | TP-0013, TP-0032, TP-0033, TP-0052, TP-0186, TP-0187, TP-0189 | Não executada |
| 193 | TP-0191 | executor | ✔ | Endpoint PUT /api/grupos/:g/financeiro/config | L42 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 194 | TP-0192 | executor | ✔ | Endpoint POST /api/grupos/:g/financeiro/pagamentos (marcar) | L42 | TP-0014, TP-0030, TP-0032, TP-0033, TP-0186, TP-0187, TP-0189 | Não executada |
| 195 | TP-0193 | executor | ✔ | Endpoint DELETE /api/grupos/:g/financeiro/pagamentos/:jogadorId/:mes (desmarcar) | L42 | TP-0014, TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 196 | TP-0194 | executor | ✔ | Resumo do início com o saldo atual | L42 | TP-0061, TP-0187, TP-0189 | Não executada |
| 197 | TP-0195 | executor | ✔ | Endpoint POST /api/grupos/:g/financeiro/lancamentos | L43 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 198 | TP-0196 | executor | ✔ | Endpoint GET /api/grupos/:g/financeiro/lancamentos/:id | L43 | TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 199 | TP-0197 | executor | ✔ | Endpoint PUT /api/grupos/:g/financeiro/lancamentos/:id | L43 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 200 | TP-0198 | executor | ✔ | Endpoint DELETE /api/grupos/:g/financeiro/lancamentos/:id | L43 | TP-0030, TP-0032, TP-0033, TP-0186, TP-0189 | Não executada |
| 201 | TP-0199 | executor | ✔ | Tela T22: Financeiro do mês | L44 | TP-0089, TP-0092, TP-0095, TP-0101, TP-0106, TP-0186 | Não executada |
| 202 | TP-0200 | executor | ✔ | Tela T22: marcar e desmarcar pagamento | L44 | TP-0097, TP-0100, TP-0199 | Não executada |
| 203 | TP-0201 | executor | ✔ | Tela T23: Lançamento | L44 | TP-0089, TP-0095, TP-0096, TP-0097, TP-0098, TP-0100, TP-0106, TP-0186 | Não executada |
| 204 | TP-0202 | executor | ✔ | Tela T24: Configuração do caixa | L44 | TP-0089, TP-0095, TP-0096, TP-0098, TP-0106, TP-0186 | Não executada |
| 205 | TP-0203 | executor | ✔ | Endpoint POST /api/sessao/aviso-privacidade | L45 | TP-0019, TP-0027, TP-0031, TP-0033 | Não executada |
| 206 | TP-0204 | executor | ✔ | Tela T07: Aviso de privacidade (página e diálogo do 1º acesso) | L45 | TP-0089, TP-0095, TP-0099, TP-0105, TP-0106 | Não executada |
| 207 | TP-0205 | executor | ✔ | E2E de integração do I4 (API real) | L45 | TP-0138, TP-0190, TP-0191, TP-0192, TP-0193, TP-0195, TP-0199, TP-0200, TP-0201, TP-0202 | Não executada |
| 208 | TP-0206 | executor | ✔ | [U] Go-live do I4 | L45 | TP-0185, TP-0194, TP-0196, TP-0197, TP-0198, TP-0203, TP-0204, TP-0205 | Não executada |
