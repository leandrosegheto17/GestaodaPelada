---
description: Etapa 2 do fluxo — aciona o agente Validador no chapéu QA para testar as tarefas já executadas (estado Executada/aguarda teste), em sequência, contra o plano de teste e o critério de aceite de .md/.taskplan/<ID>.md; grava o resultado no arquivo e no TASKPLAN. Aprova (QA ✔), devolve ao /executar em achado crítico ou abre RTP em achado não crítico. Não implementa nem valida segurança e não chama outro comando. Sem argumento pega a próxima tarefa elegível; --tarefa <ID> testa só essa; --lote N e --continuar [N] [--nocontext] encadeiam as tarefas. Não dispara /deploy sozinho.
argument-hint: [vazio = próxima tarefa | --tarefa <ID> | --lote N | --continuar [N] [--nocontext]]
---

# Comando `/testar` — etapa 2: QA

A lógica do fluxo está em `.claude/EXECUTION-FLOW.md` (Comando 1) e a mecânica
comum em `.claude/commands/executar.md` — **leia o `executar.md` agora** se ainda não o
tiver em contexto. Este comando é o `/executar` com **a etapa trocada**: tudo o que está
lá sobre modos (`--tarefa`, `--lote`, `--continuar`, `--nocontext`), checagem de contexto,
`taskplan.py`, reserva por sessão, onde o código roda (worktree em `--tarefa`, `main` em
`--continuar`), `PARALELISMO`, bloqueio (Seção 6) e abertura de tarefa nova (Seção 5)
vale **igual aqui**, com as diferenças abaixo. Agente: `validador` no chapéu QA
(`.claude/agents/validador.md`). **Nunca chama `/executar` nem `/validar`.**

Argumento recebido (pode estar vazio): $ARGUMENTS

## Diferenças em relação ao `/executar`

- **Pré-requisito**: a tarefa tem de ter o resultado da execução em
  `## 4. Resultado da execução` e ao menos um commit com o ID (`git log --grep "^<ID>"`).
  Sem isso, pare e sugira `/executar --tarefa <ID>`.
- **Fila**: `python .claude/scripts/taskplan.py proxima --etapa qa [--lote N] [--pular ID,ID] [--n PARALELISMO]`.
  Elegível = estado `Executada (aguarda teste)` ou `Em teste` (retomada), com plano, sem reserva de
  outra sessão. **Dependências não são checadas** (o código já foi executado); `BK-`/`SPK-` nunca.
- **`--tarefa <ID>`**: tarefa fora de `Executada (aguarda teste)`/`Em teste` (ainda não
  executada, já `QA ✔`, `Bloqueada`…) — explique o estado e o comando certo, e **pare**.
  Worktree: `execucao/testar-<ID>`, criada a partir da `main`.
- **Reserva e estado**: `reservar <ID> <token> --etapa "Em QA"`, depois
  `etapa <ID> <token> "Em QA"` (estado `Em teste`).

## Ciclo da tarefa

1. **Contexto, reserva e etapa** como no `executar.md` (Seções 0 e 3-0), com `"Em QA"`.
2. **Dispare `validador`** (`subagent_type: validador`, `run_in_background: false`) focado no
   chapéu QA, **só nesta tarefa**: skills `acceptance-criteria-validation`,
   `non-functional-validation`, `bug-documentation` e `qa-report-drafting`
   (`cross-platform-integration-testing` quando a tarefa tocar mais de uma plataforma). Ele
   **lê o `.md/.taskplan/<ID>.md`** (plano de teste e resultado da execução) e o diff da tarefa
   (`git log --grep "^<ID>"` + `git show`), executa o plano de teste, valida o critério de aceite
   sem reinterpretá-lo e **escreve o resultado em `## 5. Resultado do QA`** (veredito, o que foi
   testado, evidências, achados com severidade; `### Rodada n` em reteste), além de uma entrada
   resumida em `.md/QA-REPORT.md`. **Não altera código da tarefa.**
3. **Resultado**, gravado pelo `taskplan.py status <ID> "<texto>"`:
   - **Aprovada**: `Concluída · QA ✔` (estado `Testada (aguarda segurança)`). Não chame `/validar`.
   - **Achado crítico** (compromete o critério de aceite central, exige mudança de
     escopo/arquitetura, ou quebra algo de que outra tarefa depende): a tarefa **volta para a
     execução** — Status `Em andamento`, achados em `## Achados` (e na seção 5). O próximo
     `/executar` a pega. Conta **1 devolução** (Seção 3d).
   - **Achado não crítico** (ajuste pontual de baixo esforço): **não volta** — `QA ✔` e o
     `validador` abre uma **`RTP-0000`** (`executar.md`, Seção 5a: linha no `TASK.md` + arquivo
     em `.md/.taskplan/`), conferida com `taskplan.py gerar` e `tarefa <ID>`.
4. **Commite** o que o QA produziu (seção 5, `QA-REPORT.md`, RTP) com a mensagem
   `<ID>: QA aprovado|devolvido`, pelas regras de onde o código roda (em `--continuar`, na `main`;
   em `--tarefa`, na worktree, integrada à `main` no fim), e `liberar <ID> Livre`.

### 3d. Limite de devoluções

No máximo **2 devoluções** por tarefa, **somando as do `/testar` e as do `/validar`**
(contagem em `## Achados`, uma linha por devolução com a origem). Na 3ª, em vez de devolver
é **bloqueio crítico** (`executar.md`, Seção 6), com o resumo do que falhou em cada volta.
Tarefa bloqueada aqui, depois de `desbloquear`, volta à fila do `/executar`.

## Fim

Resumo curto por tarefa: veredito, achados, RTP criadas, estado agora. No modo contínuo, o
resumo final traz: aprovadas (`QA ✔`), devolvidas ao `/executar` (ID + motivo), bloqueadas,
RTP abertas e puladas. Termine sugerindo `/validar` (e `/executar` se houve devolução).
Nunca dispare `/deploy`.
