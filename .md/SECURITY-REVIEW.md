# SECURITY-REVIEW

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
