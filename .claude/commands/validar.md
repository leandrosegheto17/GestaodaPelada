---
description: Etapa 3 do fluxo — aciona o agente Validador no chapéu DevSecOps para validar a segurança das tarefas já testadas (estado Testada/aguarda segurança), em sequência, contra o plano de validação de segurança de .md/.taskplan/<ID>.md; grava o resultado no arquivo e no TASKPLAN. Dá o OK (Sec ✔ = tarefa Aprovada), devolve ao /executar em achado crítico ou abre RTP em achado não crítico. Não implementa nem testa e não chama outro comando. Sem argumento pega a próxima tarefa elegível; --tarefa <ID> valida só essa; --lote N e --continuar [N] [--nocontext] encadeiam as tarefas. Não dispara /deploy sozinho.
argument-hint: [vazio = próxima tarefa | --tarefa <ID> | --lote N | --continuar [N] [--nocontext]]
---

# Comando `/validar` — etapa 3: DevSecOps

A lógica do fluxo está em `.claude/EXECUTION-FLOW.md` (Comando 1) e a mecânica
comum em `.claude/commands/executar.md` — **leia o `executar.md` agora** se ainda não o
tiver em contexto (e o `testar.md`, de onde vem o limite de devoluções). Este comando é o
`/executar` com **a etapa trocada**: tudo o que está lá sobre modos (`--tarefa`, `--lote`,
`--continuar`, `--nocontext`), checagem de contexto, `taskplan.py`, reserva por sessão, onde o
código roda (worktree em `--tarefa`, `main` em `--continuar`), `PARALELISMO`, bloqueio
(Seção 6) e abertura de tarefa nova (Seção 5) vale **igual aqui**, com as diferenças abaixo.
Agente: `validador` no chapéu DevSecOps (`.claude/agents/validador.md`). **Nunca chama
`/executar` nem `/testar`.**

Argumento recebido (pode estar vazio): $ARGUMENTS

## Diferenças em relação ao `/executar`

- **Pré-requisito**: a tarefa tem de ter `QA ✔` (seção 5 aprovada) e commits com o ID.
  Sem isso, pare e sugira `/testar --tarefa <ID>`.
- **Fila**: `python .claude/scripts/taskplan.py proxima --etapa sec [--lote N] [--pular ID,ID] [--n PARALELISMO]`.
  Elegível = estado `Testada (aguarda segurança)` ou `Em validação de segurança` (retomada), com
  plano, sem reserva de outra sessão. **Dependências não são checadas**; `BK-`/`SPK-` nunca.
- **`--tarefa <ID>`**: tarefa fora desses estados (ainda sem `QA ✔`, já `Aprovada`,
  `Bloqueada`…) — explique o estado e o comando certo, e **pare**. Worktree:
  `execucao/validar-<ID>`, criada a partir da `main`.
- **Reserva e estado**: `reservar <ID> <token> --etapa "Em DevSecOps"`, depois
  `etapa <ID> <token> "Em DevSecOps"` (estado `Em validação de segurança`).

## Ciclo da tarefa

1. **Contexto, reserva e etapa** como no `executar.md` (Seções 0 e 3-0), com `"Em DevSecOps"`.
2. **Dispare `validador`** (`subagent_type: validador`, `run_in_background: false`) focado no
   chapéu DevSecOps, **só nesta tarefa**: skills `static-security-analysis`,
   `security-requirement-validation`, `sensitive-data-exposure-check`, `compliance-validation`
   (quando houver dado pessoal) e `security-report-drafting`. Ele **lê o
   `.md/.taskplan/<ID>.md`** (plano de validação de segurança, resultado da execução e do QA) e o
   diff da tarefa (`git log --grep "^<ID>"` + `git show`), executa o plano e **escreve o
   resultado em `## 6. Resultado do DevSecOps`** (veredito, o que foi verificado, achados com
   severidade; `### Rodada n` em revalidação), além de uma entrada resumida em
   `.md/SECURITY-REVIEW.md`. **Não altera código da tarefa.**
3. **Resultado**, gravado pelo `taskplan.py status <ID> "<texto>"`:
   - **OK de segurança** (sem achado alto/crítico, compliance obrigatório atendido):
     `Concluída · QA ✔ · Sec ✔` — a tarefa fica **`Aprovada`** e libera as dependentes (que o
     `/executar` passa a enxergar como elegíveis).
   - **Achado crítico** (severidade alta/crítica, ou compliance obrigatório não atendido): a
     tarefa **volta para a execução** — Status `Em andamento`, achados em `## Achados` (e na
     seção 6). O próximo `/executar` a pega e, depois, ela passa de novo por `/testar` e
     `/validar`. Conta **1 devolução**, somada às do `/testar` (limite de 2; na 3ª é bloqueio
     crítico — `testar.md`, Seção 3d).
   - **Achado não crítico** (baixa/média, débito): `Sec ✔` e o `validador` abre uma
     **`RTP-0000`** (`executar.md`, Seção 5a), conferida com `taskplan.py gerar` e `tarefa <ID>`.
4. **Commite** o que a validação produziu (seção 6, `SECURITY-REVIEW.md`, RTP) com a mensagem
   `<ID>: segurança aprovada|devolvida`, pelas regras de onde o código roda, e `liberar <ID> Livre`.

## Fim

Resumo curto por tarefa: veredito, achados, RTP criadas, estado agora. No modo contínuo, o
resumo final traz: aprovadas (`Sec ✔`), devolvidas ao `/executar` (ID + motivo), bloqueadas,
RTP abertas, puladas e **se algum lote ficou todo pronto para `/deploy`**. Termine sugerindo
`/executar` (se houve devolução ou há novas elegíveis) ou `/deploy`. Nunca dispare `/deploy`.
