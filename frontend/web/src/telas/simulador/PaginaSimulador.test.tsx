import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaSimulador } from './PaginaSimulador';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

interface Previa {
  corpo: { formato: string; n: number; k?: unknown; aptos: Record<string, unknown>[] };
  xPelada: string | null;
}
let previas: Previa[] = [];
let consultasContexto: string[] = [];

function api({
  contexto = 'simulador-contexto-2026-10-22.json',
  previa = (): Response => HttpResponse.json(fixture('simulador-previa-dois.json')),
}: { contexto?: string; previa?: (n: number) => Response | Promise<Response> } = {}) {
  previas = [];
  consultasContexto = [];
  servidor.use(
    http.get('/api/grupos/g-quinta/simulador/contexto', ({ request }) => {
      consultasContexto.push(new URL(request.url).search);
      return HttpResponse.json(fixture(contexto));
    }),
    http.post('/api/grupos/g-quinta/simulador/previa', async ({ request }) => {
      const corpo = (await request.json()) as Previa['corpo'];
      previas.push({ corpo, xPelada: request.headers.get('x-pelada') });
      return previa(corpo.n);
    }),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/simulador', Component: PaginaSimulador },
      { path: '/admin/:grupoId/simulador/resultado', element: <p>Resultado</p> },
      { path: '/admin/:grupoId/jogadores/novo', element: <p>Novo jogador</p> },
    ],
    { initialEntries: ['/admin/g-quinta/simulador'] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container, roteador };
}

const sugerir = () => screen.getByRole('button', { name: 'Sugerir times' });

describe('PaginaSimulador (T12)', () => {
  it('carrega com a data sugerida, aptos marcados, nível e "sem nota"', async () => {
    api();
    montar();
    expect(await screen.findByLabelText('Data da partida')).toHaveValue('2026-10-22');
    expect(screen.getByText('Próximo dia de jogo.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /^Aptos \(\d+\)$/ })).toBeInTheDocument();
    expect(screen.getByText('nível 6,1')).toBeInTheDocument();
    expect(screen.getAllByText('sem nota').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Jogadores por time')).toHaveValue(7);
    expect(screen.getByLabelText('Limite de substituições por time')).toHaveValue(2);
  });

  it('prévia da API aparece e libera "Sugerir times"', async () => {
    api();
    montar();
    expect(await screen.findByText('2 times de 7 · 5 reservas')).toBeInTheDocument();
    expect(sugerir()).toBeEnabled();
    expect(previas[0]?.xPelada).toBe('1');
    expect(previas[0]?.corpo).toMatchObject({ formato: 'dois_times', n: 7, k: 2 });
  });

  it('três mudanças de N em menos de 300 ms geram uma prévia; "calculando…" enquanto isso', async () => {
    api();
    montar();
    await screen.findByText('2 times de 7 · 5 reservas');
    const antes = previas.length;
    const aumentar = screen.getByRole('button', { name: 'Aumentar jogadores por time' });
    fireEvent.click(aumentar);
    fireEvent.click(aumentar);
    fireEvent.click(aumentar);
    expect(await screen.findByText('calculando…')).toBeInTheDocument();
    expect(sugerir()).toBeDisabled();
    await waitFor(() => expect(previas.length).toBe(antes + 1));
    expect(previas.at(-1)?.corpo.n).toBe(10);
    await waitFor(() => expect(sugerir()).toBeEnabled());
  });

  it('insuficiente: faixa com o texto da API e botão desabilitado ligado a ela', async () => {
    api({ previa: () => HttpResponse.json(fixture('simulador-previa-insuficiente.json')) });
    montar();
    const faixa = await screen.findByRole('alert');
    expect(faixa).toHaveTextContent('Faltam aptos para 2 times de 11. Maior N possível: 9.');
    expect(sugerir()).toBeDisabled();
    expect(sugerir()).toHaveAttribute('aria-describedby', faixa.parentElement?.id);
  });

  it('3 ou mais times: sem K e sem "Só 1º"; o corpo não leva k nem so1oTempo', async () => {
    api({ previa: () => HttpResponse.json(fixture('simulador-previa-varios.json')) });
    montar();
    await screen.findByText('2 times de 7 · 5 reservas').catch(() => undefined);
    await userEvent.click(await screen.findByLabelText('3 ou mais times'));
    expect(await screen.findByText('4 times de 4 + 1 time incompleto de 2')).toBeInTheDocument();
    expect(screen.queryByLabelText('Limite de substituições por time')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Só 1º tempo:/)).not.toBeInTheDocument();
    const ultima = previas.at(-1)?.corpo;
    expect(ultima).not.toHaveProperty('k');
    expect(ultima?.aptos.every((a) => !('so1oTempo' in a))).toBe(true);
  });

  it('Ilimitado envia k "ilimitado" e desabilita o campo; o interruptor tem o nome do jogador', async () => {
    api();
    montar();
    const interruptor = await screen.findByRole('switch', { name: 'Só 1º tempo: Juninho' });
    await userEvent.click(interruptor);
    await userEvent.click(screen.getByLabelText('Ilimitado'));
    expect(screen.getByLabelText('Limite de substituições por time')).toBeDisabled();
    await waitFor(() => expect(previas.at(-1)?.corpo.k).toBe('ilimitado'));
    const juninho = previas.at(-1)?.corpo.aptos.find((a) => a['so1oTempo'] === true);
    expect(juninho).toBeDefined();
  });

  it('nenhum apto marcado: sem chamada à API, razão visível e botão desabilitado', async () => {
    api();
    montar();
    await screen.findByText('2 times de 7 · 5 reservas');
    const antes = previas.length;
    await userEvent.click(screen.getByRole('button', { name: 'Desmarcar todos' }));
    expect(await screen.findByText('Marque os aptos.')).toBeInTheDocument();
    expect(sugerir()).toBeDisabled();
    await new Promise((r) => setTimeout(r, 400));
    expect(previas.length).toBe(antes);
    await userEvent.click(screen.getByRole('button', { name: 'Marcar todos' }));
    await waitFor(() => expect(sugerir()).toBeEnabled());
  });

  it('desmarcar um apto reduz o contador e desabilita o "Só 1º" dele', async () => {
    api();
    montar();
    const titulo = await screen.findByRole('heading', { name: /^Aptos \(\d+\)$/ });
    const total = Number(/\((\d+)\)/.exec(titulo.textContent ?? '')?.[1]);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Alemão' }));
    expect(screen.getByRole('heading', { name: `Aptos (${total - 1})` })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Só 1º tempo: Alemão' })).toBeDisabled();
  });

  it('trocar a data busca o contexto dela', async () => {
    api();
    montar();
    const campo = await screen.findByLabelText('Data da partida');
    fireEvent.change(campo, { target: { value: '2026-10-29' } });
    await waitFor(() => expect(consultasContexto).toContain('?data=2026-10-29'));
  });

  it('limites de N: os botões − e + desabilitam em 2 e em 11', async () => {
    api();
    montar();
    const campo = await screen.findByLabelText('Jogadores por time');
    fireEvent.change(campo, { target: { value: '2' } });
    expect(screen.getByRole('button', { name: 'Diminuir jogadores por time' })).toBeDisabled();
    fireEvent.change(campo, { target: { value: '11' } });
    expect(screen.getByRole('button', { name: 'Aumentar jogadores por time' })).toBeDisabled();
  });

  it('vazio: só a mensagem e o link para cadastrar jogadores', async () => {
    api({ contexto: 'simulador-contexto-vazio.json' });
    montar();
    expect(await screen.findByRole('heading', { name: 'Sem jogadores' })).toBeInTheDocument();
    expect(screen.getByText('Cadastre jogadores para usar o simulador.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar jogadores' })).toHaveAttribute(
      'href',
      '/admin/g-quinta/jogadores/novo',
    );
    expect(screen.queryByLabelText('Data da partida')).not.toBeInTheDocument();
  });

  it('Sugerir times leva ao resultado com a entrada no state', async () => {
    api();
    const { roteador } = montar();
    await screen.findByText('2 times de 7 · 5 reservas');
    await userEvent.click(sugerir());
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta/simulador/resultado'));
    expect(roteador.state.location.state).toMatchObject({
      entrada: { formato: 'dois_times', n: 7, data: '2026-10-22' },
    });
  });

  it('axe: sem violações na prévia pronta e no vazio', async () => {
    api();
    const { container } = montar();
    await screen.findByText('2 times de 7 · 5 reservas');
    expect(await violacoes(container)).toEqual([]);
  });
});
