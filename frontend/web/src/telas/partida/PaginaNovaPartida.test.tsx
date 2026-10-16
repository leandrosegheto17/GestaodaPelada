import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaNovaPartida } from './PaginaNovaPartida';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => servidor.close());

interface Envio {
  corpo: { data: string; choveu: boolean; marcacoes: { jogadorId: string; situacao: string }[] };
  xPelada: string | null;
}
let datasPedidas: (string | null)[] = [];
let envios: Envio[] = [];

type RespostaGet = () => Response | Promise<Response>;
type RespostaPost = (() => Response) | 'rede';

function api(
  get: RespostaGet = () => HttpResponse.json(fixture('partida-nova-2026-10-22.json')),
  post: RespostaPost = () => HttpResponse.json(fixture('partida-2026-10-15.json'), { status: 201 }),
) {
  datasPedidas = [];
  envios = [];
  servidor.use(
    http.get('/api/grupos/g-quinta', () => HttpResponse.json(fixture('grupo-quinta.json'))),
    http.get('/api/grupos/g-quinta/partidas/nova', ({ request }) => {
      datasPedidas.push(new URL(request.url).searchParams.get('data'));
      return get();
    }),
    http.post('/api/grupos/g-quinta/partidas', async ({ request }) => {
      envios.push({ corpo: (await request.json()) as Envio['corpo'], xPelada: request.headers.get('x-pelada') });
      return post === 'rede' ? HttpResponse.error() : post();
    }),
  );
}

function montar(rota = '/admin/g-quinta/partidas/nova') {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const [pathname, busca] = rota.split('?');
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/partidas/nova', Component: PaginaNovaPartida },
      { path: '/admin/:grupoId', element: <p>Início do admin</p> },
    ],
    { initialEntries: [{ pathname: pathname!, search: busca ? `?${busca}` : '' }] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

describe('PaginaNovaPartida (T11): lista', () => {
  it('20 jogadores com seletor, faixa de pré-marcação, contagem e botão com o total', async () => {
    api();
    montar();
    expect(await screen.findAllByRole('radiogroup')).toHaveLength(20);
    expect(screen.getByRole('radiogroup', { name: 'Situação de Alemão' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      'Pré-marcado pela escalação de 22/10 (inclui quem ficou como “não entra”).',
    );
    expect(document.body).toHaveTextContent('Presentes 19 · Lesionados 0 · Expulsos 0 · Ausentes 1');
    expect(screen.getByRole('button', { name: 'Salvar partida (19 presentes)' })).toBeEnabled();
    expect(screen.getByLabelText('Data')).toHaveAttribute('max', '2026-10-22');
  });

  it('marcar o ausente como presente atualiza o botão; Choveu alterna Não/Sim', async () => {
    api();
    montar();
    await screen.findAllByRole('radiogroup');
    const fumaca = screen.getByRole('radiogroup', { name: 'Situação de Fumaça' });
    await userEvent.click(within(fumaca).getByText('Presente'));
    expect(screen.getByRole('button', { name: 'Salvar partida (20 presentes)' })).toBeInTheDocument();
    const chave = screen.getByRole('switch', { name: /Choveu\?/ });
    expect(screen.getByText('Não')).toBeInTheDocument();
    await userEvent.click(chave);
    expect(screen.getByText('Sim')).toBeInTheDocument();
  });

  it('busca filtra a exibição; marcar todos e limpar valem para a lista inteira', async () => {
    api();
    montar();
    await screen.findAllByRole('radiogroup');
    await userEvent.type(screen.getByLabelText('Buscar jogador'), 'leo');
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Limpar marcações' }));
    await userEvent.clear(screen.getByLabelText('Buscar jogador'));
    expect(document.body).toHaveTextContent('Presentes 0 · Lesionados 0 · Expulsos 0 · Ausentes 20');
    await userEvent.click(screen.getByRole('button', { name: 'Marcar todos como presentes' }));
    expect(screen.getByRole('button', { name: 'Salvar partida (20 presentes)' })).toBeInTheDocument();
  });

  it('sem pré-marcação pela escalação, não há faixa', async () => {
    const corpo = fixture('partida-nova-2026-10-22.json') as Record<string, JsonBodyType>;
    api(() => HttpResponse.json({ ...corpo, preMarcadaPelaEscalacao: false }));
    montar();
    await screen.findAllByRole('radiogroup');
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('trocar a data muda a URL, pede a nova data e anuncia o carregamento', async () => {
    api();
    const { roteador } = montar('/admin/g-quinta/partidas/nova?data=2026-10-22');
    await screen.findAllByRole('radiogroup');
    api(() => new Promise<Response>(() => undefined));
    const campo = screen.getByLabelText('Data');
    await userEvent.clear(campo);
    await userEvent.type(campo, '2026-09-24');
    await waitFor(() => expect(roteador.state.location.search).toBe('?data=2026-09-24'));
    await waitFor(() => expect(datasPedidas).toContain('2026-09-24'));
    expect(await screen.findByRole('status')).toHaveTextContent('Carregando os jogadores ativos em 24/09…');
  });
});

describe('PaginaNovaPartida (T11): estados da data', () => {
  it('ninguém ativo: aviso, sem lista e Salvar desabilitado', async () => {
    api(() => HttpResponse.json(fixture('partida-nova-sem-ativos.json')));
    const { container } = montar('/admin/g-quinta/partidas/nova?data=2026-01-29');
    expect(await screen.findByText('Ninguém estava ativo nessa data.')).toBeInTheDocument();
    expect(screen.getByText('Escolha outra data ou confira as datas de entrada dos jogadores.')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByRole('button', { name: 'Salvar partida' })).toBeDisabled();
    expect(await violacoes(container)).toEqual([]);
  });

  it('data futura (422): erro no campo, sem lista e Salvar desabilitado', async () => {
    api(() => HttpResponse.json(fixture('erro-data-futura.json'), { status: 422 }));
    const { container } = montar('/admin/g-quinta/partidas/nova?data=2026-12-01');
    expect(await screen.findByRole('alert')).toHaveTextContent('A data não pode ser no futuro.');
    expect(screen.getByLabelText('Data')).toBeInvalid();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByRole('button', { name: 'Salvar partida' })).toBeDisabled();
    expect(await violacoes(container)).toEqual([]);
  });

  it('data duplicada (jaExiste): mensagem e atalho para editar', async () => {
    const corpo = fixture('partida-nova-2026-10-22.json') as Record<string, JsonBodyType>;
    api(() => HttpResponse.json({ ...corpo, data: '2026-10-15', jaExiste: true }));
    const { container } = montar('/admin/g-quinta/partidas/nova?data=2026-10-15');
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma partida em 15/10/2026.');
    expect(screen.getByRole('link', { name: 'Editar a partida de 15/10' })).toHaveAttribute(
      'href',
      '/admin/g-quinta/partidas/2026-10-15',
    );
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(await violacoes(container)).toEqual([]);
  });

  it('erro de rede na consulta mostra o erro padrão', async () => {
    api(() => HttpResponse.json(fixture('erro-interno.json'), { status: 503 }));
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar. Verifique a conexão.');
  });
});

describe('PaginaNovaPartida (T11): salvar', () => {
  it('envia data, choveu e as 20 marcações com X-Pelada e volta ao início com o recado', async () => {
    api();
    const { roteador } = montar('/admin/g-quinta/partidas/nova?data=2026-10-22');
    await screen.findAllByRole('radiogroup');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar partida (19 presentes)' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta'));
    expect(envios).toHaveLength(1);
    expect(envios[0]?.xPelada).toBe('1');
    expect(envios[0]?.corpo).toMatchObject({ data: '2026-10-22', choveu: false });
    expect(envios[0]?.corpo.marcacoes).toHaveLength(20);
    expect(roteador.state.location.state).toEqual({ retorno: { tipo: 'partida-salva', data: '2026-10-22' } });
  });

  it('falha de rede mantém as marcações e Tentar de novo reenvia o mesmo corpo', async () => {
    api(undefined, 'rede');
    montar('/admin/g-quinta/partidas/nova?data=2026-10-22');
    await screen.findAllByRole('radiogroup');
    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Situação de Fumaça' })).getByText('Presente'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar partida (20 presentes)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não salvou. Suas marcações continuam aqui.');
    expect(screen.getByRole('button', { name: 'Salvar partida (20 presentes)' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(envios).toHaveLength(2));
    expect(envios[1]?.corpo).toEqual(envios[0]?.corpo);
  });

  it('409 ao salvar mostra o erro na data sem perder as marcações', async () => {
    api(undefined, () => HttpResponse.json(fixture('erro-partida-duplicada.json'), { status: 409 }));
    montar('/admin/g-quinta/partidas/nova?data=2026-10-22');
    await screen.findAllByRole('radiogroup');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar partida (19 presentes)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma partida em 15/10/2026.');
    expect(screen.getByRole('link', { name: 'Editar a partida de 15/10' })).toBeInTheDocument();
  });

  it('teclado: Tab entra no grupo de um jogador e sai para o próximo; axe sem violações', async () => {
    api();
    const { container } = montar('/admin/g-quinta/partidas/nova?data=2026-10-22');
    await screen.findAllByRole('radiogroup');
    expect(await violacoes(container)).toEqual([]);
  });
});
