import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { EMAIL_MARQUINHOS, SENHA_DE_TESTE } from '../../../../backend/scripts/seed-local/ids';
import { cadastrarJogadores, criarGrupoComAdmin, type GrupoDeTeste } from './apoio/grupo';
import { entrarComo } from './apoio/sessao';

const sufixo = randomUUID().slice(0, 8);
const APELIDOS = ['Ana', 'Beto', 'Caio', 'Duda', 'Edu'].map((a) => `${a} ${sufixo}`);

const estado: { grupo?: GrupoDeTeste; admin?: Page; hoje?: string; dataSugerida?: string } = {};
const grupo = (): GrupoDeTeste => {
  if (!estado.grupo) throw new Error('grupo não criado');
  return estado.grupo;
};
const admin = (): Page => {
  if (!estado.admin) throw new Error('admin não autenticado');
  return estado.admin;
};

const diaMes = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

/** Espera uma chamada real da API (sem `page.route`) e confere o status. */
const esperarChamada = (page: Page, metodo: string, termina: string, status: number) =>
  page.waitForResponse(
    (r) => r.request().method() === metodo && new URL(r.url()).pathname.endsWith(termina) && r.status() === status,
  );

test.describe.serial('I2: do simulador à partida pré-marcada e ao ranking', () => {
  test('prepara um grupo novo com 5 jogadores', async ({ browser }) => {
    const { grupo: criado, admin: pagina } = await criarGrupoComAdmin(browser, sufixo);
    estado.grupo = criado;
    estado.admin = pagina;
    await cadastrarJogadores(pagina, criado.grupoId, APELIDOS);
    const lista = await pagina.request.get(`/api/grupos/${criado.grupoId}/jogadores`);
    expect(lista.ok()).toBe(true);
  });

  test('2 times: sugere, ajusta uma troca, confirma e volta ao início com a faixa', async () => {
    const page = admin();
    const contexto = page.waitForResponse((r) => r.url().includes('/simulador/contexto') && r.ok());
    await page.goto(`/admin/${grupo().grupoId}/simulador`);
    const ctx = (await (await contexto).json()) as { hoje: string; dataSugerida: string };
    estado.hoje = ctx.hoje;
    estado.dataSugerida = ctx.dataSugerida;

    // A partida só pode ser lançada até hoje: o simulador usa a data de hoje.
    await page.getByLabel('Data da partida').fill(ctx.hoje);
    await page.getByRole('spinbutton', { name: 'Jogadores por time' }).fill('2');
    await page.getByLabel('Limite de substituições por time').fill('0');
    await expect(page.getByText('2 times de 2 · 1 reserva')).toBeVisible();

    const sugestao = esperarChamada(page, 'POST', '/simulador/sugerir', 200);
    await page.getByRole('button', { name: 'Sugerir times' }).click();
    await sugestao;
    await expect(page.getByRole('heading', { level: 1, name: 'Times sugeridos' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Time A' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Time B' })).toBeVisible();
    const naoEntra = page.getByRole('region', { name: 'Não entra' });
    await expect(naoEntra.getByRole('button')).toHaveCount(1);

    // Ajuste: um titular do Time A troca de lugar com um titular do Time B.
    const titularA = page.getByRole('region', { name: 'Time A' }).getByRole('button').first();
    const nomeA = (await titularA.locator('span').first().textContent()) ?? '';
    await titularA.click();
    await page.getByRole('button', { name: 'Trocar com…' }).click();
    const avaliacao = esperarChamada(page, 'POST', '/simulador/avaliar', 200);
    await page
      .getByRole('dialog')
      .getByRole('button')
      .filter({ hasText: APELIDOS[0] ? /./ : /./ })
      .first()
      .click();
    await expect(page.getByRole('button', { name: 'Confirmar escalação' })).toBeDisabled();
    await avaliacao;
    await expect(page.getByRole('button', { name: 'Confirmar escalação' })).toBeEnabled();
    expect(nomeA).not.toBe('');

    const confirmacao = page.waitForRequest((r) => r.url().endsWith('/escalacoes') && r.method() === 'POST');
    const respostaConfirmacao = esperarChamada(page, 'POST', '/escalacoes', 201);
    await page.getByRole('button', { name: 'Confirmar escalação' }).click();
    const corpo = (await confirmacao).postDataJSON() as {
      composicao: { times: { titulares: unknown[]; entramNo2oTempo: unknown[] }[]; naoEntra: unknown[] };
    };
    const total =
      corpo.composicao.times.reduce((s, t) => s + t.titulares.length + t.entramNo2oTempo.length, 0) +
      corpo.composicao.naoEntra.length;
    expect(total).toBe(5);
    await respostaConfirmacao;
    await expect(page).toHaveURL(new RegExp(`/admin/${grupo().grupoId}$`));
    await expect(page.getByText(`Escalação de ${diaMes(ctx.hoje)} confirmada.`)).toBeVisible();
  });

  test('a partida nova vem pré-marcada pela escalação, inclusive o "não entra", e o ranking público mostra os pontos', async ({
    browser,
  }) => {
    const page = admin();
    await page.goto(`/admin/${grupo().grupoId}/partidas/nova?data=${estado.hoje}`);
    await expect(page.getByText(/Pré-marcado pela escalação de/)).toBeVisible();
    for (const apelido of APELIDOS) {
      await expect(
        page.getByRole('radiogroup', { name: `Situação de ${apelido}` }).getByRole('radio', { name: 'Presente' }),
      ).toBeChecked();
    }
    await page.getByRole('button', { name: /^Salvar partida/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/${grupo().grupoId}$`));
    await expect(page.getByRole('status').first()).toContainText('salva');

    const pesos = (await (await page.request.get(`/api/grupos/${grupo().grupoId}/pesos`)).json()) as {
      vigente: { presencaSemChuva: number };
    };
    const anonimo = await (await browser.newContext()).newPage();
    await anonimo.goto(`/g/${grupo().slug}`);
    for (const apelido of APELIDOS) {
      const linha = anonimo.getByRole('rowheader', { name: apelido }).locator('xpath=..');
      await expect(linha).toContainText(`Presente, ${pesos.vigente.presencaSemChuva}`);
    }
  });

  test('3 ou mais times: sugere, confirma e o início mostra a escalação do próximo jogo', async () => {
    const page = admin();
    await page.goto(`/admin/${grupo().grupoId}/simulador`);
    await page.getByLabel('3 ou mais times').check();
    await page.getByRole('spinbutton', { name: 'Jogadores por time' }).fill('2');
    await expect(page.getByRole('button', { name: 'Sugerir times' })).toBeEnabled();
    const sugestao = esperarChamada(page, 'POST', '/simulador/sugerir', 200);
    await page.getByRole('button', { name: 'Sugerir times' }).click();
    await sugestao;
    await expect(page.getByRole('region', { name: /^Time 3/ })).toBeVisible();
    await expect(page.getByText(/Incompleto \(1 de 2\)/)).toBeVisible();

    const confirmacao = esperarChamada(page, 'POST', '/escalacoes', 201);
    await page.getByRole('button', { name: 'Confirmar escalação' }).click();
    await confirmacao;
    await expect(page.getByText(/Escalação de \d{2}\/\d{2} confirmada\./).first()).toBeVisible();
  });

  test('admin de outro grupo recebe 404 no simulador deste grupo (isolamento)', async ({ browser }) => {
    const page = await (await browser.newContext()).newPage();
    await entrarComo(page, EMAIL_MARQUINHOS, SENHA_DE_TESTE);
    const r = await page.request.post(`/api/grupos/${grupo().grupoId}/simulador/sugerir`, {
      headers: { 'X-Pelada': '1' },
      data: {
        formato: 'varios_times',
        data: estado.hoje,
        n: 2,
        aptos: [{ id: '00000000-0000-4000-8000-000000000001' }],
      },
    });
    expect(r.status()).toBe(404);
  });
});
