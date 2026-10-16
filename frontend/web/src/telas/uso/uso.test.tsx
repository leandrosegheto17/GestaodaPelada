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
import { linhasUso } from './linhasUso';
import { Component as PaginaUso } from './PaginaUso';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

let leituras = 0;
function api(resposta: () => Response) {
  leituras = 0;
  servidor.use(
    http.get('/api/grupos/g-quinta/uso', () => {
      leituras += 1;
      return resposta();
    }),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/admin/:grupoId/uso', Component: PaginaUso }], {
    initialEntries: ['/admin/g-quinta/uso'],
  });
  return render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
}

describe('linhasUso', () => {
  it('rótulos e valores na ordem recebida', () => {
    const semanas = (fixture('uso.json') as { semanas: Parameters<typeof linhasUso>[0] }).semanas;
    const linhas = linhasUso(semanas);
    expect(linhas.map((l) => l.rotulo)).toEqual(['19/10 a 25/10', '12/10 a 18/10', '05/10 a 11/10', '28/09 a 04/10']);
    expect(linhas[0]?.valores).toEqual(['9', '0', '0 (0)', '1 / 0']);
  });

  it('virada de ano e zeros mantidos', () => {
    const [linha] = linhasUso([
      {
        inicio: '2026-12-28',
        fim: '2027-01-03',
        aparelhosRanking: 0,
        pdfsExportados: 0,
        partidasLancadas: 0,
        partidasEm48h: 0,
        escalacoesConfirmadas: 0,
      },
    ]);
    expect(linha).toEqual({ rotulo: '28/12 a 03/01', valores: ['0', '0', '0 (0)', '0 / 0'] });
  });
});

describe('PaginaUso (T21)', () => {
  it('tabela com legenda, 5 colunas e 4 linhas, mais os cartões', async () => {
    api(() => HttpResponse.json(fixture('uso.json')));
    const { container } = montar();
    const tabela = await screen.findByRole('table', { name: 'Uso por semana, mais recente primeiro' });
    expect(within(tabela).getAllByRole('columnheader')).toHaveLength(5);
    expect(within(tabela).getAllByRole('rowheader')).toHaveLength(4);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toContain('19/10 a 25/10');
    expect(await violacoes(container)).toEqual([]);
  });

  it('vazio mostra o aviso e nenhuma tabela', async () => {
    api(() => HttpResponse.json(fixture('uso-vazio.json')));
    const { container } = montar();
    expect(await screen.findByText('Ainda não há uso registrado.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(await violacoes(container)).toEqual([]);
  });

  it('503 mostra o erro padrão e Tentar de novo refaz o GET', async () => {
    api(() => HttpResponse.json(fixture('erro-interno.json'), { status: 503 }));
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar. Verifique a conexão.');
    const antes = leituras;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(leituras).toBeGreaterThan(antes));
  });
});
