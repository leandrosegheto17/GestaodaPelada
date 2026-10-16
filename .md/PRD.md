# PRD — Gestão da Pelada

Versão: rascunho 4.1 (Loop A, reabertura pontual das colunas do ranking) | Data: 2026-10-16 | Autor: Gestor (chapéu PM)
Insumos: briefing do Leandro (ideia original), respostas do Leandro às perguntas das rodadas 1, 2 e 3, `.md/PLANO-COMERCIAL.md` v2, `.md/CTO-REVIEW.md` (Gate 1 e adendo da rodada 2).
Escopo deste PRD: **Fase 1, uso próprio** do grupo do Leandro. A Fase 2 (abertura paga a outros grupos) aparece só como restrição de modelagem.

**Mudanças do rascunho 4 para o 4.1 (reabertura pontual, P-30):**
- **Colunas do ranking (tela e PDF).** Nesta ordem: #, Jogador, PTS INICIAL (acumulado até o início do mês exibido), uma coluna por partida do mês com os **pontos** da rodada (cor por situação; ícone de chuva ou de sol no cabeçalho) e PTS FINAL (PTS INICIAL + rodadas do mês; no mês corrente, o acumulado até hoje). Saem as contagens de presenças e faltas do mês. É mudança **só de apresentação**: pontuação, acumulado contínuo e ordem sempre pelo acumulado atual (P-26) continuam iguais. Só RA-06 e RA-09 mudam.
- Uma pergunta nova em aberto (P-32, §7.1).

**Mudanças em relação ao rascunho 3:**
- **Sobra no formato de 3 ou mais times (P-29, opção c).** Quem sobra forma um **time incompleto**. Exemplo: 22 aptos com 4 por time dão 5 times de 4 e 1 time de 2. O número de times passa a ser aptos ÷ jogadores por time, arredondado **para cima**. Nesse formato não existe "aguardam": todos os aptos jogam.
- Não há mais perguntas em aberto.

**Mudanças do rascunho 2 para o 3:**
- **Ordem do ranking (P-26).** É sempre a do acumulado geral atual, também ao navegar para meses anteriores. A navegação por meses só troca as partidas exibidas, com as presenças e faltas de cada partida daquele mês. Deixam de existir a "foto" do ranking por mês e a coluna "pontos no mês".
- **Simulador em dois formatos (P-27).**
  - **2 times:** com 1º e 2º tempo, titulares, reservas, limite de substituições, "só 1º tempo" e "não entra".
  - **3 ou mais times:** só a divisão inicial equilibrada por habilidade e idade, sem substituições. O número de times sai da conta aptos ÷ jogadores por time.
- **"Só 1º tempo" fora dos titulares (P-28).** Confirmado: pode ficar como "não entra", com pontuação de presença.
- **Nova pergunta P-29.** O que fazer com a sobra no formato de 3 ou mais times.

**Mudanças do rascunho 1 para o 2:**
- O ranking passa a ser geral e contínuo (pontos acumulados), exibido mês a mês.
- Novo papel de **dono da plataforma**, que cria grupos e o primeiro admin de cada um.
- A TWA sobe de Could para Should, porque a conta da Play já está paga.
- O simulador passa a aceitar um número configurável de times e não trata mais goleiros de forma especial.
- Foi criado o fluxo "esqueci a senha", com aviso interno ao dono da plataforma.
- A expulsão passa a valer −1 por padrão.
- As habilidades começam com 6 itens fixos.
- As perguntas respondidas estão fechadas na §7.

---

## 1. Problema e Contexto

Hoje o organizador (admin) de uma pelada semanal de amigos controla a presença, monta os times e cuida do caixa da quadra por mensagens no WhatsApp, em planilha, em caderno ou de cabeça. Isso gera três dores, que podem ser verificadas na rotina do grupo do Leandro:

1. **Presença sem registro confiável.** Não existe um histórico fácil de consultar de quem veio, em quais condições (com chuva, lesionado, expulso) e de quem faltou. Por isso, o critério "quem vem mais, joga mais" depende da memória do admin e abre espaço para discussão.
2. **Divisão de times manual e contestada.** A cada jogo, o admin decide de cabeça quem começa jogando, quem entra no 2º tempo e como equilibrar os times por nível e idade. O processo é lento e sujeito a reclamação.
3. **Caixa da pelada informal.** Quem pagou o mês, as entradas e saídas e o saldo ficam espalhados em mensagens ou planilha.

**Contexto:** já existem apps de pelada no mercado (PLANO-COMERCIAL §4). Nenhum dos pesquisados mostrou **pontuação de presença configurável** (chuva, lesão, expulsão) nem **ordem de 1º e 2º tempo definida pelo ranking**, que são o diferencial desta ideia. O concorrente real da Fase 1 não é outro app, é o hábito atual (WhatsApp mais planilha).

**Restrições do contexto:**
- O desenvolvimento é hobby do Leandro, em horário de lazer, sem prazo de negócio.
- O custo de caixa da Fase 1 vai de R$ 0 a R$ 180. A conta de desenvolvedor da Google Play já está paga, então esse custo sai da conta.
- A distribuição é pelo PWA por link e pela TWA na Google Play (§4).

## 2. Público-Alvo

| Perfil | Quem é na Fase 1 | O que faz no app |
|---|---|---|
| **Dono da plataforma** | O Leandro (leandrosegheto17@gmail.com). É um papel único, acima dos admins de grupo | Cria grupos e define o primeiro admin de cada um. Arquiva grupos. Recebe os pedidos de "esqueci a senha" e redefine senhas de admins. Mantém a situação comercial dos grupos |
| **Admin do grupo** (usuário principal) | O Leandro e os gestores que ele, ou outro admin do grupo, cadastrar | Faz os cadastros, lança as partidas, configura os pesos, usa o simulador, exporta o PDF e cuida do caixa |
| **Jogador do grupo** (usuário de consulta) | Os participantes fixos da pelada do Leandro (até 40 ativos, premissa I-20) | Consulta o ranking pelo link do grupo, no celular, sem login |
| *Admin de outro grupo* (Fase 2, não atendido agora) | Organizador de pelada recorrente de 10 a 30 pessoas, conforme o ICP do PLANO-COMERCIAL §2 | Fora do escopo. Só orienta a modelagem para vários grupos |

## 3. Objetivo de Sucesso

**Objetivo:** o grupo do Leandro usa o app de fato por **8 semanas consecutivas**, contadas a partir do dia em que todos os requisitos Must (§5) estiverem no ar. Ao fim desse período, ninguém volta para planilha ou caderno.

| # | Métrica | Baseline | Meta (janela de 8 semanas) | Como medir |
|---|---|---|---|---|
| M1 | Partidas realizadas que foram lançadas no app em até 48 h após o jogo | 0% (o app não existe; hoje não há registro) | **100%** | Partidas lançadas no app comparadas com o calendário do grupo. O admin confirma os jogos que não aconteceram |
| M2 | Dispositivos distintos que abriram o ranking do grupo na semana, em relação ao número de jogadores ativos | 0 | **≥ 50%**, em **pelo menos 6 das 8 semanas** (mantida pelo usuário) | Contador anônimo de acesso por dispositivo (RA-11) |
| M3 | PDF do ranking exportado e compartilhado no grupo | 0 | **≥ 2 compartilhamentos** na janela | Exportações registradas (RA-11), com confirmação do admin de que o arquivo foi para o WhatsApp |
| M4 | Partidas em que o simulador foi usado | 0% | **≥ 50%** das partidas lançadas | Escalações confirmadas e vinculadas a uma partida (RA-08, RA-11) |
| M5 | Volta ao controle paralelo (planilha ou caderno) | Hoje é 100% planilha ou WhatsApp | **Nenhuma** na semana 8 | Declaração do Leandro ao fim da janela (sim/não) |
| G1 (guarda) | Tempo para o admin lançar uma partida de até 24 jogadores | Desconhecido | **Mediana ≤ 2 min** | Cronometragem em teste de uso com o protótipo |

O objetivo é cumprido quando M1 a M5 atingem a meta. G1 é uma métrica de guarda: se passar de 2 minutos, ameaça M1.

## 4. Escopo desta Release (Fase 1)

### Dentro

| Item | Justificativa |
|---|---|
| Ranking de presença **geral e contínuo**, sempre na ordem do acumulado atual, com navegação por meses que mostra as partidas de cada mês (presenças e faltas por partida) | Núcleo da proposta de valor. Confirmado pelo usuário (P-05, P-26) |
| Lançamento de partidas (data, chuva, presentes, lesionados, expulsos) | Alimenta o ranking. Sem isso, não há produto |
| Papel de dono da plataforma: cria grupos e o primeiro admin, arquiva grupos, redefine senhas e recebe pedidos de "esqueci a senha" | Confirmado pelo usuário (P-07, P-25). Também prepara a Fase 2 |
| Área administrativa com login de admin: edição do grupo, cadastro de jogadores, admins do grupo e habilidades (6 habilidades iniciais) | Pedido no briefing |
| Simulador de divisão de times em dois formatos. **2 times:** titulares, 2º tempo e substituições pelo ranking; equilíbrio por substituições, depois habilidade, depois idade. **3 ou mais times:** só a divisão inicial equilibrada por habilidade e idade; todos os aptos jogam, e quem sobra forma um time incompleto. Os dois formatos têm ajuste manual | Diferencial do produto e base da métrica M4 (P-14, P-27, P-29) |
| Exportação do ranking em PDF de uma página | Pedido no briefing. Base de M3 e vetor de indicação na Fase 2 |
| Financeiro do caixa da pelada (pagou ou não no mês, entradas e saídas, saldo), só para admin com permissão | Pedido no briefing. É útil, mas não está na métrica de sucesso (Should) |
| PWA instalável no iPhone (Safari) e no Android (Chrome) | Canal principal no iPhone, com custo zero |
| TWA na Google Play, com o teste fechado começando logo depois do I1 | O briefing pede a TWA "ao mesmo tempo" e a conta da Play já está paga. Detalhes da decisão em RA-14 |
| Isolamento de todo dado por grupo e campo de situação comercial do grupo, sem lógica | Prepara a Fase 2 sem retrabalho (Gate 1, ressalva 4) |
| Registro anônimo de uso | Sem isso, M2, M3 e M4 não podem ser medidas |

### Fora

| Item | Justificativa do corte |
|---|---|
| Cobrança do app (trial, assinatura, gateway, Pix, inadimplência do app) | É coisa da Fase 2 (PLANO-COMERCIAL §Veredito) |
| Cadastro self-service de grupos e onboarding público | Os grupos são criados só pelo dono da plataforma |
| Termos de uso e política de privacidade completos | São necessários só na Fase 2. Na Fase 1 basta um aviso simples (RA-15) |
| App nativo e App Store da Apple | O PWA atende o iPhone sem custo nem comissão |
| Login de jogador e perfil pessoal | O jogador só consulta o ranking |
| Placar, gols, artilharia, cronômetro, estatísticas de desempenho | Não foram pedidos. O ranking é de **presença** |
| Regras ou avisos específicos de goleiro no simulador | Por decisão do usuário (P-13), goleiros não são controlados |
| Confirmação de presença antes do jogo e lembretes | Não foram pedidos |
| Envio de e-mail (recuperação de senha, avisos) e notificações push | A recuperação de senha é feita por outro admin ou pelo dono, com aviso interno no app (P-25) |
| Cobrança automática ou lembrete de pagamento no financeiro | O briefing pede só "um controle simples" |
| Mais de um idioma | Público só no Brasil (pt-BR) |

### Ordem de entrega sugerida (incrementos)

Esta ordem é uma recomendação de produto. A decomposição em tarefas é do Coordenador.

1. **I1, núcleo:** RA-01 a RA-06, RA-10, RA-11, RA-13 e RA-16.
2. **I1-TWA:** empacotar a TWA e abrir o teste fechado com o grupo (12 testadores, 14 dias), em paralelo com o I2.
3. **I2:** RA-07 e RA-08 (habilidades e simulador).
4. **I3:** RA-09 (PDF). **Quando I1 a I3 estiverem no ar, começa a janela de 8 semanas.**
5. **I4:** RA-12 e RA-15 (financeiro e aviso de privacidade). A TWA vai para produção assim que o teste fechado terminar.

## 5. Requisitos de Alto Nível Priorizados

Prioridade MoSCoW. O detalhamento está no `PRD-TECNICO.md`.

| ID | Requisito | Prioridade | Justificativa |
|---|---|---|---|
| RA-01 | Grupos (nome, dia da semana, frequência, horário), criados e arquivados pelo dono da plataforma e editados pelos admins do grupo, com todo dado isolado por grupo | Must | Unidade de isolamento. Exigência de modelagem para a Fase 2 |
| RA-02 | Acesso de admin com credencial individual (e-mail e senha), vinculado a grupos. O primeiro admin é criado pelo dono com senha aleatória, de troca obrigatória. Os admins do grupo dão acesso a outros admins. Inclui permissão de financeiro e "esqueci a senha" | Must | Briefing e respostas P-07 e P-25 |
| RA-03 | Cadastro de jogadores (nome/apelido, ano de nascimento, telefone, posição, data de entrada), com inativação sem perda de histórico | Must | Base do ranking e do simulador |
| RA-04 | Pesos de pontuação por grupo (presença com e sem chuva, lesionado com e sem chuva, expulso), valendo só daqui para a frente. Padrão: 1 por presença e −1 por expulsão | Must | Pedido no briefing. Respostas P-06, P-10 e P-22 |
| RA-05 | Lançamento de partidas: data, chuva sim/não e a situação de cada jogador (ausente, presente, lesionado, expulso) | Must | Alimenta o ranking. Precisa ser rápido (G1) |
| RA-06 | Ranking público do grupo, geral e contínuo. A ordem é sempre a do acumulado atual (desempate pelo mais velho e, depois, pelo apelido) e não muda ao trocar de mês. Colunas: posição, jogador, PTS INICIAL (acumulado até o início do mês exibido), uma coluna por partida do mês com os pontos da rodada de cada jogador (cor por situação: presente, lesionado, expulso, falta ou "–" antes de entrar no grupo; ícone de chuva ou de sol no cabeçalho) e PTS FINAL (PTS INICIAL + pontos das rodadas do mês). Sem contagens de presenças e faltas | Must | Tela principal e núcleo do produto (M1, M2). P-05, P-26 e P-30 |
| RA-07 | Habilidades por grupo (6 iniciais: Visão de Jogo, Passe, Preparo Físico, Drible, Chute, Desarme), com cadastro e nota de 1 a 10 por jogador, visíveis só para admins | Must | O simulador precisa delas (P-04) |
| RA-08 | Simulador de divisão de times, com escolha do formato, jogadores por time, aptos, ajuste manual e confirmação. **2 times:** "só 1º tempo", limite de substituições, titulares, reservas e "não entra" pelo ranking contínuo; equilíbrio por substituições, depois habilidade, depois idade. **3 ou mais times:** número de times = aptos ÷ jogadores por time, arredondado para cima; quem sobra forma um time incompleto; sem substituições; equilíbrio por habilidade, depois idade | Must | Diferencial do produto. Base de M4. P-14, P-27, P-28, P-29 |
| RA-09 | Exportação em PDF de uma página do ranking (ordem atual), com as mesmas colunas da tela (RA-06), as partidas do mês exibido e, se couber, as anteriores. Qualquer pessoa com o link pode exportar | Must | Pedido no briefing. Base de M3. P-30 |
| RA-10 | PWA instalável no iPhone e no Android, em pt-BR, pensado primeiro para celular | Must | Canal de distribuição no iPhone |
| RA-11 | Registro anônimo de uso, para medir M1 a M4 | Must | Sem medição, não há como declarar sucesso ou fracasso |
| RA-12 | Financeiro do caixa da pelada, só para admin com permissão | Should | Pedido no briefing, mas fora das métricas |
| RA-13 | Campo de situação comercial do grupo (uso próprio, trial com data de início, ativo, inadimplente, cancelado), sem lógica de cobrança, mantido pelo dono da plataforma | Must | Custo quase zero agora. Evita migração na Fase 2 |
| RA-14 | TWA na Google Play | **Should** (era Could) | **Decisão da rodada 2:** com a conta da Play já paga, o único custo que justificava adiar deixou de existir. O empacotamento tem pouco esforço se o PWA já for instalável (RNF-11), e o briefing pede a TWA "ao mesmo tempo". **Não é Must** por dois motivos. Primeiro, o PWA já cobre o Android e nenhuma métrica de sucesso depende da loja. Segundo, o teste fechado (12 testadores por 14 dias contínuos) depende de pessoas permanecerem inscritas, o que o projeto não controla, e não pode atrasar o início da janela de 8 semanas. O teste fechado começa logo depois do I1, usando o próprio grupo |
| RA-15 | Aviso simples de privacidade no app | Should | Baixo custo. Prepara a Fase 2 |
| RA-16 | Área do dono da plataforma: grupos, primeiro admin, redefinição de senha, pedidos de "esqueci a senha" e situação comercial | Must | Sem ela, não há como criar o grupo nem o primeiro admin (P-07) |

## 6. Premissas e Riscos de Produto

| # | Premissa / risco | Tipo | Como validar | Dono | Prazo |
|---|---|---|---|---|---|
| PR-01 | O grupo aceita como justos os pesos (padrão: 1 por presença, −1 por expulsão) e o desempate por idade | Risco social, o maior da Fase 1 | Apresentar as regras e os pesos ao grupo, ajustar por consenso e registrar os valores | Leandro | Antes de começar o I1 |
| PR-02 | O admin consegue lançar uma partida em 2 minutos ou menos | Premissa crítica | Cronometrar o lançamento de 20 a 24 jogadores no protótipo do I1 | Validador, com o Leandro | No fim do I1 |
| PR-03 | O admin sabe, na hora de lançar, quem foi lesionado (foi e não jogou) ou expulso | Premissa | Confirmar com o Leandro a rotina pós-jogo | Leandro | Antes de começar o I1 |
| PR-04 | O simulador é usado de verdade | Risco de adoção | M4 nas 4 primeiras semanas. Se ficar abaixo de 50%, investigar o motivo | Gestor, com o Leandro | Semana 4 da janela |
| PR-05 | Os jogadores abrem o link do ranking sem precisar de login | Premissa de adoção | M2 | Gestor, com o Leandro | Semana 2 da janela |
| PR-06 | O PWA no iPhone mantém os dados e a sessão do admin de forma estável | Risco técnico de plataforma | Teste em iPhones reais (PRD-TECNICO §6) | Coordenador e Validador | No fim do I1 |
| PR-07 | É possível compartilhar o PDF no WhatsApp a partir do PWA e da TWA | Risco técnico de plataforma | Teste em iPhone e Android reais (PRD-TECNICO §6) | Coordenador e Validador | No fim do I3 |
| PR-08 | A infraestrutura cabe em plano gratuito | Premissa de custo | Estimativa de volume no SDD.md | Coordenador | No `/definir` |
| PR-09 | Dados pessoais de terceiros sem exposição indevida | Risco de compliance | A visão pública mostra só apelido, presenças, faltas e pontos | Gestor (estratégico) e Validador (tático) | No `/definir` |
| PR-10 | O escopo largo, somado às horas de lazer, atrasa a primeira versão útil | Risco de entrega | Entrega em incrementos (§4) | Gestor | Revisar no `/definir` (TASK.md) |
| PR-11 | Mudar os pesos gera disputa sobre pontos já ganhos | Risco social | **Resolvido:** a mudança vale só daqui para a frente (P-06) | — | Fechado |
| PR-12 | Ranking contínuo: quem está no grupo há mais tempo fica sempre no topo, e quem chega depois quase nunca começa jogando no simulador | Risco social (novo, consequência de P-05) | Observar nas 8 semanas se jogadores novos ficam presos como reservas ou "não entra". Se o grupo reclamar, avaliar uma janela móvel ou zerar o ranking por temporada (decisão futura do usuário, não desta release) | Leandro | Semana 8 da janela |
| PR-13 | O grupo tem pelo menos 12 pessoas dispostas a ficar inscritas no teste fechado da Play por 14 dias contínuos | Premissa de distribuição | Recrutar os testadores no grupo antes de fechar o I1 | Leandro | No fim do I1 |
| PR-14 | Concentrar a recuperação de senha no dono da plataforma ou em outro admin, sem e-mail, não deixa nenhum admin bloqueado por muito tempo | Premissa operacional | Observar os pedidos de "esqueci a senha" na janela | Leandro | Semana 8 da janela |

## 7. Perguntas em Aberto

### 7.1 Ainda em aberto

| # | Pergunta | Por que importa | Interpretação provisória (PRD-TECNICO) |
|---|---|---|---|
| P-32 | No PDF, que inclui partidas de meses anteriores quando cabem (P-19), a que se refere o PTS INICIAL? | O usuário definiu PTS INICIAL + rodadas = PTS FINAL. Com colunas de dois ou mais meses, essa conta só fecha se o PTS INICIAL for o acumulado antes da primeira partida impressa | I-42: PTS INICIAL do PDF = acumulado antes da primeira partida impressa; PTS FINAL = o mesmo do mês exibido |

### 7.1.1 Resolvida na reabertura pontual (rascunho 4.1)

| # | Pergunta | Resposta do usuário | Onde foi aplicada |
|---|---|---|---|
| P-30 | Colunas do ranking na tela e no PDF | **#, Jogador, PTS INICIAL, uma coluna por partida do mês com os pontos da rodada (cor por situação; ícone de chuva ou de sol no cabeçalho), PTS FINAL.** Saem as contagens de presenças e faltas do mês. **Mudança só de apresentação:** a pontuação, o acumulado contínuo e a ordem sempre pelo acumulado atual (P-26) não mudam, também ao ver meses passados | RA-06, RA-09; no PRD-TECNICO: RF-29, RF-31, RF-32, RF-50, RN-01, RN-03, RN-21, RNF-10, F1, F4, I-41 a I-43 |

### 7.2 Resolvidas na rodada 4

| # | Pergunta | Resposta do usuário | Onde foi aplicada |
|---|---|---|---|
| P-29 | Sobra no formato de 3 ou mais times | **(c)** Quem sobra forma um time incompleto (ex.: 22 aptos com 4 por time dão 5 times de 4 e 1 time de 2). O número de times é arredondado para cima. Não há "aguardam" | RA-08, RN-09B, RN-10B, RF-39 a RF-47, F3 |

### 7.3 Resolvidas na rodada 3

| # | Pergunta | Resposta do usuário | Onde foi aplicada |
|---|---|---|---|
| P-26 | Ordem do ranking ao ver um mês passado | **Não muda.** É sempre a ordem do acumulado geral atual. A navegação por meses só mostra as partidas daquele mês (presenças e faltas por partida) | RA-06, RA-09, RN-05, RF-29 a RF-32, RF-50 |
| P-27 | Modelo com 3 ou mais times | **Não há substituições nem 1º e 2º tempo.** Só a divisão inicial equilibrada por habilidade e idade (ex.: 20 aptos com 4 por time dá 5 times de 4). Titulares, reservas, limite de substituições, "só 1º tempo" e "não entra" valem só para 2 times | RA-08, RN-09, RN-10, RF-39 a RF-47 |
| P-28 | "Só 1º tempo" fora dos titulares, com limite | **Confirmado:** pode ficar como "não entra", pela ordem do ranking, e recebe a pontuação de presença | RN-09, RN-19 |

### 7.4 Resolvidas na rodada 2

Respostas do usuário, já aplicadas.

| # | Pergunta | Resposta do usuário | Onde foi aplicada |
|---|---|---|---|
| P-01 | Tamanho do grupo | Indiferente. Mantida a premissa de até 40 ativos e 30 presentes por partida | I-20 |
| P-02 | Meta de M2 | Indiferente. Mantida | §3 |
| P-03 | TWA na Fase 1 | A conta da Play já está paga. O teste fechado continua valendo | RA-14 subiu para Should; I1-TWA na §4 |
| P-04 | Habilidades | Catálogo com 6 iniciais: Visão de Jogo, Passe, Preparo Físico, Drible, Chute, Desarme. O cadastro continua existindo | RA-07, RN-18 |
| P-05 | Base do ranking no simulador | O ranking é geral e contínuo | RA-06, RA-08, RN-05, RN-08 |
| P-06 | Mudança de pesos | Só daqui para a frente | RN-04 |
| P-07 | Login | Login individual por admin. O dono da plataforma cria o grupo e o primeiro admin, com senha aleatória de troca obrigatória. O "$" usa o mesmo login, com permissão | RA-02, RA-16 |
| P-08 | Ranking público | Por link, sem login, só apelido, presenças, faltas e pontos | RA-06 |
| P-09 | Lesionado | Foi e não jogou | RN-02 |
| P-10 | Expulsão | Peso único, padrão −1 | RN-01, RN-18 |
| P-11 | Falta | 0 ponto, só contagem | RN-03 |
| P-12 | Mesmo ano de nascimento | Ordem alfabética do apelido | RN-05 |
| P-13 | Goleiros | Não serão controlados. Removidas todas as regras e avisos de goleiro | RA-08 |
| P-14 | Número de times | Configurável | RA-08, RN-09, RN-10 |
| P-15 | "Só 1º tempo" fora dos titulares | Joga apenas o 2º tempo, sem ajuste manual | RN-09 (detalhe em aberto na P-28) |
| P-16 | Sobra de aptos com limite | Os de pior ranking ficam como "não entra", **mas recebem a pontuação de presença** | RN-09, RN-19 |
| P-17 | Prioridade do equilíbrio | Substituições iguais, depois habilidade, depois idade | RN-10 |
| P-18 | Quem usa o simulador | Só admin | RA-08 |
| P-19 | Colunas do PDF | Partidas do mês e, se couber, anteriores, até 12 | RA-09 |
| P-20 | Financeiro | Mensalidade opcional; "pagou" gera entrada vinculada; sem jogador avulso | RA-12 |
| P-21 | Jogador em mais de um grupo | Um cadastro por grupo | RA-03 |
| P-22 | Pesos iniciais | Indiferente. Mantidos 1 por presença, com expulsão = −1 | RN-18 |
| P-23 | Quem exporta o PDF | Qualquer pessoa com o link | RA-09 |
| P-24 | Faltas de quem entrou no meio do mês | Contam só a partir da data de entrada no grupo | RN-06 |
| P-25 | Recuperação de senha | Outro admin redefine, sem e-mail. "Esqueci a senha" mostra "Solicite o reset de senha a outro admin" e gera um aviso interno, visível só ao dono da plataforma no login dele | RA-02, RA-16 |
