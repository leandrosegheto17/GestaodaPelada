# CTO-REVIEW — Gestão da Pelada

Log de governança do Gestor (chapéu CTO). Cada seção registra um gate ou um parecer ad hoc, com data, achados e veredito. A entrada mais recente fica no topo.

---

## Gate 1 — Reabertura pontual "Datas de saída e de retorno do jogador" | 2026-10-21 | `/planejar` rodada 1

**Escopo do gate:** só esta demanda. Correção interna, sem impacto comercial (PLANO-COMERCIAL.md não muda; nenhum conflito com preço ou canal). Projeto só com produção, uso pessoal (ADR-020).

**Objetivo de negócio:** o admin registrar retorno retroativo e corrigir saída/retorno já registrados, para o ranking, o lançamento de partidas e a edição da data de início (RA-18) refletirem a realidade (caso real: jogador voltou antes de 20/10/2026 mas consta "ativo desde 20/10").

**Achados:**
- Alinhado ao produto: reaproveita o diálogo de prévia e a auditoria da RA-18; nada é apagado.
- **Fato técnico verificado no código:** `acumuladoPorInicio` não olha períodos; a correção de períodos muda aparência (falta/"–"), linhas do ranking e disponibilidade no lançamento, simulador e financeiro, e não muda pontos sozinha. Por isso o PRD registra a expectativa como risco (PR-22) e a prévia explica o efeito.
- Sem gap de capacidade: mudança aditiva em domínio, contrato e aplicação, sem migração obrigatória; compatível com G-05, G-14, G-20 e G-25 (acumulado só pela função única). Sem exceção em GUARDRAILS.md.
- Privacidade: lista de períodos e auditoria só para admins (RNF-06, G-10). Risco de segurança: validação no servidor, transação com trava, sem 500 (RNF-14); revisão tática com o Validador.
- Custo/prazo: pequeno; sem recurso novo (G-13).

**Decisões de produto do Gestor (P-43 a P-45, revogáveis pelo usuário):** antecipar o retorno não cria pontos sozinho; presença que ficaria fora do período bloqueia a correção; qualquer admin do grupo corrige.

**Ressalvas:** (1) deploy só pelo `deploy.yml` com backup (G-15); (2) teste de regressão: acumulado idêntico antes e depois de correção sem presença lançada; (3) conferência do Leandro com o caso real.

**Veredito: Aprovado com ressalvas.** Libera os chapéus PM/BA (feitos) e o `/definir` desta demanda. Nenhum bloqueio aberto.

---

## Gate 4 — Fechamento do deploy em produção | 2026-10-21

**Natureza:** registro de fechamento, sem poder de veto. O deploy já aconteceu.

**Deploy:** run `deploy` 39652858822 (disparo manual a partir da main, commit `83909c5b`). **Sucesso** em todos os passos: build do web, branch de restauração no Neon, dump cifrado, migração, conferência do cache do Hyperdrive, deploy e saúde. O passo de rollback foi pulado (não acionado).

**Verificação passiva no host** `https://pelada.prod-ljs.workers.dev`:
- `GET /api/saude` retornou `{"ok":true}`, com `Cache-Control: no-store` e `X-Content-Type-Options: nosniff`.
- `/` com CSP, nosniff e referrer-policy.

**Conteúdo publicado:** TP-0209 (data de início da pontuação do jogador, blocos A–F; migração `202610201000_inicio_pontuacao`), todas as tarefas com QA ✔ · Sec ✔.

**Revisão de arquitetura 2026-10-21:** sem achado Alto. RTP-0183, RTP-0184 e BK-0014 abertos como débito/decisão.

**Auditoria de segurança de release 2026-10-21:** **APROVADA COM DÉBITO** (RTP-0185, Baixa). Risco aceito pelo usuário: limite de taxa da Cloudflare e cabeçalhos no host publicado não testados localmente; conferência passiva feita após o deploy (cabeçalhos ok; o limite de taxa segue sem prova executada).

**Fora da publicação:** TP-0140 a TP-0144 (TWA/Play, despriorizadas).

**Registro:** Deploy fechado e registrado. Nenhum bloqueio novo.

---

## Guardrails — G-25 (acumulado só pela função única do domínio) | 2026-10-20

Proposta do Coordenador (lote L47 / TP-0209, aprovado pelo usuário). Regra clara, verificável (ESLint + teste de rotas, ambos criados na TP-0209) e sem conflito com G-05, G-14, G-20 ou o ADR-023. Ajuste de redação: a criação do jogador (S = início do 1º período) e as migrações também gravam `inicio_pontuacao`, além do `PUT …/inicio`. **Veredito: Aprovado com ajuste de redação.** Gravada em `GUARDRAILS.md` com entrada no Log de Alterações. Sem renumeração.

---

## Gate 1 — Demanda pontual "Data de início do jogador" | 2026-10-20 | `/planejar --tarefa`

**Escopo do gate:** só esta demanda. Sem impacto comercial (PLANO-COMERCIAL.md não muda). Projeto só com produção, uso pessoal (ADR-020).

**Objetivo de negócio:** permitir que um jogador que saiu ou foi punido por faltas volte ao grupo com a pontuação zerada, sem mexer no histórico, e corrigir o início do Vandré (20/10 para 20/09) sem alterar pontos.

**Achados:**
- Alinhado ao produto de ranking contínuo (I-35): zerar é ação explícita por jogador, não temporada (PR-12 segue como decisão futura).
- **Risco técnico/produto principal (PR-18):** o acumulado hoje ignora períodos; ligar o corte ao início do período faria todo jogador importado (período aberto em 20/10) perder o histórico. Exigido: corte separado, vazio por padrão, e teste de regressão (RNF-13).
- Sem gap de capacidade: mudança aditiva em domínio, contrato e banco, compatível com G-05, G-14 e G-20. Sem exceção em GUARDRAILS.md.
- Privacidade: auditoria e corte só para admins; público vê só pontos e "–" (G-10).
- Custo/prazo: pequeno; sem recurso novo (G-13).

**Ressalvas:** (1) as 8 decisões de produto P-33 a P-40 são do usuário, sem veto do Gestor; (2) deploy só pelo `deploy.yml` com backup (G-15); (3) conferência do Leandro no ranking real após o deploy.

**Atualização (rodada 2, mesmo dia):** o usuário respondeu P-33 (pontuação inicial também deixa de contar), P-34 (preservar histórico dos meses anteriores), P-35 (um campo só: a data de início do cadastro) e P-38 (recuar só muda quem aparece). O modelo de "corte separado" foi abandonado; o PR-18 passa a ser tratado por verificação e ajuste prévios dos dados (RF-74, RNF-13). Surgem P-41 (reconciliar "voltar a data volta a contar" com "recuar não muda pontos") e P-42 (reativar e zerar). Sem mudança de veredito.

**Atualização (rodada 3):** o usuário simplificou a regra (reativar só devolve visibilidade; o ranking conta apenas as presenças a partir da data de início). O modelo da rodada 2 foi substituído; a regra simples não sustenta "preservar o histórico dos meses anteriores" (reaberto como P-41). RF-74 (verificação e ajuste prévios das datas) continua necessário contra regressão (PR-18). Sem mudança de veredito.

**Rodada final do Gate 1 (2026-10-20):** o usuário aprovou o `PRD.md` e o `PRD-TECNICO.md` deste recorte com todas as recomendações do Gestor. P-33 a P-41 estão decididas (P-36 data válida e não futura; P-37 rodadas anteriores como "–"; P-39 auditoria com acumulado antes e depois; P-40 qualquer admin do grupo; P-41 aceita que os meses anteriores à data de início deixem de mostrar a pontuação da época para o jogador). I-49 a I-52 confirmadas. Resta só a premissa técnica para o Coordenador (data de entrada do cadastro e início do primeiro período são o mesmo dado ou ficam alinhados) e o RF-74 antes de ligar a regra (PR-18).

**Veredito (final): Aprovado.** Libera o `/definir` desta demanda; as ressalvas anteriores ficam cobertas por RF-74/RNF-13 (regressão), `deploy.yml` com backup (G-15) e conferência do Leandro no ranking real.

---

## Gate 4 — Fechamento do deploy em produção (2º do dia) | 2026-10-20

**Natureza:** registro de fechamento, sem poder de veto. O deploy já aconteceu.

**Deploy:** run `deploy.yml` 39529189540 (workflow_dispatch, environment `producao`, sha `6501168a` da main). **Sucesso** em todas as etapas. Rollback não acionado. Sem migração de banco neste deploy.

**Verificação passiva no host** `https://pelada.prod-ljs.workers.dev`:
- `/api/saude` retornou 200, com `Cache-Control: no-store` e `X-Content-Type-Options: nosniff`.
- `GET /api/dono/grupos` sem cookie retornou 401.
- Rota inexistente retornou 404, com nosniff.
- `/` com CSP, referrer-policy, permissions-policy e nosniff.
- Login com e-mail inexistente: 401 nas 5 primeiras tentativas e 429 da 6ª em diante (bloqueio por e-mail funcionando). O limitador da Cloudflare em `/api/sessao/entrar` e `/api/publico/*` segue **não verificado de forma isolada** (o 429 observado é o bloqueio por e-mail).

**Conteúdo publicado desde o deploy anterior:**
- Exportar PDF com diálogo "PDF pronto." (Compartilhar ou Baixar) em aparelho que compartilha, resolvendo o PC sem opção de salvar (ADR-022 supersede o §3 do ADR-008).
- `X-Content-Type-Options: nosniff` em todas as respostas de `/api/*` (RTP-0170).
- Ações do GitHub fixadas por SHA e pnpm endurecido (RTP-0171).
- `.gitignore` dos arquivos de entrada do legado (RTP-0172).
- Checagem de CI `checar-acoes-fixadas` (RTP-0178 e RTP-0179).
- Documentação (RTP-0169, 0174, 0175 e 0177).

**Decisões do usuário em 2026-10-20:** o projeto só tem produção (uso pessoal), sem staging, e o fluxo (`deploy.md`, `EXECUTION-FLOW.md`, `validador.md` etc.) foi ajustado. A TWA/Play Store (TP-0140 a TP-0144) fica fora, seguindo só PWA; as despriorizadas não bloqueiam o deploy. BK-0012 resolvido pela alternativa A (RTP-0180 contrai o CHECK de `posicao`) e BK-0013 pela A (ADR-022).

**Auditoria de release 2026-10-20 (2ª):** **APROVADA COM DÉBITO** (0 Crítico/Alto). DAST local 30/30 na API e 3/3 no front; ZAP 0 alto e 0 médio. Risco aceito pelo usuário e registrado no `SECURITY-REVIEW.md`: o limitador da Cloudflare não executado isoladamente, com conferência passiva feita após o deploy.

**Revisão de arquitetura `--pre-deploy` (4ª do dia):** 0 achados Altos.

**Pendências pós-deploy:**
- RTP-0176 (`minimumReleaseAge` 10080 a partir de 22/10, prazo 29/10).
- RTP-0180 (migração que contrai o CHECK de `posicao`) e RTP-0181 (corrigir 4 linhas de pesos no `QUEBRAS.md`, depende da 0180).
- `braces` dev-only sem correção publicada.
- e2e intermitente `i4.spec.ts:170` (falhou uma vez no CI por login rejeitado e passou no reroda): observar.
- semgrep ainda acusa `pnpm-missing-minimum-release-age` (é a RTP-0176).

**Registro:** Deploy fechado e registrado. Nenhum bloqueio novo.

---

## Gate 4 — Fechamento do deploy em produção | 2026-10-20

**Natureza:** registro de fechamento, sem poder de veto. O deploy já aconteceu.

**Deploy:** run `deploy.yml` 39447193681 (workflow_dispatch, environment `producao`, sha `a6be366f` da main). **Sucesso** em todas as etapas: build do web, branch de restauração no Neon, dump cifrado, migração, cache do Hyperdrive desligado, deploy e saúde. Rollback não acionado.

**Verificação no host** `https://pelada.prod-ljs.workers.dev`:
- `/api/saude` retornou 200.
- `GET /api/dono/grupos` sem cookie retornou 401.
- Grupo inexistente retornou 404.
- Cabeçalhos CSP, nosniff e referrer-policy presentes.

**Conteúdo publicado:**
- TP-0208 Adequação ao legado: pontuação inicial por jogador, 7 posições, pesos de expulso sem/com chuva, migração `202610200000_adequacao_legado.sql` e script `backend/scripts/importar-legado` com `--correcoes`.
- RTP-0167 e RTP-0168.
- Tudo o que já estava aprovado: 384 tarefas Aprovadas.

**Aceite do usuário:** publicado **sem as 5 tarefas despriorizadas da Play Store (TP-0140 a TP-0144)**. O Neon está sem dados e sem usuários, e o usuário dispensou o backup.

**Auditoria de release 2026-10-20:** **APROVADA COM DÉBITO** (RTP-0170, RTP-0171 e RTP-0172, baixas). Um item não foi executado: limite de taxa da Cloudflare em `/api/sessao/entrar` e `/api/publico/*`, a confirmar no host publicado.

**Revisão de arquitetura `--pre-deploy` 2026-10-20:** 0 achados Altos. RTP-0169 e BK-0012 (contração do CHECK de posição, só após o go-live e a importação).

**Pendências pós-deploy:**
- Dry-run e execução real do `importar-legado`, rodados pelo usuário (G-21).
- Confirmar o limite de taxa no host publicado.
- Backlog RTP-0169 a RTP-0172 e BK-0012.

**Registro:** Deploy fechado e registrado. Nenhum bloqueio novo.

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
