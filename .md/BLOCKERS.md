# BLOCKERS

## Bloqueio 001 — 2026-10-17 (BK-0001)
- Reportado por: Executor
- Escalado para: Coordenador
- Artefato/trecho afetado: TP-0017
- Descrição: Projeto workers do Vitest (vitest-pool-workers 0.23.0 / workerd 1.20260815.1) recusa compatibility_date 2026-10-01 do wrangler.jsonc; com a data forçada o pg quebra (import fora de módulo). Decidir: atualizar pool/miniflare para workerd >= 1.20261012 (muda dependência e lockfile) ou reduzir compatibility_date.
- Impacto se não resolvido: apoio-banco.test.ts e testes de rota da API no pool workers não rodam; job api do CI provavelmente falha
- Sugestão: avaliar atualização do pool; senão reduzir a data e registrar em ADR
- Status: Em aberto
