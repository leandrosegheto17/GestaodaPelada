# Auditoria de segurança — DAST (2026-10-22)

Alvo: `http://127.0.0.1:8787` · Docker: sim

## Sondas: 77 executadas, 0 reprovadas

| Sonda | Método | Caminho | Status | Falhas |
|---|---|---|---|---|
| saude responde | GET | `/api/saude` | 200 | — |
| admin: listar jogadores sem cookie | GET | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores` | 401 | — |
| admin: criar jogador sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores` | 401 | — |
| admin: pesos sem cookie | GET | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/pesos` | 401 | — |
| admin: salvar pesos sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/pesos` | 401 | — |
| admin: financeiro sem cookie | GET | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/financeiro/mes` | 401 | — |
| admin: admins do grupo sem cookie | GET | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/admins` | 401 | — |
| admin: simulador sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/simulador/sugerir` | 401 | — |
| dono: painel sem cookie | GET | `/api/dono/painel` | 401 | — |
| dono: criar grupo sem cookie | POST | `/api/dono/grupos` | 401 | — |
| dono: redefinir senha sem cookie | POST | `/api/dono/contas/00000000-0000-0000-0000-000000000000/redefinir-senha` | 401 | — |
| admin: inicio previa sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/inicio/previa` | 401 | — |
| admin: inicio previa cookie forjado | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/inicio/previa` | 401 | — |
| admin: inicio previa sem X-Pelada (CSRF) | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/inicio/previa` | 403 | — |
| admin: inicio previa data malformada sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/inicio/previa` | 401 | — |
| admin: inicio previa corpo malformado sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/inicio/previa` | 401 | — |
| admin: inicio editar sem cookie | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/inicio` | 401 | — |
| admin: inicio editar cookie forjado | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/inicio` | 401 | — |
| admin: inicio editar sem X-Pelada (CSRF) | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/inicio` | 403 | — |
| admin: inicio editar data malformada sem cookie | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/inicio` | 401 | — |
| admin: inicio editar corpo malformado sem cookie | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/inicio` | 401 | — |
| admin: detalhe do jogador sem cookie | GET | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001` | 401 | — |
| admin: editar jogador (inicioPontuacao) sem cookie | PATCH | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001` | 401 | — |
| admin: periodos listar sem cookie | GET | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos` | 401 | — |
| admin: periodos listar cookie forjado | GET | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos` | 401 | — |
| admin: periodos listar id nao UUID sem cookie | GET | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/%27%3BDROP%20TABLE%20jogadores--/periodos` | 401 | — |
| admin: periodos corrigir sem cookie | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa` | 401 | — |
| admin: periodos corrigir cookie forjado | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa` | 401 | — |
| admin: periodos corrigir sem X-Pelada (CSRF) | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa` | 403 | — |
| admin: periodos corrigir data malformada sem cookie | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa` | 401 | — |
| admin: periodos corrigir data extrema 0000 sem cookie | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa` | 401 | — |
| admin: periodos corrigir data extrema 9999 sem cookie | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa` | 401 | — |
| admin: periodos corrigir data 30/02 sem cookie | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa` | 401 | — |
| admin: periodos corrigir corpo malformado sem cookie | PUT | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa` | 401 | — |
| admin: periodos previa sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa/previa` | 401 | — |
| admin: periodos previa cookie forjado | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa/previa` | 401 | — |
| admin: periodos previa sem X-Pelada (CSRF) | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa/previa` | 403 | — |
| admin: periodos previa data malformada sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa/previa` | 401 | — |
| admin: periodos previa data extrema 0000 sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa/previa` | 401 | — |
| admin: periodos previa data extrema 9999 sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa/previa` | 401 | — |
| admin: periodos previa data 30/02 sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa/previa` | 401 | — |
| admin: periodos previa corpo malformado sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/periodos/00000000-0000-4000-8000-0000000000aa/previa` | 401 | — |
| admin: reativar previa sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar/previa` | 401 | — |
| admin: reativar previa cookie forjado | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar/previa` | 401 | — |
| admin: reativar previa sem X-Pelada (CSRF) | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar/previa` | 403 | — |
| admin: reativar previa data malformada sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar/previa` | 401 | — |
| admin: reativar previa data extrema 0000 sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar/previa` | 401 | — |
| admin: reativar previa data extrema 9999 sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar/previa` | 401 | — |
| admin: reativar previa data 30/02 sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar/previa` | 401 | — |
| admin: reativar previa corpo malformado sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar/previa` | 401 | — |
| admin: reativar com dataRetorno sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar` | 401 | — |
| admin: reativar com dataRetorno cookie forjado | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar` | 401 | — |
| admin: reativar com dataRetorno sem X-Pelada (CSRF) | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar` | 403 | — |
| admin: reativar com dataRetorno data malformada sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar` | 401 | — |
| admin: reativar com dataRetorno data extrema 0000 sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar` | 401 | — |
| admin: reativar com dataRetorno data extrema 9999 sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar` | 401 | — |
| admin: reativar com dataRetorno data 30/02 sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar` | 401 | — |
| admin: reativar com dataRetorno corpo malformado sem cookie | POST | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores/00000000-0000-4000-8000-000000000001/reativar` | 401 | — |
| sessao/eu sem cookie | GET | `/api/sessao/eu` | 401 | — |
| cookie forjado nao autentica | GET | `/api/grupos/57c0a466-4db9-46dd-bbd4-76cfdfa4f4cb/jogadores` | 401 | — |
| CSRF: escrita sem X-Pelada recusada | POST | `/api/sessao/sair` | 403 | — |
| login errado: mensagem generica | POST | `/api/sessao/entrar` | 401 | — |
| login: corpo malformado sem vazamento | POST | `/api/sessao/entrar` | 422 | — |
| login: SQLi no e-mail | POST | `/api/sessao/entrar` | 422 | — |
| publico: ranking sem login | GET | `/api/publico/pelada-de-quinta/ranking` | 200 | — |
| publico: pdf sem login | GET | `/api/publico/pelada-de-quinta/pdf` | 200 | — |
| publico: slug inexistente | GET | `/api/publico/nao-existe-xyz/ranking` | 404 | — |
| publico: SQLi no slug | GET | `/api/publico/%27%20OR%201%3D1%20--/ranking` | 404 | — |
| publico: traversal no slug | GET | `/api/publico/..%2f..%2fetc%2fpasswd/ranking` | 404 | — |
| publico: slug enorme | GET | `/api/publico/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ranking` | 404 | — |
| publico: evento tipo invalido | POST | `/api/publico/pelada-de-quinta/eventos` | 422 | — |
| publico: POST em rota de leitura | POST | `/api/publico/pelada-de-quinta/ranking` | 404 | — |
| rota inexistente | GET | `/api/inexistente` | 404 | — |
| metodo TRACE | TRACE | `/api/saude` | 404 | — |
| arquivo sensivel .env | GET | `/.env` | 200 | — |
| arquivo sensivel wrangler | GET | `/wrangler.jsonc` | 200 | — |
| arquivo sensivel .git | GET | `/.git/config` | 200 | — |

## Varredura de base
| Item | Status | Comando | Versão | Resultado | Saída completa |
|---|---|---|---|---|---|
| DAST (OWASP ZAP baseline) | **ACHADOS** | `docker run zaproxy/zap-stable zap-baseline.py -t http://host.docker.internal:8787 -J zap.json` | imagem zaproxy/zap-stable | high: 0, moderate: 0, low: 3 | zap.json |
