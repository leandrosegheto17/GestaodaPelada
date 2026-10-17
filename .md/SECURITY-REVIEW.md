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
