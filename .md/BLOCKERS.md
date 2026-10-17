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
