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
import { Component as PaginaHabilidades } from './PaginaHabilidades';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

interface Chamada {
  metodo: string;
  caminho: string;
  corpo: unknown;
  xPelada: string | null;
}
let chamadas: Chamada[] = [];

interface Opcoes {
  lista?: JsonBodyType;
  /** Resposta para as escritas; padrão: sucesso. */
  escrita?: (metodo: string) => Response | undefined;
}

function api({ lista = fixture('habilidades.json'), escrita }: Opcoes = {}) {
  chamadas = [];
  const tratar = async (metodo: string, request: Request, padrao: () => Response) => {
    const texto = await request.text();
    chamadas.push({
      metodo,
      caminho: new URL(request.url).pathname,
      corpo: texto ? JSON.parse(texto) : null,
      xPelada: request.headers.get('x-pelada'),
    });
    return escrita?.(metodo) ?? padrao();
  };
  servidor.use(
    http.get('/api/grupos/g-quinta/habilidades', () => HttpResponse.json(lista)),
    http.post('/api/grupos/g-quinta/habilidades', ({ request }) =>
      tratar('POST', request, () => HttpResponse.json({ id: 'h-novo', nome: 'Finta' }, { status: 201 })),
    ),
    http.patch('/api/grupos/g-quinta/habilidades/:id', ({ request, params }) =>
      tratar('PATCH', request, () => HttpResponse.json({ id: params['id'], nome: 'Passe longo' })),
    ),
    http.delete('/api/grupos/g-quinta/habilidades/:id', ({ request }) =>
      tratar('DELETE', request, () => new HttpResponse(null, { status: 204 })),
    ),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/admin/:grupoId/habilidades', Component: PaginaHabilidades }], {
    initialEntries: ['/admin/g-quinta/habilidades'],
  });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container };
}

const erroDeNome = () => HttpResponse.json(fixture('erro-validacao-habilidade.json'), { status: 422 });

describe('PaginaHabilidades (T17)', () => {
  it('sucesso: seis itens com nome acessível e botão Excluir com o nome da habilidade', async () => {
    api();
    montar();
    const campo = await screen.findByLabelText('Nome da habilidade 4');
    expect(campo).toHaveValue('Drible');
    expect(screen.getAllByLabelText(/^Nome da habilidade \d$/)).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Excluir Drible' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nova habilidade')).toBeInTheDocument();
  });

  it('vazio: explica o nível 5,5 e mantém o formulário', async () => {
    api({ lista: fixture('habilidades-vazio.json') });
    montar();
    expect(await screen.findByRole('heading', { name: 'Nenhuma habilidade' })).toBeInTheDocument();
    expect(screen.getByText('O simulador vai usar nível 5,5 para todos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });

  it('criar: envia o nome com X-Pelada, limpa o campo e devolve o foco a ele', async () => {
    api();
    montar();
    const campo = await screen.findByLabelText('Nova habilidade');
    await userEvent.type(campo, 'Finta');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(chamadas.filter((c) => c.metodo === 'POST')).toHaveLength(1));
    expect(chamadas.find((c) => c.metodo === 'POST')).toMatchObject({ corpo: { nome: 'Finta' }, xPelada: '1' });
    await waitFor(() => expect(campo).toHaveValue(''));
    expect(campo).toHaveFocus();
  });

  it.each(['A', 'x'.repeat(31)])('nome %j é recusado no campo, sem requisição', async (nome) => {
    api();
    montar();
    const campo = await screen.findByLabelText('Nova habilidade');
    // maxLength do input corta no 30º caractere: a validação do contrato cobre colagem/ajuste por script
    await userEvent.type(campo, nome);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    if (nome.length === 1) {
      expect(await screen.findByRole('alert')).toHaveTextContent(/2 a 30 caracteres/);
      expect(campo).toHaveAttribute('aria-invalid', 'true');
      expect(chamadas.filter((c) => c.metodo === 'POST')).toHaveLength(0);
    } else {
      expect((campo as HTMLInputElement).value).toHaveLength(30);
    }
  });

  it('criar: 422 mostra o texto da API com role=alert e aria-invalid', async () => {
    api({ escrita: (m) => (m === 'POST' ? erroDeNome() : undefined) });
    montar();
    const campo = await screen.findByLabelText('Nova habilidade');
    await userEvent.type(campo, 'passe');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Já existe uma habilidade com esse nome.');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveValue('passe');
  });

  it('excluir: abre o D2 com foco em Cancelar; Cancelar não chama DELETE; confirmar remove', async () => {
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir Drible' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Excluir “Drible”?' });
    expect(within(dialogo).getByText(/apaga as notas de todos os jogadores/)).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(chamadas.filter((c) => c.metodo === 'DELETE')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Drible' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir habilidade' }));
    await waitFor(() => expect(chamadas.filter((c) => c.metodo === 'DELETE')).toHaveLength(1));
    expect(chamadas.find((c) => c.metodo === 'DELETE')).toMatchObject({
      caminho: '/api/grupos/g-quinta/habilidades/h-drible',
      xPelada: '1',
    });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('excluir com falha mantém o item e mostra a faixa de erro', async () => {
    api({ escrita: (m) => (m === 'DELETE' ? new HttpResponse(null, { status: 500 }) : undefined) });
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir Drible' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir habilidade' }));
    expect(await screen.findByText(/Não foi possível excluir/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nome da habilidade 4')).toHaveValue('Drible');
  });

  it('renomear: sair do campo com nome novo faz PATCH; sem mudança não faz nada; Esc restaura', async () => {
    api();
    montar();
    const campo = await screen.findByLabelText('Nome da habilidade 2');
    await userEvent.click(campo);
    await userEvent.tab();
    expect(chamadas.filter((c) => c.metodo === 'PATCH')).toHaveLength(0);

    await userEvent.clear(campo);
    await userEvent.type(campo, 'Passe longo');
    await userEvent.type(campo, '{Escape}');
    expect(campo).toHaveValue('Passe');

    await userEvent.clear(campo);
    await userEvent.type(campo, 'Passe longo{Enter}');
    await waitFor(() => expect(chamadas.filter((c) => c.metodo === 'PATCH')).toHaveLength(1));
    expect(chamadas.find((c) => c.metodo === 'PATCH')).toMatchObject({
      caminho: '/api/grupos/g-quinta/habilidades/h-passe',
      corpo: { nome: 'Passe longo' },
      xPelada: '1',
    });
    expect(await screen.findByText('salvo')).toBeInTheDocument();
  });

  it('renomear: 422 mostra o erro no item e mantém o valor digitado', async () => {
    api({ escrita: (m) => (m === 'PATCH' ? erroDeNome() : undefined) });
    montar();
    const campo = await screen.findByLabelText('Nome da habilidade 2');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Chute{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma habilidade com esse nome.');
    expect(campo).toHaveValue('Chute');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
  });

  it('erro de rede na lista mostra o aviso com nova tentativa', async () => {
    servidor.use(http.get('/api/grupos/g-quinta/habilidades', () => HttpResponse.error()));
    montar();
    expect(await screen.findByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
  });

  it('axe: sem violações em sucesso, vazio, erro de nome e com o D2 aberto', async () => {
    api();
    const { container } = montar();
    await screen.findByLabelText('Nome da habilidade 1');
    expect(await violacoes(container)).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Drible' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(await violacoes(dialogo)).toEqual([]);
  });

  it('axe: vazio e erro de nome', async () => {
    api({ lista: fixture('habilidades-vazio.json'), escrita: (m) => (m === 'POST' ? erroDeNome() : undefined) });
    const { container } = montar();
    await screen.findByRole('heading', { name: 'Nenhuma habilidade' });
    expect(await violacoes(container)).toEqual([]);
    await userEvent.type(screen.getByLabelText('Nova habilidade'), 'passe');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await screen.findByRole('alert');
    expect(await violacoes(container)).toEqual([]);
  });
});
