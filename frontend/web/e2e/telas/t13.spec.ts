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

async function simularApi(page: Page) {
  const sugestao = lerComUuids('simulador-sugestao-dois.json');
  const avaliacao = JSON.stringify(
    Object.fromEntries(
      Object.entries(JSON.parse(sugestao) as Record<string, unknown>).filter(([k]) => k !== 'ordemPrioridade'),
    ),
  );
  const escalacoes: unknown[] = [];
  await page.route('**/api/sessao/eu', (r) =>
    r.fulfill(json(readFileSync(join(RESPOSTAS, 'sessao-eu-admin.json'), 'utf8'))),
  );
  await page.route('**/api/grupos/g-quinta', (r) =>
    r.fulfill(json(readFileSync(join(RESPOSTAS, 'grupo-quinta.json'), 'utf8'))),
  );
  await page.route('**/api/grupos/g-quinta/simulador/contexto*', (r) =>
    r.fulfill(json(lerComUuids('simulador-contexto-2026-10-22.json'))),
  );
  await page.route('**/api/grupos/g-quinta/simulador/previa', (r) =>
    r.fulfill(json(readFileSync(join(RESPOSTAS, 'simulador-previa-dois.json'), 'utf8'))),
  );
  await page.route('**/api/grupos/g-quinta/simulador/sugerir', (r) => r.fulfill(json(sugestao)));
  await page.route('**/api/grupos/g-quinta/simulador/avaliar', (r) => r.fulfill(json(avaliacao)));
  await page.route('**/api/grupos/g-quinta/escalacoes', (r) => {
    escalacoes.push(r.request().postDataJSON());
    return r.fulfill(json(JSON.stringify({ data: '2026-10-22', confirmadaEm: '2026-10-22T15:00:00.000Z' }), 201));
  });
  return { escalacoes };
}

test.describe('T12 → T13: simulador com respostas falsas', () => {
  test('sugerir, mover um jogador, confirmar e voltar ao início com a faixa', async ({ page }) => {
    const { escalacoes } = await simularApi(page);
    await page.goto('/admin/g-quinta/simulador');
    await expect(page.getByText('2 times de 7 · 5 reservas')).toBeVisible();

    await page.getByRole('button', { name: 'Sugerir times' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Times sugeridos' })).toBeVisible();
    await expect(page.getByText('qui, 22/10 · 2 times de 7 · até 2 substituições por time')).toBeVisible();

    await page.getByRole('button', { name: /Japa/ }).click();
    await page.getByRole('button', { name: 'Não entra' }).click();
    await expect(page.getByRole('button', { name: 'Confirmar escalação' })).toBeEnabled();

    await page.getByRole('button', { name: 'Confirmar escalação' }).click();
    await expect(page.getByText('Escalação de 22/10 confirmada.')).toBeVisible();
    expect(escalacoes).toHaveLength(1);
    expect(escalacoes[0]).toMatchObject({ formato: 'dois_times', data: '2026-10-22', n: 7 });
  });

  test('recarregar o resultado sem estado volta às entradas', async ({ page }) => {
    await simularApi(page);
    await page.goto('/admin/g-quinta/simulador/resultado');
    await expect(page.getByRole('heading', { level: 1, name: 'Simulador' })).toBeVisible();
  });
});
