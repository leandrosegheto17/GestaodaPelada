import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaFinanceiro } from './PaginaFinanceiro';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const base = JSON.parse(readFileSync(join(RESPOSTAS, 'financeiro-2026-10.json'), 'utf8')) as {
  pagamentos: { jogadorId: string; apelido: string; pagou: boolean }[];
  [chave: string]: unknown;
};
const comoJson = (valor: unknown): JsonBodyType => valor as JsonBodyType;
const depois = comoJson({
  ...base,
  saldoAtualCentavos: 132_050,
  pagamentos: base.pagamentos.map((p) => (p.jogadorId === 'j-fumaca' ? { ...p, pagou: true } : p)),
});

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

interface Chamada {
  metodo: string;
  caminho: string;
  corpo: unknown;
  cabecalho: string | null;
}
let chamadas: Chamada[] = [];
let gets = 0;

function api(escrita: (request: Request) => Response | Promise<Response>) {
  chamadas = [];
  gets = 0;
  servidor.use(
    http.get('/api/grupos/g-quinta/financeiro/mes', () => {
      gets += 1;
      return HttpResponse.json(gets === 1 ? comoJson(base) : depois);
    }),
    http.post('/api/grupos/g-quinta/financeiro/pagamentos', async ({ request }) => {
      chamadas.push({
        metodo: 'POST',
        caminho: new URL(request.url).pathname,
        corpo: await request.clone().json(),
        cabecalho: request.headers.get('X-Pelada'),
      });
      return escrita(request);
    }),
    http.delete('/api/grupos/g-quinta/financeiro/pagamentos/:jogadorId/:mes', ({ request }) => {
      chamadas.push({
        metodo: 'DELETE',
        caminho: new URL(request.url).pathname,
        corpo: null,
        cabecalho: request.headers.get('X-Pelada'),
      });
      return escrita(request);
    }),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/admin/:grupoId/financeiro', Component: PaginaFinanceiro }], {
    initialEntries: ['/admin/g-quinta/financeiro'],
  });
  return render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
}

const interruptor = (apelido: string) => screen.findByRole('switch', { name: `Pagou: ${apelido}` });
const ok = () => new HttpResponse(null, { status: 204 });
const erroServidor = () => HttpResponse.json({ erro: { codigo: 'erro_interno', mensagem: 'Falha.' } }, { status: 500 });

describe('PaginaFinanceiro: pagamentos (T22)', () => {
  it('marcar Fumaça: POST com o corpo e X-Pelada, refaz o mês e mostra os saldos novos', async () => {
    api(ok);
    montar();
    await userEvent.click(await interruptor('Fumaça'));
    expect(await screen.findByText('R$ 1.320,50')).toBeInTheDocument();
    expect(chamadas).toEqual([
      {
        metodo: 'POST',
        caminho: '/api/grupos/g-quinta/financeiro/pagamentos',
        corpo: { jogadorId: 'j-fumaca', mes: '2026-10' },
        cabecalho: '1',
      },
    ]);
    expect(await interruptor('Fumaça')).toBeChecked();
  });

  it('falha de rede ou 500: o interruptor volta a "Não pagou" e a faixa explica', async () => {
    for (const falha of [() => HttpResponse.error(), erroServidor]) {
      api(falha);
      const { unmount } = montar();
      const chave = await interruptor('Fumaça');
      await userEvent.click(chave);
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível marcar o pagamento de Fumaça. Tente de novo.',
      );
      expect(await interruptor('Fumaça')).not.toBeChecked();
      unmount();
    }
  });

  it('409 (já marcado por outro admin): só refaz a consulta, sem faixa de erro', async () => {
    api(() =>
      HttpResponse.json({ erro: { codigo: 'pagamento_ja_marcado', mensagem: 'Já marcado.' } }, { status: 409 }),
    );
    montar();
    await userEvent.click(await interruptor('Fumaça'));
    await waitFor(() => expect(gets).toBe(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('desmarcar Toninho: pede confirmação com o texto do mockup e o foco em Cancelar', async () => {
    api(ok);
    montar();
    await userEvent.click(await interruptor('Toninho'));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Desmarcar o pagamento de Toninho?' });
    expect(dialogo).toHaveTextContent('A entrada “Mensalidade Toninho 10/2026” (R$ 75,00) será removida do caixa.');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    expect(chamadas).toEqual([]);
  });

  it('Cancelar e Esc: nada é enviado, o interruptor segue "Pagou" e o foco volta a ele', async () => {
    api(ok);
    montar();
    const chave = await interruptor('Toninho');
    await userEvent.click(chave);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(chave).toBeChecked();
    expect(chave).toHaveFocus();
    await userEvent.click(chave);
    await screen.findByRole('alertdialog');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(chave).toBeChecked();
    expect(chamadas).toEqual([]);
  });

  it('confirmar: DELETE no caminho do jogador e do mês, depois refaz o mês', async () => {
    api(ok);
    montar();
    await userEvent.click(await interruptor('Toninho'));
    await userEvent.click(await screen.findByRole('button', { name: 'Desmarcar' }));
    await waitFor(() => expect(gets).toBe(2));
    expect(chamadas).toEqual([
      {
        metodo: 'DELETE',
        caminho: '/api/grupos/g-quinta/financeiro/pagamentos/j-toninho/2026-10',
        corpo: null,
        cabecalho: '1',
      },
    ]);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('desmarcar com falha: o interruptor volta a "Pagou" e a faixa explica', async () => {
    api(erroServidor);
    montar();
    const chave = await interruptor('Toninho');
    await userEvent.click(chave);
    await userEvent.click(await screen.findByRole('button', { name: 'Desmarcar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível desmarcar o pagamento de Toninho. Tente de novo.',
    );
    expect(chave).toBeChecked();
  });

  it('teclado: Espaço no interruptor dispara o mesmo fluxo', async () => {
    api(ok);
    montar();
    (await interruptor('Fumaça')).focus();
    await userEvent.keyboard(' ');
    await waitFor(() => expect(chamadas).toHaveLength(1));
  });

  it('a faixa é fechável', async () => {
    api(erroServidor);
    montar();
    await userEvent.click(await interruptor('Fumaça'));
    await userEvent.click(await screen.findByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('axe: sem violações com a faixa de erro e com o diálogo aberto', async () => {
    api(erroServidor);
    const { container } = montar();
    await userEvent.click(await interruptor('Fumaça'));
    await screen.findByRole('alert');
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(await interruptor('Toninho'));
    await screen.findByRole('alertdialog');
    expect(await violacoes(document.body)).toEqual([]);
  });
});
