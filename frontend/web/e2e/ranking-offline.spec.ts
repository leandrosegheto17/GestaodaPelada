import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const RESPOSTAS = join(import.meta.dirname, '../../../.md/mockup/respostas');
const corpo = (nome: string): string => readFileSync(join(RESPOSTAS, nome), 'utf8');

const RANKING = '**/api/publico/pelada-de-quinta/ranking*';
const EVENTOS = '**/api/publico/pelada-de-quinta/eventos';

test.describe('Ranking público sem conexão', () => {
  test('visita online, depois offline: mostra o guardado com a hora e avisa para entrar', async ({ page, context }) => {
    let eventos = 0;
    await page.route(RANKING, (rota) =>
      rota.fulfill({ status: 200, contentType: 'application/json', body: corpo('publico-ranking-2026-10.json') }),
    );
    await page.route(EVENTOS, (rota) => {
      eventos += 1;
      return rota.fulfill({ status: 204 });
    });
    await page.goto('/g/pelada-de-quinta');
    await expect(page.getByRole('heading', { level: 1, name: 'Pelada de Quinta' })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await expect.poll(() => eventos).toBe(1);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Pelada de Quinta' })).toBeVisible();
    await expect(page.getByText('Sem conexão, atualizado em 22/10 18:40')).toBeVisible();

    await page.getByRole('link', { name: 'Área do admin' }).click();
    await expect(page.getByText('É preciso conexão para entrar.')).toBeVisible();
    expect(eventos).toBe(1);
  });

  test('offline e sem nenhum ranking guardado: mostra Sem conexão', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await context.setOffline(true);
    await page.goto('/g/racha-de-domingo');
    await expect(page.getByRole('heading', { level: 1, name: 'Sem conexão' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveText('Conecte-se para ver o ranking.');
  });
});
