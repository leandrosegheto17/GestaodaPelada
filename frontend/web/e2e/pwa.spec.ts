import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const RESPOSTAS = join(import.meta.dirname, '../../../.md/mockup/respostas');
const corpo = (nome: string): string => readFileSync(join(RESPOSTAS, nome), 'utf8');

const RANKING = '**/api/publico/pelada-de-quinta/ranking*';

test.describe('PWA', () => {
  test('manifesto acessível e service worker instalado, sem erros de instalabilidade', async ({ page, request }) => {
    const resposta = await request.get('/manifest.webmanifest');
    expect(resposta.ok()).toBe(true);
    const manifesto = (await resposta.json()) as { display: string; icons: unknown[] };
    expect(manifesto.display).toBe('standalone');
    expect(manifesto.icons).toHaveLength(3);

    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    const cdp = await page.context().newCDPSession(page);
    const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as {
      installabilityErrors: unknown[];
    };
    expect(installabilityErrors).toEqual([]);
  });

  test('ranking já visitado volta do cache offline; outras rotas da API não ficam em cache', async ({
    page,
    context,
  }) => {
    await context.route(RANKING, (rota) =>
      rota.fulfill({ status: 200, contentType: 'application/json', body: corpo('publico-ranking-2026-10.json') }),
    );
    await context.route('**/api/grupos/g-quinta', (rota) =>
      rota.fulfill({ status: 200, contentType: 'application/json', body: corpo('grupo-quinta.json') }),
    );
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    const pedir = (caminho: string) =>
      page.evaluate(async (c) => {
        try {
          return (await fetch(c)).status;
        } catch {
          return 0;
        }
      }, caminho);
    expect(await pedir('/api/publico/pelada-de-quinta/ranking?mes=2026-10')).toBe(200);
    expect(await pedir('/api/grupos/g-quinta')).toBe(200);

    await context.unroute(RANKING);
    await context.unroute('**/api/grupos/g-quinta');
    await context.setOffline(true);
    expect(await pedir('/api/publico/pelada-de-quinta/ranking?mes=2026-10')).toBe(200);
    expect(await pedir('/api/grupos/g-quinta')).toBe(0);
  });

  test('com enderecoNovo numa resposta, a navegação seguinte vai à rede', async ({ page, context }) => {
    await context.route('**/api/sessao/eu', (rota) =>
      rota.fulfill({ status: 200, contentType: 'application/json', body: corpo('sessao-eu-endereco-novo.json') }),
    );
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await page.evaluate(() => fetch('/api/sessao/eu').then(() => undefined));
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await caches.has('pelada-sinais')) && (await (await caches.open('pelada-sinais')).keys()).length,
        ),
      )
      .toBe(1);
    let documentosNaRede = 0;
    await context.route('**/*', (rota) => {
      if (rota.request().url().endsWith('/g/pelada-de-quinta')) documentosNaRede += 1;
      return rota.continue();
    });
    await page.goto('/g/pelada-de-quinta');
    expect(documentosNaRede).toBeGreaterThan(0);
  });
});
