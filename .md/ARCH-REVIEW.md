# Revisão de arquitetura

## Revisão 2026-10-22 — pré-deploy, depois do lote de períodos do jogador (L49 a L51, RTP-0197 a 0200)

Números do saude.py: 0 arquivos acima do limite · 4 blocos duplicados (34 linhas, os mesmos já descartados) · 3 IDs de tarefa (todos em `evidencia/s-01`) · 2 pastas com acesso a dados (`backend/api/src`, `evidencia/s-01`) · 0 imports indevidos entre aplicações · 0 conversões forçadas · 8 comentários de cópia (falsos positivos). Comparação visual: 153 de 153 OK, 0 DIVERGE; `tokens.css` do app idêntico ao do mockup.

**Não há achado de severidade Alta aberto. Nada impede o `/deploy`** (pelo que esta revisão cobre). Fora do escopo, por estarem em decisão em outra sessão: BK-0018/BK-0019, RTP-0197 (regra do PTS FINAL × INICIAL com presença fora de período) e as alterações não commitadas em `backend/dominio` e `test/apoio/regressao-periodos`.

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | A G-26 diz que a correção de período e o retorno retroativo acontecem só em `periodos-corrigir` e `reativar`, com `jogadores.travar` antes; hoje também travam `inativar`, `inicio-editar` e lançar/editar partida (ordem de id), e a lista de rotas do teste e da varredura é maior que a do texto | 17, 11 | Baixa | `.md/GUARDRAILS.md` (G-26); `backend/scripts/checagens/checar-escrita-periodo.mjs:12-17` | RTP-0201 |
| 2 | Editar partida trava os marcados (`travarMarcados`), mas só lançar tem teste de ordem; remover a trava de `editar.ts` não derruba nenhum teste | 17 | Baixa | `backend/api/src/aplicacao/partidas/editar.ts`; `backend/api/test/g26/ordem.test.ts` | RTP-0202 |

Descartados:
- Rotas de prévia × gravação de períodos (`periodos-previa.ts`, `periodos-corrigir.ts`): ambas só leem parâmetros e corpo (mesmo schema) e delegam, uma a `avaliarPedidoDePeriodos` e outra a `corrigirPeriodoDoJogador`, que chama a mesma avaliação dentro da transação; o trecho comum é montagem do pedido (5 linhas), não regra. Sem bloco no `saude.py`.
- Mensagens de períodos: `mensagens-periodos.ts` é o único lugar dos textos das regras a–h; `avaliarPedidoDePeriodos` usa `mensagemDaRecusa` e `inicio-editar` usa `mensagemInicioDepoisDaSaida`; `formatarDataBr` não tem cópia no backend. Os dois avisos de `avaliacao-periodos.ts` são o único ponto do texto "vale 0 ponto".
- `comparar-visual.mjs` × `comparar-visual-captura.mjs`: a extração dividiu por responsabilidade (orquestração e servidores × captura e diferença de pixels); nenhuma função repetida, só `capturar` e `diferenca` exportadas.
- IDs de tarefa no código: só os 3 de `evidencia/s-01` (já descartados); nenhum no código de períodos nem em `.claude/scripts` fora do próprio `taskplan.py`.
- Acesso a dados: a varredura de `.query(`/`selectFrom` fora de `infraestrutura/db` só acha `c.req.query` (parâmetro de URL); escrita em `periodos_ativos` só em `repositorios/jogadores.ts` e `periodos-corrigir.ts`, como a G-26 e `checar-escrita-periodo.mjs` exigem; `evidencia/s-01` é o mesmo descarte anterior.
- Regra de negócio na tela de jogador: `frontend/web` não importa `@pelada/dominio`; `DialogoCorrigirDatas` valida com o schema do contrato e as frases de ajuda ("não pode ser depois do próximo retorno") são texto de apoio com dados da lista, a recusa real vem da API; `DialogoInicio` só formata a prévia.
- Blocos duplicados `AreaDono`/`GrupoDono`, `ranking`/`prioridade`, `PaginaGrupo`/`PaginaPontuacao`, `pesos.ts`/`tipos.ts` e os 8 comentários de cópia: os mesmos já descartados em 19, 20 e 21/10.
- `excluir.test.ts` falhando por linhas vazadas em `pelada_teste`: ambiente, já registrado pelo QA da RTP-0200; não é achado de arquitetura.

Sem achado nos itens: 1 a 10, 12 a 16 e 18. Itens 11, 13 e 14 por amostragem do relatório.

## Revisão 2026-10-21 — pré-deploy, depois da TP-0209

Números do saude.py: 1 arquivo acima do limite (`PaginaJogador.tsx`, 213 de 200) · 4 blocos duplicados (34 linhas, os mesmos já descartados) · 3 IDs de tarefa (todos em `evidencia/s-01`) · 2 pastas com acesso a dados (`backend/api/src`, `evidencia/s-01`) · 0 imports indevidos entre aplicações · 0 conversões forçadas · 8 comentários de cópia (falsos positivos). Comparação visual: 117 de 117 OK, 0 DIVERGE; `tokens.css` do app idêntico ao do mockup. Mudança desde a revisão anterior: TP-0209 (data de início da pontuação, blocos A a F): `acumuladoPorInicio` no domínio, migração 202610201000, `inicio_pontuacao` no repositório de jogadores, rotas `inicio/previa` e `inicio`, `verificar-inicio`, rodadas "–" no ranking e no PDF, T16 com `DataDeInicio` e `DialogoInicio`; RTP-0182 aberta pelo QA.

**Não há achado de severidade Alta aberto. Nada impede o `/deploy`.** Débitos já abertos e não repetidos: RTP-0176, RTP-0180, RTP-0181 e RTP-0182 (linha de `inicioPontuacao`/`pontuacaoInicial` em `QUEBRAS.md`).

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | A regra "data de início em vigor = a gravada ou, sem ela, o início do 1º período" existe em `inicioEfetivo` (api) e foi reescrita à mão em `verificar.ts`, que a usa para conferir justamente que a regra não mudou nada; se uma mudar, a outra não acompanha e a verificação passa a comparar contra regra diferente | 4 | Baixa | `backend/api/src/aplicacao/pontuacao/adaptadores.ts:18`; `backend/scripts/verificar-inicio/verificar.ts:44` | RTP-0183 |
| 2 | `PaginaJogador.tsx` passou do limite de componente (213 de 200) ao ganhar estado e diálogo da data de início; concentra estado de faixas, de diálogos e três handlers de mutação | 8 | Baixa | `frontend/web/src/telas/jogador/PaginaJogador.tsx` | RTP-0184 |
| 3 | O "–" do ranking e do PDF agora também vale para rodada anterior à data de início, mas legenda, rótulo (`rotulos/index.ts:39`), UX-SPEC e mockup dizem só "Ainda não fazia parte do grupo". Texto aprovado no mockup: mudar exige decisão do usuário e começa pelo mockup | 11 | Baixa | `frontend/web/src/rotulos/index.ts:39`; `frontend/web/src/pdf/legenda.ts:7`; `.md/UX-SPEC.md` (legenda ~296); `.md/mockup/telas/t01-ranking--*.html` | BK |

Descartados:
- Acumulado calculado em mais de um lugar: `acumuladoPorInicio` é a única conta; ranking (`acumuladosDosAtivos`, `calcularRanking`), PDF (`projecao.ts`), simulador (`prioridade.ts`), prévia (`previa-inicio.ts`), importação (`calculo.ts`) e `verificar.ts` só a chamam. Frontend e `api` não recalculam. Os blocos `ranking.ts:95-103` × `prioridade.ts:40-48` são a chamada com os mesmos 5 campos (já descartados).
- Regra de negócio na tela: `DialogoInicio` só formata o que a API devolve (`fraseDaPrevia`) e valida com `inicioCorpo(hoje)` do contrato; `data < atual` só escolhe a frase "rodadas passam a constar". `DataDeInicio` só formata. Nenhum import do domínio no frontend.
- Prévia (domínio, `previa-inicio.ts:48-54`) × gravação (SQL de `alterarInicio`) repetem "recuar antes do 1º período alinha o início": uma é a conta sem gravar, a outra é o UPDATE; os testes de `escrita-inicio-pontuacao` e `inicio.test` cobrem as duas. Refinamento marginal.
- Acesso a dados: a coluna só é lida e escrita em `repositorios/jogadores.ts`; `inicio-previa.ts`/`inicio-editar.ts` usam `jogadores.*`, `auditoria.*` e `carregarHistoricoGrupo` (repositórios), e `verificar.ts` só repositórios e `emLeitura`. As 89 ocorrências em `backend/api/src` seguem no módulo único; `evidencia/s-01` é o mesmo descarte de 19 e 20/10.
- Migração 202610201000: aditiva (coluna nula), `UPDATE` com isenção de perda (a data é a menor entre o 1º período e a 1ª presença, o que já era contado), comentário de coluna sem ID de tarefa; coberta por `migracoes/inicio-pontuacao.test.ts`.
- `QUEBRAS.md`/contrato: a linha de `elenco.detalhe.inicioPontuacao` (e `pontuacaoInicial`) é a RTP-0182 (já aberta); `inicioCorpo`/`InicioPreviaResposta` são rotas e campos novos (aditivos); snapshot `elenco.detalhe.json` atualizado.
- ID de tarefa em comentário: `saude.py` §3 em 3 (todos em `evidencia/s-01`); nenhum no código da TP-0209.
- Re-recálculo da prévia carrega o histórico do grupo a cada data digitada (`carregarHistoricoGrupo`): leitura única por chamada, sem laço de consulta; escala de uma pelada. Item 13 sem achado.
- `verificar-inicio.ts` com `inicio ?? periodos[0]` e `primeira` por `sort()`: só diagnóstico de leitura; log por id, sem apelido nem telefone (SDD §7).
- Blocos duplicados `AreaDono`/`GrupoDono`, `PaginaGrupo`/`PaginaPontuacao`, `pesos.ts`/`tipos.ts` e os 8 comentários de cópia: os mesmos já descartados em 19 e 20/10.

Sem achado nos itens: 1, 2, 3, 5, 6, 7, 9, 10, 12 a 18. Itens 11, 13 e 14 por amostragem do relatório.

## Revisão 2026-10-20 (4ª) — pré-deploy, depois das RTP-0177 a 0179 e dos BK-0012/0013

Números do saude.py: 0 arquivos acima do limite · 4 blocos duplicados (33 linhas, os mesmos já descartados) · 3 IDs de tarefa (todos em `evidencia/s-01`) · 2 pastas com acesso a dados (`backend/api/src`, `evidencia/s-01`) · 0 imports indevidos entre aplicações · 0 conversões forçadas · 8 comentários de cópia (falsos positivos). Comparação visual: a de hoje (117 de 117 OK) segue válida: nenhum arquivo de frontend mudou desde a revisão anterior (4ffef08c); `tokens.css` do app idêntico ao do mockup. Mudança desde a revisão anterior: `checar-acoes-fixadas.mjs` + teste e passo no `ci.yml` (RTP-0178/0179); SDD §7 e G-24 (RTP-0177); ADR-022 e ajustes no SDD, no ADR-008 e no UX-SPEC (BK-0013); `QUEBRAS.md` e comentário da migração 202610200000 (BK-0012).

**Não há achado de severidade Alta aberto. Nada impede o `/deploy`.** Débitos já abertos e não repetidos: RTP-0176 (`minimumReleaseAge` 10080 depois de 22/10) e RTP-0180 (contrair o CHECK de `posicao`).

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | As 4 linhas de pesos de `QUEBRAS.md` (`expulsoComChuva`, `expulsoSemChuva`, `historico[].expulso`, `vigente.expulso`) trazem o texto das linhas de `posicao` ("banco aceita as posições antigas e as novas", "RTP-0180 contrai o CHECK de posição"). Para pesos a migração só acrescentou `expulso_com_chuva` e manteve `expulso`; não há contração. A RTP-0180 manda trocar o "deploy 2" das "12 linhas" e espalharia o texto errado | 17 | Baixa | `backend/contrato/QUEBRAS.md:21-24` | RTP-0181 (depende da RTP-0180) |

Descartados:
- `checar-acoes-fixadas.mjs` × padrão: usa `arquivosVersionados` e `encerrar` de `arquivos.mjs`, `RAIZ` por argumento, regex no topo, como `checar-wrangler-deploy.mjs`; teste em `checagens/test/` roda em `pnpm test:checagens`. Sem leitura de arquivo ou saída copiada. Resíduos aceitos pelo DevSecOps (chave `"uses"` entre aspas, `\` em caminho local): revisão de PR cobre; sem RTP.
- Passo no `ci.yml`: está no job `base`, ao lado dos outros `checar-*` (a RTP-0178 diz "job `checagens`", que só roda os testes); o lugar certo é o atual, sem mudança.
- ADR-022 × código × UX-SPEC: `entregarPdf` devolve `pedir-gesto` quando o aparelho compartilha arquivo e baixa direto senão; é o que o ADR-022 §1-3, a F4/D4 e o trade-off T01/P01 do UX-SPEC, o C3 e o T-05 do SDD descrevem. O ADR-008 só ganhou a marca de status "§3 Superseded by ADR-022" e o texto original foi mantido: é o uso previsto de ADR imutável.
- G-24: aponta `backend/scripts/checagens/checar-acoes-fixadas.mjs`, que existe e roda no CI; as 3 chaves batem com `pnpm-workspace.yaml`. Sem staging/homologação: a única menção em `.github` é o cabeçalho do `deploy.yml` ("sem homologação", ADR-020).
- Incidente do comentário da migração 202610200000 com ID de tarefa (corrigido em bbb50979): caso isolado de um comentário de texto; a trava existe e funcionou (`checar-ids-tarefa` no CI, hoje 0 fora de `evidencia/s-01`). Sem causa estrutural nem RTP.
- Os 4 blocos duplicados, IDs em `evidencia/s-01`, acesso a dados em `backend/api/src` e `evidencia/s-01`, e os 8 comentários de cópia: os mesmos já descartados em 19 e 20/10.

Sem achado nos itens: 1 a 16 e 18 (além do #1 no 17). Itens 11, 13 e 14 por amostragem do relatório.

## Revisão 2026-10-20 (3ª) — pré-deploy, depois das RTP-0169 a 0175

Números do saude.py: 0 arquivos acima do limite · 4 blocos duplicados (33 linhas, os mesmos já descartados) · 3 IDs de tarefa (todos em `evidencia/s-01`) · 2 pastas com acesso a dados (`backend/api/src`, `evidencia/s-01`) · 0 imports indevidos entre aplicações · 0 conversões forçadas · 8 comentários de cópia (falsos positivos). Comparação visual: a de hoje (117 de 117 OK) segue válida: desde então o frontend só mudou comentários e títulos de teste (RTP-0175); `tokens.css` do app idêntico ao do mockup. Mudança desde a revisão anterior (commit 53526121): workflows com ações fixadas por SHA, `pnpm-workspace.yaml` (RTP-0171), `middlewares/sem-sniff.ts` (RTP-0170), comentários do PDF (RTP-0175); documentos SDD §2, G-01 e UX-SPEC (RTP-0169, 0174).

**Não há achado de severidade Alta aberto. Nada impede o `/deploy`.** Débitos já abertos e não repetidos: RTP-0176 (`minimumReleaseAge` 10080 depois de 22/10, prazo 29/10), BK-0012 e BK-0013.

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | O SDD §7 e o GUARDRAILS não têm requisito para a cadeia de suprimento (ações por SHA, política do pnpm) nem para `nosniff` em `/api/*` (a "Superfície de Exposição" só cita `nosniff` nos assets). As RTP-0170/0171 citam "SDD §7; G-15", que não dizem isso: o controle existe só no código | 17 | Baixa | `.md/SDD.md` §7 (Superfície de Exposição, ~595-598); `.md/GUARDRAILS.md` | RTP-0177 |
| 2 | Nada impede voltar a uma ação por tag mutável (`uses: x@v4`) ou tirar `blockExoticSubdeps`/`trustPolicy`: o fixar por SHA foi feito à mão e só o semgrep do DevSecOps (fora do CI) confere. Os outros guardrails de CI têm `checar-*` | 17 | Baixa | `.github/workflows/*.yml`, `.github/actions/*/action.yml`, `pnpm-workspace.yaml`; modelo: `backend/scripts/checagens/checar-wrangler-deploy.mjs` | RTP-0178 (depende da RTP-0177) |

Descartados:
- `deploy.yml` depois do pinning: só mudaram as linhas `uses:`; ordem build do web, branch de restauração, dump cifrado, migração, cache do Hyperdrive, deploy, saúde e rollback igual ao cabeçalho do arquivo, ao G-15 e à §6 do SDD; `permissions`, `environment`, `concurrency` e o gatilho `workflow_dispatch` intactos.
- `semSniff` × `semCache` (7 linhas cada, mesmo corpo com outro cabeçalho): mesmo padrão `await proximo(); c.header(...)` e mesmas duas linhas em `app.ts`, antes de limite de taxa, CSRF e sessão, então 401, 404, 429 e 500 também saem com o cabeçalho; teste cobre 200/401/404/500. Juntar em um arquivo seria refinamento marginal.
- Nome do arquivo `cache.ts` (exporta `semCache`) × `sem-sniff.ts` (exporta `semSniff`): inconsistência só de nome de arquivo; renomear gera churn sem ganho.
- THREAT-MODEL com os débitos 1 e 2 ("sem nosniff", "ações por tag") ainda listados: é o retrato da auditoria do DevSecOps, não artefato de arquitetura; a nova auditoria o atualiza.
- `trustPolicyExclude` com 4 entradas por versão exata: falso positivo do lockfile atual, já previsto na RTP-0176 (item 3), sem RTP nova.
- Os 4 blocos duplicados, IDs em `evidencia/s-01`, acesso a dados em `backend/api/src` e `evidencia/s-01`, e os 8 comentários de cópia: os mesmos já descartados em 19 e 20/10.
- Comentários de `pdf/entregar.ts`, `DialogoPdfPronto.tsx` e títulos de `exportar-pdf.test.tsx` (RTP-0175): agora dizem o fluxo novo; sem mudança de lógica.
- SDD §2 e G-01 (RTP-0169): batem com `ZONAS` do `eslint.config.mjs` e com os imports reais de `backend/scripts`.

Sem achado nos itens: 1 a 16 e 18 (além dos #1 e #2 no 17). Itens 11, 13 e 14 por amostragem do relatório.

## Revisão 2026-10-20 (2ª) — pré-deploy, depois do ajuste do Exportar PDF

Números do saude.py: 0 arquivos acima do limite · 4 blocos duplicados (33 linhas, os mesmos já descartados na revisão anterior) · 3 IDs de tarefa (todos em `evidencia/s-01`) · 2 pastas com acesso a dados (`backend/api/src`, `evidencia/s-01`) · 0 imports indevidos entre aplicações · 0 conversões forçadas · 8 comentários de cópia (falsos positivos). Comparação visual: 117 de 117 OK, 0 DIVERGE; `tokens.css` do app idêntico ao do mockup. Mudança desde a revisão anterior: commit 7a7560ee (`pdf/entregar.ts`, `usarExportarPdf.ts`, testes).

**Não há achado de severidade Alta aberto. Nada impede o `/deploy`.** Os achados abaixo são de documentação; o achado #2 da revisão anterior (contrair o CHECK de `posicao`) segue aberto como BK e não é repetido.

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | O UX-SPEC ainda descreve o Exportar PDF antigo: F4 compartilha direto e só cai no D4 se recusado; D4 "quando o compartilhamento direto falha"; trade-off T01/P01 "compartilhar no mesmo toque, D4 como reserva". O código agora abre o D4 (Compartilhar ou Baixar) sempre que o aparelho compartilha arquivo | 18 | Baixa | `.md/UX-SPEC.md` F4 (~234-240), lista de diálogos (~157), estados P01 (~633), trade-offs (~743) | RTP-0174 |
| 2 | Doc de `ResultadoEntrega` (`pedir-gesto` = "recusou por falta de gesto"), comentário de `DialogoPdfPronto` ("recusou o compartilhamento direto") e dois títulos de teste ainda dizem o fluxo antigo | 4 | Baixa | `frontend/web/src/pdf/entregar.ts:4`, `telas/ranking/DialogoPdfPronto.tsx:12`, `telas/ranking/exportar-pdf.test.tsx:105,137` | RTP-0175 |
| 3 | O ADR-008 (item 3, "Ordem para preservar o gesto") decide gerar e chamar `navigator.share` no mesmo gesto; o app passou a sempre mostrar Compartilhar/Baixar. ADR é imutável: falta um ADR novo que supersede esse ponto (ou decisão de voltar ao fluxo direto) | 17 | Baixa | `.md/adr/008-pdf-gerado-no-cliente-a-partir-de-projecao-da-api.md` §3; `.md/SDD.md` C3 e §6 (risco "Aparência do PDF") | BK |

Descartados:
- Os 4 blocos duplicados, IDs em `evidencia/s-01`, acesso a dados em `backend/api/src` e `evidencia/s-01`, e os 8 comentários de cópia: os mesmos já descartados em 19 e 20/10.
- `compartilharArquivo` receber `titulo` enquanto `entregarPdf` não recebe mais: coerente, só o botão Compartilhar do D4 compartilha; `usarExportarPdf.ts` monta o título e passa. Sem código morto.
- Em `compartilharDoD4`, `pedir-gesto` não faz nada e o D4 continua aberto: a pessoa toca de novo, o que é o comportamento especificado.
- SDD C3 ("compartilhar ou baixar") e a lista de integrações: continuam verdadeiros com o novo fluxo.
- Regra de negócio na tela do PDF: sem mudança; `usarExportarPdf` só orquestra, título e colunas vêm do contrato e do domínio.

Conferido: `entregar.test.ts` cobre os 3 caminhos de `entregarPdf` (compartilha, baixa, `canShare` ausente) e `exportar-pdf.test.tsx` cobre D4 (Compartilhar, Baixar, cancelar, erro); visual sem divergência, inclusive `pdf-compartilhar`.

Sem achado nos itens: 1 a 3, 5 a 16 e 18 (além do #1). Itens 11, 13 e 14 por amostragem do relatório.

## Revisão 2026-10-20 — pré-deploy (projeto inteiro, depois da TP-0208 e das RTP-0167/0168)

Números do saude.py: 0 arquivos acima do limite · 4 blocos duplicados (33 linhas; 1 novo par, `Pesos` em `pesos.ts` × `dominio/pontuacao/tipos.ts`, descartado) · 3 IDs de tarefa (todos em `evidencia/s-01`) · 2 pastas com acesso a dados (`backend/api/src`, `evidencia/s-01`) · 0 imports indevidos entre aplicações · 0 conversões forçadas · 8 comentários de cópia (falsos positivos). Comparação visual: 117 de 117 OK; `tokens.css` do app idêntico ao do mockup. Todas as RTP da revisão anterior (0130 a 0134, 0162) e as RTP-0165 a 0168 estão Aprovadas no TASKPLAN.

**Não há achado de severidade Alta aberto. Nada impede o `/deploy`.**

| # | Achado | Item do checklist | Severidade | Onde | Destino |
|---|---|---|---|---|---|
| 1 | A tabela de pacotes do SDD §2 diz que só a api depende de `@pelada/dominio` e que os scripts importam da api só repositórios, migrações, `seguranca` e `acesso/senhas`; o código (e o ESLint) também deixam `backend/scripts` importar `@pelada/dominio` e `infraestrutura/db/index.ts` | 2 | Baixa | `.md/SDD.md` §2; `backend/scripts/importar-legado/{calculo,executar}.ts`, `seed-local.ts` | RTP-0169 |
| 2 | A migração `202610200000_adequacao_legado.sql` alarga o CHECK de `posicao` (antigas e novas) e promete "contrair no deploy seguinte" (SDD §6, `QUEBRAS.md`, TP-0208), mas nenhuma tarefa, BK ou nota registra quem e quando tira `defensor`/`meio_campo` do CHECK | 17 | Média | `backend/api/src/infraestrutura/db/migracoes/202610200000_adequacao_legado.sql:3-8`; `backend/contrato/QUEBRAS.md` | BK (quando contrair e onde registrar) |

Descartados:
- `Pesos` repetido em `repositorios/pesos.ts` e `dominio/pontuacao/tipos.ts` (8 linhas): a infraestrutura não importa o domínio (camadas do SDD §2); a tipagem estrutural faz o compilador acusar divergência em `aplicacao/pesos/painel.ts` e `aplicacao/pontuacao/adaptadores.ts`. Refinamento marginal.
- `importar-legado/*` × domínio: sem duplicação da regra de pontuação; `calculo.ts` usa `acumuladoComInicial`, `somarDias` e os tipos do `@pelada/dominio`. `PESOS_LEGADO` são dados da RN-24 (exceção declarada do script), não lógica. A regra de chuva por maioria (`chuvaDaRodada`) é só da leitura do legado.
- Acesso a dados do script: `gravacao.ts` e `executar.ts` só chamam repositórios (`jogadores`, `partidas`, `pesos`, `habilidades`, `auditoria`, `grupos`) e `emTransacao`; o único SQL novo é `pesos.substituirTodas`, dentro do repositório; lint e `checar-grupo-id` cobrem.
- Regra de negócio na tela: `FormularioJogador` valida a pontuação inicial pelo schema do contrato; as 7 posições vêm de `POSICOES` (contrato) e os rótulos de `rotulos/`; nenhuma lista de posição ou de peso fora deles.
- Colunas `expulso` e `expulso_com_chuva` com nomes assimétricos no banco: migração aplicada é imutável; o mapeamento fica isolado em `pesos.ts` (`paraConfig`).
- "6 posições" no ADR-021 (são 7): ADR é imutável e o SDD, o contrato e o teste de migração dizem 7.
- IDs de tarefa e acesso a dados em `evidencia/s-01`, comentários "de cópia", blocos de `AreaDono`/`GrupoDono`, `PaginaGrupo`/`PaginaPontuacao` e os dois `EXISTS` de `jogadores.ts`: os mesmos já descartados em 19/10.
- Menção "etapa 1" em `gravacao.ts` e no teste: nome de fase da ADR-021, não ID de tarefa; `checar-ids-tarefa` em 0.

Conferido: migração aditiva com a isenção `-- contrair:` justificada, CHECK com as duas listas e `UPDATE` sem perda, coberta por `api/test/migracoes/adequacao-legado.test.ts` (rodada no job `api`); testes de `backend/scripts` rodam no job `checagens` (`pnpm test:checagens`) com Postgres; `ci.yml` mantém lint, `checar-*`, `checar-compatibilidade`, format, typecheck (inclui `tsc -p backend/scripts`), build, gitleaks, e2e e visual; `deploy.yml` na ordem build, branch de restauração, dump, migração, cache do Hyperdrive, deploy, saúde, rollback, igual ao cabeçalho e à §6 do SDD; a importação do legado está na §6 com recusa de grupo com partida, backup confirmado e execução só do usuário.

Sem achado nos itens: 1, 3 a 16 e 18. Itens 11, 13 e 14 por amostragem do relatório.

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
