---
description: Etapa 2 do fluxo — aciona o agente Validador no chapéu QA para testar as tarefas já executadas (estado Executada/aguarda teste), em sequência, contra o plano de teste e o critério de aceite de .md/.taskplan/<ID>.md; grava o resultado no arquivo da tarefa. Aprova (QA ✔), devolve ao /executar em achado crítico ou abre RTP em achado não crítico. Não implementa nem valida segurança e não chama outro comando. Sem argumento pega a próxima tarefa elegível; --tarefa <ID> testa só essa; --lote N e --continuar [N] [--nocontext] [--nocommit] [--paralelo [N]] [--lotes-distintos] encadeiam as tarefas. Durante a rodada só o arquivo de cada tarefa é escrito; TASK.md e TASKPLAN.md são consolidados no fim. Não dispara /deploy sozinho.
argument-hint: [vazio = próxima tarefa | --tarefa <ID> | --lote N | --tarefas ID,ID | --continuar [N] [--nocontext] [--nocommit] [--paralelo [N]] [--lotes-distintos]]
---

# Comando `/testar` — etapa 2: QA

A lógica do fluxo está em `.claude/EXECUTION-FLOW.md` (Comando 1) e a mecânica
comum em `.claude/commands/executar.md` — **leia o `executar.md` agora** se ainda não o
tiver em contexto. Este comando é o `/executar` com **a etapa trocada**: tudo o que está
lá sobre modos e flags (`--tarefa`, `--lote`, `--continuar`, `--nocontext`, `--nocommit`,
`--paralelo`, `--lotes-distintos`), checagem de contexto, `taskplan.py` (`iniciar`/`concluir`/`consolidar`),
reserva por sessão, onde o código roda (`main` por padrão; worktree só com `--worktree`), rodada paralela
(Seção 3e: até 20 tarefas ao mesmo tempo), bloqueio (Seção 6) e abertura de tarefa nova (Seção 5) vale
**igual aqui**, com as diferenças abaixo. Se a suíte mostrar interferência entre testes (banco, portas)
numa rodada paralela, rode de novo sem `--paralelo`. Agente: `validador` no chapéu QA
(`.claude/agents/validador.md`). **Nunca chama `/executar` nem `/validar`.**

Argumento recebido (pode estar vazio): $ARGUMENTS

**Acionado pelo `/desenvolver`** (orquestrador sem supervisão): não pare para perguntar nada ao usuário — onde o
comando perguntaria (assumir reserva velha, retomar bloqueada, argumento ambíguo), **pule a tarefa** e registre
no resumo; ao terminar, devolva só o resumo curto (o que fechou, devolveu e bloqueou) e **não** sugira próximo
comando: o controle volta ao `/desenvolver`.

## Diferenças em relação ao `/executar`

- **Pré-requisito**: a tarefa tem de ter o resultado da execução em
  `## 4. Resultado da execução` e um diff recuperável (`python .claude/scripts/taskplan.py diff <ID>`:
  snapshot ou commits com o ID). Sem isso, pare e sugira `/executar --tarefa <ID>`.
- **Fila**: `python .claude/scripts/taskplan.py proxima --etapa qa [--lote N] [--pular ID,ID]` (com `--paralelo N`: `--n N`, e `--lotes-distintos` quando pedido). Elegível = estado `Executada (aguarda teste)` ou
  `Em teste` (retomada), com plano, sem reserva de outra sessão. **Dependências não são checadas** (o
  código já foi executado); `BK-`/`SPK-` nunca.
- **`--tarefa <ID>`**: tarefa fora de `Executada (aguarda teste)`/`Em teste` (ainda não
  executada, já `QA ✔`, `Bloqueada`…) — explique o estado e o comando certo, e **pare**.
  Roda na `main`; com `--worktree`, em `execucao/testar-<ID>`, criada a partir da `main`.
- **Início e fim**: `iniciar <ID> <token> --etapa "Em QA"` e, no fim, `concluir <ID> <token> qa-ok`
  (ou `devolvida`). Nada de `TASK.md`/`TASKPLAN.md` na rodada; `consolidar` ao encerrar a chamada.

**Despriorizada** (`/despriorizar`) é ignorada: não entra na fila (`proxima`), e `--tarefa <ID>` sobre ela explica e **para**. Se ela já estava `Executada (aguarda teste)`, o estado anterior é preservado e volta com `/despriorizar --desfazer`.

## Ciclo da tarefa

1. **Contexto, `iniciar`** como no `executar.md` (Seções 0 e 3-0), com `--etapa "Em QA"`.
2. **Dispare `validador`** (`subagent_type: validador`, `run_in_background: false`) focado no
   chapéu QA, **só nesta tarefa**: skills `acceptance-criteria-validation`,
   `non-functional-validation`, `bug-documentation` e `qa-report-drafting`
   (`cross-platform-integration-testing` quando a tarefa tocar mais de uma plataforma). Ele
   **começa por `python .claude/scripts/taskplan.py cobertura <ID>`** (todo caso `Cn` do plano de
   teste tem teste mapeado em `## 4`? faltou = retoque imediato, sem rodar o resto) e
   **lê o `.md/.taskplan/<ID>.md`** (plano de teste e resultado da execução) e o diff da tarefa
   (`python .claude/scripts/taskplan.py diff <ID>`; se a tarefa tocou arquivo compartilhado, o diff pode
   incluir edição de outra — leia-o junto com a lista de arquivos de `## 4`), executa o plano de teste,
   valida o critério de aceite sem reinterpretá-lo, **em tarefa de tela roda ele mesmo a comparação visual**
   (`.claude/scripts/comparar-visual.mjs`, estados e tamanhos do aceite) e abre os PNGs — fora do limite ou
   divergência visível reprova —, **confere o diff contra `.claude/CONVENCOES-DE-CODIGO.md`**
   (duplicação, comentário falso ou com ID de tarefa, fronteira furada, tamanho — achado não crítico vira
   `RTP`, nunca "observação sem severidade") e **escreve o resultado em `## 5. Resultado do QA`**
   (veredito, o que foi testado, evidências, achados com severidade; `### Rodada n` em reteste), e, como
   última linha da seção, `Resumo para o relatório: <uma linha>` (o `consolidar` monta a entrada de
   `.md/QA-REPORT.md`; **o agente não edita esse arquivo**). **Não altera código da tarefa (salvo a via
   rápida, item 3) e não grava status.** Peça o
   **retorno em até 4 linhas** (APROVADA/DEVOLVIDA/BLOQUEIO, achados críticos e não críticos em
   contagem) e **não releia a seção 5**.
3. **Resultado** (`concluir`):
   - **Aprovada**: `concluir <ID> <token> qa-ok` — `Concluída · QA ✔` (estado `Testada (aguarda
     segurança)`). Não chame `/validar`.
   - **Achado crítico** (compromete o critério de aceite central, exige mudança de
     escopo/arquitetura, ou quebra algo de que outra tarefa depende): `concluir <ID> <token> devolvida
     --motivo "<resumo>"` — Status `Em andamento`, achados em `## Achados` (e na seção 5). O próximo
     `/executar` a pega. O script **conta a devolução** (Seção 3d).
   - **Achado não crítico** (ajuste pontual de baixo esforço) — três destinos, **nesta ordem**
     (detalhe em `agents/validador.md`, "Simples"):
     1. **Retoque**: achado da própria tarefa, ~30 linhas ou menos, fora de segurança, banco,
        CI/deploy e contrato público. `concluir <ID> <token> devolvida --retoque --motivo "<achados>"`
        — a tarefa volta ao Executor **sem gastar devolução** e sem RTP (`RETOQUE n de 3`; no
        `LIMITE-RETOQUE`, exit 5, siga para 2 ou 3). **Caso `Cn` do plano sem teste é sempre
        retoque.** Os achados ficam em `## 5` da rodada para o Executor corrigir só eles.
     2. **Agregar**: `taskplan.py rtp-aberta --classe <classe> --lote <X>` devolveu uma RTP ainda
        não iniciada — acrescente o item ao plano dela (execução e teste) e `qa-ok`.
     3. **RTP nova**: `qa-ok` e o `validador` abre uma **`RTP-0000`** (`executar.md`, Seção 5a:
        linha no `TASK.md` + arquivo em `.md/.taskplan/` + `taskplan.py classe <RTP> <classe>`),
        conferida com `taskplan.py tarefa <RTP>`.
     **Quando a tarefa em teste é uma `RTP-…`, o achado nunca vira outra RTP**: dentro do escopo
     dela é retoque; fora, agrega (2) ou vai para a lista "Sem dono" do resumo final.
   - **Via rápida** (achado não crítico **sem mudança de comportamento**): o próprio `validador`
     corrige na hora em vez de abrir RTP, quando **todas** as condições valem: só formatação (rodando
     o formatador do projeto), comentário falso ou com ID de tarefa, texto de README/documentação de
     operação, ou linha/byte inválido; no máximo ~10 linhas; não toca lógica, asserção de teste,
     configuração de CI, de segurança ou de banco. Depois da correção roda de novo lint e formatação,
     registra em `## 5` a linha `Corrigido na via rápida: <o quê, arquivos>` e segue para `qa-ok`. Na
     dúvida, é RTP. (No MyMoney, cerca de 20 das 182 RTP eram desse tipo e passaram por três agentes cada.)
   - **Achado repetido**: antes de abrir uma RTP, o `validador` procura no `TASK.md` RTP da mesma
     classe (mesmo tipo de erro, outra tarefa). Na 2ª ocorrência, o retorno traz a linha
     `Padrão repetido: <classe> (RTP-x, RTP-y) → regra sugerida: <texto>`. Leve essas linhas ao
     resumo do fim: o usuário decide se a regra entra no `CONVENCOES-DE-CODIGO.md` ou na Seção 1 do
     `TASK.md`, para o Executor parar de repetir o erro.
4. **Commit** (padrão): o que o QA produziu (seção 5, RTP, correção da via rápida) com a mensagem
   `<ID>: QA aprovado|devolvido`, pelas regras de onde o código roda (na `main`;
   com `--worktree`, na worktree, integrada à `main` no fim). Com `--nocommit`, não commite.

### 3d. Limite de devoluções

No máximo **2 devoluções** por tarefa, **somando as do `/testar` e as do `/validar`** (o **retoque**
tem contador próprio — `Retoques:`, até 3 — e não entra nessa conta). O
`concluir ... devolvida` conta sozinho (linha `Devoluções:` do arquivo da tarefa): na 3ª ele **não
devolve** e responde `LIMITE` (exit 3) — aí é **bloqueio crítico** (`executar.md`, Seção 6: `bloquear`),
com o resumo do que falhou em cada volta. Tarefa bloqueada aqui, depois de `desbloquear`, volta à fila do
`/executar`.

**Publicação**: commit local apenas; push e espera do CI seguem a Seção 4b do `executar.md` (um push por chamada, só com autorização).

## Fim

Rode `taskplan.py consolidar` (também monta a entrada de `QA-REPORT.md` a partir da linha `Resumo para o relatório:`). Resumo curto por tarefa: veredito, achados, RTP criadas, estado agora.
No modo contínuo, o resumo final traz: aprovadas (`QA ✔`), devolvidas ao `/executar` (ID + motivo),
**retoques** (ID + n), bloqueadas, RTP abertas (com a `Classe`), achados agregados a RTP existente,
achados **"Sem dono"** (de RTP, fora do escopo e sem RTP da mesma classe para receber), correções da
via rápida, linhas `Padrão repetido` e puladas. Termine sugerindo `/validar` (e `/executar` se houve devolução ou retoque).
Nunca dispare `/deploy`.
