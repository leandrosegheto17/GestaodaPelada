# Comparação visual mockup × aplicação (2026-10-17)

Aplicação: `http://localhost:24523` · Limite: 1% de pixels · Limiar por canal: 0.1 · Imagens: `C:/Leandro/Projetos/GestaodaPelada/.md/.visual/qa-rtp0045`

| Tela | Estado | Tamanho | Pixels divergentes | Altura mockup / app | Resultado | Diferença |
|---|---|---|---|---|---|---|
| T11 Lançar partida | nova | pc | 0.00% | 1280×1161 / 1280×1161 | **OK** | `T11-nova-pc--diff.png` |
| T11 Lançar partida | nova | celular | 0.00% | 390×1959 / 390×1959 | **OK** | `T11-nova-celular--diff.png` |
| T11 Editar partida | edicao | pc | 0.01% | 1280×1122 / 1280×1122 | **OK** | `T11-edicao-pc--diff.png` |
| T11 Editar partida | edicao | celular | 0.11% | 390×1898 / 390×1898 | **OK** | `T11-edicao-celular--diff.png` |
| T11 Lançar partida | carregando | pc | 0.65% | 1280×800 / 1280×800 | **OK** | `T11-carregando-pc--diff.png` |
| T11 Lançar partida | carregando | celular | 0.65% | 390×844 / 390×844 | **OK** | `T11-carregando-celular--diff.png` |
| T11 Lançar partida | vazio | pc | 0.00% | 1280×800 / 1280×800 | **OK** | `T11-vazio-pc--diff.png` |
| T11 Lançar partida | vazio | celular | 0.00% | 390×844 / 390×844 | **OK** | `T11-vazio-celular--diff.png` |
| T11 Lançar partida | data-futura | pc | 0.00% | 1280×800 / 1280×800 | **OK** | `T11-data-futura-pc--diff.png` |
| T11 Lançar partida | data-futura | celular | 0.00% | 390×844 / 390×844 | **OK** | `T11-data-futura-celular--diff.png` |
| T11 Lançar partida | duplicada | pc | 0.00% | 1280×800 / 1280×800 | **OK** | `T11-duplicada-pc--diff.png` |
| T11 Lançar partida | duplicada | celular | 0.00% | 390×844 / 390×844 | **OK** | `T11-duplicada-celular--diff.png` |

DIVERGE = acima do limite **ou** página com tamanho diferente do mockup. Abra o `--diff.png` (vermelho = pixel diferente) e os prints `--mockup.png`/`--app.png` lado a lado antes de concluir.
