# PLANO-COMERCIAL.md

**Status:** Aprovado pelo stakeholder em 2026-10-09 (Loop 0 encerrado, rodada 2). Decisão: seguir para o `/planejar`.

> **Veredito: a conta fecha no cenário principal, em que o desenvolvimento é hobby.** O custo em
> dinheiro é praticamente zero (infraestrutura gratuita) e o valor esperado vem de duas fontes. A
> primeira é a visibilidade sobre gastos variáveis (almoço, mercado, iFood), que hoje o casal não
> sabe se ficam em R$ 2.000 ou R$ 6.000 por mês. A segunda é deixar de pagar uma assinatura. **A
> condição que decide tudo é a adesão:** se registrar muitos lançamentos pequenos for lento, o app
> perde exatamente o valor que justifica construí-lo (P1). Com a hora de desenvolvimento valorada, a
> conta não fecha (nota na Seção 6).
> | Projeto de **uso pessoal**, sem monetização | Última rodada: 2026-10-09 (rodada 2 do Loop 0)

---

## 1. Proposta de Valor e Modelo de Venda

- **Proposta de valor (uma frase):** um controle financeiro feito pelo próprio casal, customizável,
  que mostra quanto realmente vai para os gastos variáveis do dia a dia (almoço, mercado, delivery).
  As despesas, orçamentos e metas da casa ficam visíveis aos dois, e as contas, receitas e metas
  individuais ficam privadas.
- **Motores de valor, em ordem de importância (rodada 2):**
  1. **Visibilidade dos gastos variáveis do dia a dia.** É o problema central. Nas palavras do
     stakeholder: "não sabemos se estamos gastando 2000 ou 6000".
  2. **Customização.** O app é feito pelo casal e evolui conforme a necessidade deles. É o
     diferencial frente a qualquer app pronto.
  3. **Privacidade entre o conjunto e o individual.** Regra definida pelo stakeholder: quando uma
     despesa conjunta é paga com uma conta individual, o outro vê **apenas que ela foi paga**. Não vê
     o valor na conta individual, o saldo nem qual conta foi usada.
  4. Orçamento mensal com resultado no fim do mês e metas de poupança individuais e compartilhadas.
- **Modelo de receita:** **nenhum**, e não há intenção de vender.
- **Âncora de valor:**
  - (a) **Valor evitado:** de R$ 160 a R$ 600 por ano para uma assinatura de app pronto, ou até cerca
    de R$ 800 se fossem duas (Seção 4).
  - (b) **Valor potencial da visibilidade:** se ela ajudar a cortar só 5% de um gasto variável
    entre R$ 2.000 e R$ 6.000 por mês, isso dá **R$ 1.200 a R$ 3.600 por ano**. **Premissa não
    verificada**, porque hoje nem o valor gasto é conhecido (P6).

## 2. Público-Alvo Comercial

- **ICP:** o próprio casal, com 2 usuários. Eles dividem as contas da casa, mantêm contas individuais
  e perderam o controle dos gastos variáveis de alimentação e delivery.
- **Tamanho de mercado e disposição a pagar:** não se aplicam (SOM = 1 casal).
- **Hipótese de abrir para outros casais: DESCARTADA** pelo stakeholder na rodada 2.

## 3. Canais de Publicação e Distribuição

- **Canal:** aplicação web na **Vercel**, instalável como **PWA** no Android e no iPhone. Sem loja e
  sem custo de aquisição (R$ 0).
- O plano Hobby da Vercel, que só permite uso não comercial, **deixou de ser risco**: não há
  monetização prevista.

## 4. Concorrentes e Diferenciação

| Alternativa | Preço praticado | Conjunto + privado? | Diferencial do MyMoney | Fonte |
|---|---|---|---|---|
| **Honeydue** | Gratuito, com gorjeta opcional | Sim, por conta | Customização, orçamento e metas, BRL e português | [MoneyTalksNews](https://www.moneytalksnews.com/honeydue-budgeting-app-review-is-this-the-best-app-for-couples/), [College Investor](https://thecollegeinvestor.com/35477/honeydue-review/), [Finny](https://getfinny.app/blog/best-budgeting-apps-for-couples-2026) |
| **YNAB** (Together) | US$ 109 por ano ou US$ 14,99 por mês | Incerto: as fontes divergem | Customização, privacidade garantida, BRL | [ynab.com/pricing](https://www.ynab.com/pricing), [ynab.com/ynab-together](https://www.ynab.com/ynab-together), [Gerald](https://joingerald.com/learn/financial-wellness/ynab-together-guide) |
| **Organizze** | R$ 199,90 a R$ 599,90 por ano, conforme o plano | Não verificado | Customização, separação nativa entre conjunto e individual | [organizze.com.br/planos](https://www.organizze.com.br/planos) |
| **Mobills** | R$ 159,90 por ano. **Dado de 2024** | Não verificado | Idem | [Blog Mobills (2024)](https://www.mobills.com.br/?p=121834) |
| **Splitwise** | Grátis, ou Pro por cerca de US$ 40 a 50 por ano | Parcial: só divide despesas | Controle pessoal e conjunto no mesmo lugar | [Finny](https://getfinny.app/blog/splitwise-pricing-2026) |
| **Monefy** | Premissa não verificada | Não (feito para um usuário) | Multiusuário com privacidade | Não pesquisado |
| **Planilha compartilhada** | R$ 0 | Não | Uso no celular, separação automática | Premissa |
| **Não fazer nada** (situação atual) | R$ 0 | — | Hoje não se sabe se o gasto variável é R$ 2.000 ou R$ 6.000 | Fala do stakeholder |

**Leitura (rodada 2):**
- O stakeholder **decidiu não testar** as alternativas. O motivo declarado é a customização.
- Isso encerra o risco "uma alternativa já resolve" como **decisão consciente do stakeholder**. Não
  significa que a pergunta tenha sido validada.
- O concorrente real é o **status quo**: não registrar nada e não saber quanto se gasta. O app vence
  apenas se registrar um gasto for mais fácil do que ignorá-lo.

## 5. Hipótese de Viabilidade

**Chance estimada de o casal adotar e manter o uso por 6 meses ou mais: ~60%.** Na rodada 1 era
~55%.

**Por que subiu:**
- A motivação ficou mais clara: há uma dor concreta com os gastos variáveis e o casal quer um app
  próprio.
- A regra de privacidade foi definida (P3).
- O risco de pausa da Supabase tem mitigação disponível (P5).

**Por que não subiu mais:** a nova dor depende de **muitos lançamentos pequenos e frequentes**, e
isso deixa a P1 ainda mais frágil.

| # | Premissa | O que a derrubaria |
|---|---|---|
| P1 | **Os dois registram com regularidade e de forma manual** (sem integração bancária, decisão do stakeholder) **muitos gastos pequenos do dia a dia** (almoço, mercado, iFood). **É a premissa mais frágil e a que decide a viabilidade** | Se lançar um gasto exigir mais do que poucos segundos, ou não puder ser feito na hora pelo celular, os pequenos gastos deixam de ser registrados. O total do mês volta a ser desconhecido, e é justamente ele o principal motor de valor. **A fricção de lançamento rápido é crítica.** A solução cabe ao Gestor e ao Coordenador; o Dono não decide |
| P2 | O MVP fica utilizável em cerca de 2 meses de dedicação parcial (hobby), antes de a motivação acabar | Como o app é customizável e não há prazo, o escopo pode crescer sem fim e o app nunca chegar ao uso diário |
| P3 | A regra de privacidade definida ("o outro vê só que foi pago") atende aos dois na prática | Casos de borda não previstos, como metas alimentadas por conta individual ou transferências, geram desconfiança |
| P4 | O PWA instalado funciona bem para uso diário no iOS e no Android. **Premissa técnica**, a validar pelo Coordenador | Limitações do iOS (atalho, comportamento offline) atrapalham o lançamento rápido, o que agrava a P1 |
| P5 | A infraestrutura continua com custo zero. A Supabase gratuita pausa o projeto após 1 semana de inatividade ([supabase.com/pricing](https://supabase.com/pricing)). **Mitigação disponível:** o casal tem servidor próprio e conta na Cloudflare. A decisão fica para o /definir | Uma pausa inesperada, ou a necessidade do plano pago (US$ 25 por mês, cerca de R$ 1.650 por ano), sem uma mitigação adotada |
| P6 | Ver o total dos gastos variáveis leva o casal a mudar o comportamento, ou pelo menos dá a ele a clareza que procura | O casal passa a ver os números, mas nada muda, e o app vira só um registro. O valor fica limitado a evitar uma assinatura |

## 6. Break-even

**Cenário principal: o desenvolvimento é hobby (a hora não entra como custo).**

| Item | Custo anual |
|---|---|
| Desenvolvimento e manutenção | R$ 0 (hobby, decisão do stakeholder) |
| Infraestrutura (Supabase Free + Vercel Hobby + GitHub) | R$ 0 enquanto couber no plano gratuito (P5) |
| Domínio próprio (opcional) | Cerca de R$ 40 (premissa) |
| Aquisição | R$ 0 |
| **Total** | **R$ 0 a R$ 40 por ano** |

**Valor anual:**
- Assinatura evitada: de R$ 160 a R$ 800.
- Potencial da visibilidade dos gastos variáveis: de R$ 1.200 a R$ 3.600 (P6, não verificado).

**Resultado:** **a conta fecha no primeiro ano**, mesmo considerando só a assinatura evitada. Não há
número de vendas a atingir. O "break-even" real é de adesão: **o app só gera valor se os gastos
variáveis forem registrados de forma consistente** (P1).

**Riscos que viram a conta:**
- Precisar da Supabase paga sem adotar a mitigação. O custo de cerca de R$ 1.650 por ano supera o
  valor evitado, embora não supere o potencial da P6.
- Abandono do uso (P1), que zera o valor.

**Nota secundária (hora valorada a R$ 50/h, como referência):** um MVP de 60 a 100 h custaria de
R$ 3.000 a R$ 5.000, mais cerca de R$ 1.200 por ano de manutenção. Nesse cenário a conta só fecharia
se o potencial da P6 se confirmar na faixa alta. Contra a assinatura evitada, não fecha.

## 7. Premissas e Riscos Comerciais em Aberto

| # | Premissa / risco | O que precisa ser validado | Quem |
|---|---|---|---|
| R1 | **Fricção do lançamento manual de gastos pequenos e frequentes** (= P1, o risco crítico) | Requisito de lançamento rápido no celular: tempo e passos para registrar um gasto. Critério de adesão (por exemplo, cobertura dos gastos variáveis do mês). **Solução fora da autoridade do Dono** | Gestor (PRD) e Coordenador |
| R2 | Escopo de hobby sem prazo (= P2) | Um MVP enxuto, focado em gastos variáveis e na visão do conjunto, antes de customizações | Gestor |
| R3 | Regra de privacidade "o outro vê apenas que foi pago" (= P3) | Detalhar os casos de borda (metas compartilhadas alimentadas por conta individual, transferências) | Gestor com o stakeholder |
| R4 | PWA no iOS adequado para lançamento rápido (= P4) | Restrição técnica | Coordenador |
| R5 | Custo zero de infraestrutura e pausa da Supabase gratuita (= P5) | Avaliar a mitigação com o servidor próprio ou a Cloudflare. **Decisão no /definir.** O Dono não decide | Coordenador |
| R6 | A visibilidade gera mudança ou clareza (= P6) | Depois de 1 a 2 meses de uso, comparar o gasto variável real com a percepção atual (R$ 2.000 a R$ 6.000) | Stakeholder |
| R7 | Restrição de stack: Supabase + Vercel + GitHub, começando do zero. Nada a preservar nos ambientes atuais, que podem ser limpos | Registrada como restrição dada pelo stakeholder | Coordenador |
| R8 | Dados financeiros sensíveis de duas pessoas | O isolamento entre o individual e o conjunto é requisito | Gestor e Coordenador |
| R9 | Alternativas prontas não testadas | Encerrado por decisão do stakeholder (preferem a customização). Não é uma validação de mercado | — (fechado) |
| R10 | Preços do Mobills (2024) e do Monefy desatualizados ou não verificados | Irrelevante sem monetização. Atualizar só se for necessário | Dono |
| — | ~~Monetização futura / outros casais~~ | **Descartado** pelo stakeholder na rodada 2 | — |
