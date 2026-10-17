# Comparação visual mockup × aplicação (2026-10-17)

Aplicação: `http://localhost:4173` · Limite: 1% de pixels · Limiar por canal: 0.1 · Imagens: `C:/Leandro/Projetos/GestaodaPelada/.md/.visual/qa-tp0127p`

| Tela | Estado | Tamanho | Pixels divergentes | Altura mockup / app | Resultado | Diferença |
|---|---|---|---|---|---|---|
| PADRAO Carregando (lista) | carregando | pc | 0.53% | 1280×800 / 1280×800 | **OK** | `PADRAO-carregando-pc--diff.png` |
| PADRAO Carregando (lista) | carregando | celular | 0.65% | 390×844 / 390×844 | **OK** | `PADRAO-carregando-celular--diff.png` |
| PADRAO Carregando (formulário) | carregando | pc | 0.53% | 1280×800 / 1280×800 | **OK** | `PADRAO-carregando-pc--diff.png` |
| PADRAO Carregando (formulário) | carregando | celular | 0.00% | 390×844 / 390×844 | **OK** | `PADRAO-carregando-celular--diff.png` |
| PADRAO Erro de rede | erro | pc | 0.08% | 1280×800 / 1280×800 | **OK** | `PADRAO-erro-pc--diff.png` |
| PADRAO Erro de rede | erro | celular | 0.24% | 390×844 / 390×844 | **OK** | `PADRAO-erro-celular--diff.png` |

DIVERGE = acima do limite **ou** página com tamanho diferente do mockup. Abra o `--diff.png` (vermelho = pixel diferente) e os prints `--mockup.png`/`--app.png` lado a lado antes de concluir.
