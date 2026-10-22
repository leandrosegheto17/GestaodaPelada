# Auditoria de segurança — ferramentas (2026-10-22)

Raiz: `C:/Leandro/Projetos/GestaodaPelada` · Docker: sim · Saídas brutas: `C:/Leandro/Projetos/GestaodaPelada/.md/.seguranca/2026-10-22`

| Item | Status | Comando | Versão | Resultado | Saída completa |
|---|---|---|---|---|---|
| Dependências (Node) | **OK** | `pnpm audit --prod --json` | 11.23.0 | critical: 0, high: 0, moderate: 0, low: 0 | dependencias-node.json |
| Dependências (OSV, todos os lockfiles) | **ACHADOS** | `docker run ... osv-scanner scan source -r /src` | imagem ghcr.io/google/osv-scanner:latest | 1 vulnerabilidade(s) (severidade no arquivo bruto) | osv-scanner.json |
| Segredos (histórico git) | **ACHADOS** | `gitleaks git --report-format json . (histórico inteiro)` | 8.30.1 | 36 segredo(s) — todo achado confirmado é Alto/Crítico | gitleaks.json |
| SAST (semgrep) | **ACHADOS** | `docker run ... semgrep scan --config p/default --config p/secrets --config p/owasp-top-ten --json /src` | imagem semgrep/semgrep:latest | ERROR: 13, WARNING: 32, INFO: 0 | semgrep.json |

Status: OK = rodou sem achado · ACHADOS = confirmar cada um no arquivo bruto · NÃO EXECUTADO/FALHOU = bloqueia até rodar ou até o usuário aceitar explicitamente.
