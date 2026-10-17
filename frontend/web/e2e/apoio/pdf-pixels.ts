import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Page } from '@playwright/test';

const requerer = createRequire(import.meta.url);
const principal = () => readFileSync(requerer.resolve('pdfjs-dist/build/pdf.min.mjs'), 'utf8');
const trabalhador = () => readFileSync(requerer.resolve('pdfjs-dist/build/pdf.worker.min.mjs'), 'utf8');

/** Escala de 72 dpi (pt) para 96 dpi (px): a folha A4 vira 794 × 1123 px. */
export const ESCALA_PT_PARA_PX = 96 / 72;

/**
 * Desenha a 1ª página do PDF num canvas, dentro do navegador, e devolve o PNG. O pdfjs-dist só existe nos
 * testes (devDependency): o app nunca o carrega.
 */
export async function rasterizarPrimeiraPagina(page: Page, pdf: Buffer): Promise<Buffer> {
  await page.goto('about:blank');
  const urlDe = (texto: string) =>
    page.evaluate((conteudo) => URL.createObjectURL(new Blob([conteudo], { type: 'text/javascript' })), texto);
  const [urlLib, urlTrabalhador] = [await urlDe(principal()), await urlDe(trabalhador())];
  await page.addScriptTag({
    type: 'module',
    content: `import * as lib from '${urlLib}'; lib.GlobalWorkerOptions.workerSrc = '${urlTrabalhador}'; window.pdfjsLib = lib;`,
  });
  await page.waitForFunction(() => 'pdfjsLib' in window);
  const dataUrl = await page.evaluate(
    async ({ base64, escala }) => {
      const lib: typeof import('pdfjs-dist') = Reflect.get(window, 'pdfjsLib');
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const documento = await lib.getDocument({ data: bytes }).promise;
      const pagina = await documento.getPage(1);
      const viewport = pagina.getViewport({ scale: escala });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      // Contexto com alfa: o texto sai em tons de cinza, como no navegador (sem franjas coloridas de LCD).
      const canvasContext = canvas.getContext('2d', { alpha: true });
      if (!canvasContext) throw new Error('Sem contexto 2D.');
      await pagina.render({ canvas, canvasContext, viewport }).promise;
      return canvas.toDataURL('image/png');
    },
    { base64: pdf.toString('base64'), escala: ESCALA_PT_PARA_PX },
  );
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
}

export interface DiferencaDePixels {
  largura: number;
  altura: number;
  divergentes: number;
  proporcao: number;
}

/** Compara dois PNGs pixel a pixel (canal a canal, tolerância pequena) dentro do navegador. */
export async function diferencaDePixels(page: Page, a: Buffer, b: Buffer, tolerancia = 24): Promise<DiferencaDePixels> {
  await page.goto('about:blank');
  return page.evaluate(
    async ({ pngA, pngB, limite }) => {
      const carregar = async (base64: string) => {
        const imagem = new Image();
        imagem.src = `data:image/png;base64,${base64}`;
        await imagem.decode();
        const canvas = document.createElement('canvas');
        canvas.width = imagem.naturalWidth;
        canvas.height = imagem.naturalHeight;
        const contexto = canvas.getContext('2d');
        if (!contexto) throw new Error('Sem contexto 2D.');
        contexto.drawImage(imagem, 0, 0);
        return contexto.getImageData(0, 0, canvas.width, canvas.height);
      };
      const [x, y] = await Promise.all([carregar(pngA), carregar(pngB)]);
      if (x.width !== y.width || x.height !== y.height) {
        return { largura: x.width, altura: x.height, divergentes: x.width * x.height, proporcao: 1 };
      }
      let divergentes = 0;
      for (let i = 0; i < x.data.length; i += 4) {
        const dif = Math.max(
          Math.abs((x.data[i] ?? 0) - (y.data[i] ?? 0)),
          Math.abs((x.data[i + 1] ?? 0) - (y.data[i + 1] ?? 0)),
          Math.abs((x.data[i + 2] ?? 0) - (y.data[i + 2] ?? 0)),
        );
        if (dif > limite) divergentes += 1;
      }
      const total = x.width * x.height;
      return { largura: x.width, altura: x.height, divergentes, proporcao: divergentes / total };
    },
    { pngA: a.toString('base64'), pngB: b.toString('base64'), limite: tolerancia },
  );
}
