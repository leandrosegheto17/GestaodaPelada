# Revisão de arquitetura

## Revisão 2026-10-19 (2ª) — sob demanda (projeto inteiro, depois da RTP-0162)

Números do saude.py: 0 arquivos acima do limite · 3 blocos duplicados (25 linhas, os mesmos já descartados hoje) · 3 IDs de tarefa (todos em `evidencia/s-01`) · 0 imports indevidos entre aplicações · 0 conversões forçadas · 8 comentários de cópia (falsos positivos). Nada em frontend mudou; a comparação visual e o diff de tokens da primeira revisão de hoje continuam valendo.

**Não há achado de severidade Alta aberto.** Nenhum achado novo; 0 RTP, 0 BK.

Conferido nesta rodada:
- RTP-0162 (`ops/restauracao-neon.ts`, `-cli.ts`, teste): a lógica de pai e de retenção está em funções puras que falham fechado (JSON inválido, sem lista, sem nome, pai ausente) e só tocam nomes `restauracao-<ambiente>-*`, então `production` nunca é apagado. CLI fina de 1 linha, igual a `verificar-cache-hyperdrive-cli.ts`.
- Duplicação `ops/` e `checagens/`: `main` de `restauracao-neon.ts` e de `verificar-cache-hyperdrive.ts` repetem só `readFileSync(0)` e o teste de `--executar` (2 cópias de 1-2 linhas); `checagens/` segue concentrada em `arquivos.mjs`. Extrair seria refinamento marginal.
- `deploy.yml` depois das RTP-0148/0150/0154/0160/0162: ordem build, branch de restauração, dump, migração, cache do Hyperdrive, deploy, saúde e rollback bate com o cabeçalho e com a §6 do SDD. `set -euo pipefail` faz falhar o passo se o `curl`, o CLI ou um `DELETE` falhar; o branch novo entra na lista antes da poda e fica entre os 2 mantidos; o passo de desfazer só roda com a migração concluída.

Descartados: os mesmos blocos duplicados, IDs em `evidencia/s-01`, acesso a dados em `backend/api/src` e comentários de cópia já registrados na primeira revisão de hoje; T18 pc (instabilidade de carga já registrada).

Item 17 (CI/troca de dados em produção): sem pendência; a retenção dos branches agora está em script testado.

Sem achado nos itens: 1 a 18. Itens 11, 13 e 14 por amostragem do relatório.

## Revisão 2026-10-19 — sob demanda (projeto inteiro, segunda revisão)

Números do saude.py: 0 arquivos acima do limite · 3 blocos duplicados (25 linhas) · 3 IDs de tarefa (todos em `evidencia/s-01`) · 2 pastas com acesso a dados (`backend/api/src`, `evidencia/s-01`) · 0 imports indevidos entre aplicações · 0 conversões forçadas · 8 comentários de cópia (falsos positivos, como ontem). Comparação visual: tudo OK; T18 Pontuação/sucesso/pc divergiu uma vez (39,48%, altura 800 vs 1169) por carregamento incompleto e deu 0,00% ao repetir; `tokens.css` do app idêntico ao do mockup.

**Não há achado de severidade Alta aberto.** A Alta da revisão anterior (RTP-0130, T16) está Aprovada, assim como RTP-0131 a RTP-0134; nenhuma tela divergiu do mockup nesta rodada.

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | O passo "Branch de restauração no Neon" decide o branch pai e **quais branches são apagados** com dois `node -e` inline, sem teste; o resto do workflow já põe a regra em script testado (`ops/`) | 17 | Média | `.github/workflows/deploy.yml:46,52` | RTP-0162 |

Descartados:
- Instabilidade da T18 Pontuação/sucesso/pc na comparação visual: nota, não regressão. A tela repetida deu 0,00% com a mesma altura; a primeira leitura pegou a página antes de terminar de carregar. Se voltar a aparecer, vale esperar o fim do carregamento antes de capturar (ajuste da ferramenta de comparação, não do app).
- IDs de tarefa e acesso a dados em `evidencia/s-01`: pasta de evidência do spike, fora do código de produção (igual à revisão anterior).
- Comentários "que admitem cópia" (8): falam de partida duplicada/repetida e do espelho do PWA; nenhum diz que o código foi copiado (igual à anterior).
- Acesso a dados em `backend/api/src` (89): o `saude.py` agrupa por pasta de partida; o G-02 é verificado por ESLint e `checar-grupo-id.mjs` (igual à anterior). Imports entre pacotes conformes ao SDD.
- Blocos duplicados do §2: `AreaDono`/`GrupoDono` (9 linhas, `DialogoSenha` com `aoFechar`), `PaginaGrupo`/`PaginaPontuacao` (8 linhas, timer do aviso "salvo") e dois `EXISTS` de `temPresencaAntesDe`/`temPresencaDesde` em `jogadores.ts`. Cada um tem 2 cópias de poucas linhas; extrair seria refinamento marginal.
- Lote-30 (scripts `ops`/`checagens`): sem duplicação relevante (`arquivos.mjs` já concentra `git ls-files`, `falharFechado`, `procurar` e `encerrar` e todos os `checar-*` o usam; `ops/` tem funções puras + CLI fina), nenhum arquivo perto do limite de 300 linhas, `consultar-hyperdrive.sh` valida token e base antes de enviar.

Troca de dados em produção (item 17): a tabela da §6 do SDD bate com o `deploy.yml` (branch do Neon e dump antes da migração, migração aditiva, cache do Hyperdrive conferido, `wrangler rollback` e instrução de restauração em falha). Único ponto aberto é a lógica de retenção dos branches (RTP-0162).

Sem achado nos itens: 1 a 16 e 18. Itens 11, 13 e 14 foram olhados por amostragem do relatório, sem leitura exaustiva de cabeçalhos.

## Revisão 2026-10-18 — sob demanda (projeto inteiro, primeira revisão)

Números do saude.py: 3 arquivos acima do limite (2 código, 1 componente) · 24 blocos duplicados (250 linhas) · 3 IDs de tarefa (todos em `evidencia/`) · 2 pastas com acesso a dados (`backend/api/src`, `evidencia/s-01`) · 0 imports indevidos entre aplicações (web importa só `@pelada/contrato`) · 0 conversões forçadas. Comparação visual: 115 OK, 2 DIVERGE (T16 sem-habilidades); `tokens.css` do app idêntico ao do mockup.

**Há 1 achado de severidade Alta aberto (#1, RTP-0130): tela fora do limite do mockup. Bloqueia o `/deploy` até ser corrigido.**

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | T16 Ficha do jogador, estado sem-habilidades: título e selo da seção 1 px abaixo do mockup; 4,60% (PC) e 5,98% (celular) de pixels divergentes, limite 1% | 18 | Alta | `frontend/web/src/telas/jogador/SecaoNotas.tsx`, `jogador.module.css` | RTP-0130 |
| 2 | Cinco+ formulários reescrevem o `<form noValidate aria-busy onSubmit>` que o `Formulario` compartilhado já faz, e `.formulario`/`.duasColunas` estão copiados em 8 módulos CSS | 4 | Média | `telas/{lancamento,pontuacao,grupo,jogador,config-caixa,partida,admins,...}/Formulario*.tsx`, `*.module.css`; `componentes/pagina/Formulario.tsx` | RTP-0131 |
| 3 | ResultadoDois e ResultadoVarios repetem confirmar escalação, faixas de erro e diálogo de refazer; ResultadoVarios importa constante da tela irmã; ResultadoDois com 207 linhas | 4, 5, 8 | Média | `telas/simulador-resultado/ResultadoDois.tsx:60-116,183-205`, `ResultadoVarios.tsx:46-91,121-143` | RTP-0132 |
| 4 | Validação do `?mes=` malformado copiada em Ranking, Partidas e Financeiro | 4 | Média | `telas/ranking/PaginaRanking.tsx:23-33`, `telas/partidas/PaginaPartidas.tsx:33-43`, `telas/financeiro/PaginaFinanceiro.tsx:34-44` | RTP-0133 |
| 5 | `eslint.config.mjs` (304) e `checar-grupo-id.mjs` (301) acima de 300 linhas | 8 | Baixa | `eslint.config.mjs`, `backend/scripts/checagens/checar-grupo-id.mjs` | RTP-0134 |

Descartados (falso positivo):
- IDs de tarefa em `evidencia/s-01/{preparar.sql,rodar.mjs,worker.ts}` e acesso a dados em `evidencia/s-01`: pasta de evidência do spike, fora do código de produção e do empacotamento.
- Comentários "que admitem cópia" (8): falam de partida duplicada/repetida (regra de negócio) e do espelho de armazenamento do PWA; nenhum diz que o código foi copiado.
- Blocos restantes do §2 (9 não listados): consequência dos mesmos Formulario*/Pagina* acima, cobertos por RTP-0131 e RTP-0133.
- Acesso a dados em `backend/api/src` (89 ocorrências): confirmado, o `saude.py` agrupa por pasta de partida; o G-02 é verificado por ESLint (`pg`/`kysely` proibidos fora de `infraestrutura/db/`) e `checar-grupo-id.mjs`.
- Imports entre pacotes (§6a): todos conformes ao SDD (api e web importam `@pelada/contrato`; só a api importa `@pelada/dominio`); as linhas com origem `.` são arquivos de configuração/scripts da raiz.

Sem achado nos itens: 1, 2, 3, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17 (CI: `ci.yml` roda as checagens `checar-*`, `checar-compatibilidade`, gitleaks, e2e e `visual`; `deploy.yml` tem o `hyperdrive get` do G-17; guardrails com coluna "Como verificar" automática). Itens 11, 13 e 14 foram olhados por amostragem do relatório, sem leitura exaustiva de cabeçalhos.
