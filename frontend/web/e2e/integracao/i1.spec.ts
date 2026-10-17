import { randomUUID } from 'node:crypto';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { EMAIL_DONO, EMAIL_MARQUINHOS, SENHA_DE_TESTE } from '../../../../backend/scripts/seed-local/ids';
import { aceitarAvisoDePrivacidade, entrarComo } from './apoio/sessao';

const sufixo = randomUUID().slice(0, 8);
const NOME_DO_GRUPO = `Racha E2E ${sufixo}`;
const EMAIL_ADMIN = `e2e-${sufixo}@exemplo.com.br`;
const SENHA_NOVA = `Senha-nova-${sufixo}`;
const APELIDOS = [`Ana ${sufixo}`, `Beto ${sufixo}`, `Caio ${sufixo}`];

interface Estado {
  grupoId: string;
  slug: string;
  senhaTemporaria: string;
}
const estado: Partial<Estado> = {};

async function novoContexto(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

test.describe.serial('I1: do grupo novo ao ranking público', () => {
  test('o dono cria o grupo e lê a senha temporária do primeiro admin', async ({ page }) => {
    await entrarComo(page, EMAIL_DONO, SENHA_DE_TESTE);
    await expect(page).toHaveURL(/\/dono$/);
    await page.getByRole('link', { name: 'Novo grupo' }).first().click();
    await page.getByLabel('Nome do grupo').fill(NOME_DO_GRUPO);
    await page.getByLabel('Dia da semana').selectOption('quinta');
    await page.getByLabel('Horário').fill('20:00');
    await page.getByLabel('Nome', { exact: true }).fill('Admin E2E');
    await page.getByLabel('E-mail', { exact: true }).fill(EMAIL_ADMIN);

    const resposta = page.waitForResponse(
      (r) => r.url().endsWith('/api/dono/grupos') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Criar grupo' }).click();
    const criado = (await (await resposta).json()) as {
      grupo: { id: string; slug: string };
      primeiroAdmin: { senhaTemporaria: string };
    };
    estado.grupoId = criado.grupo.id;
    estado.slug = criado.grupo.slug;
    estado.senhaTemporaria = criado.primeiroAdmin.senhaTemporaria;
    await expect(page.getByRole('dialog', { name: /Senha temporária de Admin E2E/ })).toBeVisible();
  });

  test('o primeiro admin entra com a temporária e define a própria senha', async ({ browser }) => {
    const page = await novoContexto(browser);
    await entrarComo(page, EMAIL_ADMIN, estado.senhaTemporaria ?? '');
    await expect(page).toHaveURL(/\/entrar\/nova-senha/);
    await page.getByLabel('Nova senha', { exact: true }).fill(SENHA_NOVA);
    await page.getByLabel('Confirmar nova senha').fill(SENHA_NOVA);
    await page.getByRole('button', { name: 'Salvar e continuar' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin(/${estado.grupoId})?$`));
    await expect(page.getByRole('heading', { level: 1, name: `Início do admin: ${NOME_DO_GRUPO}` })).toBeAttached();
  });

  test('a senha temporária deixa de valer depois da troca', async ({ browser }) => {
    const page = await novoContexto(browser);
    await entrarComo(page, EMAIL_ADMIN, estado.senhaTemporaria ?? '');
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.');
  });

  test('o admin cadastra 3 jogadores e lança a partida na data sugerida', async ({ browser }) => {
    const page = await novoContexto(browser);
    await entrarComo(page, EMAIL_ADMIN, SENHA_NOVA);
    // Os jogadores entram na data que a tela de partida sugere, para estarem ativos nela.
    await page.goto(`/admin/${estado.grupoId}/partidas/nova`);
    await aceitarAvisoDePrivacidade(page);
    const dataSugerida = await page.getByLabel('Data', { exact: true }).inputValue();
    for (const apelido of APELIDOS) {
      await page.goto(`/admin/${estado.grupoId}/jogadores/novo`);
      await page.getByLabel('Apelido').fill(apelido);
      await page.getByLabel('Data de entrada').fill(dataSugerida);
      await page.getByLabel('Ano de nascimento').fill('1990');
      await page.getByLabel('Posição').selectOption('meio_campo');
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByRole('heading', { level: 1, name: apelido })).toBeVisible();
    }
    await page.goto(`/admin/${estado.grupoId}/jogadores`);
    for (const apelido of APELIDOS) await expect(page.getByRole('link', { name: new RegExp(apelido) })).toBeVisible();

    await page.goto(`/admin/${estado.grupoId}/partidas/nova`);
    await expect(page.getByRole('radiogroup', { name: `Situação de ${APELIDOS[0]}` })).toBeVisible();
    await page
      .getByRole('radiogroup', { name: `Situação de ${APELIDOS[0]}` })
      .getByText('Presente')
      .click();
    await page
      .getByRole('radiogroup', { name: `Situação de ${APELIDOS[1]}` })
      .getByText('Ausente')
      .click();
    await page
      .getByRole('radiogroup', { name: `Situação de ${APELIDOS[2]}` })
      .getByText('Lesionado')
      .click();
    await page.getByRole('button', { name: /^Salvar partida/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/${estado.grupoId}$`));
    await expect(page.getByRole('status')).toContainText('salva');
  });

  test('o ranking público mostra os 3 jogadores com os pontos dos pesos vigentes', async ({ browser }) => {
    const admin = await novoContexto(browser);
    await entrarComo(admin, EMAIL_ADMIN, SENHA_NOVA);
    await expect(admin).toHaveURL(/\/admin/);
    const respostaPesos = await admin.request.get(`/api/grupos/${estado.grupoId}/pesos`);
    expect(respostaPesos.status(), await respostaPesos.text()).toBe(200);
    const pesos = (await respostaPesos.json()) as {
      vigente: { presencaSemChuva: number; lesionadoSemChuva: number };
    };
    const publico = await novoContexto(browser);
    await publico.goto(`/g/${estado.slug}`);
    for (const apelido of APELIDOS) await expect(publico.getByRole('rowheader', { name: apelido })).toBeVisible();
    const linha = (apelido: string) => publico.getByRole('rowheader', { name: apelido }).locator('xpath=..');
    await expect(linha(APELIDOS[0] ?? '')).toContainText(`Presente, ${pesos.vigente.presencaSemChuva}`);
    await expect(linha(APELIDOS[2] ?? '')).toContainText(`Lesionado, ${pesos.vigente.lesionadoSemChuva}`);
  });

  test('admin de outro grupo recebe 404 na URL do grupo (isolamento)', async ({ browser }) => {
    const page = await novoContexto(browser);
    await entrarComo(page, EMAIL_MARQUINHOS, SENHA_DE_TESTE);
    await expect(page).toHaveURL(/\/admin/);
    const direto = await page.request.get(`/api/grupos/${estado.grupoId}`);
    expect(direto.status()).toBe(404);
    expect((await page.request.get(`/api/grupos/${estado.grupoId}/jogadores`)).status()).toBe(404);
    await page.goto(`/admin/${estado.grupoId}`);
    // A guarda de navegação leva quem não é do grupo para a própria área; o grupo alheio nunca aparece.
    await expect(page).toHaveURL(
      (url) => /^\/admin(\/[0-9a-f-]{36})?$/.test(url.pathname) && !url.pathname.includes(estado.grupoId ?? ''),
    );
    await expect(page.getByRole('heading', { level: 1, name: new RegExp(NOME_DO_GRUPO) })).toHaveCount(0);
  });

  test('anônimo em /admin vai para a entrada com o destino', async ({ browser }) => {
    const page = await novoContexto(browser);
    await page.goto(`/admin/${estado.grupoId}`);
    await expect(page).toHaveURL(/\/entrar\?destino=/);
  });
});
