import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const RESPOSTAS = join(import.meta.dirname, '../../../../.md/mockup/respostas');

/** Lê a resposta do mockup trocando os ids `j-xxx` por uuids, que é o que a entrada do contrato exige. */
function lerComUuids(nome: string): string {
  const ids = new Map<string, string>();
  return readFileSync(join(RESPOSTAS, nome), 'utf8').replace(/"(j-[a-z]+)"/g, (_, id: string) => {
    if (!ids.has(id)) ids.set(id, `00000000-0000-4000-8000-${String(ids.size + 1).padStart(12, '0')}`);
    return `"${ids.get(id)}"`;
  });
}

const json = (corpo: string, status = 200) => ({ status, contentType: 'application/json', body: corpo });
const arquivo = (nome: string) => readFileSync(join(RESPOSTAS, nome), 'utf8');

async function simularApi(page: Page) {
  const sugestao = lerComUuids('simulador-sugestao-varios.json');
  const escalacoes: unknown[] = [];
  await page.route('**/api/sessao/eu', (r) => r.fulfill(json(arquivo('sessao-eu-admin.json'))));
  await page.route('**/api/grupos/g-quinta', (r) => r.fulfill(json(arquivo('grupo-quinta.json'))));
  await page.route('**/api/grupos/g-quinta/simulador/contexto*', (r) =>
    r.fulfill(json(lerComUuids('simulador-contexto-2026-10-22.json'))),
  );
  await page.route('**/api/grupos/g-quinta/simulador/previa', (r) =>
    r.fulfill(json(arquivo('simulador-previa-varios.json'))),
  );
  await page.route('**/api/grupos/g-quinta/simulador/sugerir', (r) => r.fulfill(json(sugestao)));
  await page.route('**/api/grupos/g-quinta/simulador/avaliar', (r) => r.fulfill(json(sugestao)));
  await page.route('**/api/grupos/g-quinta/escalacoes', (r) => {
    escalacoes.push(r.request().postDataJSON());
    return r.fulfill(json(JSON.stringify({ data: '2026-10-22', confirmadaEm: '2026-10-22T15:00:00.000Z' }), 201));
  });
  return { escalacoes };
}

test.describe('T12 → T14: simulador com 3 ou mais times (respostas falsas)', () => {
  test('sugerir, mover um jogador de time, confirmar e voltar ao início', async ({ page }) => {
    const { escalacoes } = await simularApi(page);
    await page.goto('/admin/g-quinta/simulador');
    await page.getByLabel('3 ou mais times').check();
    await expect(page.getByText('4 times de 4 + 1 time incompleto de 2')).toBeVisible();

    await page.getByRole('button', { name: 'Sugerir times' }).click();
    await expect(page.getByText('qui, 22/10 · 4 times de 4 + 1 time incompleto de 2')).toBeVisible();
    await expect(page.getByText('Incompleto (2 de 4)')).toBeVisible();

    await page.getByRole('button', { name: /Vini/ }).click();
    await page.getByRole('button', { name: 'Mover para Time 2' }).click();
    await expect(page.getByRole('button', { name: 'Confirmar escalação' })).toBeEnabled();
    await page.getByRole('button', { name: 'Confirmar escalação' }).click();

    await expect(page.getByText('Escalação de 22/10 confirmada.')).toBeVisible();
    expect(escalacoes[0]).toMatchObject({ formato: 'varios_times', n: 4 });
  });

  test('a grade tem 1 coluna no celular, 2 a partir de 600 px e 3 a partir de 1024 px', async ({ page }) => {
    await simularApi(page);
    await page.goto('/admin/g-quinta/simulador');
    await page.getByLabel('3 ou mais times').check();
    await page.getByRole('button', { name: 'Sugerir times' }).click();
    await expect(page.getByText('Incompleto (2 de 4)')).toBeVisible();
    const colunas = async () =>
      page
        .locator('section[aria-labelledby]')
        .first()
        .evaluate((cartao) => {
          const grade = cartao.parentElement;
          return grade ? getComputedStyle(grade).gridTemplateColumns.split(' ').length : 0;
        });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await colunas()).toBe(1);
    await page.setViewportSize({ width: 700, height: 900 });
    expect(await colunas()).toBe(2);
    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await colunas()).toBe(3);
  });
});
