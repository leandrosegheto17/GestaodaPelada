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
