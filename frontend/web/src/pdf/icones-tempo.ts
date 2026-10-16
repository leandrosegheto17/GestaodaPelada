import type { jsPDF } from 'jspdf';
import type { Rgb } from './tokens-pdf';

const RAIOS = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Sol (sem chuva) ou nuvem com chuva, centrado em (cx, cy) e com `tamanho` de lado, em pt. Traço simples
 * na cor recebida; é o mesmo desenho do ícone da tela, em linhas e círculos.
 */
export function desenharIconeTempo(
  doc: jsPDF,
  cx: number,
  cy: number,
  tamanho: number,
  choveu: boolean,
  cor: Rgb,
): void {
  const u = tamanho / 24;
  doc.setDrawColor(cor.r, cor.g, cor.b);
  doc.setFillColor(cor.r, cor.g, cor.b);
  doc.setLineWidth(Math.max(0.4, 2.2 * u));
  doc.setLineCap('round');
  doc.setLineDashPattern([], 0);
  if (!choveu) {
    doc.circle(cx, cy, 4 * u, 'S');
    for (const graus of RAIOS) {
      const a = (graus * Math.PI) / 180;
      doc.line(
        cx + Math.cos(a) * 8 * u,
        cy + Math.sin(a) * 8 * u,
        cx + Math.cos(a) * 10 * u,
        cy + Math.sin(a) * 10 * u,
      );
    }
    return;
  }
  // Nuvem: três círculos e uma base; chuva: três traços.
  doc.circle(cx - 4 * u, cy - 1 * u, 4 * u, 'S');
  doc.circle(cx + 1 * u, cy - 3 * u, 5 * u, 'S');
  doc.circle(cx + 5 * u, cy, 4 * u, 'S');
  for (const dx of [-5, -1, 3]) doc.line(cx + dx * u, cy + 5 * u, cx + dx * u, cy + 8 * u);
}
