import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { diferencaDePixels, rasterizarPrimeiraPagina } from './apoio/pdf-pixels';

const RESPOSTAS = join(import.meta.dirname, '../../../.md/mockup/respostas');
const TELAS = join(import.meta.dirname, '../../../.md/mockup/telas');
const RESULTADOS = join(import.meta.dirname, 'resultado');
const resposta = (nome: string) => readFileSync(join(RESPOSTAS, nome), 'utf8');
const json = (corpo: string) => ({ status: 200, contentType: 'application/json', body: corpo });

/** Limite do PDF (ADR-019): rasterizador do PDF e do navegador suavizam o texto de formas diferentes; telas seguem em 1%. */
const LIMITE_PDF = 0.045;

const ESTADOS = [
  { nome: 'sucesso', mes: '2026-10', pdf: 'publico-pdf-2026-10.json', ranking: 'publico-ranking-2026-10.json' },
  { nome: 'mes-vazio', mes: '2026-07', pdf: 'publico-pdf-2026-07.json', ranking: 'publico-ranking-2026-07.json' },
] as const;

async function abrirRanking(page: Page, estado: (typeof ESTADOS)[number]) {
  await page.route('**/api/publico/pelada-de-quinta/ranking*', (r) => r.fulfill(json(resposta(estado.ranking))));
  await page.route('**/api/publico/pelada-de-quinta/pdf*', (r) => r.fulfill(json(resposta(estado.pdf))));
  await page.route('**/api/publico/pelada-de-quinta/eventos', (r) => r.fulfill({ status: 204 }));
  await page.goto(`/g/pelada-de-quinta?mes=${estado.mes}`);
}

// O PDF é rasterizado em tons de cinza; o mockup também, para o texto não diferir só pela suavização colorida.
test.use({ launchOptions: { args: ['--disable-lcd-text'] } });

for (const estado of ESTADOS) {
  test(`PDF do ranking (${estado.nome}) confere com o mockup P01`, async ({ page, context }) => {
    await abrirRanking(page, estado);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar PDF' }).first().click();
    const arquivo = await (await download).path();
    const pdf = readFileSync(arquivo);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');

    const raster = await context.newPage();
    const obtido = await rasterizarPrimeiraPagina(raster, pdf);

    const mockup = await context.newPage();
    await mockup.setViewportSize({ width: 860, height: 1200 });
    await mockup.goto(pathToFileURL(join(TELAS, `p01-pdf--${estado.nome}.html`)).toString());
    const esperado = await mockup.locator('.pdf-folha').screenshot();

    const diferenca = await diferencaDePixels(await context.newPage(), obtido, esperado);
    mkdirSync(RESULTADOS, { recursive: true });
    writeFileSync(join(RESULTADOS, `pdf-${estado.nome}-obtido.png`), obtido);
    writeFileSync(join(RESULTADOS, `pdf-${estado.nome}-mockup.png`), esperado);
    expect(`${diferenca.largura}x${diferenca.altura}`).toBe('794x1123');
    expect(diferenca.proporcao, `${(diferenca.proporcao * 100).toFixed(2)}% dos pixels divergem`).toBeLessThanOrEqual(
      LIMITE_PDF,
    );
  });
}
