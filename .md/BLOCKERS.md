# BLOCKERS

## Bloqueio 001 — 2026-10-17 (BK-0001)
- Reportado por: Executor
- Escalado para: Coordenador
- Artefato/trecho afetado: TP-0017
- Descrição: Projeto workers do Vitest (vitest-pool-workers 0.23.0 / workerd 1.20260815.1) recusa compatibility_date 2026-10-01 do wrangler.jsonc; com a data forçada o pg quebra (import fora de módulo). Decidir: atualizar pool/miniflare para workerd >= 1.20261012 (muda dependência e lockfile) ou reduzir compatibility_date.
- Impacto se não resolvido: apoio-banco.test.ts e testes de rota da API no pool workers não rodam; job api do CI provavelmente falha
- Sugestão: avaliar atualização do pool; senão reduzir a data e registrar em ADR
- Status: Resolvido (2026-10-17): Coordenador: reduzir compatibility_date para 2026-08-15 (ADR-018); Executor aplica na TP-0017

## Bloqueio 002 — 2026-10-17 (BK-0002)
- Reportado por: Executor
- Escalado para: Coordenador
- Artefato/trecho afetado: TP-0183
- Descrição: Comparação visual do PDF (P01) fica em 3,96% (sucesso) e 4,02% (mes-vazio) contra o limite de 1% do aceite; restante é suavização do pdf.js vs Chrome e jsPDF sem tabular-nums (1 px). Decidir: subir LIMITE do e2e/pdf-visual.spec.ts (~4,5%), usar tolerância por canal maior ou aceitar inspeção dos PNGs; ajustar aceite/ADR.
- Impacto se não resolvido: e2e/pdf-visual.spec.ts vermelho; job e2e falha
- Sugestão: limite específico do PDF (ex. 4,5%) justificado em ADR, mantendo 1% nas telas
- Status: Resolvido (2026-10-17): Coordenador: limite próprio de 4,5% para a comparação visual do PDF (ADR-019); Executor aplica na TP-0183

## Bloqueio 003 — 2026-10-17 (BK-0003)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: RTP-0014
- Descrição: Exige push da branch ci-prova e PR real no remoto (ação manual/autorização do usuário); rodar a prova do CI e apagar a branch
- Impacto se não resolvido: —
- Sugestão: —
- Status: Resolvido (2026-10-19): ja resolvido; RTP-0014 encerrado por decisao do usuario

## Bloqueio 004 — 2026-10-17 (BK-0004)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: RTP-0006
- Descrição: Falta apagar backend/dominio/src/simulador/indicadores.test.ts (rm negado pela permissão) e rodar vitest test/simulador/indicadores test/elenco; caso novo em test/simulador/indicadores.test.ts não verificado
- Impacto se não resolvido: —
- Sugestão: —
- Status: Resolvido (2026-10-17): pendência operacional feita: duplicado removido e vitest da RTP-0006 verde

## Bloqueio 005 — 2026-10-17 (BK-0005)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: RTP-0017
- Descrição: Item (b) feito; item (a) exige PR real com job e2e verde (push/PR autorizado pelo usuário) e registrar a URL do run
- Impacto se não resolvido: —
- Sugestão: —
- Status: Resolvido (2026-10-19): Item (a) provado: job e2e verde em PR real (PR #2, run 39265054416) e na main (run 39355743642); item (b) feito. Evidencia: https://github.com/leandrosegheto17/GestaodaPelada/actions/runs/39265054416

## Bloqueio 006 — 2026-10-17 (BK-0006)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0154
- Descrição: Orçamento de CPU de sugerir estourado (2 times de 11, 30 aptos: mediana 3,9-4,8 ms vs limiar 4 ms, ADR-017): decidir entre otimizar distribuirDoisTimes ou rever o limiar
- Impacto se não resolvido: —
- Sugestão: —
- Status: Resolvido (2026-10-17): distribuirDoisTimes otimizado (ADR-017 passo 1); limiar de 4 ms mantido

## Bloqueio 007 — 2026-10-17 (BK-0007)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: RTP-0114
- Descrição: Rotacionar senhas pelada_app/pelada_backup no console do Neon (ALTER ROLE nos branches production e teste) e atualizar secrets NEON_URL_*, antes do TP-0133
- Impacto se não resolvido: —
- Sugestão: —
- Status: Resolvido (2026-10-17): rotação dispensada por decisão do usuário; histórico do SQL Editor do Neon apagado

## Bloqueio 008 — 2026-10-17 (BK-0008)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0133
- Descrição: Rodar o roteiro Cloudflare (subdomínio, token, wrangler hyperdrive create pelada-prod/pelada-teste com cache desligado) e informar os dois ids do Hyperdrive
- Impacto se não resolvido: Bloqueia TP-0134 e o deploy
- Sugestão: Fazer os passos 1-4 do plano com as strings do TP-0132; depois desbloquear e rodar /executar --tarefa TP-0133 para gravar os ids no wrangler.jsonc
- Status: Resolvido (2026-10-17): Subdomínio workers.dev = prod-ljs; Hyperdrive pelada-prod criado (id e06363bd85874f1eaffc6382da6d394b, cache desligado, host direto); sem homologação por decisão do usuário (pelada-teste fora)

## Bloqueio 009 — 2026-10-17 (BK-0009)
- Reportado por: Executor
- Escalado para: Coordenador
- Artefato/trecho afetado: —
- Descrição: Ajustar SDD/ADR-010/URL_PUBLICA/CORS/deploy.yml ao domínio prod-ljs.workers.dev e aos aceites de TP-0133/TP-0134/TP-0135 sem homologação (sem pelada-teste)
- Impacto se não resolvido: —
- Sugestão: Decidir se env.teste sai do wrangler.jsonc ou fica adormecido; revisar TP-0134 e TP-0135
- Status: Resolvido (2026-10-19): Host pelada.prod-ljs.workers.dev, sem homologacao: env.teste e caminho teste do deploy.yml removidos; ADR-020 substitui o 010; SDD/UX-SPEC/aceites ajustados

## Bloqueio 010 — 2026-10-17 (BK-0010)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0136
- Descrição: Decidir a cifra do backup: o Coordenador mandou openssl aes-256-cbc/pbkdf2, mas o repo usa age e o classificador marcou a troca como enfraquecimento de segurança; edições do dump-cifrado revertidas (parciais quebravam o deploy.yml)
- Impacto se não resolvido: —
- Sugestão: Manter age (mais forte) e ajustar o texto da tarefa, ou liberar a troca para openssl
- Status: Resolvido (2026-10-19): Manter age; texto do TP-0136 ajustado

## Bloqueio 011 — 2026-10-17 (BK-0011)
- Reportado por: QA
- Escalado para: usuário
- Artefato/trecho afetado: TP-0194
- Descrição: Banco pelada_teste com conta residual (contas_email_unico em montarCenario): ler.test.ts falha 7/7 sem nenhum processo node ativo; apagar a conta órfã e rodar de novo /testar --tarefa TP-0194
- Impacto se não resolvido: QA não consegue rodar a suíte de rota; código revisado sem achados
- Sugestão: delete da conta órfã do dono em pelada_teste e reexecutar
- Status: Resolvido (2026-10-17): Conta órfã do dono já removida de pelada_teste; ler.test.ts 11/11 verde; bloqueio só de ambiente

## Bloqueio 012 — 2026-10-20 (BK-0012)
- Reportado por: coordenador (/revisar)
- Escalado para: usuário
- Artefato/trecho afetado: —
- Descrição: Quando e onde registrar a contração do CHECK de posicao (tirar defensor/meio_campo de jogadores_posicao_check), prometida como 'no deploy seguinte' na migração 202610200000_adequacao_legado.sql, em SDD §6, contrato/QUEBRAS.md e TP-0208, mas sem tarefa nem dono
- Impacto se não resolvido: Média; sem efeito no deploy atual (o CHECK largo é seguro). Se ninguém contrair, o banco aceita para sempre valores que o contrato recusa
- Sugestão: Migração nova (-- contrair:) aberta só depois do go-live e da importação do legado confirmadas; registrar como tarefa/lembrete pós-go-live ou linha no backend/DEPLOY.md
- Status: Resolvido (2026-10-20): Decisão A: RTP-0180 contrai o CHECK de posicao (migração -- contrair:); textos de SDD §6, QUEBRAS.md, TP-0208 e da 202610200000 apontam a RTP

## Bloqueio 013 — 2026-10-20 (BK-0013)
- Reportado por: coordenador (/revisar)
- Escalado para: usuário
- Artefato/trecho afetado: —
- Descrição: ADR-008 §3 decide gerar e chamar navigator.share no mesmo gesto; o app agora sempre mostra Compartilhar/Baixar. Registrar com ADR novo que supersede esse ponto, ou voltar ao fluxo direto?
- Impacto se não resolvido: Baixa: só documentação (ADR-008, SDD C3); nada bloqueia o deploy
- Sugestão: Novo ADR (Superseded by no ADR-008 §3) registrando o D4 como passo normal; RTP-0174 já alinha o UX-SPEC
- Status: Resolvido (2026-10-20): Decisão A: ADR-022 supersede o §3 do ADR-008 (diálogo Compartilhar/Baixar); SDD C3, T-05 e tabela de ADRs ajustados

## Bloqueio 014 — 2026-10-21 (BK-0014)
- Reportado por: coordenador (/revisar)
- Escalado para: usuário
- Artefato/trecho afetado: —
- Descrição: Texto do '–' no ranking e no PDF (hoje só 'Ainda não fazia parte do grupo') também vale para rodada anterior à data de início: manter ou mudar a redação?
- Impacto se não resolvido: Baixo: leitura do ranking pode confundir quem teve a data alterada; mudar exige mockup aprovado primeiro, depois rótulos, legenda do PDF, UX-SPEC e teste
- Sugestão: Mudar para 'Fora do grupo ou antes da data de início' (mockup, UX-SPEC, rótulo e legenda juntos, depois nova comparação visual); ou registrar a decisão de manter no UX-SPEC
- Status: Resolvido (2026-10-21): Decisão do usuário: texto 'Fora do grupo ou antes da data de início'; mockup e UX-SPEC atualizados; código na RTP-0186

## Bloqueio 015 — 2026-10-21 (BK-0015)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: RTP-0180
- Descrição: Migração 202610210000_contrai_posicao e testes prontos (sem commit), mas a edição de backend/contrato/QUEBRAS.md foi negada pelo classificador de permissão: trocar 'RTP-0180 contrai o CHECK de posição' por 'contraído na migração 202610210000' nas 12 linhas da coluna 'deploy 2'
- Impacto se não resolvido: RTP-0180 não fecha o aceite e RTP-0181 (mesmo arquivo) espera por ela
- Sugestão: Liberar a edição do QUEBRAS.md (ou fazê-la à mão) e rodar /executar --tarefa RTP-0180
- Status: Resolvido (2026-10-21): QUEBRAS.md atualizado por mim a pedido do usuário: 12 linhas da coluna deploy 2 apontam para a migração 202610210000

## Bloqueio 016 — 2026-10-21 (BK-0016)
- Reportado por: Executor
- Escalado para: Coordenador
- Artefato/trecho afetado: TP-0220
- Descrição: avaliarPedidoDePeriodos (TP-0217) não devolve ja_ativo para reativar: jogador ativo cairia em 422 (regra e) e não no 409 do aceite; decidir se se acrescenta { tipo: 'ja_ativo' } em backend/api/src/aplicacao/elenco/avaliacao-periodos.ts (~4 linhas, arquivo da TP-0217) ou se a TP-0220 checa fora da avaliação
- Impacto se não resolvido: TP-0220 e dependentes (reativar/previa) paradas
- Sugestão: Autorizar o acréscimo de ja_ativo na avaliação comum (4 linhas, com teste) e reexecutar a TP-0220
- Status: Em aberto
