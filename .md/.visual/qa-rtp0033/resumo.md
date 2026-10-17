# Comparação visual mockup × aplicação (2026-10-17)

Aplicação: `http://localhost:28946` · Limite: 1% de pixels · Limiar por canal: 0.1 · Imagens: `C:/Leandro/Projetos/GestaodaPelada/.md/.visual/qa-rtp0033`

| Tela | Estado | Tamanho | Pixels divergentes | Altura mockup / app | Resultado | Diferença |
|---|---|---|---|---|---|---|
| T16 Ficha do jogador | edicao | pc | 0.18% | 1280×1382 / 1280×1382 | **OK** | `T16-edicao-pc--diff.png` |
| T16 Ficha do jogador | edicao | celular | 0.41% | 390×1607 / 390×1607 | **OK** | `T16-edicao-celular--diff.png` |
| T16 Ficha do jogador | novo | pc | 0.00% | 1280×800 / 1280×800 | **OK** | `T16-novo-pc--diff.png` |
| T16 Ficha do jogador | novo | celular | 0.00% | 390×844 / 390×844 | **OK** | `T16-novo-celular--diff.png` |
| T16 Ficha do jogador | sem-habilidades | pc | 4.60% | 512×263 / 512×263 | **DIVERGE** | `T16-sem-habilidades-pc--diff.png` |
| T16 Ficha do jogador | sem-habilidades | celular | 5.98% | 358×263 / 358×263 | **DIVERGE** | `T16-sem-habilidades-celular--diff.png` |

DIVERGE = acima do limite **ou** página com tamanho diferente do mockup. Abra o `--diff.png` (vermelho = pixel diferente) e os prints `--mockup.png`/`--app.png` lado a lado antes de concluir.
