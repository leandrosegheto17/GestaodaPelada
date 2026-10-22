---
description: Orquestra o ciclo completo sem supervisão (pensado para rodar à noite) — leva cada tarefa (ou grupo de N com --paralelo) por /executar → /testar → /validar até ser aprovada ou bloqueada, antes de começar a próxima (passada vertical; devoluções e retoques voltam ao Executor no mesmo ciclo), e repete até as filas acabarem ou ficarem travadas por bloqueios que dependem de você. Ao esvaziar as filas roda o /revisar (até 2 vezes por chamada) e, se ele abrir RTP, faz nova passada. Sem --continuar faz uma única passada. Com --por-etapa usa o modo antigo (todas as execuções, depois todos os testes, depois todas as validações). Repassa --nocontext, --nocommit, --paralelo e --lotes-distintos às etapas. Não dispara /deploy.
argument-hint: [--continuar] [--nocontext] [--nocommit] [--paralelo [N]] [--lotes-distintos] [--rodadas N] [--por-etapa]
---

# Comando `/desenvolver` — executar → testar → validar, tarefa a tarefa

Ao esvaziar as filas, ele também roda o `/revisar` (revisão de arquitetura do projeto inteiro) e, se a revisão
abrir `RTP`, volta a executar — ver Seção 3, item 5.

Este comando é o **único** que encadeia os outros três (`/executar`, `/testar`, `/validar` continuam sem
chamar um ao outro). Ele não implementa, testa nem audita nada por conta própria: só decide **qual etapa
rodar agora**, chama o comando daquela etapa e confere, pelo estado das filas, se houve progresso.

Argumento recebido (pode estar vazio): $ARGUMENTS

## 1. Argumentos

- **`--continuar`**: repete passadas (executar → testar → validar) até parar (Seção 3). **Sem ele**, faz uma
  única passada e para.
- **`--nocontext`**: repassado às etapas — sem teto de contexto (indicado para rodar a noite toda). Sem ele,
  vale o teto de 250 mil tokens: ao cruzá-lo o comando **para entre etapas**, grava tudo e devolve o relatório
  (o estado está em disco: basta rodar de novo numa sessão nova e ele continua de onde parou).
- **`--nocommit`**, **`--paralelo [N]`**, **`--lotes-distintos`**: repassados às etapas, com o mesmo
  significado e as mesmas restrições do `/executar` (ver `/comandos`).
- **`--rodadas N`**: teto opcional de passadas (padrão: sem teto; a parada por falta de progresso basta).
- **`--por-etapa`**: usa o modo antigo (todas as execuções, depois todos os testes, depois todas as
  validações) em vez da passada vertical por tarefa (Seção 3).

Argumento desconhecido: mostre as opções e **pare**. Nunca pergunte nada ao usuário durante o ciclo — ele
não está presente; onde os comandos das etapas perguntariam (ex.: assumir reserva velha, retomar bloqueada),
**pule** a tarefa e registre no relatório final.

## 2. Pré-requisitos

Os mesmos do `/executar` (Seção 0 de `commands/executar.md`): repositório git, `SDD.md`, `UX-SPEC.md`,
`TASK.md`, `GUARDRAILS.md` e `TASKPLAN.md` existindo. Falhou → **pare** com o motivo. A checagem de contexto
(item 0) vale para este comando, salvo `--nocontext`, e é repetida **antes de cada etapa**.

## 3. O ciclo

O estado das filas vem de **uma chamada** barata, que não lê o `TASK.md`:

`python .claude/scripts/taskplan.py fila`

→ `FILA exe=N qa=N sec=N | bloqueadas=… despriorizadas=… bk_spk_abertos=… reservadas=… sem_plano=… | aprovadas=… total=… | estado=<hash>`

(`exe`/`qa`/`sec` = tarefas elegíveis agora para `/executar`, `/testar` e `/validar`; `estado` = impressão
digital de todas as tarefas: se não muda, nada andou.)

**Uma passada vertical** (padrão) — cada tarefa (ou grupo de N com `--paralelo N`) percorre
**executar → testar → validar até ser aprovada ou bloqueada, antes de a próxima começar**. O contexto
da tarefa ainda está quente quando o QA ou o Sec acham algo, e o conserto acontece no mesmo ciclo:

1. Rode `fila`. Monte o **grupo G**: `python .claude/scripts/taskplan.py proxima --etapa exe --n N
   [--lotes-distintos]` (N = o valor de `--paralelo`, ou 1). As tarefas do grupo já têm dependências
   `Aprovada`, então não dependem umas das outras. `NENHUMA` → passe ao item 4.
2. **Ciclo do grupo** (repita até o grupo se esgotar ou travar):
   1. `/executar --tarefas G` (mais os repasses). Ele pega as do grupo ainda elegíveis: novas e as
      devolvidas/retocadas.
   2. `/testar --tarefas G`. Achado crítico devolve; achado pequeno vira **retoque**; ambos voltam à
      etapa 2.1 na mesma volta, sem passar pela fila geral.
   3. `/validar --tarefas G`, com a profundidade pelo risco da tarefa. Devolução ou retoque volta à 2.1.
   4. Confira: `proxima --etapa exe|qa|sec --apenas G` (as três). Se **todas** derem `NENHUMA`, o grupo
      acabou (cada tarefa está `Aprovada`, `Bloqueada` ou no limite de devoluções, que já virou
      bloqueio). Se ainda houver elegível e o `estado` (`fila`) **não mudou** desde o início da volta,
      o grupo está **travado**: anote o motivo e saia do ciclo. No máximo **6 voltas** por grupo
      (2 devoluções + 3 retoques + a final).
3. Volte ao item 1 para o próximo grupo (nova checagem de contexto, salvo `--nocontext`). O
   `estado` de `fila` comparado ao do início da **passada** diz se houve progresso.
4. **Resíduo**: com a fila `exe` vazia, ainda pode haver `qa>0` ou `sec>0` (tarefas deixadas por
   rodadas manuais ou interrompidas). Rode `/testar --continuar` e depois `/validar --continuar`
   (com os repasses) para drená-las; se uma devolução reabrir `exe`, volte ao item 1.
5. Fim da passada: rode `fila`.
   - **Todas as contagens = 0** → filas vazias: antes de parar, rode **`/revisar`** (pela
     ferramenta Skill, com `--nocommit` se esse foi um dos repasses), **no máximo 2 vezes
     por chamada do `/desenvolver`**. Se a revisão abriu `RTP`, a fila de execução volta
     a ter tarefas: comece nova passada (mesmo sem `--continuar`, já que é a continuação
     do mesmo trabalho). Se não abriu nenhuma `RTP`, ou o limite de 2 revisões foi
     atingido, **pare** (Seção 4).
   - **`estado` igual ao do início da passada** → sem progresso: **pare**.
   - **Sem `--continuar`** → **pare** depois desta passada.
   - **`--rodadas N` atingido** → **pare**.
   - Caso contrário, comece **nova passada**.

**`--por-etapa`** (modo antigo, para quando o paralelismo por etapa convém — por exemplo `--paralelo 20`
numa fila grande e independente): a passada roda as etapas **`exe` → `qa` → `sec`** em bloco. Para cada
uma: rode `fila`; contagem **0** → pule; senão chame o comando com `--continuar` mais os repasses
(`/executar --continuar --nocontext --paralelo 10`); ao voltar, rode `fila` de novo — contagem > 0 com
`estado` igual = etapa **travada** (anote o motivo e passe à próxima); `estado` mudou = progresso, repita.
O fim da passada é o mesmo do item 5. Devoluções só voltam ao QA na passada seguinte, por isso este modo
é mais lento para fechar tarefas e mais propenso a contexto frio.

**Skills**: carregue cada skill uma vez por sessão; nas voltas seguintes, siga de novo as instruções já
carregadas em vez de invocar a Skill outra vez (só invoque de novo se o contexto tiver sido compactado e
as instruções sumido).

**Entre etapas** mantenha o contexto enxuto: guarde só o resumo de 2–3 linhas que cada etapa devolveu (o
que fechou, devolveu, bloqueou). Não reimprima listas.

**Bloqueios** não interrompem o ciclo: cada etapa já os registra (`BK-`/`SPK-` + tarefa `Bloqueada`) e segue.
O ciclo só termina por filas vazias, falta de progresso, `--rodadas`, teto de contexto ou falha que atinge todas
as tarefas (git quebrado, suíte de testes quebrada de forma geral, ambiente indisponível) — neste último caso
**pare** na hora e diga qual foi.

**Publicação**: as etapas só commitam localmente (`executar.md`, Seção 4b). Não dê push entre elas; ao fim da rodada (ou do lote), peça autorização ao usuário para um único push e acompanhe o CI até ficar verde.

## 4. Relatório final

Rode `python .claude/scripts/taskplan.py consolidar` e depois `python .claude/scripts/taskplan.py fila
--bloqueios`. Entregue, curto:

- **Por que parou**: filas vazias · sem progresso · `--rodadas` · teto de contexto · falha de ambiente.
- **Balanço**: passadas feitas e, somando as etapas, quantas tarefas foram executadas, aprovadas em QA, aprovadas
  em Sec (`Aprovada`, das quais quantas pelo nível leve), devolvidas, **retocadas**, bloqueadas e quantas RTP foram
  abertas ou agregadas; `aprovadas` antes → depois.
- **Causa do retrabalho**: rode `python .claude/scripts/taskplan.py classes` e traga a contagem de RTP por `Classe`.
- **Sem dono**: achados de RTP fora do escopo que não couberam em nenhuma RTP aberta (listados pelo `/testar`
  e `/validar`), para você decidir.
- **Revisão de arquitetura**: quantas vezes o `/revisar` rodou, `RTP`/`BK` que ele abriu e se ainda há
  achado Alto aberto (que segura o `/deploy`).
- **O que depende de você**: os `BK-`/`SPK-` abertos (ID + o que fazer, uma linha cada) e as tarefas
  `Bloqueada` que eles seguram. Trate com `/executar --tarefa BK-nnnn`.
- **Despriorizadas**: quantas (`despriorizadas=`) e quais (`fila --bloqueios` as lista); o ciclo as ignora e o `/deploy` só as lista (não bloqueiam).
- **Travado por outro motivo**: etapas marcadas como travadas (com o motivo), reservas (`reservadas`; as com
  mais de 2 h de idade podem ser de uma sessão interrompida — `/executar --tarefa <ID>` oferece assumi-las) e
  tarefas sem plano (rode `/organizar`).
- **Sem commit**: se usou `--nocommit`, lembre que as alterações estão acumuladas na `main` para você commitar.
- **Próximo passo**: `/listar`, e `/deploy` se algum lote ficou todo pronto.

Nunca dispare `/deploy`, `/organizar` nem qualquer outro comando além dos três e do `/revisar`. Tarefa com
exemplos de domínio pendentes (`aguarda exemplos de domínio`) fica fora da fila: liste-a no relatório para o
usuário aprovar com `taskplan.py dominio <ID> --aprovar`.
