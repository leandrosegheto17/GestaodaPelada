# SECURITY-REVIEW

## Auditoria de release 2026-10-22 — DevSecOps — APROVADA COM DÉBITO

**Risco aceito pelo usuário em 2026-10-22 (resposta "sim" ao pedido de confirmação do deploy):** o item NÃO EXECUTADO desta auditoria (limite de taxa da Cloudflare em `/api/sessao/entrar` e `/api/publico/*` e cabeçalhos no host publicado). Motivo: não há staging (ADR-020) e DAST em produção é proibido; o aceite de 2026-10-21 valia para aquele deploy. Prazo proposto: conferência passiva (`curl -I` na URL pública) logo depois do deploy.

Escopo: o que mudou desde a auditoria de 2026-10-21 (`83909c5b..HEAD`, 126 arquivos): lote de períodos do jogador (TP-0210 a TP-0231 e RTP-0186 a RTP-0204): rotas `GET …/periodos`, `PUT …/periodos/:periodoId`, `POST …/periodos/:periodoId/previa`, `POST …/reativar/previa` e `POST …/reativar` com `dataRetorno`; piso da data de início (RTP-0185); migração `202610210000_contrai_posicao`; checagem `checar-escrita-periodo.mjs` (G-26) no `ci.yml`; telas novas do jogador. Só produção (ADR-020): teste ativo só local (API `127.0.0.1:8787`, banco de desenvolvimento `pelada` semeado); nada contra produção, nada apagado, `pelada_teste` não usado. Brutos em `.md/.seguranca/2026-10-22/` (`dast-api-auth/periodos.json`, `dast-api-auth/inicio.json`, `dast-web/`, `resumo-dast.md`, `zap.json`, `semgrep.json`, `osv-scanner.json`, `gitleaks.json`).

### Executado (evidência com comando e saída)

| Item | Comando | Ferramenta | Resultado | Saída completa |
|---|---|---|---|---|
| Dependências de produção | `pnpm audit --prod --json` | pnpm 11.23.0 | 0 vulnerabilidades | `dependencias-node.json` |
| Dependências, todos os lockfiles | `osv-scanner scan source -r` (Docker) | osv-scanner (imagem `latest`) | 1: `braces@3.0.3` (GHSA-vfj7-8cjw-p6xm), dev-only via stylelint; igual a 21/10; sem versão corrigida | `osv-scanner.json` |
| Segredos no histórico inteiro | `gitleaks git` | gitleaks 8.30.1 | 36, nos mesmos 3 commits de 21/10 (`d273d665` 21, `50b1fa6b` 14, `bca136ab` 1, contagem por commit conferida no JSON); nenhum commit do lote tem achado; falsos positivos já classificados | `gitleaks.json` |
| SAST | `semgrep scan --config p/default p/secrets p/owasp-top-ten` (Docker) | semgrep (imagem `latest`) | ERROR 13, WARNING 31, MEDIUM 1 (21/10: 13/28/1). Nenhum caminho em `backend/api/src`, `backend/dominio`, `backend/contrato` ou `frontend/` | `semgrep.json` |
| DAST da API (sondas do projeto) | `seguranca.py --dast http://127.0.0.1:8787 --sondas .md/.seguranca/sondas.json` | seguranca.py + urllib | 77 sondas (35 novas para o lote), 0 reprovadas, `nosniff` exigido em todas as respostas | `dast-sondas.json`, `resumo-dast.md` |
| ZAP baseline | idem (Docker) | zaproxy/zap-stable | 0 alto, 0 médio, 3 baixos (COEP/COOP/CORP, igual e aceitável) | `zap.json` |
| Front servido pelo Worker | `seguranca.py --dast … --sondas .md/.seguranca/sondas-web.json` | seguranca.py | 3/3, 0 falhas; CSP restritiva, nosniff, referrer-policy `same-origin`, permissions-policy (`curl -sI` em `/`) | `dast-web/` |
| Sondas autenticadas da data de início | `python .md/.seguranca/sondas-autenticadas.py http://127.0.0.1:8787 …/inicio.json` | Python 3 + urllib, 3 contas, 2 grupos | 71 sondas, 0 falhas (em 21/10: 4 falhas, 1 defeito). `0000-01-01`, `0001-01-01` e `1900-01-01` agora 422 | `dast-api-auth/inicio.json` |
| Sondas autenticadas do lote de períodos | `python .md/.seguranca/sondas-autenticadas-periodos.py http://127.0.0.1:8787 …/periodos.json` | Python 3 + urllib, 3 contas, 2 grupos | 225 sondas, 0 falhas: 153x422, 33x404, 11x200, 10x401, 9x403, 6x413, 3x409; nenhuma 5xx; nosniff e sem stack/SQL/caminho em todas | `dast-api-auth/periodos.json` |
| Checagens estáticas do projeto (G-14, G-21, G-23, G-24, G-25, G-26) | `node backend/scripts/checagens/checar-{escrita-periodo,escrita-e-dono,grupo-id,migracao-aditiva,acoes-fixadas,ids-tarefa}.mjs` | node 24.16.0 | todas com código de saída 0 (299, 570, 20 e 13 arquivos/migrações conferidos nas quatro que imprimem contagem) | terminal |
| Contrato compatível | `pnpm --filter @pelada/contrato checar-compatibilidade` | pnpm 11.23.0 | "Contrato compatível com o snapshot." | terminal |
| Banco (psql no `gestaodapelada-db-1`, PostgreSQL 16.15) | `select …` em `auditoria`, `contas`, `sessoes`, `pg_constraint` | psql | auditoria de `jogador_periodo_corrigido`, `jogador_reativado_retroativo` e `jogador_inicio_alterado` só com datas, acumulados, posição e id do período (0 linhas com `@`, telefone, apelido ou senha); hash de senha `$2a$12$` (60); token de sessão guardado com 32 bytes; CHECK de posição com as 7 posições e 0 linhas com posição antiga | terminal |

### Comparação com a auditoria de 21/10

- **gitleaks**: 36 = 36, mesmos 3 commits e mesmas contagens por commit.
- **OSV**: 1 = 1 (`braces`).
- **semgrep**: ERROR 13 = 13 (o `spawn-shell-true` de `.claude/scripts/comparar-visual.mjs` só mudou de linha, 166, depois de o arquivo encolher); WARNING 28 -> 31. Os 3 WARNING novos, conferidos no JSON, são falsos positivos sem entrada externa: (1) e (2) `detect-non-literal-regexp` em `backend/scripts/checagens/checar-escrita-periodo.mjs:83-84` (checagem do CI; o padrão é montado com nomes de funções de escrita e identificadores de `import` lidos do próprio código-fonte do repositório, sem dado de usuário, e a execução é só no CI); (3) `dynamic-urllib-use-detected` em `.md/.seguranca/sondas-autenticadas.py:24` (script de sonda; a URL vem do argumento e o script recusa qualquer base que não seja `127.0.0.1`/`localhost`). Nenhum no código publicado.
- `pnpm-missing-minimum-release-age` (1 MEDIUM) permanece: é o RTP-0176, não duplicado.

### Verificação por item do lote (executado)

- **Autenticação e CSRF** nas 4 rotas novas de escrita/prévia e na listagem: sem cookie 401; cookie forjado 401; sem `X-Pelada` 403; conta com senha temporária (escopo restrito) 401/403.
- **Isolamento (SDD §7, Autorização)**: admin do outro grupo 404; par grupo/jogador cruzado 404; período de **outro jogador do mesmo grupo** 404 (IDOR de período); período e jogador inexistentes 404; ids não UUID e com SQLi 404; reativar de jogador ativo 409 sem gravar. Leitura de código: `corrigirPeriodo` e a leitura de existência filtram por `periodo`, `jogador` e `grupo_id`.
- **Validação (datas malformadas e extremas)**: 17 variações de data em 5 campos (`saida`, `retorno`, `dataRetorno`, mais as prévias) mais tipos errados, campo extra, array, JSON malformado, corpo vazio e 1 MB: 422/413, sem 5xx, sem eco do valor enviado.
- **Gravação**: reativar com retorno retroativo 200 e depois 409; correção de retorno 200 duas vezes (ida e volta) com auditoria; correção com data igual responde `alterado: false` sem gravar nem auditar.
- **Dados pessoais**: ranking público sem período, e-mail nem id de conta; listagem de períodos só com `id`, `tipo`, `inicio`, `fim`, `corrigivel`; `Cache-Control: no-store` e `nosniff` em `/api/grupos/*` (conferido com `curl -si` na listagem).
- **RTP-0185 (data de início sem piso): RESOLVIDO** e verificado (71 sondas, 0 falhas).

### Somente lido (não conta como teste)

- Revisão do diff `83909c5b..HEAD` em `backend/api/src` e `frontend/web/src`: SQL só por Kysely/`sql` com parâmetros nos repositórios novos; sem `eval`, `sql.raw`, `innerHTML`, `dangerouslySetInnerHTML`, `localStorage`/`sessionStorage`, `document.cookie`, `console.log` nem `fetch` direto nas telas novas (grep sobre as linhas adicionadas). Ordem `travar` -> escrita -> `auditoria.registrar` na mesma transação em `periodos-corrigir` e `reativar`; a ordem em `inativar`, `inicio-editar`, lançar presença e editar partida é coberta pelo teste de ordem do CI (G-26), **não rodado nesta auditoria** (exige o banco de teste, fora do escopo autorizado).
- Configuração (grep e `git diff 83909c5b..HEAD`): só `ci.yml` (+1 passo `checar-escrita-periodo.mjs`) e `.gitignore` (+3 linhas) mudaram; `deploy.yml`, `wrangler.jsonc`, `pnpm-workspace.yaml` e lockfile sem alteração; `grep "uses:" … | grep -vE "@[0-9a-f]{40}"` não devolve ação externa por tag; `blockExoticSubdeps: true`, `minimumReleaseAge: 1440`, `trustPolicy: no-downgrade`.
- SDD §7 conferido contra as sondas acima: autenticação, sessão (`__Host-sessao`), RBAC por grupo com 404, criptografia (bcrypt 12, SHA-256), isolamento, superfície (`no-store`, `nosniff`, CSP no front) e LGPD (auditoria e listagem sem dado pessoal): sem divergência.

### Achados

Nenhum Crítico, Alto, Médio nem Baixo novo. Observações sem severidade de segurança (não viram tarefa): (a) as mensagens 422 de tipo errado e campo extra vêm do Zod em inglês (`Invalid input: …`, `Unrecognized key: …`), sem valor sensível (a chave citada é a que o próprio cliente enviou); (b) o proxy `/api` do servidor de desenvolvimento do front (`127.0.0.1:5173`) respondeu 502 neste ambiente e esse servidor não envia os cabeçalhos de segurança (eles vêm do Worker); por isso o front foi auditado onde é publicado (assets servidos pelo Worker em `:8787`).

### Resíduo no banco de desenvolvimento

As sondas criaram **um** jogador de teste no Racha de Domingo (`SondaAudit-10-22`, id `873599a3-7262-4751-a469-8c85fb442538`, ativo, com 2 períodos e as linhas de auditoria correspondentes) e a sonda da data de início regravou e restaurou `2026-07-04` no início do primeiro jogador da Pelada de Quinta. Nada foi apagado.

### Não executado

(1) Limite de taxa da Cloudflare em `/api/sessao/entrar` e `/api/publico/*` e cabeçalhos no host publicado: o binding do limitador não existe no ambiente local; sem staging (ADR-020); DAST em produção é proibido. Verificação passiva obrigatória depois do deploy (`curl -I` na URL pública: `Set-Cookie`, nosniff, CSP). (2) Teste de ordem/concorrência da G-26 e suíte de isolamento por rota (`pnpm --filter @pelada/api test`): dependem do banco `pelada_teste`, que esta auditoria não podia usar; ficam cobertos pelo CI da `main`, que deve estar verde no commit a publicar.

Débito aberto (Baixo): RTP-0176 (`minimumReleaseAge` 1440 acusado pelo semgrep) e `braces` dev-only (monitorado). RTP-0185 fechado. Nenhum Crítico/Alto. Veredito: APROVADA COM DÉBITO, condicionada ao aceite do usuário do item (1) no pedido de deploy.

## Auditoria de release 2026-10-21 — DevSecOps — APROVADA COM DÉBITO

**Risco aceito pelo usuário em 2026-10-21 (ao pedir o deploy):** o item NÃO EXECUTADO desta auditoria — limite de taxa da Cloudflare em `/api/sessao/entrar` e `/api/publico/*` e cabeçalhos no host publicado. Motivo: não há staging (ADR-020) e DAST em produção é proibido. Prazo: conferência passiva (`curl -I` na URL pública) logo depois do deploy. Débito aberto: RTP-0185 (Baixa).

Escopo: release com a TP-0209 (data de início da pontuação: migração `202610201000_inicio_pontuacao`, rotas `POST …/jogadores/:id/inicio/previa` e `PUT …/jogadores/:id/inicio`, `inicioPontuacao` no detalhe, "–" no ranking e no PDF, T16 com diálogo). Só produção (ADR-020): teste ativo só local (127.0.0.1:8787, banco descartável `pelada_auditoria` semeado por `pnpm seed`); nada contra produção. Brutos em `.md/.seguranca/2026-10-21/` (`dast-api/`, `dast-api-auth/`, `dast-web/`, `semgrep.json`, `osv-scanner.json`, `gitleaks.json`).

Executado (Fase A, `seguranca.py`) e comparado com a 2ª de 20/10, achado a achado no bruto:
- `pnpm audit --prod`: 0 (igual). OSV: 1, `braces@3.0.3` dev-only (igual). gitleaks (histórico): 36, nos mesmos 3 commits (`d273d665` 21, `50b1fa6b` 14, `bca136ab` 1); nenhum commit da TP-0209 tem achado. semgrep: ERROR 13 / WARNING 28 / MEDIUM 1, mesma contagem por regra; nenhum caminho em `backend/` ou `frontend/` aparece (os achados são `.claude/`, docs, scripts de desenvolvimento). **Novo frente a 20/10: nada.**

Executado (Fase C, DAST local):
- `seguranca.py --dast … --sondas .md/.seguranca/sondas.json`: 42 sondas (12 novas para a TP-0209: previa e editar sem cookie, cookie forjado, sem `X-Pelada`, data e corpo malformados, detalhe do jogador e PATCH com `inicioPontuacao` sem cookie), 0 reprovadas, `nosniff` em todas.
- Sondas autenticadas (`.md/.seguranca/sondas-autenticadas.py`, sessões reais de 3 contas e 2 grupos): 71 sondas, 67 passam, 4 falham (um defeito, abaixo). Passam: 401 sem cookie e com cookie forjado; 403 sem `X-Pelada`; 403 para conta com senha temporária; 404 para admin de outro grupo, jogador de outro grupo, par grupo/jogador cruzado, UUID inexistente, id não UUID e id com SQLi; 422 para formato inválido, 30/02, mês 13, data futura, tipo errado, null, campo ausente, campo extra, SQLi na data, data com hora, array, JSON malformado e corpo vazio; 413 para 1 MB; PATCH do jogador recusa `dataEntrada` e `inicioPontuacao` (strict) e o ranking e o PDF públicos não trazem `inicioPontuacao`, e-mail nem id de conta. Mesma data repetida responde 200 sem gravar.
- Banco (psql, executado): 7 linhas de `jogador_inicio_alterado`, resumo só com datas e acumulados (sem apelido, telefone nem e-mail); hash de senha `$2a$12$`; token de sessão guardado com 32 bytes (SHA-256).
- Front (`sondas-web.json`) 3/3, 0 falhas; CSP restritiva, `nosniff`, `referrer-policy: same-origin`, `permissions-policy` presentes (`curl -I`). ZAP baseline: 0 alto, 0 médio, 3 baixos (COEP/COOP/CORP, igual e aceitável).

**Achado (Baixo): data de início sem limite inferior.** `PUT …/inicio` com `0000-01-01` devolve 500 `erro_interno` (o Postgres recusa o ano 0; a transação reverte e a mensagem é genérica, sem vazamento), a prévia responde 200 com números sem sentido para a mesma data, e `1900-01-01` é aceita e move o início do 1º período. Só admin autenticado do próprio grupo alcança isso, sem acesso a dado alheio. Vira RTP (Baixo); não bloqueia.

Configuração (executado: grep e `git diff bbb50979..HEAD`): nenhuma mudança em `.github/`, `wrangler.jsonc`, `pnpm-workspace.yaml`, `.gitignore`, lockfile; `deploy.yml` com `workflow_dispatch`, `environment: producao`, `permissions: contents: read`, `persist-credentials: false`; todos os `uses:` externos por SHA de 40 caracteres; `blockExoticSubdeps`, `minimumReleaseAge: 1440`, `trustPolicy: no-downgrade`. SDD §7 conferido contra as sondas acima (autenticação, RBAC por grupo com 404, cookie `__Host-sessao` HttpOnly/Secure/SameSite=Lax, bcrypt 12, hash SHA-256, auditoria sem dado pessoal, cabeçalhos): sem divergência.

Não executado: (1) limite de taxa da Cloudflare em `/api/sessao/entrar` e `/api/publico/*` e cabeçalhos no host publicado (local não tem o limitador; sem staging, ADR-020; DAST em produção é proibido). Verificação passiva obrigatória depois do deploy (`curl -I` na URL pública). O aceite do usuário de 20/10 valia para aquele deploy: este precisa de aceite novo, registrado.

Débito aberto (Baixo): data de início sem limite inferior (RTP-0185), RTP-0176, `braces` dev-only. Nenhum Crítico/Alto. Veredito: APROVADA COM DÉBITO.

## Auditoria de release 2026-10-20 (2ª) — DevSecOps — APROVADA COM DÉBITO

**Confirmação antes do deploy (2026-10-20, depois das RTP-0177 a 0181 e dos BK-0012/0013):** desde esta auditoria (`a46da169`) o código que roda em produção não mudou (só o comentário da migração `202610200000`); mudaram a checagem `checar-acoes-fixadas`, um passo do `ci.yml` e textos. `pnpm audit --prod` sem vulnerabilidades; gitleaks sobre o histórico inteiro, os mesmos 36 achados nos mesmos 3 commits (todos falsos positivos já classificados); CI da `main` verde em `bbb50979`.

**Risco aceito pelo usuário em 2026-10-20 (ao pedir o deploy):** o item NÃO EXECUTADO desta auditoria — limite de taxa da Cloudflare em `/api/sessao/entrar` e `/api/publico/*` e cabeçalhos no host publicado. Motivo: não há staging (ADR-020) e DAST em produção é proibido. Prazo: conferência passiva (`curl -I` e leitura, sem ataque) logo depois do deploy.
Escopo: release após as RTP-0169 a 0175 (nosniff em `/api/*`, ações do GitHub por SHA, endurecimento do pnpm, `.gitignore` do legado) e o ajuste do Exportar PDF no front. Só produção (ADR-020): teste ativo só local (127.0.0.1:8787, banco local); nada contra produção. Brutos em `.md/.seguranca/2026-10-20/` (`dast-api3/`, `dast-web2/`, `semgrep.json`, `osv-scanner.json`, `gitleaks.json`).

Executado (Fase A, `seguranca.py`, resumo-ferramentas.md) e o que mudou frente à 1ª auditoria de hoje:
- `pnpm audit --prod`: 0 (igual).
- OSV: 1 achado, o mesmo `braces@3.0.3` (GHSA-vfj7-8cjw-p6xm), dev-only via stylelint (igual; débito monitorado, sem versão corrigida).
- gitleaks (histórico): 36 (igual). Conferido no JSON: commits só `d273d665` (21, JWTs de demonstração do Supabase local), `50b1fa6b` (14, docs de skills) e `bca136ab` (1, texto de TP-0164); nenhum commit das RTP-0169 a 0175 tem achado. Falsos positivos, sem rotação.
- semgrep: ERROR 13 / WARNING 28 (antes 53/41; a queda vem de o `gitleaks.json` não ser mais varrido: 40 ERROR de JWT sumiram). Contagem por regra no JSON: `github-actions-mutable-action-tag` 0 (antes 13), MEDIUM do pnpm 1 (antes 3: `block-exotic-sub-dependencies` e `trust-policy` resolvidos). Restante igual e sem achado real no produto: 8 `detect-child-process` + 1 `spawn-shell-true` (ferramentas `.claude/`), 2 websocket em Markdown, 1 bcrypt (`HASH_FIXO`, ADR-015), 1 segredo genérico em doc de skill, 14 `path-join`, 6 `non-literal-regexp`, 3 `playwright-evaluate`, md5/sha1/http em scripts de desenvolvimento.
- `pnpm-missing-minimum-release-age` permanece (1 MEDIUM) mesmo com `minimumReleaseAge: 1440` no `pnpm-workspace.yaml`: é a RTP-0176 (a regra provavelmente espera outra chave/arquivo); não duplicado.

Executado (Fase C, DAST local): `seguranca.py --dast http://127.0.0.1:8787 --sondas .md/.seguranca/sondas.json`: 30 sondas, 0 falhas. Sondas do front (`sondas-web.json`): 3/3, 0 falhas. ZAP baseline: 0 alto, 0 médio, 3 baixos (COEP/COOP/CORP, aceitável, igual).
- RTP-0169 (nosniff em `/api/*`): o `seguranca.py` exige `X-Content-Type-Options: nosniff` em TODA resposta de cada sonda (`cabecalhos_esperados` global), logo as 30 sondas cobrem 200 (`/api/saude`, ranking, PDF), 401 (rotas de admin/dono, `sessao/eu`), 403 (CSRF), 404 (`/api/inexistente`, slugs) e 422 (login, evento): 0 falhas. Conferência manual com `curl -si`: `/api/saude` 200, `/api/sessao/eu` 401 e `/api/inexistente` 404 trazem `X-Content-Type-Options: nosniff`; `/api/publico/pelada-de-quinta/pdf` 200 `application/json`, `Cache-Control: no-store`, nosniff. Débito (a) da 1ª auditoria: RESOLVIDO.
- Isolamento, autenticação, validação e CORS: mesmas sondas de antes, todas passando (401 sem cookie e com cookie forjado, 403 sem `X-Pelada`, 404 em grupo alheio já coberto na 1ª auditoria sem mudança de código nessas rotas). `/.env`, `/wrangler.jsonc` e `/.git/config` devolvem 200 com o `index.html` da SPA (`curl` confirmou HTML, sem conteúdo sensível).
- Front: `/` traz CSP restritiva (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`), `x-content-type-options: nosniff` e `referrer-policy: same-origin` (`curl -sI`). O ajuste do Exportar PDF não alterou o endpoint (segue JSON sem dado pessoal; o PDF é montado no cliente).

Configuração (executado: grep): `deploy.yml` com `workflow_dispatch`, `environment: producao`, `permissions: contents: read`, `persist-credentials: false`; `uses:` de `ci.yml`, `backup.yml` e `deploy.yml`: todos os 12 externos por SHA de 40 caracteres (`grep -vE "@[0-9a-f]{40}"` não devolve nada) e os restantes são ações locais `./`. SHAs conferidos com `gh api`: checkout `11d5960a` = v4.4.0, gitleaks-action `ff98106e` = v2.3.9, upload-artifact `ea165f8d` = v4.6.2. Débito (b, ações por tag): RESOLVIDO. `pnpm-workspace.yaml`: `blockExoticSubdeps: true`, `minimumReleaseAge: 1440`, `trustPolicy: no-downgrade`. `.gitignore`: padrão do legado presente (linha 25, commit `afb8b424`); `git ls-files` não lista arquivo de entrada do legado. Débito (c): RESOLVIDO. `wrangler.jsonc`: sem segredo (Hyperdrive por binding, `localConnectionString` local, `DONO_EMAIL` `.invalid`). SDD §7 conferido de novo contra os resultados acima: sem divergência.

Não executado: (1) limite de taxa da Cloudflare e cabeçalhos no host publicado (sem staging, ADR-020; não se roda DAST em produção): verificação passiva obrigatória após o deploy (`curl -I` na URL pública, conferir `Set-Cookie`, nosniff e CSP).

Débito aberto (Baixo): RTP-0176 (`minimumReleaseAge` ainda acusado pelo semgrep), `braces` dev-only (monitorado). Nenhum Crítico/Alto. Veredito: APROVADA COM DÉBITO.

## Auditoria de release 2026-10-20 — DevSecOps — APROVADA COM DÉBITO
Escopo: release com pontuação inicial, 6 posições, 6 pesos e importação do legado (ADR-021), a publicar em produção pelo `deploy.yml`. Evidência em `.md/.seguranca/2026-10-20/` (brutos), `.md/.seguranca/sondas.json` e `sondas-web.json`; modelo de ameaças em `.md/THREAT-MODEL.md`. Ambiente testado: local (docker compose, banco `pelada` local descartável, 127.0.0.1); nada contra produção (G-21).

Executado (Fase A, `seguranca.py`):
- `pnpm audit --prod`: 0 vulnerabilidades. OK.
- OSV (todos os lockfiles): 1 achado, CONFIRMADO mas só dev: `braces@3.0.3` (GHSA-vfj7-8cjw-p6xm, DoS por aninhamento profundo, severidade da fonte HIGH), vindo de `stylelint > globby > fast-glob > micromatch` (devDependency do `@pelada/web`, `pnpm why braces`). Não entra no Worker nem no bundle. Sem versão corrigida no npm (3.0.3 é a última). Débito monitorado; não bloqueia.
- gitleaks (histórico, 36): 0 segredos reais. 24 são o par de JWTs de demonstração do Supabase local (payload `iss: supabase-demo`, `role: anon`/`service_role`, nos commits `d273d665`: ci.yml, testes de RLS, e2e e esta própria SECURITY-REVIEW; não dão acesso a nada do projeto); 1 em `.md/.taskplan/TP-0164.md` (commit `bca136ab`, trecho de texto "api: aplicacao/..."); 1 `p256dh-forged` em teste; 10 em docs de skills (`YOUR_API_TOKEN`, `sk_live_abc123`, chaves de exemplo do figma), commit `50b1fa6b`. Todos falsos positivos; nenhuma rotação necessária. Nenhum `.env` versionado (só `.env.example`).
- semgrep (ERROR 53 / WARNING 41): 0 reais no produto. ERROR: 40 JWT são o próprio `gitleaks.json` varrido; 8 `detect-child-process` e 1 `spawn-shell-true` em `.claude/skills/mermaid-studio` e `.claude/scripts/comparar-visual.mjs` (ferramentas de desenvolvimento, não publicadas, sem entrada externa); 2 websocket inseguro em Markdown (doc de skill e TP-0002); 1 bcrypt em `contas.ts:8` é o `HASH_FIXO` deliberado e sem senha (ADR-015); 1 segredo genérico em doc da skill cloudflare. WARNING: 13 ações do GitHub por tag mutável (REAL, débito Baixo, abaixo), 14 `path-join` e 6 `non-literal-regexp` em scripts de desenvolvimento/testes/config de tokens, 3 `playwright-evaluate` e http-server na skill playwright, md5/sha1 em `.claude/scripts` (identificadores, não segurança). 3 MEDIUM de `pnpm-workspace.yaml` (`block-exotic-sub-dependencies`, `minimum-release-age`, `trust-policy`): endurecimento de cadeia de suprimentos, débito Baixo.

Executado (Fase C, DAST local, `seguranca.py --dast`): 30 sondas na API (0 reprovadas após ajustar a expectativa 400 para 422 em 3 sondas de validação, que é o código do contrato) e 3 no front servido pelo Worker (0 reprovadas). ZAP baseline: 0 alto, 0 médio, 3 baixos (COEP/COOP/CORP ausentes: aceitável, sem recurso cross-origin).
- Autenticação: 11 rotas de admin/dono sem cookie -> 401; cookie forjado -> 401; escrita sem `X-Pelada` -> 403; login errado -> 401 sem eco do e-mail; corpo malformado e SQLi no login/slug -> 422/401/404 sem stack, SQL nem caminho.
- Isolamento: admin da quinta em 6 rotas do grupo do domingo -> 404 (e o inverso); admin comum em `/api/dono/*` -> 404.
- Validação: `pontuacaoInicial` -1, 10000, 1.5, "abc" -> 422 (mensagem "0 a 9999"); 0 e 9999 aceitos; posição inexistente e legada (`defensor`) -> 422; campo extra (`e_dono`) -> 422; pesos 11, -11, 1.5, "a" -> 422 ("-10 a 10"); evento público com tipo inválido ou campo extra -> 422. Registros de teste criados foram apagados.
- Público: ranking sem login sem telefone, ano de nascimento, nota, nível, financeiro nem e-mail (o campo `linhas[].posicao` é a colocação numérica, não a posição em campo); PDF 200 `no-store`.
- Sessão: cookie `HttpOnly; Secure; SameSite=Lax; Path=/` (`__Host-`), logout invalida (200 -> 204 -> 401). Bloqueio por e-mail: 5 falhas e depois 429.
- CORS: sem `Access-Control-Allow-Origin` com `Origin` hostil; preflight não liberado. `/.env`, `/wrangler.jsonc`, `/.git/config` devolvem só o `index.html` da SPA (conferido que não contêm conteúdo sensível).
- Cabeçalhos do app (`/`, `/g/<slug>`, `/admin`): CSP restritiva, nosniff, Referrer-Policy e Permissions-Policy presentes.

Configuração: `wrangler.jsonc` sem segredo (a `localConnectionString` é a do banco local; Hyperdrive só por binding; `DONO_EMAIL` com `.invalid`); `deploy.yml` com `workflow_dispatch`, `environment: producao`, `permissions: contents: read`, todos os valores via `secrets.*`/`vars.*`, `persist-credentials: false`, branch Neon + dump cifrado antes da migração, cache do Hyperdrive conferido, rollback na falha. SDD §7 conferido item a item (autenticação, autorização, criptografia, multi-tenant, superfície, LGPD): sem divergência.

Não executado: (1) limite de taxa da Cloudflare em `/api/sessao/entrar` e `/api/publico/*`: o binding não existe no ambiente local (o middleware passa sem limitar quando ausente); só verificável no host publicado depois do deploy, em modo leitura (não é DAST de ataque; G-21). Sem homologação (ADR-020).

Débitos (todos Baixos, prazo: antes do próximo deploy): (a) `nosniff` ausente nas respostas JSON de `/api/*`; (b) ações do GitHub por tag, não por SHA, e 3 ajustes de endurecimento do pnpm; (c) `.gitignore` sem padrão para o arquivo de entrada do legado; (d) `braces` dev sem correção publicada (monitorar). Observação fora de segurança: o banco local tem jogadores com posição legada (`defensor`/`meio_campo`) e a lista de jogadores do grupo da quinta responde 500 (ZodError no contrato novo, sem vazamento); em produção a migração 202610200000 converte os valores, e o CHECK legado está no BK de contração.

## TP-0001 — DevSecOps — 2026-10-16
APROVADA, 0 críticos/0 não críticos; pnpm audit no lockfile do commit limpo, .env/.dev.vars ignorados e .env.example sem valores, sem dependência proibida; 13 vulns na árvore atual vêm de tarefas posteriores (tratar no /deploy).

## TP-0002 — DevSecOps — 2026-10-16
APROVADA, 0 críticos e 2 baixos (RTP-0001, RTP-0002: guardas de lint contornáveis por alias); audit de dependências sem achado nas libs novas (13 pré-existentes em dev); lint, checagens e 120 testes verdes.

## TP-0004 — DevSecOps — 2026-10-16
APROVADA, 0 críticos e 0 não críticos; fontes.css sem @import/https, 14 woff2 com assinatura válida, OFL presente, sem Google Fonts fora das isenções; sem dependência nova.

## TP-0005 — DevSecOps — 2026-10-16
APROVADA; 0 críticos, 0 não críticos; só `zod`, sem dependência nova, centavos inteiros seguros, limite de senha em bytes exposto, mensagens não ecoam valor.

## TP-0007 — DevSecOps — 2026-10-16
APROVADA — revisão do diff limpa (função pura, G-01/G-06/G-23 ok, grep 0 ocorrências, sem dependência nova); 0 achados.

## TP-0011 — DevSecOps — 2026-10-16
APROVADA — funções puras sem relógio/import externo/dado exposto, G-10 respeitado, sem mudança de dependência; 0 críticos, 0 não críticos.

## TP-0012 — DevSecOps — 2026-10-16
APROVADA em segurança; 0 achados; saída restrita a [a-z0-9-], reservadas tratadas, laço limitado, 50 testes verdes, sem dependências novas.

## TP-0015 — DevSecOps — 2026-10-16
APROVADA; 0 críticos/0 não críticos; trava de host falha fechado e sem vazamento de senha, `pg` isolado, audit sem advisory nas deps novas (tsx, workers-types).

## TP-0147 — DevSecOps — 2026-10-16
APROVADA — previa.ts pura, inteiros, sem I/O/import/relógio/random/dado pessoal; revisão de diff, 0 achados.

## TP-0149 — DevSecOps — 2026-10-16
APROVADA em segurança; diff lido + grep executado (sem random/relógio/import/ID), sem dependência nova, sem dado pessoal; 0 achados.

## TP-0008 — DevSecOps — 2026-10-17
APROVADA em segurança; 0 críticos, 0 não críticos; revisão do diff (função pura, sem relógio/IO/import externo/dado pessoal, O(n log m)), sem dependência nova e sem comando executado.

## TP-0009 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos novos; revisão do diff de funções puras sem I/O, relógio, import externo nem dado pessoal; sem dependência nova (nada executado além da seção 5).

## TP-0013 — DevSecOps — 2026-10-17
APROVADA COM DÉBITO — diff seguro (CSRF antes de rotas, 500 sem detalhe, no-store inclusive 404/500, wrangler em lista fechada); `pnpm audit --prod` limpo, avisos altos de sharp/undici só em dev via wrangler -> RTP-0008; teste ativo fica para o /deploy.

## TP-0088 — DevSecOps — 2026-10-17
OK — revisão do diff sem achados (sem inline/terceiros, recursos falha fechado, deps oficiais); pnpm audit --prod sem vulnerabilidades; 0 críticos, 0 não críticos.

## TP-0150 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos novos; revisão do diff (função pura sem I/O, relógio, random ou import externo, divisões protegidas), sem dependência nova; nada executado neste chapéu.

## TP-0014 — DevSecOps — 2026-10-17
OK em segurança; 0 achados; G-02/G-16/G-21 conferidos por leitura do diff, sem estado global nem vazamento de conexão.

## TP-0091 — DevSecOps — 2026-10-17
OK — revisão do diff sem achados (X-Pelada em escritas, URL same-origin, erro fora do padrão não refletido, sem log de corpo); pnpm audit --prod limpo; 0 achados.

## TP-0092 — DevSecOps — 2026-10-17
OK — formatação sem superfície de ataque, entrada de moeda validada em BigInt/ASCII, 94 testes passando, 0 achados.

## TP-0093 — DevSecOps — 2026-10-17
OK; 0 achados; revisão do diff, só importa @pelada/contrato, sem dado pessoal nem superfície de segurança, sem dependência nova.

## TP-0095 — DevSecOps — 2026-10-17
OK; 0 achados; diff lido e grep executado sem dangerouslySetInnerHTML/style inline/cor literal, sem dependência nova.

## TP-0097 — DevSecOps — 2026-10-17
APROVADA — controles de apresentação sem superfície de segurança; sem innerHTML/style/cores fixas (grep executado), sem dependência nova, 0 achados.

## TP-0107 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; só slug/uuid/ranking público/booleano no aparelho, validados na leitura; `pnpm audit --prod` sem vulnerabilidades.

## TP-0151 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos novos (RTP-0011 do QA cobre a duplicação); laço com teto, sem aleatório/relógio, 67 testes passando.

## TP-0152 — DevSecOps — 2026-10-17
OK; 0 críticos, 1 baixo (RTP-0012: sem limite de aptos na entrada); função pura sem aleatoriedade/I/O, 65 testes passando.

## TP-0153 — DevSecOps — 2026-10-17
APROVADA; 0 achados; sem import externo/relógio/nível exposto, laço limitado a 30; 14 testes passando.

## TP-0098 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; sem style=/innerHTML/VITE_, recurso financeiro respeitado, vitest barras 11/11.

## TP-0099 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos novos; diff lido + grep de sinks perigosos limpo, sem mudança de dependências.

## TP-0101 — DevSecOps — 2026-10-17
APROVADA; 0 achados; diff de apresentação sem HTML injetado, sem URL absoluta, sem import de domínio (grep executado, 0 ocorrências); sem dependência nova.

## TP-0104 — DevSecOps — 2026-10-17
OK; link só https no host de enderecoNovo, sem XSS/open redirect, 27/27 testes executados; 0 achados.

## TP-0003 — DevSecOps — 2026-10-17
APROVADA COM DÉBITO; 0 críticos, 1 baixo (RTP-0015: fixar actions de terceiros por SHA); ci.yml com contents:read, sem pull_request_target, sem segredo exposto a fork, actionlint 0.

## TP-0096 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos de segurança; diff lido, grep de storage/log/HTML perigoso/style= com 0 ocorrências, senha sem persistência, sem dependência nova.

## TP-0016 — DevSecOps — 2026-10-17
APROVADA COM DÉBITO; guardas falham fechado e isenções auditáveis; 0 críticos, 1 médio (RTP-0019: grupoId contornável por export em chamada/objeto/classe), 1 baixo.

## TP-0018 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos novos; pnpm audit --prod limpo, eDono e falha fechada confirmados no diff.

## TP-0089 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; audit --prod limpo, job e2e com contents:read sem segredos/pull_request_target, `--tela` validado; 13 vulns só em devDeps alheias à tarefa.

## TP-0100 — DevSecOps — 2026-10-17
OK; 0 críticos, 0 novos não críticos; senha só em prop/texto React, sem storage/log/URL/cache (grep executado), confirmação ao fechar e D2 disabled real conferidos por leitura.

## TP-0019 — DevSecOps — 2026-10-17
APROVADA; 0 achados; limites de senha (caracteres e bytes), mensagens genéricas e ausência de eDono na entrada confirmados; 28 testes de sessão verdes.

## TP-0020 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 novos não críticos (RTP-0021 já cobre enderecoNovo); contrato público estrito sem dado pessoal, 34 testes verdes.

## TP-0021 — DevSecOps — 2026-10-17
APROVADA; senha só em respostas de criação, corpos strict, 28 testes executados, 0 achados.

## TP-0023 — DevSecOps — 2026-10-17
APROVADA; 0 achados; LGPD ok (ano/telefone só no contrato admin, publico não importa elenco), strict e limites ok; 39 testes e pnpm audit --prod limpos.

## TP-0024 — DevSecOps — 2026-10-17
APROVADA; revisão de diff + 23 testes executados; strict, limites e uuid ok, uso só com contagens; 0 achados.

## TP-0090 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; CSP sem unsafe-*, nosniff/same-origin/Permissions-Policy/frame-ancestors ok, zod jitless ok; e2e cabeçalhos 3/3 executado, HSTS ausente por decisão do SDD.

## TP-0109 — DevSecOps — 2026-10-17
APROVADA; 0 achados; redirect validado pelo schema do contrato, link relativo, sem dado pessoal (revisão de leitura do diff, sem dependência nova).

## TP-0207 — DevSecOps — 2026-10-17
APROVADA; 0 achados de segurança (sem innerHTML/style/console, sem dependência nova, sem dado pessoal).

## TP-0017 — DevSecOps — 2026-10-17
APROVADA - trava de host antes de escrita, banco de teste só local/descartável, sem credencial real, ouvinte de erro em cliente.ts restrito ao fechamento; 0 críticos, 0 não críticos (revisão de leitura, nada executado).

## TP-0145 — DevSecOps — 2026-10-17
OK; 0 achados; strict, limites de LIMITES e isolamento de publico conferidos no diff.

## TP-0146 — DevSecOps — 2026-10-17
APROVADA; revisão do diff do contrato do simulador sem achados (strict, uuid, tetos de 60 aptos/N/K, sem eDono/grupoId, fora do público); 0 críticos, 0 não críticos.

## TP-0186 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; entradas strict e em centavos inteiros limitados, 403 sem detalhe, 30 testes e snapshot compatível executados.

## TP-0022 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; schemas do dono strict, sem dados de jogador/financeiro, senha só em primeiroAdmin/SenhaExibida, entradas sem slug/eDono/id; dono.test 24/24.

## TP-0102 — DevSecOps — 2026-10-17
OK; 0 críticos, 0 não críticos; diff só lê RankingPublico via import type, sem innerHTML nem cálculo no cliente, CSS só com tokens.

## TP-0103 — DevSecOps — 2026-10-17
OK; 0 achados; value dos rádios restrito à tupla do contrato, sem HTML bruto/rede/storage (grep executado), sem dependência nova.

## TP-0105 — DevSecOps — 2026-10-17
APROVADA; 0 achados; open redirect coberto por matriz adversarial (lerDestino), guarda sem vazamento em troca de senha, 41 testes executados verdes.

## TP-0110 — DevSecOps — 2026-10-17
APROVADA — slug/mês validados pelo contrato e codificados, T03 estática igual p/ arquivado/inexistente, sem XSS nem dado pessoal; 11 testes ok, 0 achados.

## TP-0180 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; schema strict em todos os níveis sem dado pessoal (G-10), 25 testes executados verdes.

## TP-0173 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; diff lido, grep de sinks (innerHTML/style/dominio/hex) com 0 ocorrências, sem dependência nova.

## TP-0174 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 1 baixo (RTP-0025: corpo inválido deixa Confirmar habilitado); cancelamento por AbortController e sem persistência/vazamento confirmados por leitura e grep.

## TP-0106 — DevSecOps — 2026-10-17
OK; 0 achados; atalhos só com handle (sem handle, sem botão/menu), nada de grupo/finanças exposto pelo layout, Sair com X-Pelada e cache limpo; layout-admin.test 12/12.

## TP-0111 — DevSecOps — 2026-10-17
OK; 0 críticos, 0 não críticos; sem XSS/innerHTML, só projeção pública (G-10), link de endereço novo falha fechado, cache revalidado pelo contrato, recursos desligados não renderizam; 64 testes passam.

## TP-0114 — DevSecOps — 2026-10-17
APROVADA — open redirect barrado por lerDestino/destinoAposEntrar, erro genérico 401/422, 429 com texto fixo, senha só em estado e sem storage/log/URL; 33 testes passando; 0 achados.

## TP-0118 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; slug validado, destino por id da sessão, aviso sem nome de grupo (verificado por grep e 21 testes passando).

## TP-0182 — DevSecOps — 2026-10-17
APROVADA — PDF desenha só campos do contrato, texto puro, fontes locais same-origin, jspdf dinâmico, pnpm audit --prod sem vulnerabilidades; 0 achados.

## TP-0113 — DevSecOps — 2026-10-17
APROVADA — 0 achados; UA lido só localmente, localStorage só com flag booleana não sensível, sem rede; 25 testes passando.

## TP-0115 — DevSecOps — 2026-10-17
OK; 0 críticos, 0 não críticos; RF-12 sem enumeração (200/422/429 mesmo DOM), sem dado pessoal em log/URL, 7/7 testes executados.

## TP-0116 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos novos; senha só em estado, new-password, limites 8–72 do contrato, sem log/storage/URL, destino via lerDestino (grep executado).

## TP-0119 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; saldo só com permissão no servidor (null sem acessaFinanceiro), grupoId encodado, `state`/`?negado` sem HTML, 27 testes ok.

## TP-0120 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; mes validado e codificado, sem armazenamento local nem dado pessoal; 101 testes ok, grep de padrões inseguros limpo.

## TP-0123 — DevSecOps — 2026-10-17
APROVADA; 0 achados de segurança; apelido renderizado como texto, filtro por lista fechada, busca só local, lista sem ano de nascimento/telefone (minimização LGPD); 111 testes ok.

## TP-0124 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; dado pessoal só em estado/cache em memória, X-Pelada nas escritas, D2 na exclusão, 409/422 como texto; 26 testes passam; sem dependência nova.

## TP-0125 — DevSecOps — 2026-10-17
OK; 0 achados de segurança; corpo só com 5 inteiros, X-Pelada via escrever, saída como texto, sem dependência nova; 34 testes ok.

## TP-0126 — DevSecOps — 2026-10-17
APROVADA em segurança; 0 críticos, 0 não críticos; senha temporária só no diálogo e descartada (reset + gcTime 0), escritas com X-Pelada, 13 testes OK.

## TP-0127 — DevSecOps — 2026-10-17
APROVADA; 0 achados; urls-absolutas limpo, 36 testes verdes, PATCH sem slug/urlPublica, Permissions-Policy não bloqueia clipboard/share (lido, não testado em navegador).

## TP-0128 — DevSecOps — 2026-10-17
OK, 0 críticos/0 não críticos; só inteiros anônimos exibidos, grupoId codificado, sem dependência nova; revisão do diff + 5 testes executados.

## TP-0129 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; senha temporária fora do cache (gcTime 0) e do armazenamento, SW não cacheia /api/dono, X-Pelada nas escritas, RF-07 respeitado; 9 testes ok.

## TP-0170 — DevSecOps — 2026-10-17
OK, 0 críticos/0 não críticos; texto React puro, validação no limite, escrita via cliente padrão, rota atrás de flag; grep e 16 testes executados.

## TP-0172 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; só ids uuid validados por schema, sem persistência/XSS, audit prod limpo, grep de padrões inseguros sem ocorrências.

## TP-0199 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 novos não críticos (margem negativa do .semAcesso já em RTP-0038); 403 sem vazar valores, centavos inteiros, nada guardado no aparelho (leitura do diff, nada executado).

## TP-0201 — DevSecOps — 2026-10-17
APROVADA, 0 achados; entrada validada pelo schema do contrato, X-Pelada nas escritas sem retry, exclusão com D2, id validado/codificado; 21 testes verdes.

## TP-0204 — DevSecOps — 2026-10-17
APROVADA, 0 críticos e 0 não críticos; POST via `escrever` com `X-Pelada`, aceite gravado no servidor por conta, página pública só com texto estático, nada no aparelho, conteúdo do aviso conforme RF-64/RNF-06 (leitura do diff; testes executados pelo QA).

## TP-0117 — DevSecOps — 2026-10-17
APROVADA — senhas só em estado e limpas no sucesso, autocomplete correto, `?grupo=` validado contra a sessão, sem log/storage/URL; 12 testes passando; 0 achados.

## TP-0121 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0046 corpo do POST sem validação pelo schema do contrato); data validada, 409/422 como texto, X-Pelada nas escritas lidos no código.

## TP-0130 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; senha temporária fora do cache (gcTime 0) e do state/URL/storage, sem slug/eDono no corpo, autorização só do dono na API (404); vitest 6/6.

## TP-0131 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos novos (RTP-0041 do QA cobre lacunas de teste); RF-07 sem atalho a dados internos, senha D1 sem persistência, link só da urlPublica, 10 testes ok.

## TP-0171 — DevSecOps — 2026-10-17
APROVADA — notas/nível só em cache de memória, fora de storage e service worker, PUT com X-Pelada e ids codificados, cache invalidado corretamente; 40 testes ok; 0 críticos, 0 não críticos.

## TP-0175 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; diff lido (state validado por schema, escrita via `escrever`, sem HTML injetado, sem persistência local, sem cálculo na tela), grep de padrões de risco sem ocorrências.

## TP-0183 — DevSecOps — 2026-10-17
APROVADA - PDF só com campos de ProjecaoPdf (G-10), texto puro, fontes locais, jspdf dinâmico, pdfjs-dist só devDependency; pnpm audit --prod limpo; 0 achados.

## TP-0200 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 novos não críticos (RTP-0048 já aberta); escritas via escrever/X-Pelada sem retry, rollback otimista e anti double-submit conferidos, 29 testes passando.

## TP-0202 — DevSecOps — 2026-10-17
APROVADA — entrada validada pelo schema do contrato, PUT com X-Pelada, 403 garantido por exigirFinanceiro na API, sem armazenamento local; 16/16 testes; 0 achados.

## TP-0122 — DevSecOps — 2026-10-17
APROVADA; 0 achados; PUT/DELETE via escrever com X-Pelada, D2 antes de excluir, retorno por state validado (sem open redirect), só data em URL (revisão de diff, sem ferramenta).

## TP-0176 — DevSecOps — 2026-10-17
APROVADA — 0 achados; diff só de exibição, G-05 e G-17 conferidos, sem dependência nova; grep de sinks/armazenamento limpo.

## TP-0184 — DevSecOps — 2026-10-17
OK; 0 críticos, 0 novos não críticos; evento pdf_exportado só {tipo,mes} com X-Pelada, blob/URL revogada, audit --prod limpo.

## RTP-0001 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; lint-fronteiras 57/57, diff revisado (regex ancorada, sem dependência/dado sensível).

## RTP-0002 — DevSecOps — 2026-10-17
APROVADA — seletores de alias Date/document confirmados por probe ESLint (falha em domínio/web, passa em relogio); 0 achados, sem dependência nem dado pessoal.

## RTP-0003 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; diff só de teste, sem superfície de segurança nem dependência alterada.

## RTP-0004 — DevSecOps — 2026-10-17
APROVADA; 0 achados; diff só de testes (sem dependência/produção), revisão de leitura, nada executado.

## RTP-0008 — DevSecOps — 2026-10-17
APROVADA — audit sem sharp/undici (resta só braces, fora de escopo), lockfile só com versões corrigidas, override `>=` risco baixo (só dev tooling); 0 críticos, 0 não críticos.

## RTP-0009 — DevSecOps — 2026-10-17
APROVADA; só teste, sem segredos nem dependências novas, 0 achados.

## RTP-0010 — DevSecOps — 2026-10-17
APROVADA — só teste, sem I/O/segredos/dependências alteradas; 0 achados.

## RTP-0011 — DevSecOps — 2026-10-17
APROVADA — função pura sem I/O/aleatoriedade/dependência nova; grep de sinks limpo; 0 achados.

## RTP-0012 — DevSecOps — 2026-10-17
APROVADA, 0 achados; guarda de 60 aptos com RangeError antes do laço, sem dado sensível na mensagem, vitest 66/66.

## RTP-0013 — DevSecOps — 2026-10-17
APROVADA — mudança só de foco no cliente, sem superfície de segurança nem dependência nova; 0 achados (revisão de diff, nada executado).

## RTP-0015 — DevSecOps — 2026-10-17
APROVADA — actions de terceiros fixadas em SHA verificado contra as tags via ls-remote, permissions contents:read; 0 achados.

## RTP-0016 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; diff só de className/CSS, sem dependência nem dado sensível (revisão por leitura, nada executado).

## RTP-0018 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; falha fechada de G-11/G-20 preservada, sem dependência nova, 34 testes dos arquivos alterados verdes.

## RTP-0019 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 1 média (RTP-0057: alias/ternário/membro/namespace/satisfies ainda passam sem grupoId); 3 casos do aceite falham fechado, 25/25 testes verdes.

## RTP-0020 — DevSecOps — 2026-10-17
APROVADA, 0 críticos/0 não críticos; sem superfície nova, senha só em memória/DOM confirmada (grep + 21 testes passando).

## RTP-0021 — DevSecOps — 2026-10-17
APROVADA, 0 críticos/0 não críticos; contrato público segue strict sem vazamento, enderecoNovo vem de config do operador; 405 testes do contrato passando.

## RTP-0022 — DevSecOps — 2026-10-17
APROVADA — mudança só de CSS/classe sem superfície de segurança nem dependências; 0 achados.

## RTP-0023 — DevSecOps — 2026-10-17
APROVADA, 0 achados; mudança só de HTML estático do mockup, sem script/URL externa/dado sensível/dependência (grep executado).

## RTP-0024 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; refactor de debounce sem superfície de segurança, 25 testes passando, sem mudança de dependências.

## RTP-0025 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; diff lido (fail-closed no corpo nulo, sem dado sensível), vitest ajuste-simulador 25/25.

## RTP-0026 — DevSecOps — 2026-10-17
APROVADA; 0 achados; só reordenação de CSS de padding, sem superfície de segurança (grep de url/@import vazio).

## RTP-0027 — DevSecOps — 2026-10-17
APROVADA; só teste alterado, sem dependência, segredo ou dado sensível; 0 achados.

## RTP-0028 — DevSecOps — 2026-10-17
APROVADA; 0 achados; diff só de teste (axe D1/D2), sem impacto de segurança, dependências inalteradas (revisão de leitura).

## RTP-0029 — DevSecOps — 2026-10-17
APROVADA; 0 achados; só HTML estático de mockup reposicionado, sem script/dependência/dado pessoal (grep de script/handlers limpo, href só relativo interno).

## RTP-0031 — DevSecOps — 2026-10-17
APROVADA; 0 achados; diff só de teste (senha fictícia de 72 caracteres), sem impacto de segurança.

## RTP-0032 — DevSecOps — 2026-10-17
APROVADA, 0 críticos/0 não críticos; diff só adiciona id/aria-describedby, sem dependência nova nem dado sensível.

## RTP-0033 — DevSecOps — 2026-10-17
APROVADA; 0 achados de segurança; diff só HTML estático de mockup (texto de ajuda), sem script, dado pessoal ou dependência; revisão de leitura, nada executado.

## RTP-0034 — DevSecOps — 2026-10-17
APROVADA em segurança, 0 achados; mudança de texto estático em mockup HTML, sem superfície de ataque, dependências intactas.

## RTP-0035 — DevSecOps — 2026-10-17
APROVADA; 0 achados; só CSS de layout com tokens, sem superfície de segurança, sem dependência nem dado pessoal.

## RTP-0036 — DevSecOps — 2026-10-17
APROVADA; 0 achados; diff é uma propriedade CSS em mockup estático, sem superfície de segurança (revisão de leitura).

## RTP-0037 — DevSecOps — 2026-10-17
APROVADA; 0 achados; mudança só em mockup/fixture fictícia (eDono true) sem referência em código de app/produção, sem dependência alterada.

## RTP-0038 — DevSecOps — 2026-10-17
APROVADA — diff só CSS de layout, sem superfície de segurança, sem dependências nem dado pessoal; 0 achados.

## RTP-0040 — DevSecOps — 2026-10-17
APROVADA, 0 achados; mudança só de CSS de mockup (lida, sem superfície de segurança).

## RTP-0041 — DevSecOps — 2026-10-17
APROVADA; tarefa só de testes, sem segredos, dependências ou dado pessoal real; 0 achados.

## RTP-0042 — DevSecOps — 2026-10-17
APROVADA; 0 achados; só testes com dados fictícios, sem mudança de dependência ou de código de app.

## RTP-0043 — DevSecOps — 2026-10-17
APROVADA — mudança só de teste e 1 linha de CSS; sem superfície de segurança, sem dependência alterada; 0 achados.

## RTP-0044 — DevSecOps — 2026-10-17
APROVADA, 0 achados; diff é SVG inline estático em mockup HTML, sem script/recurso externo/dado pessoal/dependência (grep executado).

## RTP-0045 — DevSecOps — 2026-10-17
APROVADA; 0 achados; diff só de apresentação (JSX/CSS), sem dependência nem dado pessoal; leitura apenas.

## RTP-0046 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; corpo validado com o schema do contrato antes do POST/PUT, inválido não chega à rede (6 testes verdes), sem exposição de dados.

## RTP-0047 — DevSecOps — 2026-10-17
APROVADA, 0 achados; diff só CSS de layout (largura 512 px), sem superfície de segurança, dependências inalteradas.

## RTP-0048 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; fallback para config removido, valor só exibido (servidor decide), 30/30 testes verdes, sem dado sensível.

## RTP-0049 — DevSecOps — 2026-10-17
APROVADA; diff só de teste e UX-SPEC, sem dependência nem dado pessoal; 0 achados.

## RTP-0050 — DevSecOps — 2026-10-17
APROVADA; mudança só em teste, sem dependência nem dado pessoal; 0 achados (diff lido, sem ferramenta executada por não haver código de produção).

## TP-0010 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; função pura, saída sem campos pessoais, sem relógio/import externo/dependência nova, 11 testes ok.

## TP-0025 — DevSecOps — 2026-10-17
APROVADA — dono único e credenciais só em hash garantidos no banco, sem IP/UA; 7/7 testes e checagem aditiva executados; 0 críticos, 1 baixo (RTP-0056).

## TP-0187 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; grep G-01/G-06/G-07 limpo, estouro tratado, 13 testes verdes, sem mudança de dependências.

## RTP-0039 — DevSecOps — 2026-10-17
APROVADA, 0 achados; apenas JSON de harness do mockup com dados fictícios, sem chegar ao app de produção (verificado por leitura do diff e busca de referências).

## RTP-0051 — DevSecOps — 2026-10-17
APROVADA - só testes de domínio/caixa unificados, sem código de produção, segredo ou dependência alterados; 0 achados.

## RTP-0052 — DevSecOps — 2026-10-17
APROVADA, 0 críticos/0 não críticos; diff só de apresentação (prop semIcone), sem superfície de segurança, sem dado pessoal; revisão de leitura, sem comando executado.

## RTP-0053 — DevSecOps — 2026-10-17
APROVADA; 0 achados; HTML estático sem script/handler/URL externa nem dado sensível (grep executado).

## RTP-0054 — DevSecOps — 2026-10-17
APROVADA — mudança só em teste (promessa controlada, msw), sem impacto de segurança; 0 achados.

## RTP-0055 — DevSecOps — 2026-10-17
APROVADA — só teste com dados fictícios, sem impacto de segurança; 0 achados (leitura, nada executado).

## RTP-0056 — DevSecOps — 2026-10-17
APROVADA; migração só com 2 COMMENT ON, aditiva, sem dado sensível e texto confere com o schema; 0 achados (revisão de leitura).

## RTP-0057 — DevSecOps — 2026-10-17
APROVADA COM DÉBITO — 7 contornos do aceite fechados; 7 novos contornos executados (classe com propriedade/extends, let/declare sem init, import=, re-export externo) exit 0; 0 críticos, 1 média (RTP-0061).

## TP-0026 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; slug imutável/único e vínculo (conta, grupo) único confirmados por 5/5 testes e checagem aditiva no Postgres 55432.

## TP-0027 — DevSecOps — 2026-10-17
APROVADA em segurança: bcrypt 12 com hash fixo de mesmo custo (medido ~300 ms nos dois caminhos), parâmetros sem SQL injection, sem hash/senha em retorno ou log, aleatoriedade WebCrypto; 0 críticos, 0 novos (RTP-0060 existente cobre o teste de custo).

## TP-0028 — DevSecOps — 2026-10-17
APROVADA — hash SHA-256 only, expiração no SQL, SQL parametrizado, sem IP/UA/log, retenção de tentativas de 1 dia; 0 críticos, 0 não críticos (lido; sem dependência alterada).

## TP-0148 — DevSecOps — 2026-10-17
APROVADA; 0 achados; função pura sem relógio/aleatoriedade/import externo/duplicação, grep limpo e 24 testes passando.

## TP-0179 — DevSecOps — 2026-10-17
APROVADA — função pura sem relógio/I/O, saída só com apelido/pontos (G-10), colunas limitadas a 12 e custo linear (G-12), 27 testes passando; 0 achados.

## RTP-0058 — DevSecOps — 2026-10-17
APROVADA; só testes, fixtures com apelidos fictícios e sem dado pessoal/segredo (grep 0), 0 achados.

## RTP-0059 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; teste só lê a contagem de chamadas, sem vazar token/hash em log ou assert; 6/6 em banco próprio.

## RTP-0060 — DevSecOps — 2026-10-17
APROVADA — contagem de crypt determinística sem vazamento de senha/hash (8/8 em banco próprio); 0 críticos/altos, 1 baixo (custo do HASH_FIXO não afirmado) na RTP-0066.

## RTP-0061 — DevSecOps — 2026-10-17
APROVADA — raiz real exit 0, 3 sondas reexecutadas confirmam o relato da QA; 0 críticos/altos, 1 médio (contornos exóticos/adversariais, não exploráveis por código de boa-fé) coberto pela RTP-0064; nenhuma RTP nova.

## TP-0029 — DevSecOps — 2026-10-17
APROVADA — SQL parametrizado, filtro por grupoId em todas as funções, sem hash/dono nas leituras, trava FOR UPDATE lida (corrida real não executada); 12 testes e checar-grupo-id passam; 0 achados.

## TP-0030 — DevSecOps — 2026-10-17
APROVADA; 11/11 testes no banco próprio, upsert/índice parcial, auditoria só-insere e acesso só sob /api/dono conferidos; 0 críticos, 1 baixo (RTP-0065: filtro de chaves só por prefixo).

## TP-0031 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 novos (cookie duplicado segue na RTP-0063, baixa); revisão do diff + 15 testes executados (atributos do cookie, hash, deslizamento, escopo), sem dependência alterada.

## TP-0042 — DevSecOps — 2026-10-17
APROVADA — isolamento por grupo (FK composta), minimização LGPD e aditividade conferidos; 10/10 testes e checagem aditiva executados; 0 achados.

## TP-0045 — DevSecOps — 2026-10-17
APROVADA — migração sem dado pessoal (7 colunas confirmadas no banco), dispositivo anônimo só em ranking_aberto por CHECK, 13 testes verdes em banco próprio; 0 achados.

## TP-0160 — DevSecOps — 2026-10-17
APROVADA; migração aditiva, FK/UNIQUE por grupo e auditoria ok, 13/13 testes e checagem aditiva verdes; 0 achados.

## RTP-0062 — DevSecOps — 2026-10-17
APROVADA; só teste, SQL parametrizado, sem segredo/dado pessoal/dependência; 0 achados.

## RTP-0063 — DevSecOps — 2026-10-17
APROVADA; cookie de sessão duplicado recusado antes do banco, atributos do cookie intactos, sem exposição de dado; 0 achados (revisão de leitura, nada executado pelo DevSecOps).

## RTP-0064 — DevSecOps — 2026-10-17
APROVADA; revisão do diff sem achados (decisão por tipo, falha fechada), checagem real exit 0, sem dependência/dado pessoal alterados.

## RTP-0065 — DevSecOps — 2026-10-17
APROVADA; regex sem âncora verificada por execução (variantes recusadas, chaves legítimas aceitas), 0 achados.

## RTP-0066 — DevSecOps — 2026-10-17
APROVADA; teste agora prova custo bcrypt igual (12) do hash fixo, export é constante não secreta; 0 críticos, 0 não críticos.

## TP-0032 — DevSecOps — 2026-10-17
APROVADA; 404 uniforme, 403 só com vínculo, uuid validado antes do banco, `use` antes das rotas, dono sem atalho; revisão de diff, 0 críticos, 0 não críticos.

## TP-0037 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; revisão do diff confirma transação única, senha só no hash do Postgres e fora de log/auditoria, e chamadores com autorização própria.

## TP-0038 — DevSecOps — 2026-10-17
APROVADA em segurança; senha temporária só no retorno, conta existente sem troca de senha/nome, sem e_dono, erro genérico sem vazar SQL; 0 críticos, 0 não críticos (revisão de leitura).

## TP-0043 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; FKs compostas por grupo_id e migração aditiva conferidas por leitura do diff.

## TP-0044 — DevSecOps — 2026-10-17
APROVADA; migração com isolamento por grupo (FKs compostas), autoria em contas e aditiva (checagem rc 0); 0 críticos, 0 não críticos.

## TP-0050 — DevSecOps — 2026-10-17
APROVADA - revisão de diff: união fechada sem dado pessoal, uuid anônimo com CHECK, grupo_id em toda consulta, SQL parametrizado e fuso literal; 0 críticos, 0 não críticos; nada executado além dos testes do QA.

## TP-0161 — DevSecOps — 2026-10-17
APROVADA, 0 críticos/0 não críticos; isolamento por grupo_id no upsert e SQL parametrizado conferidos por leitura; nada executado; conferir no TP-0167 que composicao leve só ids.

## TP-0188 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; revisão do diff confirma isolamento por grupo via FK composta, centavos inteiros, sem DEFAULT now() e sem dado pessoal novo (testes não reexecutados pelo DevSecOps).

## RTP-0068 — DevSecOps — 2026-10-17
APROVADA — diff só de teste (SQL parametrizado, sem secret/dependência), reforça auditoria admin_vinculado; 0 achados.

## RTP-0069 — DevSecOps — 2026-10-17
APROVADA — diff só de testes que provam recusa troca_de_senha antes do 404 em grupo/financeiro/dono; 0 achados, sem mudança em src/dependências.

## RTP-0070 — DevSecOps — 2026-10-17
APROVADA — diff só de teste, sem segredo/dependência/dado pessoal, reforça isolamento por grupo; 0 achados (revisão de leitura).

## TP-0033 — DevSecOps — 2026-10-17
APROVADA — revisão do diff sem achado novo (0 críticos); guarda G-03/G-04 usa app completo e falha fechado; risco residual (rota ALL) já na RTP-0074.

## TP-0041 — DevSecOps — 2026-10-17
APROVADA - revisão do diff sem achado crítico (trava de host, senha uma vez no stdout, sem vazamento de URL, SQL parametrizado, lint/CI de G-11); 0 críticos, 1 não crítico (checagem ignora contas.ts inteiro, RTP-0077).

## TP-0046 — DevSecOps — 2026-10-17
APROVADA — revisão do diff: filtro por grupo_id em todas as consultas, SQL parametrizado, sem telefone em log/erro; 0 críticos, 0 não críticos.

## TP-0047 — DevSecOps — 2026-10-17
APROVADA — isolamento por grupoId em gravarNota/leituras, SQL parametrizado, sem uso em rota pública; 0 críticos, 0 novos não críticos (RTP-0071 do QA já aberto); revisão de diff, nada executado.

## TP-0048 — DevSecOps — 2026-10-17
APROVADA — consultas parametrizadas e filtradas por grupo_id, RN-04 preservada, autor só por nome, checar-grupo-id ok; 0 achados.

## TP-0049 — DevSecOps — 2026-10-17
APROVADA — revisão do diff: isolamento por grupo_id, SQL parametrizado e jogador por JOIN conferidos (leitura; testes rodados pelo QA); 0 críticos, 1 não crítico (escrita aceita ExecutorDb em vez de Tx) em RTP-0076.

## TP-0006 — DevSecOps — 2026-10-17
APROVADA — SVG/index sem script, foreignObject, href externo, fonte ou recurso de terceiro (CSP default-src 'self'), gerador sem shell/segredo/escrita fora de icones, sem marcador de conflito nem dependência nova; 0 críticos, 0 não críticos.

## RTP-0067 — DevSecOps — 2026-10-17
APROVADA - 0 críticos, 0 não críticos; só testes, tipo EventoDeUso fechado sem IP/nome confirmado por leitura e diretivas não vacuosas; sem PII, segredos nem mudança de dependência (revisão de leitura, nada executado).

## RTP-0073 — DevSecOps — 2026-10-17
APROVADA, 0 críticos/0 não críticos; temPresencaDesde parametrizada com filtro grupo_id (G-03) lida no diff, sem mudança de dependências.

## TP-0034 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 1 não crítico novo (RTP-0084: bloqueio não atômico sob concorrência) + RTP-0079 já existente; diff lido, sem execução própria (usada a do QA).

## TP-0035 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; revisão de leitura do diff: sem hash na saída, conta só da sessão, grupos só dos vínculos não arquivados, enderecoNovo da config, no-store global.

## TP-0036 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; sessão removida no banco só do aparelho, CSRF e cookie conferidos por leitura do diff (nada executado nesta etapa).

## TP-0039 — DevSecOps — 2026-10-17
APROVADA — 0 críticos/0 não críticos; resposta idêntica nos 3 caminhos, upsert parametrizado só para não-dono, sem log/envio de e-mail; risco residual: sem limite de taxa até TP-0087.

## TP-0040 — DevSecOps — 2026-10-17
APROVADA — 0 críticos, 1 baixo (sem limite de tentativas da senha atual, RTP-0085); hash no Postgres, escopo restrito só nesta rota/eu/sair, transação com sessões encerradas e sem senha em log/auditoria (lido; execução vem do QA).

## TP-0051 — DevSecOps — 2026-10-17
APROVADA COM DÉBITO - seed travado em host local, sem segredos nem `DATABASE_URL` na saída, SQL só no repositório; 0 críticos, 1 não crítico (RTP-0083: falta a regra de lint prometida para `apagarDadosDoSeed`).

## TP-0052 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; revisão do diff confirma consulta parametrizada filtrada por grupo_id, sem pg/kysely na aplicação e sem exposição nova de dado pessoal (nada executado por este chapéu).

## TP-0053 — DevSecOps — 2026-10-17
APROVADA em segurança; 0 críticos, 0 não críticos; leituras todas filtradas por grupo_id, adaptadores sem vazar telefone/nome, sem SQL fora de repositório (revisão de código, nada executado).

## TP-0055 — DevSecOps — 2026-10-17
APROVADA, 0 críticos/0 não críticos; só dono, uuid antes do banco, schema estrito sem acessaFinanceiro, URL só de URL_PUBLICA (revisão de diff, sem execução própria).

## TP-0059 — DevSecOps — 2026-10-17
APROVADA — revisão do diff: dono-only (404), uuid validado antes do banco, SQL parametrizado só no repositório, 204 sem dado; 0 críticos, 0 não críticos.

## TP-0060 — DevSecOps — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; senha só na resposta no-store e fora de logs, conta do dono = 404 idêntico ao inexistente, sessões do alvo encerradas na transação, rota sob exigirDono (revisão de diff, sem execução própria).

## TP-0063 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos novos; revisão do diff confirma escopo por vínculo, select sem hash, parse estrito e no-store (lido, não executado).

## TP-0064 — DevSecOps — 2026-10-17
APROVADA — RF-13/ADR-015 respeitados (sem financeiro, no-store, senha uma vez sem log, 404/403/422 ok), revisão de diff sem execução própria; 0 achados.

## TP-0065 — DevSecOps — 2026-10-17
APROVADA — transação com trava de grupo, G-03/RN-13/RNF-12 conferidos no diff, corte de acesso coberto por teste; 0 achados.

## TP-0066 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; revisão do diff confirma escopo por grupo antes do caso de uso, dono e própria conta recusados, senha só na resposta com no-store (testes executados pelo QA, não por mim).

## TP-0068 — DevSecOps — 2026-10-17
APROVADA — GET jogadores atrás de exigirVinculo, grupoId do vínculo, query strict, resposta strict sem dado pessoal, sem import em publico, caso de isolamento presente; 0 críticos, 0 não críticos (revisão de diff, nada executado).

## TP-0069 — DevSecOps — 2026-10-17
APROVADA em segurança — 0 críticos, 0 não críticos; G-03 (grupoId do vínculo, 404 uniforme), uuid antes do banco, telefone fora de log e rota só de admin conferidos por leitura do diff.

## TP-0070 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; revisão do diff confirma grupoId do vínculo, corpo strict, relógio injetado, sem log/eco de telefone (leitura; testes verdes reportados pelo QA).

## RTP-0005 — DevSecOps — 2026-10-17
APROVADA; diff só de testes, sem superfície de segurança (lido, nada executado), 0 achados.

## RTP-0006 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; só remoção de teste duplicado, sem superfície de segurança (revisão de diff, busca por padrões executada).

## RTP-0007 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; diff só de testes (remoção de duplicado), sem segredo/dependência/produção; lido (diff+grep), nada além executado.

## RTP-0074 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; diff só de testes, fecha furo da G-04 (app.all) sem superfície nova; lido, sem execução própria.

## RTP-0079 — DevSecOps — 2026-10-17
APROVADA — só teste alterado, cobre senha errada/correta, token e 429 em console.*; 0 achados (revisão de leitura, nada executado pelo DevSecOps).

## TP-0054 — DevSecOps — 2026-10-17
APROVADA — painel do dono atrás de exigirDono (404), saída estrita sem dado de jogo/id/token, SQL parametrizado, caso de isolamento presente; 0 críticos, 0 não críticos (revisão de diff, sem execução).

## TP-0056 — DevSecOps — 2026-10-17
APROVADA — revisão do diff sem achado de segurança (dono-only, strict, senha só na resposta/no-store, transação única); 0 críticos, 0 novos; prova de 401/403/422 strict segue no RTP-0086

## TP-0057 — DevSecOps — 2026-10-17
APROVADA (revisão de diff) — 0 críticos, 0 não críticos; dono-only via exigirDono, uuid/corpo validados no limite, SQL parametrizado, resposta strict GrupoDono; nada executado por DevSecOps.

## TP-0058 — DevSecOps — 2026-10-17
APROVADA — revisão do diff: dono-only via exigirDono, nome conferido no servidor, sem DELETE, auditoria sem dado sensível; 0 críticos, 0 não críticos, sem RTP.

## TP-0061 — DevSecOps — 2026-10-17
APROVADA em segurança; 0 críticos, 0 não críticos novos (RTP-0087 já cobre testes); autorização por vínculo/404 uniforme, isolamento, saldo só com financeiro e resposta por allowlist conferidos por leitura do diff.

## TP-0071 — DevSecOps — 2026-10-17
APROVADA — revisão do diff sem achados (G-03 por grupo_id, transação única, corpo strict, sem vazamento de telefone/data); nada executado por segurança.

## TP-0072 — DevSecOps — 2026-10-17
APROVADA — 0 críticos, 0 não críticos de segurança; revisão do diff (isolamento por grupo, uuid/corpo strict, relógio do servidor, SQL parametrizado); nada executado por mim.

## TP-0073 — DevSecOps — 2026-10-17
APROVADA — isolamento por grupo, data do servidor, corpo strict, CSRF e SQL parametrizado conferidos por leitura do diff; 0 críticos, 0 não críticos.

## TP-0074 — DevSecOps — 2026-10-17
OK — revisão do diff sem achados (grupo_id em todo DELETE, auditoria atômica só com apelido, 409 sem vazamento); 0 críticos / 0 não críticos.

## TP-0075 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; revisão do diff confirma escopo por vínculo (ADR-005), 404 idêntico, saída strict só com nome do autor e SQL parametrizado (lido; execução vem do QA).

## TP-0076 — DevSecOps — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; revisão do diff (vigência do servidor, strict, CSRF, vínculo admin, auditoria transacional); nada executado por este chapéu.

## TP-0077 — DevSecOps — 2026-10-17
APROVADA (segurança); 0 críticos, 0 não críticos novos; isolamento por grupo, validação de `mes` e SQL parametrizado conferidos por leitura, sem dado pessoal na resposta.

## TP-0078 — DevSecOps — 2026-10-17
APROVADA — isolamento por vínculo, data validada no servidor antes do banco, resposta sem dado pessoal; 0 achados (revisão de diff, nada executado por DevSecOps).

## TP-0079 — DevSecOps — 2026-10-17
OK — GET partidas/:data isolado por grupo via vinculo, SQL parametrizado, `:data` validada antes do banco, resposta sem e-mail; 0 achados (revisão de diff, sem ferramenta executada).

## TP-0080 — DevSecOps — 2026-10-17
APROVADA; revisão do diff sem achados (isolamento por grupo, erro sem oráculo, sem PII/SQL em aplicacao); testes não reexecutados, 0 críticos/0 não críticos.

## TP-0083 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; revisão do diff confirma vínculo/isolamento, CSRF, `:data` validada antes do banco e auditoria transacional sem dado pessoal (execução apoiada nos testes do QA).

## TP-0084 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 novos (teste dedicado segue em RTP-0094); revisão do diff, 404 uniforme, projeção estrita e sem enumeração além do risco T-13 aceito.

## TP-0085 — DevSecOps — 2026-10-17
APROVADA — revisão do diff: contrato estrito, mapeamento campo a campo, sem IP/UA, bodyLimit 1 KB antes do parse, 404 indistinto; 0 críticos, 0 não críticos (limite de taxa fica no TP-0087).

## TP-0086 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; revisão do diff: vínculo antes da rota, consulta parametrizada por grupo, saída só com contagens e parse estrito (execução: testes do QA).

## TP-0094 — DevSecOps — 2026-10-17
APROVADA COM DÉBITO — sem segredo real, imagens/volumes sem privilégio extra; portas 5432/8787/5173 publicadas em 0.0.0.0 (RTP-0095, não crítico); nada executado em contêiner; 0 críticos, 1 não crítico.

## TP-0169 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; revisão de diff: só a data sai, consulta parametrizada e filtrada por grupo (G-03), isolamento coberto pelo teste do QA.

## RTP-0071 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; refatoração sem mudança de superfície de segurança (erro não-23505 relançado, SQL parametrizado, sem dependência nova), verificado por leitura + grep.

## RTP-0072 — DevSecOps — 2026-10-17
APROVADA COM DÉBITO — janela fixa removida, checagem real exit 0, eslint limpo; 0 críticos, 1 baixo (`;` em literal/objeto pré-montado escapa a checagem) -> RTP-0104.

## RTP-0075 — DevSecOps — 2026-10-17
APROVADA em segurança; revisão do diff sem achados (SQL parametrizado, escopo por grupo_id, erro 23505 tratado de forma restrita); eslint limpo; 0 achados.

## RTP-0076 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; escrita multi-passo de partidas só compila com Tx (lido + grep + tsc limpo), SQL parametrizado e escopado por grupo.

## RTP-0077 — DevSecOps — 2026-10-17
APROVADA — 0 achados; checagem real exit 0 e vitest 20/20 executados; só criarContaDono é exceção de escrita de e_dono em contas.ts.

## RTP-0078 — DevSecOps — 2026-10-17
APROVADA — só teste (plugin de contagem Kysely), sem dependência/segredo/dado pessoal (grep 0); 0 achados.

## RTP-0080 — DevSecOps — 2026-10-17
APROVADA, 0 críticos/0 não críticos; trava recusa host remoto antes de conectar (lido), gancho de falha forçada inofensivo, eslint 0.

## RTP-0081 — DevSecOps — 2026-10-17
APROVADA; só teste, sem segredo, dependência ou código de produção tocado; 0 achados.

## RTP-0083 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; função destrutiva do seed bloqueada por lint em todos os blocos exceto backend/scripts (lido + eslint executado).

## RTP-0084 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; ADR-004 efetivo sob concorrência (trava por e-mail + reserva antes do bcrypt), revisão do diff + eslint exit 0.

## RTP-0085 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0105: corrida consulta/registro permite >5 tentativas em paralelo); bloqueio por conta, 429 sem revelar acerto e ausência de senha em log verificados por leitura + grep/eslint.

## RTP-0086 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; G-08/G-09/G-11 conferidos por leitura, eslint e tsc limpos, sem dependência alterada.

## RTP-0087 — DevSecOps — 2026-10-17
APROVADA; 0 achados; só teste, sem dependência/segredo; isolamento do grupo B coberto; eslint exit 0.

## RTP-0088 — DevSecOps — 2026-10-17
APROVADA; só testes, sem segredo nem dado pessoal, caso G-03 de isolamento entre grupos presente; 0 críticos, 0 não críticos.

## RTP-0089 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; G-03 confirmado por leitura (exigirDono -> 403 troca_de_senha_obrigatoria em /api/dono/*) e coberto pelo teste; sem segredo/PII real; sem mudança de dependência.

## RTP-0090 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; somente teste, sem segredos nem mudança de dependência (grep e git diff executados).

## RTP-0091 — DevSecOps — 2026-10-17
APROVADA; só testes, sem segredos nem mudança de dependência, 0 achados (grep/git executados; vitest não rodado por restrição).

## RTP-0092 — DevSecOps — 2026-10-17
APROVADA; revisão de teste apenas (grep de segredos limpo, sem mudança de dependência); 0 críticos, 0 não críticos.

## RTP-0095 — DevSecOps — 2026-10-17
APROVADA — as 3 portas do compose publicadas só em 127.0.0.1 (compose config verificado); 0 achados; up --wait não executado.

## TP-0062 — DevSecOps — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; vínculo/grupoId do middleware, UPDATE parametrizado só nos 4 campos, strictObject recusa slug, CSRF global; revisão de diff, testes não reexecutados.

## TP-0155 — DevSecOps — 2026-10-17
APROVADA; 0 achados; revisão do diff confirma exigirVinculo, grupoId do vínculo, Kysely parametrizado, resposta só id/nome e caso de isolamento.

## TP-0156 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; grupoId só do vínculo, corpo strict, SQL parametrizado, 422 sem vazamento; revisão de diff + ESLint limpo.

## TP-0157 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; UPDATE com grupo_id, uuid/strict antes do banco, 404 uniforme e vínculo/X-Pelada via middleware conferidos por leitura do diff.

## TP-0158 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; G-03/RNF-12/CSRF/uuid conferidos por leitura do diff, escopo por grupo_id e auditoria transacional só com nome.

## TP-0159 — DevSecOps — 2026-10-17
APROVADA — isolamento por grupo em 3 camadas (serviço, SQL, vínculo), ids uuid e corpo strict antes do banco, SQL parametrizado; 0 críticos, 0 não críticos; revisão de diff, sem comando executado.

## TP-0162 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; revisão do diff confirma escopo por grupo via vínculo, validação do contrato e projeção mínima (lido, sem execução nova).

## TP-0163 — DevSecOps — 2026-10-17
APROVADA, 0 achados; rota sob vínculo/X-Pelada, corpo strict com teto 60 aptos e 16 KB, sem banco nem dado pessoal (revisão de leitura).

## TP-0189 — DevSecOps — 2026-10-17
APROVADA; 0 achados de segurança (isolamento por grupo em todas as consultas + FKs compostas, SQL parametrizado, somas com checagem de inteiro seguro, temHistorico/FK cobrindo pagamento); checar-grupo-id verde.

## RTP-0082 — DevSecOps — 2026-10-17
APROVADA — só troca de helper de teste com trava de host mantida; 0 achados de segurança (revisão de diff, nada executado).

## RTP-0093 — DevSecOps — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; diff só de teste, sem segredo/PII; testes reforçam não vazamento de nome inativado (lido, nada executado).

## RTP-0094 — DevSecOps — 2026-10-17
APROVADA — mudança só de testes, sem segredo/PII, reforça 404 idêntico, no-store e campos proibidos no ranking público; 0 achados.

## TP-0081 — DevSecOps — 2026-10-17
TP-0081 APROVADA em segurança; revisão do código (isolamento por grupo, CSRF, data pelo relógio, transação única, sem dado pessoal em evento/auditoria) e checagens estáticas executadas OK; 0 achados novos (lacunas de teste já em RTP-0100).

## TP-0082 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; PUT atrás de exigirVinculo/CSRF, filtro por grupo, autor/momento só de sessão/relógio, auditoria transacional; tsc limpo (testes lidos, não reexecutados).

## TP-0108 — DevSecOps — 2026-10-17
APROVADA COM DÉBITO, 0 críticos/1 não crítico (RTP-0107: cache do ranking sem maxAgeSeconds); só ranking público em cache (200), sem redirecionamento no SW, sem eval, pnpm audit limpo.

## TP-0167 — DevSecOps — 2026-10-17
APROVADA COM DÉBITO — revisão do diff (grupo/autor só do vínculo/sessão, strict, ids contra elenco do grupo, evento sem dado pessoal, transação única); 0 críticos, 1 não crítico (id repetido na composição não recusado) -> RTP-0108.

## TP-0181 — DevSecOps — 2026-10-17
APROVADA; 0 achados de segurança (projeção estrita, 404 uniforme, entrada validada, tsc limpo); revisão de diff, sem teste ativo.

## TP-0203 — DevSecOps — 2026-10-17
APROVADA — aviso-privacidade sem IDOR (conta da sessão), sessão completa, CSRF e corpo strict ok, só grava instante (LGPD); tsc limpo; 0 achados.

## TP-0087 — DevSecOps — 2026-10-17
TP-0087 APROVADA em segurança, 1 achado baixo (RTP-0109: binding ausente desliga o limite sem log); limitador antes do banco, IP só como chave, ratelimits Free 10/60 ok; tsc/eslint limpos.

## RTP-0098 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; só timeout de teste (lido no diff, nada executado), sem impacto em superfície de segurança.

## RTP-0099 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; revisão do diff de ler.test.ts (refatoração só de teste, sem impacto de segurança), nada executado.

## RTP-0104 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0112: '//' ou '--' em literal esconde e_dono); vitest 25/25, checador na raiz exit 0, probes dos casos do aceite falham como esperado.

## RTP-0105 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; revisão do diff (nada executado pelo DevSecOps): advisory lock por conta serializa reserva de falha antes do hash, sem bypass, enumeração nem vazamento; evidência de execução é a do QA.

## RTP-0106 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; só código de teste (lock advisory com chave constante, sem segredo/dado sensível/src), verificado por leitura do diff, nada executado.

## TP-0132 — DevSecOps — 2026-10-17
APROVADA — 0 críticos, 2 não críticos (baixa: senhas dos papéis pelada_* no histórico do SQL Editor do Neon sem rotação → RTP-0114; + higiene .gitignore → RTP-0115); repo/histórico sem segredo (gitleaks e grep executados), menor privilégio e TLS/Free conforme evidência do usuário, não reexecutável.

## RTP-0096 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; sem mudança de código, teste só reforça a ausência de dados sensíveis no PDF público (lido, não executado).

## RTP-0101 — DevSecOps — 2026-10-17
APROVADA, 0 críticos/0 não críticos; diff só de teste, validação de :data antes do banco comprovada (vitest 5/5 executado).

## RTP-0103 — DevSecOps — 2026-10-17
APROVADA em segurança — diff só de testes, IP não gravado e T-11/T-13 cobertos, limite-taxa 10/10 executado; 0 achados críticos, 0 não críticos.

## RTP-0107 — DevSecOps — 2026-10-17
APROVADA — cache do ranking com validade finita (7 dias), nenhuma outra rota /api cacheada; 0 críticos, 0 não críticos; evidência: diff lido e pwa-config 8/9 (falha preexistente RTP-0116).

## RTP-0109 — DevSecOps — 2026-10-17
APROVADA — 0 achados; ausência do binding em ambiente https vira log fixo "limitador ausente" sem IP (T-11/T-13 detectável); lido o diff e config; vitest limite-taxa 10/10 executado.

## RTP-0110 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 1 não crítico (RTP-0121: colchete, ||=, chamada/operador escapam da guarda G-11); executado vitest 37/37, raiz saída 0, sondas e teste de ReDoS.

## RTP-0112 — DevSecOps — 2026-10-17
APROVADA — passada única preserva literais, `//`/`--` em string não escondem e_dono; 0 críticos, 1 baixo (`i--` ainda esconde e_dono, RTP-0120); probe executado, resto lido.

## RTP-0115 — DevSecOps — 2026-10-17
APROVADA; 0 achados; check-ignore exit 0 nos dois, ls-files .pnpm-store vazio, nada a corrigir.

## TP-0112 — DevSecOps — 2026-10-17
APROVADA — evento só com tipo+id anônimo via escrever/schema, cache restrito ao ranking público e revalidado; 147 testes verdes; 0 achados.

## TP-0138 — DevSecOps — 2026-10-17
APROVADA em segurança; 0 críticos, 2 não críticos (RTP-0118 senha temporária no trace, baixa; RTP-0119 e-mail real do dono em literal no compose); revisão do diff, nada executado por mim.

## RTP-0118 — DevSecOps — 2026-10-17
APROVADA; 0 achados; trace/screenshot/video off e sem log de senha na API, verificado por leitura do diff/ci.yml e grep (e2e não executado).

## RTP-0119 — DevSecOps — 2026-10-17
APROVADA — compose lê DONO_EMAIL de ids.ts; sem vetor de injeção (fonte é constante do repo) nem segredo; escape `$$` e substituição executados; 0 achados; `compose up`/i1 não executados.

## RTP-0120 — DevSecOps — 2026-10-17
APROVADA — i--/--i deixam de esconder e_dono (só estreita falso negativo), 46 testes e checagem na raiz exit 0 executados; 0 achados.

## RTP-0121 — DevSecOps — 2026-10-17
APROVADA — 0 críticos, 1 não crítico (RTP-0122: `|=`/`&=`/`^=`/`>>=` escapam da guarda); 46 testes + checagem na raiz executados.

## TP-0133 — DevSecOps — 2026-10-17
OK — só o id do Hyperdrive muda; cache off, origem direta, plano Free, nenhum segredo no repositório; recomendado limpar o histórico do PowerShell onde o token foi digitado.

## TP-0134 — DevSecOps — 2026-10-17
OK — secrets só nos escopos certos, `producao` com aprovação manual e só `main`, GITHUB_TOKEN em read, nenhum `pull_request_target` nem segredo no repo; repositório público (backup cifrado baixável) é risco aceito pelo usuário.

## RTP-0102 — DevSecOps — 2026-10-17
APROVADA — 14/14 filtros de grupo_id preservados nas consultas movidas (leitura comparada a 3bfc2ece^; checar-grupo-id exit 0 registrado), 0 achados.

## RTP-0122 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; só amplia detecção (LIDO), sonda da regex e checagem real com saída 0 em 532 arquivos (EXECUTADO).

## TP-0193 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; remoção filtrada por grupo, params validados antes do banco, auditoria transacional, CSRF e financeiro exigidos; pagamentos-desmarcar 6/6 verde.

## TP-0191 — DevSecOps — 2026-10-17
APROVADA, 0 críticos/0 não críticos; isolamento, CSRF, limite de corpo, SQL parametrizado e auditoria transacional com autor da sessão conferidos por leitura de diff (testes executados apenas pelo QA).

## TP-0192 — DevSecOps — 2026-10-17
APROVADA — 0 críticos/0 não críticos; revisão do diff confirma grupoId do vínculo, IDOR do jogadorId contra o grupo, corpo strict, valor da config, auditoria na mesma transação; isolamento 70/70 executado.

## TP-0154 — DevSecOps — 2026-10-17
APROVADA — 0 críticos, 0 não críticos; função pura, busca local com teto de 200 trocas, sem relógio/aleatório/import externo/ID de tarefa (greps e eslint executados), limiar 4 ms mantido.

## RTP-0100 — DevSecOps — 2026-10-17
APROVADA; diff só de testes, sem superfície de segurança nova nem dependências; 0 achados.

## RTP-0108 — DevSecOps — 2026-10-17
APROVADA; 0 achados; repetido barrado no contrato (422 antes do jsonb), sem dependência nova nem exposição de dado.

## RTP-0111 — DevSecOps — 2026-10-17
APROVADA; 0 críticos/0 não críticos; alteração só em teste, sem superfície de segurança nem dependência.

## RTP-0113 — DevSecOps — 2026-10-17
APROVADA; 0 achados; troca de literal em deploy.yml sem impacto em segredos/permissões/injeção (leitura do diff, nada executado).

## RTP-0116 — DevSecOps — 2026-10-17
APROVADA em segurança; só 4 PNGs estáticos, sem metadados nem código/dependências; 0 críticos, 0 não críticos.

## RTP-0123 — DevSecOps — 2026-10-17
APROVADA — diff de 1 linha em teste, sem superfície de segurança nem dependências; 0 achados.

## RTP-0124 — DevSecOps — 2026-10-17
APROVADA — diff só de teste, sem superfície de segurança nem dependências; 0 achados.

## RTP-0125 — DevSecOps — 2026-10-17
APROVADA; 0 críticos, 0 não críticos; lock advisory parametrizado e com prefixo próprio por grupo, sem injeção nem vazamento entre grupos (revisão do diff; sem dependência nova).

## TP-0164 — DevSecOps — 2026-10-17
APROVADA em segurança — 422 uniforme sem vazar ids, checagem de grupo/atividade correta, sem dado pessoal extra, sem dependência nova; 0 críticos, 0 não críticos.

## TP-0190 — DevSecOps — 2026-10-17
APROVADA: rota sob exigirFinanceiro, escopo por grupo_id/vínculo, mes validado, resposta só com apelido+valores e no-store; sem dependências novas; 0 críticos, 0 não críticos.

## TP-0194 — DevSecOps — 2026-10-17
APROVADA: saldo só com acessaFinanceiro do vínculo, consultas por grupo_id parametrizadas, sem dependência nova, sem dado sensível exposto; 0 achados.

## TP-0195 — DevSecOps — 2026-10-17
APROVADA em segurança (revisão do diff) — escopo por grupo do vínculo, corpo strict em centavos, auditoria transacional sem descrição; 0 achados.

## TP-0196 — DevSecOps — 2026-10-17
APROVADA em segurança: isolamento por grupo, 404 uniforme, permissão do financeiro, resposta mínima e no-store verificados no diff; 0 achados.

## TP-0197 — DevSecOps — 2026-10-17
APROVADA — revisão do diff sem achados (0 críticos, 0 não críticos); grupo_id no WHERE, schema estrito, auditoria atômica sem descrição; nenhuma dependência nova; nada executado por este chapéu.

## TP-0198 — DevSecOps — 2026-10-17
APROVADA em segurança; 0 críticos, 0 novos não críticos (RTP-0127 já aberta pelo QA); revisão do diff: grupo_id no WHERE, 404 sem revelar existência, FK->409 atômico, auditoria sem texto livre.

## RTP-0097 — DevSecOps — 2026-10-18
APROVADA em segurança; refatoração preserva a validação de entrada (id repetido e fora dos aptos → 422) com uma só `idsDaComposicao`, sem dependências alteradas; 0 achados.

## RTP-0126 — DevSecOps — 2026-10-18
APROVADA; revisão do diff de testes sem segredo/dado sensível, G-03 coberto por teste discriminante; 0 críticos, 0 não críticos (duplicação do espião já na RTP-0129).

## TP-0165 — DevSecOps — 2026-10-18
APROVADA — revisão do diff sem achados (vínculo/isolamento, entrada limitada, log sem dado pessoal, sem dependência nova); 0 críticos, 0 não críticos.

## TP-0166 — DevSecOps — 2026-10-18
APROVADA em segurança; 0 críticos, 0 não críticos novos; revisão do diff (isolamento por grupo, limites antes do banco, resposta sem dado pessoal, no-store), sem dependências alteradas.

## RTP-0127 — DevSecOps — 2026-10-18
APROVADA (revisão do diff) - mensagem com apelido e mês só atrás de exigirFinanceiro, releitura filtrada por grupo_id, fora de log/auditoria, dado mínimo; 0 críticos, 0 não críticos.

## RTP-0128 — DevSecOps — 2026-10-18
APROVADA (revisão do diff, só teste); 0 críticos, 0 não críticos; G-03 (422 sem vazar id) e G-12 (limites de contrato) com asserção real, nada de produção alterado.

## RTP-0129 — DevSecOps — 2026-10-18
APROVADA; 0 críticos/0 não críticos; revisão do diff (só testes de repositórios, sem src/dependência/segredo), nada executado por este chapéu.

## RTP-0130 — DevSecOps — 2026-10-19
APROVADA — diff de 7 linhas em ferramenta de desenvolvimento, sem injeção, sem rede nova, sem segredo, sem I/O novo (revisão de leitura, nada executado); 0 críticos, 0 não críticos.

## RTP-0131 — DevSecOps — 2026-10-19
APROVADA; 0 críticos, 0 não críticos; revisão do diff: atributos de senha/e-mail/inputMode/maxLength intactos, `Formulario` sem spread nem dangerouslySetInnerHTML, `aria-busy`/noValidate/preventDefault centralizados, sem log/URL de dado pessoal; nada executado (só leitura).

## RTP-0132 — DevSecOps — 2026-10-19
APROVADA; 0 críticos/0 não críticos; revisão de diff (lida, não executada): corpo da confirmação só com ids, proteção de duplo envio e mensagem de erro fixa preservadas, sem dado pessoal em log/URL.

## RTP-0133 — DevSecOps — 2026-10-19
APROVADA — revisão do diff (LIDO, nada executado): `?mes=` validado por regex ancorada antes de uso em API, sem reflexão, sem redirect, sem exceção; 0 críticos, 0 não críticos.

## RTP-0134 — DevSecOps — 2026-10-19
APROVADA; 0 críticos/0 não críticos; revisão do diff confirma que as 23 regras de sintaxe (G-06/G-09/unknown/dono) e os predicados fail-closed do checar-grupo-id foram movidos sem mudar seletor, mensagem, escopo ou exceção (lido; execução só a do QA).

## TP-0136 — DevSecOps — 2026-10-19
APROVADA — 0 críticos/altos, 1 não crítico novo (F1 Baixa: guardar no secret só o destinatário age1… em vez da identidade privada, pois os artefatos de repo público são baixáveis) mais RTP-0135 do QA; segredos só por env:/secrets.*, cifra em fluxo sem claro no disco, contents: read, ações oficiais, sem injeção em run:; LIDO no diff, EXECUTADO só o do QA (shellcheck/actionlint/teste local); run real e permissões do usuário de leitura no Neon pendentes.

## RTP-0136 — DevSecOps — 2026-10-19
APROVADA; 0 críticos, 0 não críticos; valor AGE-SECRET-KEY-1… rejeitado com mensagem fixa antes de conectar, shellcheck 0 no blob, sem set -x/${{ }} em run:, secret só com age1… não decifra backup (F1 sanado); recomenda gerar par novo ao regravar o secret.

## RTP-0135 — DevSecOps — 2026-10-19
APROVADA; 0 críticos, 0 não críticos; stderr de psql/pg_dump/docker vai a mktemp com trap EXIT e nunca ao log, versão validada numérica (stub com payload `17; touch` sem injeção, grep do host = 0), sem dump em claro, RTP-0136 intacta, sem set -x nem ${{ }} em run.

## TP-0135 — DevSecOps — 2026-10-19
APROVADA COM DÉBITO (DevSecOps) — 0 críticos/altos; ordem/falha-fechado, gatilho só push main, segredos via env, filtro de apagamento do Neon seguro (prefixo restauracao-producao-, lista vazia/erro falha fechado), G-16/G-17 OK, SHA do pnpm/action-setup conferido; 2 baixos novos -> RTP-0140 (checagem não pega flags entre wrangler e deploy), RTP-0141 (persist-credentials); itens que dependem de credencial real não executados.

## TP-0137 — DevSecOps — 2026-10-19
APROVADA, 0 críticos e 4 não críticos na RTP-0142 (dump/identidade sem .gitignore nem pasta fora do repositório, senha na linha de comando do hyperdrive, aviso de URL_NOVA do pg_restore --clean, host fixo no 301); sem segredo no DEPLOY.md (grep), SQL do dono com bcrypt custo 12 e auditoria corretos, contar-linhas.sql só leitura.

## RTP-0137 — DevSecOps — 2026-10-19
APROVADA COM DÉBITO — parser só faz parse (sem eval/require), tsx/typescript do lockfile, id com metacaracteres de shell não executa (testado), falha fechada ok; 0 críticos, 1 baixo (id sem validação de formato 32 hex, ABRIR-RTP).

## RTP-0138 — DevSecOps — 2026-10-19
APROVADA — 0 críticos, 0 não críticos; segredos só em env de passo (job só tem AMBIENTE), build do web só com VITE_RECURSOS_DESLIGADOS e antes de qualquer segredo, rollback por env sem `${{ }}` em run: (grep 0), ordem/G-15/G-16/G-17 e permissions: contents: read preservados, build único sem cache restaurado depois.

## RTP-0139 — DevSecOps — 2026-10-19
APROVADA em segurança — `--silent` não mascara falha do wrangler, G-17 falha fechada (9 entradas degeneradas testadas: só `caching.disabled===true` passa), sem set -x/eco de segredo, `node -e` só faz JSON.parse; 0 achados, 0 ABRIR-RTP.

## RTP-0140 — DevSecOps — 2026-10-19
RTP-0140 APROVADA COM DÉBITO: flags antes do subcomando pegas, falha fechada (rc=2 sem git) e sem ReDoS (132 ms com 500 mil repetições); escapam `pages deploy`, `publish`, `triggers deploy` e `wrangler-action` (G-15, média, 1 ABRIR-RTP); 0 críticos.

## RTP-0141 — DevSecOps — 2026-10-19
APROVADA - persist-credentials:false eficaz no único checkout do deploy.yml, sem git autenticado/dependência git no job, permissions contents:read, pnpm/action-setup pinada por SHA; 0 críticos, 0 não críticos novos; job real não executado; backup.yml/ci.yml já na RTP-0144.

## RTP-0142 — DevSecOps — 2026-10-19
APROVADA — gitignore provado com check-ignore e add -n (dump.pgdump, .sql.age, identidade-age.txt barrados; nenhum arquivo versionado ignorado), 0 segredos no grep, mitigação de histórico/ps e limite do ps reconhecidos, aviso --clean e Worker 301 de host fixo presentes; 0 críticos, 0 novos (N1-N3 já na RTP-0145).

## RTP-0143 — DevSecOps — 2026-10-19
APROVADA, 0 críticos/0 altos, 1 baixo novo (config do curl injetável por `"`/`\n` no token, provado com output/url injetados; risco só do dono do secret; ABRIR-RTP) e fail-open do import.meta.main já coberto pela RTP-0148; token fora do argv, G-17 fecha (success e disabled booleano estritos), sem dependência nova/eval/disco/rede.

## RTP-0144 — DevSecOps — 2026-10-19
APROVADA, 0 críticos/1 baixo (ABRIR-RTP: pinar actions first-party por SHA); 5 checkouts com persist-credentials false eficaz, gitleaks-action v2.3.9 lido sem uso de credencial git, permissions contents: read, sem pull_request_target; jobs reais não rodados.

## RTP-0145 — DevSecOps — 2026-10-19
APROVADA COM DÉBITO — ACL (icacls) executada no PowerShell 5.1 deixa só o usuário atual, sem segredo no texto, sem regressão TP-0137/RTP-0142; 0 críticos, 2 baixos (falta limpar $env:URL/$s e checar histórico prévio; apagar em NTFS não é seguro e não é dito), 1 ABRIR-RTP.

## RTP-0146 — DevSecOps — 2026-10-19
APROVADA — 0 achados; regex ancorada rejeita \n/ /fullwidth/NUL, objeto e não-string falham fechado (rc 1, stdout vazio), erro não ecoa o valor (sem injeção de workflow command), URL da Cloudflare só recebe 32 hex.

## RTP-0147 — DevSecOps — 2026-10-19
RTP-0147 DevSecOps APROVADA: pages/triggers deploy, publish, flag entre aspas e wrangler-action fechados (rc=1), isenção só por caminho exato, rc=2 sem git, sem ReDoS, Vitest 33/33; 0 críticos, 2 não críticos ABRIR-RTP (tipos não varridos: Dockerfile/Makefile/justfile/.ps1/.cmd/.bat/.py; cloudflare/pages-action e wrangler.cmd).

## RTP-0148 — DevSecOps — 2026-10-19
OK - 0 críticos, 0 não críticos novos; gate G-17 falha fechado (só `disabled:true` + `--executar` dá rc 0; vazio/lixo/ligado/sem argumento rc 1, executado), sem eco de token/corpo (G-21); regressão estática coberta pela RTP-0153 existente.

## RTP-0149 — DevSecOps — 2026-10-19
OK em segurança, 0 achados; icacls só concede ao usuário atual (lido; execução do QA exit 0), pgpass.conf com placeholders, sem segredo (G-21).

## RTP-0150 — DevSecOps — 2026-10-19
APROVADA; 0 críticos, 0 não críticos; token validado e por stdin, 9 tokens hostis/inválidos rc 1 sem eco, pipefail propaga falha do curl; URL absoluta segue na RTP-0154.

## RTP-0151 — DevSecOps — 2026-10-19
OK; 0 críticos, 1 baixo (RTP-0156: EFS/BitLocker não existem no Windows Home, sem aviso no texto); G-21 e LGPD do texto corretos, limpeza de sessão/histórico e NTFS/SSD cobertas (lido; limpeza PowerShell executada pelo QA).

## RTP-0152 — DevSecOps — 2026-10-19
APROVADA; 0 críticos/altos, 1 baixo (RTP-0157: nomes/extensões sem /i, P.BAT e dockerfile passam rc 0); G-15 conferido: 51 testes, raiz rc 0, sem git rc 2, deploy.yml exato, ReDoS 2 ms, sem regressão de regra anterior.

## RTP-0153 — DevSecOps — 2026-10-19
APROVADA COM DÉBITO — 0 críticos, 1 baixo (RTP-0159: teste estático contornável por bloco `{ x; \n process.exit }`, `import.meta['main']`, `argv.at(1)`, comentário de bloco); G-17 detectado em qualquer Node para a regressão direta; revisão de diff, sem ferramenta executada.

## RTP-0154 — DevSecOps — 2026-10-19
APROVADA COM DÉBITO - 0 críticos, 1 baixo (base da API vinda de vars sem validação de https/host permitiria exfiltrar o token Bearer; virou RTP-0160); G-18 intacta, G-21 mantida; revisão de leitura, nada executado.

## RTP-0155 — DevSecOps — 2026-10-19
OK — só quebra de linha em arquivos.mjs, expressão idêntica, sem segredo/entrada nova; 0 achados (revisão de diff, sem ferramenta executada).

## RTP-0156 — DevSecOps — 2026-10-19
OK por revisão do diff (nada executado); texto não induz falsa cifra no Home e sem segredo; 0 críticos, 1 baixo (RTP-0161: aviso de swap no tmpfs e chave de recuperação).

## RTP-0157 — DevSecOps — 2026-10-19
APROVADA — flag `i` sem enfraquecer: 7 variações de caixa rc 1, FORA/deploy.yml isento só por caminho exato (Deploy.yml, .GITHUB, subpasta rc 1), sem git rc 2, sem ReDoS (~0,1 s); 0 achados.

## RTP-0159 — DevSecOps — 2026-10-19
OK - G-17 endurecido; 9/9 contornos novos (string com `/*`/`//`, globalThis, process["argv"], import.meta via variável, escape unicode etc.) falham o teste; 0 achados acionáveis, só residual de defesa em profundidade.

## RTP-0160 — DevSecOps — 2026-10-19
APROVADA; 0 críticos, 0 não críticos; 26 bases hostis/válidas executadas com stub de curl: todas as de host/esquema alheio rc 1 sem chamada nem eco, token fora de argv, produção sem bypass.

## RTP-0161 — DevSecOps — 2026-10-19
APROVADA - passo 6 do DEPLOY.md correto e sem falsa sensação de proteção (tmpfs só com swap desligado/cifrado; chave de recuperação do Device Encryption guardada), sem segredo; revisão de leitura, 0 achados.

## RTP-0162 — DevSecOps — 2026-10-19
OK DevSecOps — 0 críticos/altos, 0 acionáveis; filtro por prefixo exato nunca lista production/ambiente com metacaracteres (executado com JSON hostil), token fora de argv/eco, falha fechada com pipefail; id do branch não escapado na URL do DELETE é só observação marginal (origem Neon, igual ao código anterior).

## RTP-0014 — DevSecOps — 2026-10-19
diff só de formatação, gitleaks sem vazamento (116 commits); branch remota ci-prova mergeada ainda a apagar.

## RTP-0017 — DevSecOps — 2026-10-19
diff de script/teste sem superfície de segurança nova; gitleaks sem vazamento.

## TP-0139 — DevSecOps — 2026-10-19
OK com risco aceito — sem segredo no registro, cabeçalhos de segurança e limite de taxa conferidos em produção; itens 2-6 só declarados (RNF-03/RNF-07 sem prova); RTP-0163/0164 abertas.

## TP-0177 — DevSecOps — 2026-10-20
APROVADA; revisão do diff (nada executado por este chapéu; e2e 5/5 do QA): 404 de outro grupo, senha temporária fora de log/trace (trace off), X-Pelada nas escritas, CI sem secrets (contents: read) e só dado fictício; 0 críticos, 0 não críticos, nenhuma RTP.

## TP-0205 — DevSecOps — 2026-10-20
APROVADA; 0 críticos, 0 não críticos; revisão do diff (nada executado pelo chapéu): 403 só sem financeiro e 404 em grupo alheio conferidos, escritas com X-Pelada, senhas só do seed, trace/screenshot/vídeo desligados (RTP-0118), compose em 127.0.0.1.

## RTP-0163 — DevSecOps — 2026-10-20
APROVADA; 0 achados; ADR-020 e G-15 explicitam a perda da aprovação e a barreira (disparo manual + branch policy); branch policy só `main` e ausência de revisor confirmadas via `gh api` (executado).

## RTP-0164 — DevSecOps — 2026-10-20
APROVADA — 0 críticos, 0 não críticos; LIDO: deploy.yml só perdeu o env da flag (permissions contents:read e secrets inalterados), recursos.ts vazio = tudo ligado, telas admin/dono sob RotaProtegida e API com sessão/vínculo/papel independentes da flag; nada executado por mim.

## RTP-0166 — DevSecOps — 2026-10-20
APROVADA; 0 críticos, 0 não críticos; diff lido (1 arquivo de teste, X-Pelada: 1, dado fictício, sem console.log/route/msw/segredo); nada executado por este chapéu.

## TP-0208 — DevSecOps — 2026-10-20
APROVADA em segurança; 0 críticos/altos/médios e 0 novos baixos (RTP-0167 do QA segue); script sem conexão fora de DATABASE_URL, telefone nunca lido, transação única com recusas, migração aditiva, API admin-only com auditoria; eslint, typecheck e checar-escrita-e-dono verdes, sem segredo nem dado real no diff, sem mudança de dependências.

## RTP-0167 — DevSecOps — 2026-10-20
APROVADA em segurança; 0 achados; guard/isolamento por grupo e auditoria RNF-12 intactos, validação 0 a 9999 preservada, eslint/tsc/scan de segredos limpos.

## RTP-0168 — DevSecOps — 2026-10-20
APROVADA - --correcoes validado por esquema sem execução, sem vazar nome/caminho, trava não burlável, G-21/backup/idempotência intactos; eslint, tsc, gitleaks e checar-escrita-e-dono verdes; 0 achados.

## RTP-0173 — DevSecOps — 2026-10-20
APROVADA — trava de divergência intacta (efeito só por entrada explícita, por atleta e rodada), sem dado pessoal/dependência nova, eslint/tsc/segredos/escrita-e-dono OK; 0 achados.

## RTP-0169 — DevSecOps — 2026-10-20
APROVADA, 0 achados; mudança só documental, SDD §2/G-01 batem com ZONAS e imports reais, sem superfície de segurança nova.

## RTP-0170 — DevSecOps — 2026-10-20
APROVADA; 0 achados; vitest 17/17 com nosniff em 200/401/404/500; semgrep indisponível e DAST não executado (ficam para o /deploy).

## RTP-0171 — DevSecOps — 2026-10-20
APROVADA — SHAs fixados sem perda de permissões/segredos, pnpm audit --prod limpo, trustPolicyExclude verificável em 2 de 4 (semver, undici-types); 0 críticos, 0 RTP nova (débito minimumReleaseAge já na RTP-0176).

## RTP-0172 — DevSecOps — 2026-10-20
APROVADA; 0 achados; check-ignore casa entradas e brutos, exceções sem dado pessoal, nada da importação rastreado nem no histórico (gitleaks 794 commits sem hit nesses arquivos).

## RTP-0174 — DevSecOps — 2026-10-20
APROVADA, 0 achados; diff só de documentação (UX-SPEC), varredura de segredos/URLs nas linhas adicionadas com 0 ocorrências.

## RTP-0175 — DevSecOps — 2026-10-20
APROVADA, 0 achados; diff só comentários e títulos de teste (conferido por filtro executado), sem superfície de segurança nova.

## RTP-0177 — DevSecOps — 2026-10-20
APROVADA; 0 achados; ações de terceiros todas por SHA, 3 chaves do pnpm e nosniff em /api/* conferidos, sem segredo/URL nas linhas adicionadas, texto não afrouxa G-15/G-22.

## RTP-0178 — DevSecOps — 2026-10-20
APROVADA COM DÉBITO — 0 críticos/altos, 1 baixo (RTP-0179: `uses: ./../x` e `{uses: ...}` escapam da checagem); script sem eval/rede/traversal, falha fechado, docker:// e tags recusados em cópia descartável, ci.yml só ganha 1 passo; semgrep ausente.

## RTP-0179 — DevSecOps — 2026-10-20
APROVADA; 0 críticos/0 altos, 1 Baixo residual já documentado (chave `"uses"` entre aspas, sem RTP); EXECUTADO em cópia: `./../x`, `.../actions/../../../x` e `{uses: a/b@v3}` saem 1 com arquivo:linha, ~30 variações sem brecha nova, script real sai 0, sem eval/rede, ci.yml intocado; semgrep ausente (não executado).

## TP-0209 — DevSecOps — 2026-10-21
APROVADA em segurança: 0 críticos/altos/médios e nenhum achado novo (risco do app em cache = disponibilidade, Baixo, já na RTP-0182); autenticação e 404 fora do grupo, isolamento por `grupo_id`, transação com `FOR UPDATE`, migração aditiva, auditoria sem dado pessoal, G-25 (ESLint + teste) e `verificar-inicio.ts` somente leitura executados; isolamento/rotas/migração/script verdes, semgrep 0 achados em 28 arquivos.

## RTP-0182 — DevSecOps — 2026-10-21
APROVADA; 0 críticos/0 não críticos; diff só documental, varredura de segredos limpa, sem superfície nova.

## RTP-0183 — DevSecOps — 2026-10-21
APROVADA — função pura sem dado pessoal/entrada externa, grep limpo e 18 testes do domínio executados, 0 achados.

## RTP-0184 — DevSecOps — 2026-10-21
APROVADA, 0 críticos/0 não críticos; refatoração de UI sem superfície nova, sem innerHTML/eval/storage/log, dependências intocadas, eslint exit 0.

## RTP-0185 — DevSecOps — 2026-10-21
APROVADA — piso 2000-01-01 validado no servidor (422 pt-BR, sem 500/stack/SQL) em prévia e PUT, sem regressão de auth/CSRF/isolamento (sondas 71/0 falhas via QA; contrato 52 ok rodado); 0 achados.

## RTP-0180 — DevSecOps — 2026-10-21
APROVADA; 0 críticos, 0 não críticos; migração atômica e falha fechada, sem privilégio/segredo, deploy.yml mantém restauração Neon + dump cifrado; adequacao-legado 3/3.

## RTP-0181 — DevSecOps — 2026-10-21
APROVADA; 0 críticos, 0 não críticos; diff só de documento, gitleaks sem vazamentos, grep de segredos vazio, texto de pesos confere com a migração 202610200000.

## RTP-0186 — DevSecOps — 2026-10-21
APROVADA em segurança, 0 críticos e 0 não críticos; diff só de texto estático (sem HTML interpolado, dependência ou segredo), gitleaks limpo e eslint 0.

## TP-0210 — DevSecOps — 2026-10-21
APROVADA — diff puro e sem I/O/relógio/dado pessoal, fronteiras respeitadas, dependências intocadas; 0 achados.

## TP-0211 — DevSecOps — 2026-10-21
APROVADA; 0 críticos, 0 não críticos; função pura sem I/O/imports fora de datas e atividade, sem dado pessoal, sem mudança de dependências; 8/8 testes executados.

## TP-0213 — DevSecOps — 2026-10-21
APROVADA; revisão do diff + grep de fronteiras/G-25 e 36 testes de ranking verdes, 0 achados, sem mudança de dependências.

## TP-0214 — DevSecOps — 2026-10-21
APROVADA em segurança; 0 críticos, 0 novos não críticos (RTP-0187 do QA segue aberta); UPDATE filtra id+jogador+grupo, SQL parametrizado, migração aditiva OK e 14 testes verdes.

## TP-0215 — DevSecOps — 2026-10-21
APROVADA; 0 críticos, 0 não críticos; esquemas strict com data de calendário, sem dado sensível nem dependência alterada, 22 testes verdes.

## TP-0212 — DevSecOps — 2026-10-21
APROVADA; 0 críticos, 0 não críticos; matriz adversarial de datas (null, não texto, 0000-00-00, 2026-13-01, 02-30, hora, espaços, ano 99999, \n) executada: sem lançar exceção, sempre recusa (h); sem relógio/I-O/dependência nova.

## TP-0218 — DevSecOps — 2026-10-21
APROVADA, 0 críticos / 0 não críticos; diff lido (vínculo via middleware, grupoId do vinculo, query parametrizada por grupo, resposta mínima, no-store) e 78 testes de rota+isolamento executados passando.

## TP-0227 — DevSecOps — 2026-10-21
APROVADA; 0 achados; diff lido (sem innerHTML, ids com encodeURIComponent, resposta validada por esquema, erro genérico, autorização só na API), sem mudança de dependência.

## TP-0228 — DevSecOps — 2026-10-21
APROVADA; 0 críticos, 0 não críticos novos (RTP-0188 do QA segue); texto da API renderizado só como texto React (grep sem dangerouslySetInnerHTML/storage/fetch/log), sem lógica de autorização nem dado pessoal, sem mudança de dependência.

## TP-0231 — DevSecOps — 2026-10-21
APROVADA; 0 críticos, 0 não críticos; mensagem da API renderizada só como texto, erro de rede sem detalhe interno, sem autorização no cliente, sem mudança de dependência; grep de HTML inseguro limpo e 84 testes verdes.

## RTP-0188 — DevSecOps — 2026-10-21
OK; 0 achados críticos, 0 não críticos; revisão de leitura do diff: texto React, sem dado pessoal nem dependência nova.

## RTP-0189 — DevSecOps — 2026-10-21
APROVADA — diff só de teste (Kysely com Driver falso, sem rede), sem produção/segredo/dependência; 0 achados (revisão de leitura).

## TP-0216 — DevSecOps — 2026-10-21
APROVADA - revisão do diff sem achados (mensagens só com datas do domínio, formatação validada por regex ancorada, throws só em recusa malformada); 0 críticos, 0 não críticos.

## TP-0217 — DevSecOps — 2026-10-21
APROVADA — 0 críticos, 0 não críticos; revisão do diff: isolamento por grupo, SQL parametrizado, sem escrita e mensagens sem vazamento; grep sem escrita/hono e sem mudança de dependências.

## TP-0229 — DevSecOps — 2026-10-21
APROVADA — 0 críticos, 0 não críticos; sem XSS (texto React), ids com encodeURIComponent, corpo validado pelo contrato, erros sem vazamento, nada em storage/log (grep executado), sem mudança de dependência; autorização só no backend.

## RTP-0190 — DevSecOps — 2026-10-22
APROVADA; 0 críticos/0 não críticos; só CSS e atributo estático data-variante, sem mudança de superfície; revisão do diff + vitest do Botao (10 verdes).

## RTP-0191 — DevSecOps — 2026-10-22
APROVADA; 0 achados (ferramenta local, passos vêm de telas.json versionado, sem segredo/URL externa/dado real; node --check e grep de segredos executados limpos).

## TP-0219 — DevSecOps — 2026-10-22
APROVADA; 0 achados; diff somente leitura, 404 uniforme com período amarrado a jogador+grupo, CSRF herdado, 89 testes verdes executados.

## TP-0221 — DevSecOps — 2026-10-22
APROVADA; 0 críticos, 0 novos não críticos (RTP-0192 já aberta pela QA); diff lido e 85 testes do escopo executados passando; escopo por vínculo, UPDATE filtrado e auditoria sem PII confirmados.

## TP-0222 — DevSecOps — 2026-10-22
APROVADA em segurança; 0 críticos, 0 não críticos novos; escopo por grupo, travar+transação, corpo estrito e resumo de auditoria sem PII conferidos; 7 testes OK.

## TP-0230 — DevSecOps — 2026-10-22
APROVADA; 0 críticos, 0 não críticos; diff lido sem injeção de HTML, sem dado em log/URL/storage, validação final na API, ids codificados, 17 testes do reativar passando; sem dependência nova.

## RTP-0192 — DevSecOps — 2026-10-22
APROVADA; 0 críticos, 0 não críticos; teste anônimo de ranking/pdf sem as auditorias, pré-condição no banco, 9/9 passando, sem segredo/PII.

## RTP-0193 — DevSecOps — 2026-10-22
APROVADA — 0 críticos/0 não críticos; texto de erro idêntico e fixo, sem mudança de autorização; 24 arquivos/181 testes verdes.

## RTP-0194 — DevSecOps — 2026-10-22
RTP-0194 APROVADA em segurança (revisão do diff + 2 greps executados); respostas só fictícias, script local sem URL externa/segredo/exec novo; 0 achados.

## RTP-0195 — DevSecOps — 2026-10-22
APROVADA; 0 achados; código só movido (diff linha a linha conferido), imports locais/node: apenas, sem URL externa, segredo, exec novo ou ampliação de superfície.

## TP-0223 — DevSecOps — 2026-10-22
APROVADA; 0 críticos, 1 não crítico (RTP-0198: inativar sem transação/trava, corrida baixa só no mesmo grupo); escopo por grupo e mensagens sem vazamento; 99 testes verdes.

## TP-0224 — DevSecOps — 2026-10-22
APROVADA; 0 críticos, 0 não críticos; mensagem só com a data do próprio jogador, sem mudança de autorização ou SQL; 43 testes passando nos 4 arquivos do escopo.

## TP-0225 — DevSecOps — 2026-10-22
APROVADA em segurança; 0 críticos, 0 não críticos; só test/, sem PII/segredo, fábrica limpa no afterEach, sem import de teste em src, 7 testes passando.

## RTP-0196 — DevSecOps — 2026-10-22
APROVADA em segurança; 0 críticos, 0 não críticos; diff só de teste com dados sintéticos, sem src/ alterado, vitest do arquivo 16/16.

## RTP-0198 — DevSecOps — 2026-10-22
APROVADA (revisão do diff + 97 testes do escopo) — 0 críticos, 0 não críticos novos; escopo por grupo e trava/avaliação/gravação no mesmo tx confirmados; presença sem trava segue na RTP-0200.

## TP-0226 — DevSecOps — 2026-10-22
APROVADA (DevSecOps); 0 críticos, 0 não críticos; ci.yml só ganhou 1 passo sem segredo/ação nova, script só lê arquivos locais, checagem (298 arquivos), 220 testes e eslint verdes.

## RTP-0199 — DevSecOps — 2026-10-22
APROVADA — só teste em ordem.test.ts, nada em src/, dados sintéticos sem segredo/PII, teste falha se ordem/tx/rollback quebrarem; test/g26 9/9 verde; 0 achados.

## RTP-0200 — DevSecOps — 2026-10-22
APROVADA; 0 críticos, 0 não críticos; trava escopada por grupo (id alheio ignorado, validação rejeita como antes), ordem crescente sem deadlock e nº de travas limitado pelo corpo; ordem.test.ts 8 verdes, concorrência só por leitura.

## TP-0220 — DevSecOps — 2026-10-22
APROVADA — 0 achados; rota de prévia sem escrita, 404 uniforme por vínculo, corpo strict 422 por campo, 409 sem dados, auth/CSRF herdados; vitest 83/83 (rota + isolamento).

## RTP-0201 — DevSecOps — 2026-10-22
APROVADA em segurança, 0 achados; nenhuma regra enfraquecida, G-26 segue PROPOSTA, Log sem aprovação inventada, lista igual a ROTAS_QUE_ESCREVEM, sem segredo, script saída 0.

## RTP-0202 — DevSecOps — 2026-10-22
APROVADA em segurança; 0 críticos, 0 não críticos; só teste alterado (src intacto), dados sintéticos, mocks restaurados, cenário pela fábrica; test/g26 10/10 verde.

## RTP-0203 — DevSecOps — 2026-10-22
APROVADA — só teste, nada em src/, dados sintéticos sem segredo/PII, ordem/mesmo tx/rollback e restauração de mocks preservados, test/g26 10/10 verde; 0 críticos, 0 não críticos.

## RTP-0204 — DevSecOps — 2026-10-22
APROVADA; 0 críticos/0 não críticos; resíduo sem segredo/PII (só código de teste e UUID de fixture), `*.tmp.*` não esconde arquivo rastreado nem configuração, sem rotação nem limpeza de histórico.

## RTP-0197 — DevSecOps — 2026-10-22
APROVADA — mudança só na decisão de situação da grade em rodadas.ts, sem import/dependência nova, sem exposição entre jogadores/grupos, G-25 preservado (acumuladoPorInicio intocado; dominio 82/82); 0 críticos, 0 não críticos.

## RTP-0205 — DevSecOps — 2026-10-22
APROVADA, 0 críticos/0 não críticos; diff de src só em situacao-rodada.ts e 1 linha de rodadas.ts, comportamento idêntico, sem dependência nova (git show --stat, grep de chamadores e de padrões de risco limpos).

## RTP-0206 — DevSecOps — 2026-10-22
APROVADA; 0 achados; comando encadeado fixo e restrito à pasta, sem dependência nova, JSON parseado idêntico ao HEAD (80 arquivos) e teste de remoção de campo passando (9/9).

## RTP-0209 — DevSecOps — 2026-10-22
APROVADA; 0 achados; só escreve em mkdtemp e limpa (0 resíduos), execFileSync sem shell com args em array, sem dependência nova nem segredo, snapshot intocado (executado).

## RTP-0208 — DevSecOps — 2026-10-22
APROVADA — diff é só `"endOfLine": "auto"` em .prettierrc.json (ci.yml/package.json intactos, índice 100% LF, sem impacto em scripts/CI); 0 críticos, 0 não críticos novos; lacuna CRLF já coberta pela RTP-0210.

## RTP-0210 — DevSecOps — 2026-10-22
APROVADA — commit toca só .gitattributes; 379 binários i/-text intactos, 0 .bat/.cmd/.ps1, 5 .sh i/lf corretos; 0 achados.

## RTP-0207 — DevSecOps — 2026-10-22
APROVADA em segurança. G-25 mantida (único `acumuladoPorInicio`, grep sem cálculo paralelo), sem mudança de autorização, isolamento ou dado exposto, `periodos` só com datas, sem dependência nova. Domínio pontuacao+ranking 86/86 executado. 0 críticos, 0 não críticos.

## RTP-0211 — DevSecOps — 2026-10-22
APROVADA, 0 críticos/0 não críticos; G-25 mantido (acumulado só por acumuladoPorInicio), sem mudança de autorização/exposição/dependências; vitest ranking+pontuacao 87/87.
