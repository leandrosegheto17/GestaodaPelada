# CTO-REVIEW — Gestão da Pelada

Log de governança do Gestor (chapéu CTO). Cada seção registra um gate ou um parecer ad hoc, com data, achados e veredito. A entrada mais recente fica no topo.

---

## Guardrails — Primeira versão | 2026-10-16 | Loop C (`/definir`)

**Skill:** `guardrails-governance`. Só governança. Não é parecer sobre o SDD.md nem sobre o TASK.md, que o usuário já aprovou diretamente.

**Achados:**
- As 23 regras têm origem rastreável e uma checagem que roda na máquina.
- As 23 tarefas citadas como criadoras das checagens existem no TASK.md.
- Não há contradição com o SDD, com os ADRs vigentes nem com as ressalvas do Gate 1.
- A L-2 (`backend/scripts` → `infraestrutura/seguranca` e `aplicacao/acesso/senhas`) é uma mudança estrutural permanente e o escopo é fechado. O usuário já a aprovou.

**Veredito:** **Aprovado com ajustes** (só mecânicos). As duas entradas foram registradas no Log de Alterações do `GUARDRAILS.md`, que passa a valer.

---

## Gate 1 — Adendo | 2026-10-16 | Loop A, rodada 2

**Gatilho:** respostas do Leandro às perguntas da rodada 1. O chapéu CTO reabriu porque duas respostas mexem em ressalvas já registradas e uma cria um papel novo.

### Ressalvas alteradas

- **Ressalva 2 (TWA): revista.** A conta de desenvolvedor da Google Play já está paga, então o custo de US$ 25 deixa de existir. O briefing pede a TWA "ao mesmo tempo" e o empacotamento tem pouco esforço sobre um PWA instalável. **Decisão:** a TWA sobe de Could para **Should**, e o teste fechado começa logo depois do I1, usando o próprio grupo. A TWA **não sobe para Must** por dois motivos:
  - o PWA já cobre o Android e nenhuma métrica de sucesso depende da loja;
  - o teste fechado (12 testadores por 14 dias contínuos, Ajuda do Play Console, answer 14151465) depende da adesão de terceiros, que o projeto não controla, e não deve atrasar o início da janela de 8 semanas.

  Sem cobrança na Fase 1, não há conflito com a política de pagamentos da Play.
- **Ressalva 4 (vários grupos): ampliada.** Entra o papel único de **dono da plataforma** (Leandro, leandrosegheto17@gmail.com), acima dos admins de grupo. O dono:
  - cria e arquiva grupos;
  - define o primeiro admin, com senha aleatória de troca obrigatória;
  - mantém a situação comercial dos grupos;
  - recebe os pedidos de "esqueci a senha".

  O papel reforça a preparação para a Fase 2. Restrição estratégica registrada: o dono vê só os metadados dos grupos dos quais não é admin (PRD-TECNICO I-30), para que a Fase 2 não nasça com um superusuário que lê dados de terceiros.

### Novos pontos estratégicos (não bloqueiam)

- **Ponto único de recuperação de acesso.** Não há e-mail, por decisão do usuário. A recuperação depende de outro admin ou do dono (PR-14). Isso é aceitável na Fase 1. Na Fase 2, com vários grupos, a recuperação por e-mail deve ser reavaliada.
- **Ranking contínuo (P-05).** Vira risco social novo (PR-12): veteranos podem dominar a titularidade. Não muda o escopo; só é monitorado na janela de 8 semanas.
- **Segurança do papel de dono.** É a conta de maior privilégio. As exigências estratégicas são:
  - o papel não pode ser atribuído pela interface;
  - "esqueci a senha" não pode revelar quais e-mails existem (RNF-05).

  A análise tática fica com o Validador.

### Veredito

**Aprovado com ressalvas, mantido.** As ressalvas 1, 3, 5 e 6 seguem sem mudança. As ressalvas 2 e 4 passam a valer como descrito acima.

---

## Gate 1 — Pré-descoberta | 2026-10-16 | Loop A, rodada 1

**Insumos:** briefing de negócio (ideia original do Leandro, transcrita na íntegra no dispatch do `/planejar`) e `.md/PLANO-COMERCIAL.md` v2. O plano foi aprovado pelo usuário no `/avaliar_ideia`, rodada 2.

### Objetivo de negócio

Em uma frase: **fazer o grupo de pelada do Leandro trocar o controle de presença, a divisão de times e o caixa (hoje feitos no WhatsApp, em planilha ou caderno) por um app próprio, usado de fato por 8 semanas consecutivas.** O objetivo é verificável pelo critério de sucesso da Fase 1 do PLANO-COMERCIAL (§Veredito e §5).

A Fase 2 (abrir a outros grupos com 3 meses grátis e depois R$ 9,90 por grupo por mês) **não é objetivo desta iniciativa**. É uma opção futura, condicionada ao sucesso da Fase 1. Nesta fase entra apenas como restrição de modelagem, para que a abertura não exija retrabalho.

### Alinhamento com roadmap

**Reforça.** Não existe roadmap anterior. O PLANO-COMERCIAL é a direção estratégica vigente e define duas fases. O escopo pedido atende a Fase 1. As recomendações de modelagem do Dono preservam a opção da Fase 2 a custo baixo:
- todo dado pertence a um grupo;
- admins são vinculados ao grupo;
- o grupo tem um campo de situação comercial, sem lógica de cobrança;
- os pesos de pontuação são configurados por grupo.

Nada no escopo compete com essa direção.

### Plausibilidade de orçamento/prazo

Esta é uma sinalização, não uma estimativa (a estimativa é da `capacity-and-timeline-validation`, com o TASK.md em mãos).

- **Caixa:** sem conflito. A Fase 1 custa de R$ 0 a R$ 180 no total, e o desenvolvimento é hobby, com custo de oportunidade declarado como zero pelo usuário.
- **Prazo:** não há prazo de negócio declarado. O risco real é outro: o escopo é largo para horas de lazer. São 5 módulos (ranking, PDF, administração, simulador e financeiro), mais isolamento por grupo e mais PWA e TWA. Se tudo for entregue de uma vez, o grupo pode esperar meses pela primeira versão útil, e o hábito de planilha se mantém.
- **Mitigação, aplicada no PRD.md §4-5:**
  - liberar em incrementos, começando pelo núcleo (cadastros, lançamento de partida e ranking);
  - em seguida, o simulador e o PDF;
  - depois, o financeiro;
  - a TWA (Play Store) fica por último e só se o usuário confirmar.
- O relógio das 8 semanas só começa quando os itens Must estiverem no ar.

### Gap de roster

**Nenhum gap de papel identificado.** Cobertura por tipo de trabalho:
- PWA instalável e empacotamento TWA: Executor, chapéu Mobile/Frontend.
- Geração de PDF de uma página: Executor.
- Heurística de balanceamento de times: Coordenador desenha, Executor implementa. É um problema de otimização pequeno (até cerca de 40 jogadores), e não exige papel de ML.
- Autenticação de admin e isolamento por grupo: Coordenador e Validador (DevSecOps).
- Pesquisa de concorrência e preço: Dono, já feita.

Ponto de atenção, que não é gap: **não há papel de pesquisa com usuário**. A validação social dos pesos de pontuação com o grupo (o maior risco da Fase 1, segundo o pressure-test do Dono) fica com o próprio Leandro, como stakeholder. Isso está registrado como premissa com dono e prazo no PRD.md §6.

### Achados que viram ressalvas

1. **Risco social antes do técnico.** O ranking com pontos pode gerar atrito no grupo (PLANO-COMERCIAL §5, premissa 2). Os pesos de chuva, lesão e expulsão e o desempate por idade devem ser apresentados ao grupo **antes** de o módulo de ranking ser construído. Dono: Leandro.
2. **A TWA entra como Could, não como Must.** A ideia original pede PWA e TWA "ao mesmo tempo". O PWA já atende iPhone e Android, sem custo e sem loja. A TWA exige:
   - taxa de US$ 25;
   - teste fechado com 12 testadores por 14 dias contínuos para conta pessoal nova (Ajuda do Play Console, answer/14151465).

   Mantenho a TWA no escopo da Fase 1 como último incremento, condicionada à confirmação do usuário (PRD.md §7, pergunta aberta). O usuário pode inverter essa decisão.
3. **A cobrança do app fica fora da Fase 1.** Ficam fora:
   - trial, gateway e controle de inadimplência do app;
   - cadastro self-service de grupos por terceiros;
   - termos e política de privacidade completos.

   O módulo Financeiro do briefing é o **caixa da pelada** (quem pagou a quadra), não a cobrança do app. Os dois não podem se confundir no PRD nem na modelagem.
4. **Modelagem preparada para vários grupos desde a Fase 1** (restrição de produto, não decisão de arquitetura):
   - isolamento de todo dado por grupo;
   - admins por grupo;
   - campo de situação comercial do grupo sem lógica associada;
   - pesos por grupo.

   Como implementar isso é decisão do Coordenador no SDD.md.
5. **LGPD em nível estratégico.** Na Fase 1, o tratamento é feito por pessoa natural para fins particulares e não econômicos, o que tende a cair na exclusão do art. 4º, I, da Lei 13.709/2018. A Fase 2, com cobrança, sai dessa exclusão. Por isso, desde já:
   - minimizar dados;
   - não expor telefone, ano de nascimento nem notas de habilidade na visão pública;
   - preparar a política de privacidade antes da Fase 2.

   A análise tática fica com o Validador (DevSecOps).
6. **Ambiguidades do briefing não são decididas em silêncio.** São elas:
   - semântica de "habilidades";
   - base do ranking usada pelo simulador;
   - senha única ou login por admin;
   - ranking público sem login;
   - outras listadas no PRD.md §7.

   Todas estão registradas como pergunta aberta (PRD.md §7) ou como interpretação provisória (PRD-TECNICO.md §7), à espera da confirmação do usuário.

### Checklist do Gate 1

- [x] Objetivo de negócio declarado explicitamente: uso real por 8 semanas consecutivas, com critério observável.
- [x] Hipótese de alinhamento com roadmap e orçamento: reforça. O caixa é compatível e não há prazo declarado.
- [x] Nenhum gap óbvio de capacidade para o tipo de projeto. O risco de prazo, por ser hobby, é mitigado com entrega incremental.
- [x] PLANO-COMERCIAL.md presente e aprovado. Não há ressalva de Loop 0 ausente.

### Veredito

**Aprovado com ressalvas** (as 6 acima). Os chapéus PM e BA estão liberados para produzir o rascunho de `PRD.md` e `PRD-TECNICO.md` nesta mesma rodada.
