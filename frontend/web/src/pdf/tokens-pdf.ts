import tokensCss from '../estilos/tokens.css?raw';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface CoresSituacao {
  fundo: Rgb;
  texto: Rgb;
}

/** Cores (RGB) e medidas (pt) do PDF, lidas dos tokens do app: nada literal no desenho. */
export interface TokensPdf {
  cor: {
    superficie: Rgb;
    zebra: Rgb;
    texto: Rgb;
    textoSecundario: Rgb;
    linha: Rgb;
    verde: Rgb;
    presente: CoresSituacao;
    lesionado: CoresSituacao;
    expulso: CoresSituacao;
    falta: CoresSituacao;
  };
  /** Tamanhos de fonte em pt. */
  fonte: { titulo: number; sub: number; pontos: number; texto: number; pequeno: number; rodape: number; mes: number };
  /** Espaçamentos em pt (os tokens são em px; 1 px = 0,75 pt). */
  espaco: { e1: number; e2: number; e3: number; e4: number };
}

const PX_PARA_PT = 0.75;

/** Todas as variáveis `--nome: valor;` do CSS (a última definição vale). */
export function lerVariaveis(css: string): Map<string, string> {
  const variaveis = new Map<string, string>();
  for (const achado of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const [, nome, valor] = achado;
    if (nome && valor) variaveis.set(nome, valor.replace(/\/\*.*?\*\//g, '').trim());
  }
  return variaveis;
}

export function hexParaRgb(hex: string): Rgb {
  const achado = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!achado) throw new Error(`Cor inválida nos tokens: "${hex}".`);
  return { r: parseInt(achado[1]!, 16), g: parseInt(achado[2]!, 16), b: parseInt(achado[3]!, 16) };
}

/** Lê tokens do CSS (padrão: o do app). Variável ausente ou fora do formato é erro explícito. */
export function tokensPdf(css: string = tokensCss): TokensPdf {
  const variaveis = lerVariaveis(css);
  const valor = (nome: string): string => {
    const v = variaveis.get(nome);
    if (v === undefined) throw new Error(`Token ausente: ${nome}.`);
    return v;
  };
  const cor = (nome: string): Rgb => hexParaRgb(valor(nome));
  const pt = (nome: string): number => {
    const achado = /^(\d+(?:\.\d+)?)pt$/.exec(valor(nome));
    if (!achado) throw new Error(`Token ${nome} precisa estar em pt: "${valor(nome)}".`);
    return Number(achado[1]);
  };
  const px = (nome: string): number => {
    const achado = /^(\d+(?:\.\d+)?)px$/.exec(valor(nome));
    if (!achado) throw new Error(`Token ${nome} precisa estar em px: "${valor(nome)}".`);
    return Number(achado[1]) * PX_PARA_PT;
  };
  const situacao = (letra: 'p' | 'l' | 'e' | 'f'): CoresSituacao => ({
    fundo: cor(`--cor-${letra}-fundo`),
    texto: cor(`--cor-${letra}-texto`),
  });
  return {
    cor: {
      superficie: cor('--cor-superficie'),
      zebra: cor('--cor-zebra'),
      texto: cor('--cor-texto'),
      textoSecundario: cor('--cor-texto-sec'),
      linha: cor('--cor-linha'),
      verde: cor('--cor-verde'),
      presente: situacao('p'),
      lesionado: situacao('l'),
      expulso: situacao('e'),
      falta: situacao('f'),
    },
    fonte: {
      titulo: pt('--pdf-titulo'),
      sub: pt('--pdf-sub'),
      pontos: pt('--pdf-pontos'),
      texto: pt('--pdf-texto'),
      pequeno: pt('--pdf-pequeno'),
      rodape: pt('--pdf-rodape'),
      mes: pt('--pdf-mes'),
    },
    espaco: { e1: px('--esp-1'), e2: px('--esp-2'), e3: px('--esp-3'), e4: px('--esp-4') },
  };
}
