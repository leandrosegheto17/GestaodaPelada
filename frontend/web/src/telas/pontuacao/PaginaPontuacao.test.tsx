import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { ORDEM_PESOS, ROTULO_PESO } from '../../rotulos/pesos';
import { Component as PaginaPontuacao } from './PaginaPontuacao';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

let envios: { corpo: unknown; xPelada: string | null }[] = [];
let leituras = 0;
function api(post: () => Response = () => HttpResponse.json(fixture('pesos-salvo.json')), get?: () => Response) {
  envios = [];
  leituras = 0;
  servidor.use(
    http.get('/api/grupos/g-quinta/pesos', () => {
      leituras += 1;
      return get ? get() : HttpResponse.json(fixture('pesos.json'));
    }),
    http.get('/api/grupos/g-quinta', () => HttpResponse.json(fixture('grupo-quinta.json'))),
    http.post('/api/grupos/g-quinta/pesos', async ({ request }) => {
      envios.push({ corpo: await request.json(), xPelada: request.headers.get('x-pelada') });
      return post();
    }),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/admin/:grupoId/pontuacao', Component: PaginaPontuacao }], {
    initialEntries: ['/admin/g-quinta/pontuacao'],
  });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container };
}

describe('PaginaPontuacao (T18)', () => {
  it('cartão vigente, formulário preenchido, ajuda e histórico com autor', async () => {
    api();
    montar();
    expect(await screen.findByRole('heading', { name: 'Vigente desde 01/09/2026' })).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: 'Pesos vigentes' });
    expect(within(tabela).getAllByRole('rowheader')).toHaveLength(5);
    expect(within(tabela).getByText('−1')).toBeInTheDocument();
    expect(ORDEM_PESOS.map((c) => (screen.getByLabelText(ROTULO_PESO[c]) as HTMLInputElement).value)).toEqual([
      '1',
      '2',
      '1',
      '1',
      '-1',
    ]);
    const ajuda = screen.getByText('Inteiros de −10 a 10. Partidas anteriores a hoje não mudam.');
    expect(ajuda).toHaveAttribute('id');
    for (const c of ORDEM_PESOS) {
      expect(screen.getByLabelText(ROTULO_PESO[c])).toHaveAccessibleDescription(ajuda.textContent ?? '');
    }
    expect(screen.getByText('De 05/02/2026 a 31/08/2026')).toBeInTheDocument();
    expect(screen.getByText(/registrado por Leandro/)).toBeInTheDocument();
  });

  it.each([['-11'], ['11'], ['1,5'], ['abc'], ['']])('valor %j é recusado no campo, sem POST', async (valor) => {
    api();
    montar();
    const campo = await screen.findByLabelText('Presença com chuva');
    await userEvent.clear(campo);
    if (valor) await userEvent.type(campo, valor);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova configuração' }));
    expect(await screen.findByText('Use um número inteiro de −10 a 10.')).toBeInTheDocument();
    expect(envios).toHaveLength(0);
  });

  it('-10 e 10 são aceitos e o corpo leva só os 5 inteiros', async () => {
    api();
    montar();
    const campo = await screen.findByLabelText('Expulso');
    await userEvent.clear(campo);
    await userEvent.type(campo, '-10');
    const outro = screen.getByLabelText('Presença sem chuva');
    await userEvent.clear(outro);
    await userEvent.type(outro, '10');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova configuração' }));
    await waitFor(() => expect(envios).toHaveLength(1));
    expect(envios[0]).toEqual({
      corpo: { presencaSemChuva: 10, presencaComChuva: 2, lesionadoSemChuva: 1, lesionadoComChuva: 1, expulso: -10 },
      xPelada: '1',
    });
  });

  it('2 erros mostram o resumo', async () => {
    api();
    montar();
    for (const rotulo of ['Presença com chuva', 'Expulso']) {
      const campo = await screen.findByLabelText(rotulo);
      await userEvent.clear(campo);
      await userEvent.type(campo, '99');
    }
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova configuração' }));
    expect(await screen.findByText('Corrija 2 campos:')).toBeInTheDocument();
  });

  it('sucesso: faixa, cartão e histórico novos', async () => {
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar nova configuração' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Nova configuração vale a partir de hoje.');
    expect(screen.getByRole('heading', { name: 'Vigente desde 22/10/2026' })).toBeInTheDocument();
    expect(screen.getAllByText(/^De \d\d\/\d\d\/\d{4} a /)).toHaveLength(2);
  });

  it('422 do servidor aparece no campo certo', async () => {
    api(() => HttpResponse.json(fixture('erro-validacao-pesos.json'), { status: 422 }));
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar nova configuração' }));
    expect(await screen.findByText('Use um número inteiro de −10 a 10.')).toBeInTheDocument();
    const campo = screen.getByLabelText('Presença com chuva');
    expect(campo).toBeInvalid();
    expect(campo.getAttribute('aria-describedby')).toContain(`${campo.id}-erro`);
    expect(document.getElementById(`${campo.id}-erro`)).toHaveTextContent('Use um número inteiro de −10 a 10.');
  });

  it('sem violações do axe no estado de erro (422)', async () => {
    api(() => HttpResponse.json(fixture('erro-validacao-pesos.json'), { status: 422 }));
    const { container } = montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar nova configuração' }));
    await screen.findByText('Use um número inteiro de −10 a 10.');
    expect(await violacoes(container)).toEqual([]);
  });

  it('sem violações do axe no estado salvo', async () => {
    api();
    const { container } = montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar nova configuração' }));
    await screen.findByRole('heading', { name: 'Vigente desde 22/10/2026' });
    expect(await violacoes(container)).toEqual([]);
  });

  it('falha de rede mantém os valores digitados', async () => {
    api(() => HttpResponse.error());
    montar();
    const campo = await screen.findByLabelText('Expulso');
    await userEvent.clear(campo);
    await userEvent.type(campo, '-3');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova configuração' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar. Verifique a conexão.');
    expect(screen.getByLabelText('Expulso')).toHaveValue(-3);
  });

  it('503 no GET mostra o erro padrão com Tentar de novo', async () => {
    api(undefined, () => HttpResponse.json(fixture('erro-interno.json'), { status: 503 }));
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar. Verifique a conexão.');
    const antes = leituras;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(leituras).toBeGreaterThan(antes));
  });

  it('sem violações do axe', async () => {
    api();
    const { container } = montar();
    await screen.findByRole('heading', { name: 'Vigente desde 01/09/2026' });
    expect(await violacoes(container)).toEqual([]);
  });
});
