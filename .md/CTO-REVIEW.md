# CTO-REVIEW.md

Log de governança do Gestor (chapéu CTO). Uma seção por gate ou parecer ad hoc, a mais recente no topo.

---

## Gate 1 — Adendo (rodada 2 do Loop A) — 2026-10-09

**Motivo:** o stakeholder respondeu às 8 perguntas, acrescentou escopo antes de o PRD fechar
(formas de pagamento cadastráveis e parcelamento no crédito) e descreveu o fluxo do app, em que
orçamento e metas aparecem como núcleo.

- **Veredito do Gate 1: mantido como Aprovado com ressalvas.** O objetivo de negócio e o
  alinhamento não mudaram.
- **Ressalva 2 (escopo fechado): mantida.** O acréscimo é legítimo, porque veio do próprio
  stakeholder antes do fechamento do PRD.
  - **Compensação aplicada sem tocar no fluxo dele:** a exportação CSV saiu, o pagamento de
    cartão virou Could (coberto pelo ajuste de saldo) e o indicador de regularidade saiu com a M2.
  - **Saldo:** o MVP estimado sobe de 60 a 100 h para cerca de 75 a 115 h, ou seja, de 2 a 2,5
    meses de hobby.
  - O chapéu CTO **não** rebaixou orçamento nem metas por conta própria. Apresentou o trade-off ao
    stakeholder: **opção A** (recomendada), tudo no MVP com cerca de +2 semanas e uso diário
    começando antes pela ordem de entrega; **opção B**, metas na release 1.1. **Rodada 3: o
    stakeholder escolheu a opção A** (PR-07, confirmada em 2026-10-09). O novo prazo-alvo do MVP é
    de cerca de 2 a 2,5 meses.
  - **Rodada 3, regra do crédito:** as parcelas caem no vencimento do cartão a partir do mês
    seguinte à compra, sem data de fechamento, e diferenças são ajuste manual. A complexidade fica
    equivalente à da regra anterior: entram o dia de vencimento no cartão e a edição da data de
    cada parcela, e a fatura continua fora. Sem impacto relevante no prazo.
  - **Plausibilidade:** continua plausível, porque não há prazo externo. O risco P2 sobe um pouco
    e fica mitigado pela ordem de entrega.
- **Ressalva 5 (critério de sucesso e classificação dos variáveis): resolvida.** M1, M3 e M4
  foram confirmadas (M2 removida) e a categoria define o escopo.
- **Ressalva 3 (privacidade): reforçada.** Formas de pagamento passam a ser cadastro privado, e o
  outro membro não vê a forma nem a conta de uma despesa conjunta.
- **Ressalvas 1, 4, 6 e 7:** sem mudança.

---

## Gate 1 — Pré-descoberta — 2026-10-09

**Insumos:** ideia inicial do stakeholder (briefing verbatim no `/planejar`), respostas do Loop 0 e
`.md/PLANO-COMERCIAL.md` (aprovado em 2026-10-09, rodada 2 do Loop 0).
**Skill:** `tech-strategy-review`. As skills `the-fool` e `the-jury` não foram usadas: não há decisão
contestada de alto custo. O custo em dinheiro é perto de zero e a única aposta é o tempo de hobby.

### Objetivo de negócio

Em uma frase: **dar ao casal, em até 2 meses de uso, o total real e confiável do que gasta por mês
com gastos variáveis do dia a dia (almoço, mercado, delivery), sem expor as finanças individuais de
um ao outro.** As despesas fixas da casa, o orçamento mensal e as metas de poupança completam esse
objetivo, mas não o substituem.

O objetivo é verificável: hoje o casal estima o gasto variável entre R$ 2.000 e R$ 6.000 por mês.
Depois de um mês fechado de uso, o app tem que mostrar um número, e esse número tem que bater com
os extratos e as faturas (critério detalhado no PRD.md, Seção 3).

### Alinhamento com roadmap

**Reforça.** Não existe roadmap de empresa. O "roadmap" é a necessidade do próprio casal, e o
plano comercial já descartou monetização e abertura para outros casais. A proposta é exatamente
o motor de valor nº 1 do PLANO-COMERCIAL.md (visibilidade dos gastos variáveis). Os motores 2 a 4
(customização, privacidade, orçamento e metas) também estão cobertos.

### Plausibilidade de orçamento e prazo

- **Orçamento:** plausível. Custo de R$ 0 a R$ 40 por ano com Supabase Free, Vercel Hobby e GitHub
  (PLANO-COMERCIAL.md, Seção 6).
- **Prazo:** plausível **com ressalva**. O plano supõe um MVP utilizável em cerca de 2 meses de
  hobby, de 60 a 100 h (P2). Isso só cabe se o MVP for enxuto: lançamento rápido, despesas fixas
  conjuntas, receitas, visão conjunto/individual e orçamento. Metas entram por último e são o
  primeiro corte se o prazo apertar. Não há prazo externo nem restrição de negócio com data.
- **Sinal de risco:** o app é customizável e não tem prazo, então o escopo pode crescer sem fim
  (R2). O PRD.md tem que ter cortes explícitos.

### Gap de roster

**Nenhum.** O app é web, instalável como PWA, com backend gerenciado (Supabase) e hospedagem na
Vercel. Os papéis cobrem o projeto: o Coordenador cuida de arquitetura e UX, o Executor de
backend, frontend e PWA (chapéu Mobile), e o Validador de QA, segurança e deploy. Não há IA,
integração bancária nem app nativo de loja.

### Ressalvas (condicionam a aprovação)

1. **R1/P1, adesão ao lançamento manual (crítica).** O lançamento rápido de um gasto pelo celular
   é requisito **obrigatório** do MVP, com meta mensurável (RNF no PRD-TECNICO.md). Se o
   `/definir` não conseguir atender, o Coordenador registra um bloqueio. Não pode virar
   "melhoria futura".
2. **R2/P2, escopo de hobby.** O MVP tem cortes explícitos no PRD.md (Seção 4). Toda
   funcionalidade nova que vier depois da aprovação do PRD entra numa release seguinte, não no
   MVP.
3. **R3/P3, privacidade.** O isolamento entre individual e conjunto é requisito de **servidor e
   dados**, não só de tela. O detalhamento dos casos de borda está no PRD-TECNICO.md, Seção 3, e
   tem perguntas abertas ao stakeholder.
4. **R5/P5, pausa do Supabase Free.** Fica registrado como restrição e dependência para o
   `/definir`. A mitigação pode usar o servidor próprio ou a Cloudflare do casal. O Gestor não
   decide a arquitetura.
5. **Critério de sucesso e classificação dos gastos variáveis.** O Dono deixou essas duas
   perguntas em aberto. Estão resolvidas como **premissas explícitas** no PRD.md (Seção 3 e PR-02)
   e precisam da confirmação do stakeholder na aprovação do Loop A.
6. **Limpeza dos ambientes (Supabase, Vercel, GitHub).** O stakeholder autorizou começar do zero.
   Mesmo assim, apagar recursos existentes é ação destrutiva e irreversível. Ela só acontece na
   fase de execução, como tarefa explícita do TASK.md e com confirmação do usuário no momento.
   Nenhum agente limpa ambiente durante o planejamento.
7. **LGPD.** O uso é estritamente pessoal e doméstico, sem fim econômico. Pelo art. 4º, I, da Lei
   13.709/2018, esse tratamento fica fora da LGPD. Mesmo assim, os dados financeiros são
   sensíveis para os dois usuários. Por isso valem como requisito o isolamento, o acesso restrito
   aos 2 usuários e os segredos fora do repositório (RNF de segurança).

### Veredito

**Aprovado com ressalvas.** O objetivo é explícito e mensurável, o custo é perto de zero, não
falta nenhum papel no roster e o alinhamento com o plano comercial é direto. As ressalvas 1 a 7
acompanham o PRD.md e o PRD-TECNICO.md. Os chapéus PM e BA estão liberados.
