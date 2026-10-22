import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaJogador } from './PaginaJogador';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const FICHA = '/admin/g-quinta/jogadores/j-gil';
const API = '/api/grupos/g-quinta/jogadores/j-gil';

function api(gravar?: () => Response) {
  let periodos = fixture('jogador-gil-periodos.json');
  servidor.use(
    http.get('/api/grupos/g-quinta', () => HttpResponse.json(fixture('grupo-quinta.json'))),
    http.get(API, () => HttpResponse.json(fixture('jogador-gil.json'))),
    http.get(`${API}/periodos`, () => HttpResponse.json(periodos)),
    http.post(`${API}/periodos/p-gil-2/previa`, () => HttpResponse.json(fixture('periodo-previa-retorno.json'))),
    http.put(`${API}/periodos/p-gil-2`, () => {
      if (gravar) return gravar();
      periodos = { periodos: (fixture('periodo-editar-resposta.json') as { periodos: unknown[] }).periodos };
      return HttpResponse.json(fixture('periodo-editar-resposta.json'));
    }),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/jogadores/:jogadorId', Component: PaginaJogador },
      { path: '/admin/:grupoId/partidas', element: <p>Lista de partidas</p> },
    ],
    { initialEntries: [FICHA] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

async function abrirCorrecaoDoRetorno() {
  const lista = await screen.findByRole('list', { name: 'Períodos de atividade' });
  const botoes = await within(lista).findAllByRole('button', { name: 'Corrigir datas' });
  await userEvent.click(botoes[1] as HTMLElement);
  return screen.findByRole('dialog', { name: 'Corrigir datas' });
}

describe('Corrigir datas na ficha', () => {
  it('o botão da lista abre o diálogo do período; ao confirmar fecha, mostra as duas faixas e atualiza a lista', async () => {
    api();
    const { roteador, container } = montar();
    const dialogo = await abrirCorrecaoDoRetorno();
    expect(dialogo).toHaveAccessibleDescription('Retorno de Gil: 20/10/2026 até atual.');
    fireEvent.change(within(dialogo).getByLabelText('Data de retorno'), { target: { value: '2026-10-12' } });
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar novas datas' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Datas corrigidas.')).toBeVisible();
    expect(
      screen.getByText(
        '1 rodada passou a constar: 15/10. Ela vale 0 ponto até você lançar a presença em Editar partida.',
      ),
    ).toBeVisible();
    const lista = screen.getByRole('list', { name: 'Períodos de atividade' });
    await waitFor(() => expect(within(lista).getAllByRole('listitem')[1]).toHaveTextContent('12/10/2026'));
    expect(await violacoes(container)).toEqual([]);

    await userEvent.click(screen.getByRole('link', { name: 'Abrir partidas' }));
    expect(roteador.state.location.pathname).toBe('/admin/g-quinta/partidas');
  });

  it('a faixa de atenção não some sozinha', async () => {
    api();
    montar();
    const dialogo = await abrirCorrecaoDoRetorno();
    fireEvent.change(within(dialogo).getByLabelText('Data de retorno'), { target: { value: '2026-10-12' } });
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar novas datas' }));
    await screen.findByText('Datas corrigidas.');
    await new Promise((r) => setTimeout(r, 4500));
    expect(screen.getByRole('link', { name: 'Abrir partidas' })).toBeVisible();
  }, 10000);

  it('404 ao gravar fecha o diálogo e mostra "Jogador não encontrado."', async () => {
    api(() => HttpResponse.json({ erro: { codigo: 'nao_encontrado', mensagem: 'x' } }, { status: 404 }));
    montar();
    const dialogo = await abrirCorrecaoDoRetorno();
    fireEvent.change(within(dialogo).getByLabelText('Data de retorno'), { target: { value: '2026-10-12' } });
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar novas datas' }));
    expect(await screen.findByText('Jogador não encontrado.')).toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancelar não deixa faixa nenhuma e devolve o foco ao botão', async () => {
    api();
    montar();
    const lista = await screen.findByRole('list', { name: 'Períodos de atividade' });
    const botoes = await within(lista).findAllByRole('button', { name: 'Corrigir datas' });
    await userEvent.click(botoes[1] as HTMLElement);
    await screen.findByRole('dialog', { name: 'Corrigir datas' });
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Datas corrigidas.')).toBeNull();
    expect(botoes[1]).toHaveFocus();
  });
});
