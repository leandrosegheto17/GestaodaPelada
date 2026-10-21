# THREAT-MODEL

Modelo de ameaças enxuto (STRIDE) do Pelada. Atualizado na auditoria de release de 2026-10-21. Evidência executada em
`.md/.seguranca/2026-10-21/` e `.md/.seguranca/sondas.json`. Requisitos de origem: `SDD.md` §7, `GUARDRAILS.md`.

## Ativos

| Ativo | Onde fica | Sensibilidade |
|---|---|---|
| Senha e sessão do dono e dos admins | `contas` (hash bcrypt via pgcrypto), `sessoes` (hash SHA-256), cookie `__Host-sessao` | Alta |
| Dados pessoais de jogador (telefone, ano de nascimento, notas, financeiro) | Neon (disco cifrado), só rotas de admin | Alta (LGPD) |
| Histórico do legado (57 jogadores, 231 rodadas) | Arquivo na máquina do operador; depois, Neon | Média |
| Credenciais de infraestrutura (`CLOUDFLARE_API_TOKEN`, `NEON_*`, `BACKUP_CHAVE`) | Secrets do ambiente `producao` no GitHub | Crítica |
| Credencial do banco da aplicação | Só na configuração do Hyperdrive | Crítica |
| Ranking público e PDF | `/api/publico/<slug>/*`, aberto por desenho (T-13, risco aceito) | Baixa (sem dado pessoal) |

## Fronteiras de confiança

Navegador (sem confiança) -> Worker Cloudflare (`/api/*` primeiro, assets estáticos) -> Hyperdrive (TLS) -> Neon.
Operador (máquina local, `DATABASE_URL` própria) -> Neon por script. GitHub Actions (ambiente `producao`) -> Cloudflare e Neon.

## STRIDE por superfície

### 1. Login do dono/admin (`/api/sessao/*`)

| Ameaça | Controle | Evidência desta auditoria |
|---|---|---|
| S: força bruta e enumeração de e-mail | Bloqueio 5 falhas/15 min por e-mail, hash fixo para e-mail inexistente, mesma mensagem; limitador `LIMITE_ENTRAR` (10/min) | Sonda "login errado: mensagem genérica" 401 sem eco do e-mail; limitador só existe publicado (ver abaixo) |
| T: CSRF | `SameSite=Lax`, JSON e cabeçalho `X-Pelada: 1` em toda escrita | Sonda: POST sem `X-Pelada` -> 403 |
| R: negar autoria | Auditoria de escritas (RNF-12) | Revisão por tarefa |
| I: vazamento em erro | Mensagens genéricas, 500 sem detalhe | Sondas: corpo malformado e SQLi -> 422/401 sem stack, SQL nem caminho |
| D: custo do bcrypt | Limitador por IP + bloqueio por e-mail | Só verificável em ambiente publicado |
| E: sessão roubada | Cookie `HttpOnly; Secure; SameSite=Lax; Path=/`, sem `Domain`, hash no banco, logout encerra | `Set-Cookie` conferido no login |

### 2. Ranking público sem login (`/api/publico/*`)

| Ameaça | Controle | Evidência |
|---|---|---|
| I: dado pessoal na projeção | Esquema estrito de resposta + teste de campos proibidos | Ranking local sem telefone, ano de nascimento, nota, nível, financeiro, e-mail |
| I: enumeração de slug | Risco aceito pelo usuário (T-13); 404 igual para inexistente e arquivado; limitador `LIMITE_PUBLICO` (60/min) | 404 uniforme; limitador só publicado |
| T/E: escrita anônima | Só `POST eventos`, união discriminada estrita (2 tipos) | Tipo inválido e campo extra -> 422 |
| D: varredura | Limitador por IP | Ver acima |

### 3. Rotas de admin e do dono (`/api/grupos/*`, `/api/dono/*`)

| Ameaça | Controle | Evidência |
|---|---|---|
| E: acesso sem sessão | Sessão em toda rota | 11 sondas sem cookie -> 401; cookie forjado -> 401 |
| E: admin de um grupo no outro | Middleware de vínculo + repositório com `grupoId` + suíte de isolamento; 404 | Admin da quinta em 6 rotas do grupo do domingo -> 404 (e o inverso); admin comum em `/api/dono/*` -> 404 |
| T: entrada inválida | Esquema estrito do contrato no servidor | `pontuacaoInicial` fora de 0 a 9999, posição inexistente, campo extra, peso fora de -10 a 10 -> 422 |
| I: financeiro sem permissão | 403 sem `acessa_financeiro` | Testes do QA (TP-0205) |
| E/T: data de início da pontuação (TP-0209): `POST …/jogadores/:id/inicio/previa` e `PUT …/jogadores/:id/inicio` | Mesma guarda de admin vinculado (sessão, `X-Pelada`, escopo completo, 404 fora do grupo), corpo estrito `{ data }` com data de calendário e `<= hoje` (servidor), transação com trava da linha e auditoria `jogador_inicio_alterado` (datas e acumulados, sem dado pessoal) | 71 sondas autenticadas (`sondas-autenticadas.py`, 2 grupos e 3 contas): sem cookie/forjado 401, sem `X-Pelada` 403, senha temporária 403, grupo/jogador alheio e id inválido 404, formato/futura/campo extra/tipo/SQLi/corpo malformado 422, 1 MB 413; público sem `inicioPontuacao`. **Falha:** sem limite inferior, `1900-01-01` é aceita e `0000-01-01` na gravação responde 500 (RTP aberta, Baixo) |

### 4. Importação do legado por script (ADR-021)

| Ameaça | Controle |
|---|---|
| T: gravar no banco errado | `exigirHostPermitido` (G-21), `DATABASE_URL` só do ambiente do operador, confirmação de backup digitada |
| I: dado pessoal do legado no repositório ou no log | Telefone nunca lido; só o ano de nascimento; log só com contagens; arquivo de entrada fora do repositório (ver débito: `.gitignore` não cobre o arquivo do legado) |
| T: carga parcial ou repetida | Transação única; recusa se o grupo já tem partida ou apelido repetido |
| E: uso por agente em produção | A execução em produção é do usuário (ADR-021 item 6) |

### 5. PDF (`/api/publico/<slug>/pdf`)

| Ameaça | Controle |
|---|---|
| I: dado pessoal no PDF | Mesma projeção pública do ranking (RF-33) |
| T: injeção em nome/slug | Slug validado; apelido é texto, sem HTML |
| D: geração pesada | Limitador público; mês validado |

### 6. Hyperdrive / Neon

| Ameaça | Controle |
|---|---|
| I: credencial do banco no Worker | Só o binding `HYPERDRIVE`; `localConnectionString` do `wrangler.jsonc` é só a de desenvolvimento local |
| I: cache de resposta com dado de outro grupo | Cache do Hyperdrive desligado (G-17), conferido no `deploy.yml` antes de publicar |
| T/I: Neon exposto | Não exposto ao navegador; TLS |
| R: perda de dado na migração | Branch de restauração + dump cifrado antes de migrar |

### 7. `deploy.yml` e CI

| Ameaça | Controle | Situação |
|---|---|---|
| S/E: deploy por quem não deve | `workflow_dispatch` manual, `environment: producao`, branch policy só `main` (RTP-0163) | OK |
| I: segredo no workflow | Todos via `${{ secrets.* }}`; nenhum literal | OK (conferido) |
| E: token amplo | `permissions: contents: read`; token Cloudflare com escopo mínimo | OK |
| T: cadeia de suprimentos | Ações do GitHub fixadas por SHA de 40 caracteres; pnpm com `blockExoticSubdeps`, `minimumReleaseAge` e `trustPolicy` | OK (2ª auditoria: grep sem `uses:` por tag; semgrep sem `mutable-action-tag`); resta RTP-0176 (Baixo) |
| I: dump com dado pessoal | Cifrado com chave simétrica do secret | OK |

## Riscos aceitos (do usuário)

T-13 (enumeração de slug), ausência de RLS na Fase 1, sem criptografia por campo na Fase 1.

## Débitos de segurança abertos nesta auditoria

Resolvidos na 2ª auditoria de 2026-10-20 (RTP-0169 a 0175): nosniff em `/api/*` (30 sondas com o cabeçalho exigido em 200/401/403/404/422), ações do GitHub por SHA, `.gitignore` do legado.

0. Data de início sem limite inferior (`0000-01-01` gera 500 no `PUT …/inicio`; `1900-01-01` é aceita). Baixo, só admin autenticado, sem vazamento, transação reverte.
1. `pnpm-missing-minimum-release-age` ainda acusado pelo semgrep (RTP-0176). Baixo.
2. `braces@3.0.3` dev-only (GHSA-vfj7-8cjw-p6xm), sem versão corrigida. Baixo, monitorado.
3. Verificação do limite de taxa e dos cabeçalhos no host publicado: obrigatória após o deploy (não aplicável ao ambiente local; sem staging, ADR-020).
