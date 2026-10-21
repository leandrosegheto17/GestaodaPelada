# Comparação visual mockup × aplicação (2026-10-21)

Aplicação: `http://localhost:4173` · Limite: 1% de pixels · Limiar por canal: 0.1 · Imagens: `C:/Leandro/Projetos/GestaodaPelada/.md/.revisao/visual-qa-rtp0186`

| Tela | Estado | Tamanho | Pixels divergentes | Altura mockup / app | Resultado | Diferença |
|---|---|---|---|---|---|---|
| T01 Ranking público | sucesso | pc | 0.02% | 1280×1427 / 1280×1427 | **OK** | `T01-sucesso-pc--diff.png` |
| T01 Ranking público | sucesso | celular | 0.06% | 390×1550 / 390×1550 | **OK** | `T01-sucesso-celular--diff.png` |
| T01 Ranking público | vazio | pc | 0.00% | 1280×800 / 1280×800 | **OK** | `T01-vazio-pc--diff.png` |
| T01 Ranking público | vazio | celular | 0.00% | 390×844 / 390×844 | **OK** | `T01-vazio-celular--diff.png` |
| T01 Ranking público | vazio-mes | pc | 0.02% | 1280×1270 / 1280×1270 | **OK** | `T01-vazio-mes-pc--diff.png` |
| T01 Ranking público | vazio-mes | celular | 0.05% | 390×1293 / 390×1293 | **OK** | `T01-vazio-mes-celular--diff.png` |
| T01 Ranking público | carregando | pc | 0.00% | 1280×800 / 1280×800 | **OK** | `T01-carregando-pc--diff.png` |
| T01 Ranking público | carregando | celular | 0.00% | 390×844 / 390×844 | **OK** | `T01-carregando-celular--diff.png` |
| T01 Ranking público | erro | pc | 0.00% | 1280×800 / 1280×800 | **OK** | `T01-erro-pc--diff.png` |
| T01 Ranking público | erro | celular | 0.00% | 390×844 / 390×844 | **OK** | `T01-erro-celular--diff.png` |
| T01 Ranking público | instalar-iphone | celular | 0.00% | 390×69 / 390×69 | **OK** | `T01-instalar-iphone-celular--diff.png` |
| T01 Ranking público | endereco-novo | pc | 0.00% | 1280×69 / 1280×69 | **OK** | `T01-endereco-novo-pc--diff.png` |
| T01 Ranking público | endereco-novo | celular | 0.00% | 390×69 / 390×69 | **OK** | `T01-endereco-novo-celular--diff.png` |

DIVERGE = acima do limite **ou** página com tamanho diferente do mockup. Abra o `--diff.png` (vermelho = pixel diferente) e os prints `--mockup.png`/`--app.png` lado a lado antes de concluir.
