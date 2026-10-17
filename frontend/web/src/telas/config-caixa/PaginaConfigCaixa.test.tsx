import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaConfigCaixa } from './PaginaConfigCaixa';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

interface Envio {
  metodo: string;
  caminho: string;
  corpo: unknown;
  cabecalho: string | null;
}
let envios: Envio[] = [];

function api(
  leitura: () => Response = () => HttpResponse.json(fixture('financeiro-sem-config.json')),
  escrita: () => Response = () =>
    HttpResponse.json({ mensalidadeCentavos: 7500, saldoInicialCentavos: 35000, dataSaldoInicial: '2026-10-22' }),
) {
  envios = [];
  servidor.use(
    http.get('/api/grupos/g-quinta/financeiro/mes', () => leitura()),
    http.put('/api/grupos/g-quinta/financeiro/config', async ({ request }) => {
      envios.push({
        metodo: request.method,
        caminho: new URL(request.url).pathname,
        corpo: await request.clone().json(),
        cabecalho: request.headers.get('X-Pelada'),
      });
      return escrita();
    }),
  );
}

function Local() {
  const l = useLocation();
  return <p data-testid="local">{`${l.pathname}${l.search}`}</p>;
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/financeiro/config', Component: PaginaConfigCaixa },
      { path: '/admin/:grupoId/financeiro', Component: Local },
    ],
    { initialEntries: ['/admin/g-quinta/financeiro/config'] },
  );
  return render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
}

async function digitar(rotulo: string, texto: string) {
  const campo = await screen.findByLabelText(rotulo);
  await userEvent.clear(campo);
  if (texto) await userEvent.type(campo, texto);
}

const MENSALIDADE = 'Mensalidade (opcional, R$)';
const SALDO = 'Saldo inicial (R$)';
const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

describe('PaginaConfigCaixa (T24)', () => {
  it('caixa novo: campos vazios, data de hoje da API e a ajuda ligada à mensalidade', async () => {
    api();
    montar();
    expect(await screen.findByLabelText(MENSALIDADE)).toHaveValue('');
    expect(screen.getByLabelText(SALDO)).toHaveValue('');
    expect(screen.getByLabelText('Data do saldo inicial')).toHaveValue('2026-10-22');
    expect(screen.getByLabelText(MENSALIDADE)).toHaveAccessibleDescription(
      'Com mensalidade, marcar “pagou” já cria a entrada no caixa.',
    );
    expect(screen.getByRole('link', { name: /Financeiro/ })).toHaveAttribute('href', '/admin/g-quinta/financeiro');
  });

  it('salvar: PUT com centavos e X-Pelada, depois T22', async () => {
    api();
    montar();
    await digitar(MENSALIDADE, '75,00');
    await digitar(SALDO, '350,00');
    await salvar();
    expect(await screen.findByTestId('local')).toHaveTextContent('/admin/g-quinta/financeiro');
    expect(envios).toEqual([
      {
        metodo: 'PUT',
        caminho: '/api/grupos/g-quinta/financeiro/config',
        corpo: { mensalidadeCentavos: 7500, saldoInicialCentavos: 35000, dataSaldoInicial: '2026-10-22' },
        cabecalho: '1',
      },
    ]);
  });

  it('com config: campos preenchidos; apagar a mensalidade envia null', async () => {
    api(() => HttpResponse.json(fixture('financeiro-2026-10.json')));
    montar();
    expect(await screen.findByLabelText(MENSALIDADE)).toHaveValue('75,00');
    expect(screen.getByLabelText(SALDO)).toHaveValue('350,00');
    expect(screen.getByLabelText('Data do saldo inicial')).toHaveValue('2026-02-05');
    await digitar(MENSALIDADE, '');
    await salvar();
    expect(await screen.findByTestId('local')).toBeInTheDocument();
    expect(envios[0]?.corpo).toEqual({
      mensalidadeCentavos: null,
      saldoInicialCentavos: 35000,
      dataSaldoInicial: '2026-02-05',
    });
  });

  it('saldo negativo e zero são aceitos', async () => {
    api();
    montar();
    await digitar(SALDO, '-120,50');
    await salvar();
    await screen.findByTestId('local');
    expect(envios[0]?.corpo).toMatchObject({ mensalidadeCentavos: null, saldoInicialCentavos: -12_050 });
  });

  it('saldo zero é aceito', async () => {
    api();
    montar();
    await digitar(SALDO, '0,00');
    await salvar();
    await screen.findByTestId('local');
    expect(envios[0]?.corpo).toMatchObject({ saldoInicialCentavos: 0 });
  });

  it.each([
    ['saldo com letras', MENSALIDADE, '', SALDO, 'mil'],
    ['saldo com três casas', MENSALIDADE, '', SALDO, '1,234'],
    ['saldo acima do limite', MENSALIDADE, '', SALDO, '1.000.000,00'],
    ['saldo vazio', MENSALIDADE, '', SALDO, ''],
    ['mensalidade zero', MENSALIDADE, '0,00', SALDO, '10,00'],
    ['mensalidade com letras', MENSALIDADE, 'abc', SALDO, '10,00'],
  ])('%s: mostra o erro e não envia', async (_nome, campoA, textoA, campoB, textoB) => {
    api();
    montar();
    await digitar(campoA, textoA);
    await digitar(campoB, textoB);
    await salvar();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(envios).toEqual([]);
  });

  it('422: mensagem do servidor no saldo, sem resumo de erros', async () => {
    api(undefined, () => HttpResponse.json(fixture('erro-validacao-config.json'), { status: 422 }));
    montar();
    await digitar(SALDO, '350,00');
    await salvar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um valor em reais, ex.: 350,00.');
    expect(screen.queryByText(/Corrija \d+ campos/)).not.toBeInTheDocument();
  });

  it('sem rede: faixa de falha e os valores continuam nos campos', async () => {
    api(undefined, () => HttpResponse.error());
    montar();
    await digitar(MENSALIDADE, '75,00');
    await digitar(SALDO, '350,00');
    await salvar();
    expect(await screen.findByText('Não foi possível enviar. Verifique a conexão.')).toBeInTheDocument();
    expect(screen.getByLabelText(SALDO)).toHaveValue('350,00');
  });

  it('403: "Sem acesso"', async () => {
    api(() => HttpResponse.json(fixture('erro-sem-permissao.json'), { status: 403 }));
    montar();
    expect(await screen.findByRole('heading', { name: 'Sem acesso' })).toBeInTheDocument();
  });

  it('falha ao carregar: aviso com nova tentativa', async () => {
    api(() => HttpResponse.error());
    montar();
    expect(await screen.findByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
  });

  it('axe: sem violações no vazio e com erro', async () => {
    api(undefined, () => HttpResponse.json(fixture('erro-validacao-config.json'), { status: 422 }));
    const { container } = montar();
    await screen.findByLabelText(SALDO);
    expect(await violacoes(container)).toEqual([]);
    await digitar(SALDO, '350,00');
    await salvar();
    await screen.findByRole('alert');
    expect(await violacoes(container)).toEqual([]);
  });
});
