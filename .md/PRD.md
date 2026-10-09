# PRD.md — MyMoney

**Status:** Aprovado pelo stakeholder em 2026-10-09, junto com o PRD-TECNICO.md (Loop A encerrado
na rodada 3). Incorpora as respostas do stakeholder às perguntas das rodadas 1 a 3 e o fluxo do
app descrito por ele. Na rodada 3 mudou a regra do crédito: as parcelas caem no vencimento do
cartão a partir do mês seguinte à compra.
**Base:** Gate 1 Aprovado com ressalvas, com adendo da rodada 2 (`.md/CTO-REVIEW.md`), e
`.md/PLANO-COMERCIAL.md`.

---

## 1. Problema e Contexto

- O casal divide as despesas da casa e também tem contas, receitas e gastos individuais.
- **Problema central:** os gastos variáveis do dia a dia (almoço, mercado, iFood e delivery)
  "estão fugindo do controle". Hoje o casal não sabe se gasta **R$ 2.000 ou R$ 6.000 por mês**
  com eles.
- **Problemas secundários:**
  - Não há visão única das despesas fixas da casa nem de quem já pagou o quê.
  - Não há orçamento com acompanhamento ("estou cumprindo?").
  - Compras parceladas comprometem meses futuros sem que ninguém veja.
  - Não há acompanhamento de metas de poupança: quanto falta, quem depositou e onde está o
    dinheiro.
- **Restrição de privacidade:**
  - Cada um vê o conjunto. Ninguém vê o individual do outro.
  - Despesa conjunta paga por um: o outro vê **que foi paga e quem pagou**. Não vê a forma de
    pagamento nem a conta usada.
- **Por que um app próprio:** customização. O desenvolvimento é hobby e não há monetização.
- **Concorrente real:** não registrar nada. O app só vence se registrar um gasto for mais fácil do
  que ignorá-lo.

### Como o stakeholder imagina o app (fala dele, rodada 2)

> "Vou entrar em um app e na tela principal tenho o resumo dos gastos conjuntos e abaixo o conjunto
> dos gastos individuais. Posso cadastrar categorias conjuntas e individuais. Posso cadastrar minhas
> contas e saldos. Posso cadastrar minhas formas de pagamento. Posso cadastrar receitas e despesas
> dentro de cada categoria. Tenho uma visão se estou cumprindo o orçamento. Tenho uma visão do
> quanto falta para minha meta."

Esse fluxo é a espinha do escopo abaixo. Orçamento e metas fazem parte dele, então são núcleo do
app, não acessório.

## 2. Público-Alvo

- **Exatamente 2 usuários:** Leandro (stakeholder) e a esposa, num único lar, sem cadastro
  público.
- **Uso:** celular **na hora do gasto** para lançar. Celular ou computador para acompanhar o mês.
- **Fora do público:** outros casais e usuários externos (descartado pelo stakeholder).

## 3. Objetivo de Sucesso

**Confirmado pelo stakeholder em 2026-10-09 (PR-01).** A métrica M2 (regularidade de lançamento)
foi removida a pedido dele.

| # | Métrica | Baseline | Meta | Como medir | Quando |
|---|---|---|---|---|---|
| M1 (principal) | **Cobertura do gasto variável** registrado no app | Desconhecido. Só a estimativa de R$ 2.000 a R$ 6.000 | O total do app fica **dentro de 10%** do valor real nos extratos e faturas | Conferência manual no fim do mês, por categoria variável. Pix e Débito: extrato do mês. Crédito: a fatura que **vence** no mês, porque as parcelas caem no vencimento do cartão (RN-14 do PRD-TECNICO.md) | **1º mês completo:** só Pix e Débito. A fatura que vence nesse mês tem compras de antes do app. **A partir do 2º mês:** conferência completa, com Pix, Débito e a fatura |
| M3 (fricção) | **Tempo para lançar um gasto variável** no celular | Não se aplica | Mediana de **10 s ou menos**, com no máximo **3 toques** além do valor | Cronometragem de 10 lançamentos reais por usuário | 1ª semana de uso |
| M4 (resultado) | **Clareza:** o casal sabe quanto gastou de variável no mês, e em quê | "Entre R$ 2.000 e R$ 6.000" | Um número único por mês, com quebra por categoria, que os dois reconhecem como real | Pergunta direta ao casal | Fim do mês 2 de uso |

**"Deu certo" depois de 1 a 2 meses:** M1 atingida no 1º mês (Pix e Débito) e no 2º mês
(completa), M3 na 1ª semana e M4 com um número. Se a M1 falhar porque gastos não foram lançados, a primeira ação é melhorar o lançamento
rápido.

## 4. Escopo

### Dentro do MVP

| Item | Prioridade | Justificativa |
|---|---|---|
| Acesso restrito aos 2 usuários do lar | Must | Pré-requisito de privacidade |
| **Tela principal:** resumo do mês com o bloco **Conjunto** no topo e o bloco **Meu individual** abaixo | Must | Fluxo do stakeholder. Entrega a M1 e a M4 |
| **Lançamento rápido de despesa** no celular | Must | Motor de valor nº 1 e condição de viabilidade (P1) |
| **Categorias conjuntas e individuais**, de despesa e de receita. A categoria define se o lançamento é conjunto ou individual | Must | Respostas 2 e fluxo do stakeholder |
| **Contas correntes individuais**, com saldo e ajuste de saldo | Must | "Posso cadastrar minhas contas e saldos". Não existe conta conjunta |
| **Formas de pagamento cadastráveis** e privadas (por exemplo, "Pix Nubank", "Débito Itaú", "Cartão de crédito XP"), dos tipos Pix, Débito e Crédito | Must | "Posso cadastrar minhas formas de pagamento" (resposta 6) |
| **Compra no crédito, à vista ou parcelada.** Cada parcela cai no **dia de vencimento do cartão**, a partir do mês seguinte à compra. Qualquer diferença em relação à fatura real é ajuste manual da data da parcela | Must | Respostas 6 e 3 da rodada 3. Sem isso, uma compra parcelada distorce o mês e esconde o que está comprometido nos meses seguintes |
| Receitas individuais por categoria | Must | "Receitas e despesas dentro de cada categoria" |
| Despesas fixas conjuntas recorrentes, pendente ou paga | Must | Pedido explícito |
| **Orçamento mensal por categoria**, com a visão "estou cumprindo?" e resultado do mês | Must | Fluxo do stakeholder ("tenho uma visão se estou cumprindo o orçamento") |
| **Metas de poupança** individuais e compartilhadas, com progresso (guardado × alvo, **quanto falta**), quem depositou e onde está guardado | Must | Fluxo do stakeholder ("quanto falta para minha meta") e resposta 5. Opção A confirmada |
| Editar e excluir lançamentos, inclusive a compra parcelada inteira | Must | Sem correção, a M1 não fecha |
| Instalação como PWA no Android e no iPhone | Must | Canal definido |
| Registro de pagamento do cartão de crédito (sai da conta corrente, sem fatura) | Could | **Rebaixado** para acomodar o parcelamento. O ajuste de saldo (Must) cobre a necessidade enquanto ele não existir |

### Prazo (decisão do stakeholder: opção A, confirmada em 2026-10-09)

- O stakeholder acrescentou formas de pagamento e crédito parcelado, e o fluxo dele confirma
  orçamento e metas como núcleo. Juntos, esses itens somam cerca de **12 a 20 h** às 60 a 100 h do
  plano comercial (P2).
- **Cortes aplicados, sem tocar no fluxo do stakeholder:**
  - Exportação CSV saiu do MVP.
  - O pagamento de cartão desceu para Could, coberto pelo ajuste de saldo.
  - O indicador de regularidade saiu junto com a M2.
- **MVP resultante:** cerca de **75 a 115 h**, ou seja, de 2 a 2,5 meses de hobby.
- **Decisão:** o stakeholder escolheu a **opção A**: tudo no MVP, incluindo metas, com cerca de 2
  semanas a mais. A ordem de entrega (Seção 5) põe lançamento rápido, categorias e tela principal
  primeiro, então o uso diário e a M1 começam antes de orçamento e metas ficarem prontos.

### Fora do escopo

| Item | Por que fica fora |
|---|---|
| Integração bancária ou Open Finance | Decisão do stakeholder: registro manual |
| Importação de extrato (OFX ou CSV) e leitura de nota por foto | Candidato à release 2 se a M1 falhar por falta de lançamento |
| **Fatura do cartão** (data de fechamento, composição da fatura, juros, vencimento real diferente do cadastrado) | Complexidade alta. O MVP tem só o dia de vencimento do cartão e a regra fixa "1ª parcela no vencimento do mês seguinte". Compra feita depois do fechamento real, ou qualquer outra diferença, é corrigida à mão editando a data da parcela |
| Exportação CSV | Cortada nesta rodada para acomodar o parcelamento. Release 2 |
| Acerto de contas entre o casal | Não foi pedido. A tela principal mostra quanto cada um pagou do conjunto, mas não calcula quem deve a quem |
| Conta conjunta | Não existe (resposta 7) |
| Receita conjunta | Não há conta conjunta para receber |
| Transferências entre os dois usuários | Caso de borda de privacidade (P3) |
| Dinheiro em espécie | As formas pedidas são Pix, Débito e Crédito |
| Indicador de regularidade de lançamento | Perdeu a função com a remoção da M2 |
| Investimentos, notificações push, offline completo, múltiplos lares, outras moedas, app de loja, relatórios de vários meses | Igual à rodada 1 |

## 5. Requisitos de Alto Nível Priorizados

Esforço: B = baixo, M = médio.

| # | Requisito | Prioridade | Esforço | Justificativa |
|---|---|---|---|---|
| RA-01 | Login e acesso restrito aos 2 usuários de um único lar | Must | B | Privacidade |
| RA-02 | **Lançamento rápido de despesa:** valor, categoria (define o escopo) e forma de pagamento, com padrões | Must | M | Motor nº 1. Atende M1 e M3 |
| RA-03 | **Regra de privacidade** garantida no servidor | Must | M | Restrição inegociável |
| RA-04 | Contas correntes individuais com saldo e ajuste de saldo | Must | B | Fluxo do stakeholder |
| RA-05 | Formas de pagamento cadastráveis (Pix, Débito, Crédito), privadas e ligadas a uma conta | Must | B | Fluxo do stakeholder e resposta 6 |
| RA-06 | Categorias de despesa e de receita, conjuntas e individuais, com a marca "variável" | Must | B | Fluxo do stakeholder e resposta 2 |
| RA-07 | Receitas individuais por categoria | Must | B | Fluxo do stakeholder |
| RA-08 | Despesas fixas conjuntas recorrentes | Must | M | Pedido explícito |
| RA-09 | **Tela principal** com o bloco Conjunto e, abaixo, o bloco Meu individual | Must | M | Fluxo do stakeholder. Entrega M1 e M4 |
| RA-10 | Compra no crédito, à vista ou parcelada, com parcelas no dia de vencimento do cartão a partir do mês seguinte e ajuste manual da data de cada parcela | Must | M | Resposta 6 e rodada 3 |
| RA-11 | Editar e excluir lançamentos | Must | B | M1 |
| RA-12 | Instalação como PWA | Must | B | Canal |
| RA-13 | Orçamento mensal com a visão "estou cumprindo?" e resultado do mês | Must | M | Fluxo do stakeholder |
| RA-14 | Metas com progresso (guardado, alvo, quanto falta), aportes e onde está guardado | Must | M | Fluxo do stakeholder. Opção A confirmada |
| RA-15 | Registro de pagamento do cartão | Could | B | Rebaixado para acomodar o parcelamento |

**Ordem de entrega sugerida** (orienta o Coordenador): RA-01, RA-04, RA-05, RA-06, RA-02, RA-03,
RA-11, RA-12, RA-09. Com isso, o **uso diário começa**. Depois: RA-07, RA-08, RA-10, RA-13,
RA-14 e RA-15.

## 6. Premissas e Riscos de Produto

| # | Premissa ou risco | Situação | Dono | Prazo |
|---|---|---|---|---|
| PR-01 | O critério de sucesso é M1, M3 e M4 | **Confirmada pelo stakeholder em 2026-10-09** (M2 removida) | Stakeholder | — |
| PR-02 | Cada um lança os próprios gastos, e a **categoria define o escopo** | **Confirmada em 2026-10-09** | Stakeholder | — |
| PR-03 | Total do casal = só o conjunto. Meu total = minha parte no conjunto + meu individual, em que minha parte = o que eu registrei como pago por mim nas despesas conjuntas | **Confirmada em 2026-10-09** (I-10) | Stakeholder | — |
| PR-04 | Pix, Débito e Crédito, com parcelamento. No crédito, a 1ª parcela cai no dia de vencimento do cartão no mês seguinte à compra e as demais nos meses seguintes. Sem data de fechamento. Diferenças viram ajuste manual | **Confirmada em 2026-10-09** (I-11, regra revisada pelo stakeholder) | Stakeholder | — |
| PR-05 | Não existe conta conjunta | **Confirmada em 2026-10-09** | Stakeholder | — |
| PR-06 | Contas, formas de pagamento e categorias individuais são privadas | **Confirmada em 2026-10-09** | Stakeholder | — |
| PR-07 | Prazo: opção A (tudo no MVP, cerca de +2 semanas) | **Confirmada em 2026-10-09** | Stakeholder | — |
| R-01 | Lançar é lento e os gastos deixam de ser registrados (P1) | Risco crítico | Gestor e Coordenador | `/definir`. Medição pela M3 |
| R-02 | O escopo cresce sem fim (P2). Nesta rodada entraram formas de pagamento e parcelamento | Risco, mitigado por cortes e pela ordem de entrega | Stakeholder e Gestor | Pedido novo vai para a release 2 |
| R-03 | Casos de borda da privacidade (P3) | Mitigado pelas regras confirmadas | Gestor e stakeholder | PRD-TECNICO.md, Seção 3 |
| R-04 | Ver os números não muda o comportamento (P6) | Risco | Stakeholder | M4, no fim do mês 2 |
| R-05 | Pausa da infraestrutura gratuita (P5) | Risco | Coordenador | `/definir` |
| R-06 | "Minha parte = o que eu paguei" faz o total de quem paga mais a casa parecer maior, sem acerto de contas | **Aceito** pelo stakeholder ao confirmar a I-10 | Stakeholder | — |
| R-07 | A regra fixa "vencimento do mês seguinte" diverge da fatura real em compras feitas depois do fechamento do cartão, e as datas precisam de ajuste manual | **Aceito** pelo stakeholder ("qualquer coisa diferente disso é ajuste manual") | Stakeholder | Observar na conferência da M1 a partir do 2º mês |

## 7. Perguntas em Aberto para o Business Analyst

Todas as perguntas das rodadas 1 a 3 foram respondidas e incorporadas ao PRD-TECNICO.md. Não
restam perguntas para o Business Analyst nem premissas de produto pendentes. A dúvida que nasceu da
regra do crédito (PRD-TECNICO.md, Seção 7, I-20, despesa fixa paga no crédito) foi confirmada pelo
stakeholder em 2026-10-09 com o padrão proposto.
