import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { EMAIL_MARQUINHOS, SENHA_DE_TESTE } from '../../../../backend/scripts/seed-local/ids';
import { cadastrarJogadores, criarGrupoComAdmin, type GrupoDeTeste } from './apoio/grupo';
import { aceitarAvisoDePrivacidade } from './apoio/sessao';

const sufixo = randomUUID().slice(0, 8);
const APELIDOS = [`Ana ${sufixo}`, `Beto ${sufixo}`];
const MENSALIDADE = 7_500;
const SALDO_INICIAL = 35_000;
const ALUGUEL = 12_000;

interface MesReal {
  mes: string;
  hoje: string;
  saldoAtualCentavos: number | null;
  resumoMes: { entradasCentavos: number; saidasCentavos: number } | null;
  pagamentos: { jogadorId: string; apelido: string; pagou: boolean }[];
  lancamentos: { descricao: string; tipo: string; valorCentavos: number; mensalidade: boolean }[];
}

const estado: { grupo?: GrupoDeTeste; admin?: Page; mes?: string } = {};
const grupo = (): GrupoDeTeste => {
  if (!estado.grupo) throw new Error('grupo não criado');
  return estado.grupo;
};
const admin = (): Page => {
  if (!estado.admin) throw new Error('admin não autenticado');
  return estado.admin;
};

/** Reais formatados pelo navegador (pt-BR), com o espaço comum que a tela usa. */
const reais = (centavos: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
    .replaceAll(String.fromCharCode(160), String.fromCharCode(32));

/** Espera uma chamada real da API (sem `page.route`) e confere o status. */
const esperarChamada = (page: Page, metodo: string, termina: string, status: number) =>
  page.waitForResponse(
    (r) => r.request().method() === metodo && new URL(r.url()).pathname.endsWith(termina) && r.status() === status,
  );

/** Clica no interruptor pelo rótulo, como o usuário: o `input` fica sob o trilho e o Playwright recusa o clique direto. */
const alternarPagou = (page: Page, apelido: string) =>
  page
    .locator('label')
    .filter({ has: page.getByRole('switch', { name: `Pagou: ${apelido}` }) })
    .click();

const lerMes = async (page: Page): Promise<MesReal> => {
  const r = await page.request.get(`/api/grupos/${grupo().grupoId}/financeiro/mes`);
  expect(r.status()).toBe(200);
  return (await r.json()) as MesReal;
};

test.describe.serial('I4: caixa do grupo, do aviso de privacidade aos saldos', () => {
  test('prepara um grupo novo com 2 jogadores e vê o aviso de privacidade do 1º acesso', async ({ browser }) => {
    const { grupo: criado, admin: pagina } = await criarGrupoComAdmin(browser, sufixo, { aceitarAviso: false });
    estado.grupo = criado;
    estado.admin = pagina;
    await pagina.goto(`/admin/${criado.grupoId}`);
    await expect(pagina.getByRole('dialog', { name: 'Privacidade' })).toBeVisible();
    await aceitarAvisoDePrivacidade(pagina);

    await pagina.reload();
    await expect(pagina.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(pagina.getByRole('dialog', { name: 'Privacidade' })).toHaveCount(0);
    const eu = await pagina.request.get('/api/sessao/eu');
    expect(((await eu.json()) as { avisoPrivacidadeVisto: boolean }).avisoPrivacidadeVisto).toBe(true);

    await cadastrarJogadores(pagina, criado.grupoId, APELIDOS);
  });

  test('configura o caixa: mensalidade e saldo inicial, e volta ao financeiro', async () => {
    const page = admin();
    const mes = esperarChamada(page, 'GET', '/financeiro/mes', 200);
    await page.goto(`/admin/${grupo().grupoId}/financeiro`);
    estado.mes = ((await (await mes).json()) as MesReal).mes;
    await expect(page.getByRole('heading', { name: 'Caixa não configurado' })).toBeVisible();

    await page.getByRole('link', { name: 'Configurar caixa' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/${grupo().grupoId}/financeiro/config$`));
    await page.getByLabel('Mensalidade (opcional, R$)').fill('75,00');
    await page.getByLabel('Saldo inicial (R$)').fill('350,00');
    const gravada = esperarChamada(page, 'PUT', '/financeiro/config', 200);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await gravada;

    await expect(page).toHaveURL(new RegExp(`/admin/${grupo().grupoId}/financeiro$`));
    const saldos = page.getByRole('region', { name: 'Saldo atual' });
    await expect(saldos).toContainText(reais(SALDO_INICIAL));
  });

  test('marca o pagamento: a entrada da mensalidade aparece e o saldo sobe', async () => {
    const page = admin();
    const marcado = esperarChamada(page, 'POST', '/financeiro/pagamentos', 204);
    await alternarPagou(page, APELIDOS[0] ?? '');
    await marcado;

    const saldos = page.getByRole('region', { name: 'Saldo atual' });
    await expect(saldos).toContainText(reais(SALDO_INICIAL + MENSALIDADE));
    await expect(page.getByRole('switch', { name: `Pagou: ${APELIDOS[0]}` })).toBeChecked();
    await expect(page.getByText(/^1 mensalidade de /)).toBeVisible();

    const mes = await lerMes(page);
    expect(mes.saldoAtualCentavos).toBe(SALDO_INICIAL + MENSALIDADE);
    expect(mes.lancamentos.filter((l) => l.mensalidade)).toHaveLength(1);
  });

  test('marcar de novo pela API é recusado (409)', async () => {
    const page = admin();
    const mes = await lerMes(page);
    const jogador = mes.pagamentos.find((p) => p.apelido === APELIDOS[0]);
    const repetido = await page.request.post(`/api/grupos/${grupo().grupoId}/financeiro/pagamentos`, {
      headers: { 'X-Pelada': '1' },
      data: { jogadorId: jogador?.jogadorId, mes: mes.mes },
    });
    expect(repetido.status()).toBe(409);
  });

  test('desmarca o pagamento: confirma no diálogo e a entrada some', async () => {
    const page = admin();
    const mes = await lerMes(page);
    const jogador = mes.pagamentos.find((p) => p.apelido === APELIDOS[0]);

    await alternarPagou(page, APELIDOS[0] ?? '');
    const dialogo = page.getByRole('alertdialog', { name: `Desmarcar o pagamento de ${APELIDOS[0]}?` });
    await expect(dialogo).toContainText(`(${reais(MENSALIDADE)}) será removida do caixa.`);
    const removido = esperarChamada(page, 'DELETE', `/financeiro/pagamentos/${jogador?.jogadorId}/${mes.mes}`, 204);
    await dialogo.getByRole('button', { name: 'Desmarcar' }).click();
    await removido;

    const saldos = page.getByRole('region', { name: 'Saldo atual' });
    await expect(saldos).toContainText(reais(SALDO_INICIAL));
    await expect(page.getByText(/mensalidade de /)).toHaveCount(0);
    expect((await lerMes(page)).lancamentos.filter((l) => l.mensalidade)).toHaveLength(0);
  });

  test('lança uma saída: o saldo cai e o resumo do mês mostra a saída', async () => {
    const page = admin();
    await page.getByRole('link', { name: 'Novo lançamento' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Novo lançamento' })).toBeVisible();
    await page.getByRole('radio', { name: 'Saída' }).check();
    await page.getByLabel('Descrição').fill(`Aluguel ${sufixo}`);
    await page.getByLabel('Valor (R$)').fill('120,00');
    const criado = esperarChamada(page, 'POST', '/financeiro/lancamentos', 201);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await criado;

    await expect(page).toHaveURL(new RegExp(`/admin/${grupo().grupoId}/financeiro\\?mes=${estado.mes}$`));
    const saldos = page.getByRole('region', { name: 'Saldo atual' });
    await expect(saldos).toContainText(reais(SALDO_INICIAL - ALUGUEL));
    await expect(page.getByRole('link', { name: new RegExp(`Aluguel ${sufixo}`) })).toBeVisible();

    const mes = await lerMes(page);
    expect(mes.saldoAtualCentavos).toBe(SALDO_INICIAL - ALUGUEL);
    expect(mes.resumoMes?.saidasCentavos).toBe(ALUGUEL);
  });

  test('admin sem financeiro recebe 403; quem é de outro grupo recebe 404', async ({ browser }) => {
    const contexto = await browser.newContext();
    const entrada = await contexto.request.post('/api/sessao/entrar', {
      headers: { 'X-Pelada': '1' },
      data: { email: EMAIL_MARQUINHOS, senha: SENHA_DE_TESTE },
    });
    expect(entrada.ok()).toBe(true);
    const eu = await contexto.request.get('/api/sessao/eu');
    const quinta = ((await eu.json()) as { grupos: { id: string; acessaFinanceiro: boolean }[] }).grupos[0];
    expect(quinta?.acessaFinanceiro).toBe(false);

    const leitura = await contexto.request.get(`/api/grupos/${quinta?.id}/financeiro/mes`);
    expect(leitura.status()).toBe(403);
    expect(await leitura.json()).toMatchObject({ erro: { codigo: 'sem_permissao_financeiro' } });
    const escrita = await contexto.request.put(`/api/grupos/${quinta?.id}/financeiro/config`, {
      headers: { 'X-Pelada': '1' },
      data: { mensalidadeCentavos: null, saldoInicialCentavos: 0, dataSaldoInicial: '2026-01-01' },
    });
    expect(escrita.status()).toBe(403);

    const alheio = await contexto.request.get(`/api/grupos/${grupo().grupoId}/financeiro/mes`);
    expect(alheio.status()).toBe(404);
    await contexto.close();
  });
});
