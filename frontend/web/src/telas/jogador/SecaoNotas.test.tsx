import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
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

interface Chamada {
  caminho: string;
  corpo: unknown;
  xPelada: string | null;
}
let chamadas: Chamada[] = [];

type Resposta = (habilidadeId: string, corpo: { nota: number | null }) => Promise<Response> | Response;

function api(jogador: JsonBodyType = fixture('jogador-toninho.json'), resposta?: Resposta) {
  chamadas = [];
  servidor.use(
    http.get('/api/grupos/g-quinta', () => HttpResponse.json(fixture('grupo-quinta.json'))),
    http.get('/api/grupos/g-quinta/jogadores/j-toninho', () => HttpResponse.json(jogador)),
    http.put('/api/grupos/g-quinta/jogadores/j-toninho/notas/:habilidadeId', async ({ request, params }) => {
      const corpo = (await request.json()) as { nota: number | null };
      chamadas.push({ caminho: new URL(request.url).pathname, corpo, xPelada: request.headers.get('x-pelada') });
      const id = String(params['habilidadeId']);
      return (
        resposta?.(id, corpo) ??
        HttpResponse.json({ habilidadeId: id, nota: corpo.nota, nivel: corpo.nota === 9 ? 7 : 6.8, semNota: false })
      );
    }),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/jogadores/:jogadorId', Component: PaginaJogador },
      { path: '/admin/:grupoId/habilidades', element: <p>Habilidades</p> },
    ],
    { initialEntries: ['/admin/g-quinta/jogadores/j-toninho'] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container, roteador };
}

const secao = async () => within(await screen.findByRole('region', { name: 'Habilidades e nível' }));

describe('SecaoNotas (T16)', () => {
  it('edição: seis seletores com a habilidade como nome e o valor da nota; nível em região aria-live', async () => {
    api();
    montar();
    const s = await secao();
    expect(s.getAllByRole('combobox')).toHaveLength(6);
    expect(s.getByRole('combobox', { name: 'Chute' })).toHaveValue('8');
    expect(s.getByRole('combobox', { name: 'Desarme' })).toHaveValue('5');
    const nivel = s.getByText('Nível 6,8');
    expect(nivel).toHaveAttribute('aria-live', 'polite');
  });

  it('seletor oferece "–" e 1 a 10', async () => {
    api();
    montar();
    const s = await secao();
    const opcoes = within(s.getByRole('combobox', { name: 'Chute' })).getAllByRole('option');
    expect(opcoes.map((o) => o.textContent)).toEqual(['–', ...Array.from({ length: 10 }, (_, i) => String(i + 1))]);
  });

  it('mudar Chute para 9: PUT com X-Pelada, nível 7,0 e selo salvo só na linha do Chute', async () => {
    api();
    montar();
    const s = await secao();
    await userEvent.selectOptions(s.getByRole('combobox', { name: 'Chute' }), '9');
    expect(await s.findByText('Nível 7,0')).toBeInTheDocument();
    expect(chamadas).toEqual([
      { caminho: '/api/grupos/g-quinta/jogadores/j-toninho/notas/h-chute', corpo: { nota: 9 }, xPelada: '1' },
    ]);
    const selos = s.getAllByRole('status');
    expect(selos).toHaveLength(1);
    expect(selos[0]).toHaveTextContent('salvo');
    expect(within(selos[0]!.closest('li')!).getByRole('combobox', { name: 'Chute' })).toHaveValue('9');
  });

  it('"–" apaga a nota: corpo { nota: null }', async () => {
    api(undefined, (id, corpo) =>
      HttpResponse.json({ habilidadeId: id, nota: corpo.nota, nivel: 6.8, semNota: false }),
    );
    montar();
    const s = await secao();
    await userEvent.selectOptions(s.getByRole('combobox', { name: 'Passe' }), '');
    await waitFor(() => expect(chamadas).toHaveLength(1));
    expect(chamadas[0]?.corpo).toEqual({ nota: null });
  });

  it('habilidade sem nota do jogador aparece com "–"', async () => {
    const base = fixture('jogador-toninho.json') as { notas: { nota: number | null }[] };
    const ficha = { ...base, notas: base.notas.map((n, i) => (i === 0 ? { ...n, nota: null } : n)) };
    api(ficha as JsonBodyType);
    montar();
    const s = await secao();
    expect(s.getByRole('combobox', { name: 'Visão de Jogo' })).toHaveValue('');
  });

  it('sem habilidades: "Sem nota", "Usa 5,5 no simulador." e link para cadastrar', async () => {
    api(fixture('jogador-sem-habilidades.json'));
    servidor.use(
      http.get('/api/grupos/g-quinta/jogadores/j-toninho', () =>
        HttpResponse.json(fixture('jogador-sem-habilidades.json')),
      ),
    );
    montar();
    const s = await secao();
    expect(s.getByText('Sem nota')).toBeInTheDocument();
    expect(s.getByText(/Usa 5,5 no simulador\./)).toBeInTheDocument();
    expect(s.getByText('Nenhuma habilidade cadastrada.')).toBeInTheDocument();
    expect(s.getByRole('link', { name: 'Cadastrar habilidades' })).toHaveAttribute(
      'href',
      '/admin/g-quinta/habilidades',
    );
  });

  it('duas alterações com respostas invertidas: fica o nível da última', async () => {
    api(undefined, async (id, corpo) => {
      if (corpo.nota === 9) {
        await delay(60);
        return HttpResponse.json({ habilidadeId: id, nota: 9, nivel: 7, semNota: false });
      }
      return HttpResponse.json({ habilidadeId: id, nota: 3, nivel: 6.2, semNota: false });
    });
    montar();
    const s = await secao();
    const chute = s.getByRole('combobox', { name: 'Chute' });
    await userEvent.selectOptions(chute, '9');
    await userEvent.selectOptions(chute, '3');
    await waitFor(() => expect(chamadas).toHaveLength(2));
    await delay(120);
    expect(await s.findByText('Nível 6,2')).toBeInTheDocument();
    expect(s.queryByText('Nível 7,0')).not.toBeInTheDocument();
    expect(chute).toHaveValue('3');
  });

  it('falha ao gravar: o seletor volta ao valor salvo e aparece a faixa de erro', async () => {
    api(undefined, () => new HttpResponse(null, { status: 500 }));
    montar();
    const s = await secao();
    await userEvent.selectOptions(s.getByRole('combobox', { name: 'Chute' }), '9');
    expect(await screen.findByText('Não foi possível salvar a nota.')).toBeInTheDocument();
    await waitFor(() => expect(s.getByRole('combobox', { name: 'Chute' })).toHaveValue('8'));
  });

  it('axe: sem violações na edição e sem habilidades', async () => {
    api();
    const { container } = montar();
    await secao();
    expect(await violacoes(container)).toEqual([]);
  });
});
