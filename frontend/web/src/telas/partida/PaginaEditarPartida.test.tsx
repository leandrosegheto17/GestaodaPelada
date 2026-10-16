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
import { Component as PaginaEditarPartida } from './PaginaEditarPartida';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

interface Chamada {
  metodo: string;
  corpo: { data: string; choveu: boolean; marcacoes: { jogadorId: string; situacao: string }[] } | null;
  xPelada: string | null;
}
let chamadas: Chamada[] = [];
let leituras = 0;

interface Opcoes {
  get?: () => Response;
  put?: (() => Response) | 'rede';
  apagar?: (() => Response) | 'rede';
}

function api({ get, put, apagar }: Opcoes = {}) {
  chamadas = [];
  leituras = 0;
  const registrar = async (metodo: string, request: Request) =>
    chamadas.push({
      metodo,
      corpo: metodo === 'DELETE' ? null : ((await request.json()) as Chamada['corpo']),
      xPelada: request.headers.get('x-pelada'),
    });
  servidor.use(
    http.get('/api/grupos/g-quinta/partidas/:data', () => {
      leituras += 1;
      return get ? get() : HttpResponse.json(fixture('partida-2026-10-15.json'));
    }),
    http.put('/api/grupos/g-quinta/partidas/2026-10-15', async ({ request }) => {
      await registrar('PUT', request);
      if (put === 'rede') return HttpResponse.error();
      return put ? put() : HttpResponse.json(fixture('partida-2026-10-15.json'));
    }),
    http.delete('/api/grupos/g-quinta/partidas/2026-10-15', async ({ request }) => {
      await registrar('DELETE', request);
      if (apagar === 'rede') return HttpResponse.error();
      return apagar ? apagar() : new HttpResponse(null, { status: 204 });
    }),
  );
}

function montar(rota = '/admin/g-quinta/partidas/2026-10-15') {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/partidas/:data', Component: PaginaEditarPartida },
      { path: '/admin/:grupoId/partidas', element: <p>Lista de partidas</p> },
      { path: '/admin/:grupoId/partidas/nova', element: <p>Nova partida</p> },
      { path: '/admin/:grupoId', element: <p>Início do admin</p> },
    ],
    { initialEntries: [rota] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

describe('PaginaEditarPartida (T11 edição)', () => {
  it('carrega com título, voltar, última alteração, contagem e marcações da resposta', async () => {
    api();
    montar();
    expect(await screen.findByRole('heading', { level: 1, name: 'Editar partida' })).toBeInTheDocument();
    expect(await screen.findAllByRole('radiogroup')).toHaveLength(20);
    expect(screen.getByRole('link', { name: 'Partidas' })).toHaveAttribute('href', '/admin/g-quinta/partidas');
    expect(screen.getByText('Última alteração: Leandro, 15/10 22:41')).toBeInTheDocument();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-10-15');
    expect(screen.getByLabelText('Data')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Salvar partida (15 presentes)' })).toBeEnabled();
    expect(document.body).toHaveTextContent('Presentes 15 · Lesionados 0 · Expulsos 1 · Ausentes 4');
    expect(screen.getByRole('button', { name: 'Excluir partida' })).toBeInTheDocument();
  });

  it('salvar envia PUT com a data do caminho, as marcações alteradas e X-Pelada, e volta ao início', async () => {
    api();
    const { roteador } = montar();
    const grupo = await screen.findByRole('radiogroup', { name: 'Situação de Alemão' });
    await userEvent.click(within(grupo).getByText('Ausente'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar partida (14 presentes)' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta'));
    expect(chamadas[0]?.metodo).toBe('PUT');
    expect(chamadas[0]?.xPelada).toBe('1');
    expect(chamadas[0]?.corpo?.data).toBe('2026-10-15');
    expect(chamadas[0]?.corpo?.marcacoes.find((m) => m.jogadorId === 'j-alemao')?.situacao).toBe('ausente');
    expect(roteador.state.location.state).toEqual({ retorno: { tipo: 'partida-salva', data: '2026-10-15' } });
  });

  it('falha de rede ao salvar mostra a faixa e mantém as marcações', async () => {
    api({ put: 'rede' });
    montar();
    const grupo = await screen.findByRole('radiogroup', { name: 'Situação de Alemão' });
    await userEvent.click(within(grupo).getByText('Ausente'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar partida (14 presentes)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não salvou. Suas marcações continuam aqui.');
    expect(screen.getByRole('button', { name: 'Salvar partida (14 presentes)' })).toBeInTheDocument();
  });
});

describe('PaginaEditarPartida: excluir', () => {
  it('abre o diálogo com foco em Cancelar; Cancelar fecha sem DELETE e devolve o foco', async () => {
    api();
    montar();
    const excluir = await screen.findByRole('button', { name: 'Excluir partida' });
    await userEvent.click(excluir);
    const dialogo = await screen.findByRole('alertdialog', { name: 'Excluir a partida de 15/10?' });
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(excluir).toHaveFocus();
    expect(chamadas.filter((c) => c.metodo === 'DELETE')).toHaveLength(0);
  });

  it('confirmar envia DELETE e volta à lista do mês com o recado', async () => {
    api();
    const { roteador } = montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir partida' }));
    const dialogo = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir partida' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta/partidas'));
    expect(roteador.state.location.search).toBe('?mes=2026-10');
    expect(chamadas.find((c) => c.metodo === 'DELETE')?.xPelada).toBe('1');
    expect(roteador.state.location.state).toEqual({ retorno: { tipo: 'partida-excluida', data: '2026-10-15' } });
  });

  it('DELETE com erro: a partida continua na tela, com aviso', async () => {
    api({ apagar: 'rede' });
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir partida' }));
    const dialogo = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir partida' }));
    expect(await screen.findByText('Não foi possível excluir a partida. Tente de novo.')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Editar partida' })).toBeInTheDocument();
  });
});

describe('PaginaEditarPartida: bordas', () => {
  it.each(['2026-13-01', 'abc'])('data %s redireciona para a lista, sem chamar a API', async (data) => {
    api();
    const { roteador } = montar(`/admin/g-quinta/partidas/${data}`);
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta/partidas'));
    expect(leituras).toBe(0);
  });

  it('404 redireciona para lançar nessa data', async () => {
    api({ get: () => HttpResponse.json(fixture('erro-nao-encontrado.json'), { status: 404 }) });
    const { roteador } = montar();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta/partidas/nova'));
    expect(roteador.state.location.search).toBe('?data=2026-10-15');
  });

  it('sem violações do axe: edição e diálogo aberto', async () => {
    api();
    const { container } = montar();
    await screen.findAllByRole('radiogroup');
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir partida' }));
    expect(await violacoes(await screen.findByRole('alertdialog'))).toEqual([]);
  });
});
