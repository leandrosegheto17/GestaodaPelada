import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaLancamento } from './PaginaLancamento';

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
let leituras = 0;

async function registrar(request: Request): Promise<void> {
  const texto = await request.clone().text();
  envios.push({
    metodo: request.method,
    caminho: new URL(request.url).pathname,
    corpo: texto === '' ? null : (JSON.parse(texto) as unknown),
    cabecalho: request.headers.get('X-Pelada'),
  });
}

function api(escrita: () => Response = () => HttpResponse.json(fixture('lancamento-aluguel.json'))) {
  envios = [];
  leituras = 0;
  servidor.use(
    http.get('/api/grupos/g-quinta', () => HttpResponse.json(fixture('grupo-quinta.json'))),
    http.get('/api/grupos/g-quinta/financeiro/lancamentos/:id', () => {
      leituras += 1;
      return HttpResponse.json(fixture('lancamento-aluguel.json'));
    }),
    http.post('/api/grupos/g-quinta/financeiro/lancamentos', async ({ request }) => {
      await registrar(request);
      return escrita();
    }),
    http.put('/api/grupos/g-quinta/financeiro/lancamentos/:id', async ({ request }) => {
      await registrar(request);
      return escrita();
    }),
    http.delete('/api/grupos/g-quinta/financeiro/lancamentos/:id', async ({ request }) => {
      await registrar(request);
      return escrita();
    }),
  );
}

function Local() {
  const l = useLocation();
  return <p data-testid="local">{`${l.pathname}${l.search}`}</p>;
}

function montar(rota: string) {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/financeiro/lancamentos/novo', Component: PaginaLancamento },
      { path: '/admin/:grupoId/financeiro/lancamentos/:lancamentoId', Component: PaginaLancamento },
      { path: '/admin/:grupoId/financeiro', Component: Local },
    ],
    { initialEntries: [rota] },
  );
  return render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
}

const NOVO = '/admin/g-quinta/financeiro/lancamentos/novo';
const EDICAO = '/admin/g-quinta/financeiro/lancamentos/l-aluguel';
const criado = () => HttpResponse.json(fixture('lancamento-aluguel.json'), { status: 201 });
const validacao = () => HttpResponse.json(fixture('erro-validacao-lancamento.json'), { status: 422 });

async function preencher(descricao: string, valor: string) {
  const campoDescricao = await screen.findByLabelText('Descrição');
  await userEvent.clear(campoDescricao);
  if (descricao) await userEvent.type(campoDescricao, descricao);
  const campoValor = screen.getByLabelText('Valor (R$)');
  await userEvent.clear(campoValor);
  if (valor) await userEvent.type(campoValor, valor);
}

describe('PaginaLancamento (T23): novo', () => {
  it('abre com Entrada marcada, a data de hoje da API e o contador', async () => {
    api();
    montar(NOVO);
    expect(await screen.findByRole('radio', { name: 'Entrada' })).toBeChecked();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-10-22');
    expect(screen.getByText('0 de 80')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Descrição'), 'Camisas do time novo ok');
    expect(screen.getByText('23 de 80')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Financeiro/ })).toHaveAttribute('href', '/admin/g-quinta/financeiro');
  });

  it('salvar: POST com centavos e X-Pelada, depois T22 no mês da data', async () => {
    api(criado);
    montar(NOVO);
    await preencher('Camisas', '1.234,56');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByTestId('local')).toHaveTextContent('/admin/g-quinta/financeiro?mes=2026-10');
    expect(envios).toEqual([
      {
        metodo: 'POST',
        caminho: '/api/grupos/g-quinta/financeiro/lancamentos',
        corpo: { tipo: 'entrada', data: '2026-10-22', descricao: 'Camisas', valorCentavos: 123_456 },
        cabecalho: '1',
      },
    ]);
  });

  it.each([
    ['descrição vazia', '', '10,00'],
    ['valor zero', 'Bolas', '0,00'],
    ['valor negativo', 'Bolas', '-5'],
    ['três casas', 'Bolas', '1,234'],
    ['acima do limite', 'Bolas', '1.000.000,00'],
    ['valor vazio', 'Bolas', ''],
  ])('%s: mostra o erro e não envia', async (_nome, descricao, valor) => {
    api(criado);
    montar(NOVO);
    await preencher(descricao, valor);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(envios).toEqual([]);
  });

  it('422 do servidor: mensagens nos campos e "Corrija 2 campos:" com links', async () => {
    api(validacao);
    montar(NOVO);
    await preencher('Bolas', '10,00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Corrija 2 campos:')).toBeInTheDocument();
    expect(screen.getByText('Informe a descrição.')).toBeInTheDocument();
    expect(screen.getByText('O valor precisa ser maior que zero.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Descrição' })).toHaveAttribute('href', '#desc');
    expect(screen.getByRole('link', { name: 'Valor (R$)' })).toHaveAttribute('href', '#valor');
  });

  it('sem rede: faixa de falha e os valores continuam nos campos', async () => {
    api(() => HttpResponse.error());
    montar(NOVO);
    await preencher('Bolas', '10,00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Não foi possível enviar. Verifique a conexão.')).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição')).toHaveValue('Bolas');
    expect(screen.getByLabelText('Valor (R$)')).toHaveValue('10,00');
  });

  it('axe: sem violações no novo e com erros', async () => {
    api(validacao);
    const { container } = montar(NOVO);
    await screen.findByRole('radio', { name: 'Entrada' });
    expect(await violacoes(container)).toEqual([]);
    await preencher('Bolas', '10,00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await screen.findByText('Corrija 2 campos:');
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('PaginaLancamento (T23): edição', () => {
  it('preenche com o lançamento e mostra a última alteração no fuso de São Paulo', async () => {
    api();
    montar(EDICAO);
    expect(await screen.findByRole('radio', { name: 'Saída' })).toBeChecked();
    expect(screen.getByLabelText('Descrição')).toHaveValue('Aluguel da quadra outubro');
    expect(screen.getByLabelText('Valor (R$)')).toHaveValue('800,00');
    expect(screen.getByText('Última alteração: Leandro, 05/10 09:14')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Editar lançamento' })).toBeInTheDocument();
  });

  it('salvar: PUT com os dados alterados e volta a T22 no mês', async () => {
    api();
    montar(EDICAO);
    await preencher('Aluguel da quadra', '850,00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByTestId('local')).toHaveTextContent('/admin/g-quinta/financeiro?mes=2026-10');
    expect(envios).toEqual([
      {
        metodo: 'PUT',
        caminho: '/api/grupos/g-quinta/financeiro/lancamentos/l-aluguel',
        corpo: { tipo: 'saida', data: '2026-10-05', descricao: 'Aluguel da quadra', valorCentavos: 85_000 },
        cabecalho: '1',
      },
    ]);
  });

  it('id malformado: volta a T22 sem consultar', async () => {
    api();
    montar('/admin/g-quinta/financeiro/lancamentos/a%20b');
    expect(await screen.findByTestId('local')).toHaveTextContent('/admin/g-quinta/financeiro');
    expect(leituras).toBe(0);
  });

  it('404 (excluído por outro admin): volta a T22 sem faixa', async () => {
    api();
    servidor.use(
      http.get('/api/grupos/g-quinta/financeiro/lancamentos/:id', () =>
        HttpResponse.json({ erro: { codigo: 'nao_encontrado', mensagem: 'Não encontrado.' } }, { status: 404 }),
      ),
    );
    montar(EDICAO);
    expect(await screen.findByTestId('local')).toHaveTextContent('/admin/g-quinta/financeiro');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('excluir: diálogo com o texto do mockup e foco em Cancelar; Cancelar e Esc não enviam', async () => {
    api();
    montar(EDICAO);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Excluir lançamento?' });
    expect(dialogo).toHaveTextContent('“Aluguel da quadra outubro” (R$ 800,00) sai do caixa.');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(envios).toEqual([]);
  });

  it('excluir confirmado: DELETE e volta a T22 no mês do lançamento', async () => {
    api(() => new HttpResponse(null, { status: 204 }));
    montar(EDICAO);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir lançamento' }));
    expect(await screen.findByTestId('local')).toHaveTextContent('/admin/g-quinta/financeiro?mes=2026-10');
    expect(envios).toEqual([
      {
        metodo: 'DELETE',
        caminho: '/api/grupos/g-quinta/financeiro/lancamentos/l-aluguel',
        corpo: null,
        cabecalho: '1',
      },
    ]);
  });

  it('409 (entrada vinculada a pagamento): fecha o diálogo e mostra a mensagem da API', async () => {
    api(() =>
      HttpResponse.json(
        {
          erro: {
            codigo: 'lancamento_vinculado',
            mensagem: 'Esta entrada é de uma mensalidade. Desmarque o pagamento para removê-la.',
          },
        },
        { status: 409 },
      ),
    );
    montar(EDICAO);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir lançamento' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Esta entrada é de uma mensalidade. Desmarque o pagamento para removê-la.',
    );
  });

  it('outra falha ao excluir: faixa e o lançamento continua na tela', async () => {
    api(() => HttpResponse.json({ erro: { codigo: 'erro_interno', mensagem: 'Falha.' } }, { status: 500 }));
    montar(EDICAO);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir lançamento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível excluir o lançamento. Tente de novo.');
    expect(screen.getByLabelText('Descrição')).toHaveValue('Aluguel da quadra outubro');
  });

  it('axe: sem violações na edição e com o diálogo aberto', async () => {
    api();
    const { container } = montar(EDICAO);
    await screen.findByRole('radio', { name: 'Saída' });
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await screen.findByRole('alertdialog');
    expect(await violacoes(document.body)).toEqual([]);
  });
});
