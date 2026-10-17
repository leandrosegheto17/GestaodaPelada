import type { jsPDF } from 'jspdf';
import type { Rgb } from './tokens-pdf';

type Ponto = [number, number];

/** Lado da grade do desenho do ícone (viewBox 24 × 24 do ícone da tela). */
const GRADE = 24;
const TRACO = 2.5;
const SEGMENTOS_POR_ARCO = 14;

/** Raios do sol: de 8 a 10 da grade, a cada 45 graus. */
const RAIOS: [Ponto, Ponto][] = [0, 45, 90, 135, 180, 225, 270, 315].map((graus) => {
  const a = (graus * Math.PI) / 180;
  return [
    [12 + Math.cos(a) * 8, 12 + Math.sin(a) * 8],
    [12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10],
  ];
});

/** Seis traços da chuva: x, y inicial e 2 de comprimento. */
const GOTAS: [Ponto, Ponto][] = [8, 12, 16].flatMap((x, i) => {
  const alto = i === 1 ? 15 : 13;
  return [
    [
      [x, alto],
      [x, alto + 2],
    ],
    [
      [x, alto + 6],
      [x, alto + 8],
    ],
  ] as [Ponto, Ponto][];
});

/** Pontos de um arco circular SVG (`A r r 0 grande varredura x2 y2`) de `a` até `b`, sem o ponto `a`. */
export function arcoSvg(a: Ponto, b: Ponto, raio: number, grande: boolean, horario: boolean): Ponto[] {
  const dx = (a[0] - b[0]) / 2;
  const dy = (a[1] - b[1]) / 2;
  const sinal = grande === horario ? -1 : 1;
  const coef =
    sinal * Math.sqrt(Math.max(0, (raio ** 4 - raio ** 2 * (dx * dx + dy * dy)) / (raio ** 2 * (dx * dx + dy * dy))));
  const cx = coef * dy + (a[0] + b[0]) / 2;
  const cy = -coef * dx + (a[1] + b[1]) / 2;
  const inicio = Math.atan2(a[1] - cy, a[0] - cx);
  let varrido = Math.atan2(b[1] - cy, b[0] - cx) - inicio;
  if (!horario && varrido > 0) varrido -= 2 * Math.PI;
  if (horario && varrido < 0) varrido += 2 * Math.PI;
  return Array.from({ length: SEGMENTOS_POR_ARCO }, (_, i): Ponto => {
    const t = inicio + (varrido * (i + 1)) / SEGMENTOS_POR_ARCO;
    return [cx + raio * Math.cos(t), cy + raio * Math.sin(t)];
  });
}

/** Contorno da nuvem: dois arcos e a base reta, como no ícone da tela. */
function contornoNuvem(): Ponto[] {
  const ponta: Ponto = [20, 16.58];
  const alto: Ponto = [18, 7];
  const meio: Ponto = [16.74, 7];
  return [ponta, ...arcoSvg(ponta, alto, 5, false, false), meio, ...arcoSvg(meio, [4, 15.25], 8, true, false)];
}

/**
 * Sol (sem chuva) ou nuvem com chuva, centrado em (cx, cy) e com `tamanho` de lado, em pt: o mesmo desenho
 * do ícone da tela, em traços na cor recebida. Devolve o traçado ao estado padrão (ponta reta).
 */
export function desenharIconeTempo(
  doc: jsPDF,
  cx: number,
  cy: number,
  tamanho: number,
  choveu: boolean,
  cor: Rgb,
): void {
  const u = tamanho / GRADE;
  const mapear = ([x, y]: Ponto): Ponto => [cx + (x - GRADE / 2) * u, cy + (y - GRADE / 2) * u];
  const linha = (de: Ponto, ate: Ponto) => {
    const [x1, y1] = mapear(de);
    const [x2, y2] = mapear(ate);
    doc.line(x1, y1, x2, y2);
  };
  doc.setDrawColor(cor.r, cor.g, cor.b);
  doc.setLineWidth(TRACO * u);
  doc.setLineCap('round');
  doc.setLineJoin('round');
  doc.setLineDashPattern([], 0);
  if (choveu) {
    const pontos = contornoNuvem();
    pontos.slice(1).forEach((p, i) => linha(pontos[i]!, p));
    for (const [de, ate] of GOTAS) linha(de, ate);
  } else {
    doc.circle(cx, cy, 4 * u, 'S');
    for (const [de, ate] of RAIOS) linha(de, ate);
  }
  doc.setLineCap('butt');
  doc.setLineJoin('miter');
}
