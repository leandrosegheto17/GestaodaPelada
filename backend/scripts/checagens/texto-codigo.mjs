// Leitura de código-fonte para as checagens por varredura.

// Literal de texto: o `;` dentro dele não encerra a instrução.
export const LITERAL = /(['"`])(?:\\[\s\S]|(?!\1)[^\\])*\1/g;

// Uma única passada da esquerda para a direita: `//` e `--` dentro de literal de texto (URL, `a--b`) não
// são comentário e não podem apagar o resto da linha. Aspas simples e duplas não atravessam linha.
// `--` só é comentário SQL quando não cola num identificador/fecha-parêntese (`i--`) e é seguido de espaço
// ou fim de linha (`--i` é decremento).
const COMENTARIO_OU_LITERAL =
  /\/\*[\s\S]*?\*\/|\/\/[^\n]*|(?<![\w$)\]])--(?=\s|$)[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\[\s\S]|[^`\\])*`/g;

/** Apaga comentários (de bloco, de linha e SQL) preservando as quebras de linha e os literais. */
export function semComentarios(texto) {
  return texto.replace(COMENTARIO_OU_LITERAL, (m) => {
    if (m.startsWith('/*')) return m.replace(/[^\n]/g, ' ');
    if (m.startsWith('//') || m.startsWith('--')) return '';
    return m;
  });
}
