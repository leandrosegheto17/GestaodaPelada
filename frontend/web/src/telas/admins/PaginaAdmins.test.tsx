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
import { Component as PaginaAdmins } from './PaginaAdmins';

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
  escrita?: (metodo: string) => Response | undefined;
}

function api({ lista = fixture('admins-quinta.json'), escrita }: Opcoes = {}) {
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
    http.get('/api/grupos/g-quinta/admins', () => HttpResponse.json(lista)),
    http.post('/api/grupos/g-quinta/admins', ({ request }) =>
      tratar('POST', request, () => HttpResponse.json(fixture('admin-criado.json'), { status: 201 })),
    ),
    http.post('/api/grupos/g-quinta/admins/:contaId/redefinir-senha', ({ request }) =>
      tratar('POST', request, () => HttpResponse.json(fixture('senha-redefinida.json'))),
    ),
    http.delete('/api/grupos/g-quinta/admins/:contaId', ({ request }) =>
      tratar('DELETE', request, () => new HttpResponse(null, { status: 204 })),
    ),
    http.patch('/api/grupos/g-quinta/admins/:contaId/financeiro', ({ request }) =>
      tratar('PATCH', request, () => HttpResponse.json(lista)),
    ),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/admin/:grupoId/admins', Component: PaginaAdmins }], {
    initialEntries: ['/admin/g-quinta/admins'],
  });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container, cliente };
}

describe('PaginaAdmins (T19): lista', () => {
  it('a própria linha só tem Minha senha; os outros têm Redefinir e Remover; interruptores com nome e estado', async () => {
    api();
    montar();
    await screen.findByText('Leandro (você)');
    const eu = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('Leandro'))!;
    expect(within(eu).getByRole('link', { name: 'Minha senha' })).toHaveAttribute('href', '/conta/senha');
    expect(within(eu).queryByRole('button', { name: 'Redefinir senha' })).toBeNull();
    const outro = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('Marquinhos'))!;
    expect(within(outro).getByRole('button', { name: 'Redefinir senha' })).toBeInTheDocument();
    expect(within(outro).getByRole('button', { name: 'Remover do grupo' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Acessa financeiro: Leandro' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Acessa financeiro: Marquinhos' })).not.toBeChecked();
  });

  it('o interruptor da própria linha fica desabilitado, com a ajuda ligada por aria-describedby', async () => {
    api();
    montar();
    const chave = await screen.findByRole('switch', { name: 'Acessa financeiro: Leandro' });
    expect(chave).toBeDisabled();
    expect(chave).toHaveAccessibleDescription('Você não pode alterar o seu próprio acesso.');
    expect(screen.getByRole('switch', { name: 'Acessa financeiro: Marquinhos' })).toBeEnabled();
  });

  it('podeGerirFinanceiro falso desabilita os interruptores', async () => {
    const base = fixture('admins-quinta.json') as Record<string, JsonBodyType>;
    api({ lista: { ...base, podeGerirFinanceiro: false } });
    montar();
    await screen.findByText('Leandro (você)');
    for (const chave of screen.getAllByRole('switch')) expect(chave).toBeDisabled();
  });

  it('PATCH com falha volta o interruptor e mostra o aviso', async () => {
    api({ escrita: (metodo) => (metodo === 'PATCH' ? HttpResponse.error() : undefined) });
    montar();
    const chave = await screen.findByRole('switch', { name: 'Acessa financeiro: Marquinhos' });
    await userEvent.click(chave);
    expect(await screen.findByText(/Não foi possível concluir/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Acessa financeiro: Marquinhos' })).not.toBeChecked(),
    );
    expect(chamadas[0]).toMatchObject({ metodo: 'PATCH', xPelada: '1', corpo: { acessaFinanceiro: true } });
  });

  it('único admin mostra a ajuda', async () => {
    api({ lista: fixture('admins-sabado.json') });
    montar();
    expect(
      await screen.findByText('Você é o único admin deste grupo. Todo grupo precisa de pelo menos um admin.'),
    ).toBeInTheDocument();
  });

  it('sem violações do axe', async () => {
    api();
    const { container } = montar();
    await screen.findByText('Leandro (você)');
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('PaginaAdmins (T19): ações', () => {
  it('redefinir senha abre o D1 com foco em Copiar; fechar apaga a senha do DOM e do cache', async () => {
    api();
    const { cliente } = montar();
    const outro = (await screen.findAllByRole('listitem')).find((li) => li.textContent?.includes('Marquinhos'))!;
    await userEvent.click(within(outro).getByRole('button', { name: 'Redefinir senha' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Senha temporária de Marquinhos' });
    expect(within(dialogo).getByRole('button', { name: 'Copiar' })).toHaveFocus();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Já copiei' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.body).not.toHaveTextContent('Hx7nRq4tWp2m');
    const guardado = JSON.stringify(
      cliente
        .getMutationCache()
        .getAll()
        .map((m) => m.state.data),
    );
    expect(guardado).not.toContain('senhaTemporaria');
    expect(guardado).not.toContain('Tb4kWm9sQr3x');
    expect(
      JSON.stringify(
        cliente
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain('Hx7nRq4tWp2m');
    expect(chamadas[0]).toMatchObject({ metodo: 'POST', xPelada: '1' });
  });

  it('remover abre o D2 com foco em Cancelar; confirmar envia DELETE', async () => {
    api();
    montar();
    const outro = (await screen.findAllByRole('listitem')).find((li) => li.textContent?.includes('Marquinhos'))!;
    await userEvent.click(within(outro).getByRole('button', { name: 'Remover do grupo' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Remover Marquinhos do grupo?' });
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover do grupo' }));
    await waitFor(() => expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(true));
  });

  it('erro 409 ao remover vira aviso com a mensagem da API', async () => {
    api({
      escrita: (metodo) =>
        metodo === 'DELETE'
          ? HttpResponse.json(
              { erro: { codigo: 'ultimo_admin', mensagem: 'Todo grupo precisa de pelo menos um admin.' } },
              { status: 409 },
            )
          : undefined,
    });
    montar();
    const outro = (await screen.findAllByRole('listitem')).find((li) => li.textContent?.includes('Marquinhos'))!;
    await userEvent.click(within(outro).getByRole('button', { name: 'Remover do grupo' }));
    const dialogo = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover do grupo' }));
    expect(await screen.findByText('Todo grupo precisa de pelo menos um admin.')).toBeInTheDocument();
  });
});

describe('PaginaAdmins (T19): adicionar', () => {
  it('e-mail inválido é recusado no cliente, sem POST', async () => {
    api();
    montar();
    await userEvent.type(await screen.findByLabelText('Nome'), 'Rodrigo');
    await userEvent.type(screen.getByLabelText('E-mail'), 'rodrigo@');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar admin' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(chamadas).toHaveLength(0);
  });

  it('422 do servidor aparece no campo', async () => {
    api({
      escrita: (metodo) =>
        metodo === 'POST' ? HttpResponse.json(fixture('erro-validacao-admin.json'), { status: 422 }) : undefined,
    });
    montar();
    await userEvent.type(await screen.findByLabelText('Nome'), 'Rodrigo');
    await userEvent.type(screen.getByLabelText('E-mail'), 'rodrigo@exemplo.com.br');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar admin' }));
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
  });

  it('conta nova abre o D1 com a senha e limpa o formulário', async () => {
    api();
    montar();
    await userEvent.type(await screen.findByLabelText('Nome'), 'Rodrigo');
    await userEvent.type(screen.getByLabelText('E-mail'), 'rodrigo@exemplo.com.br');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar admin' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Senha temporária de Rodrigo' });
    expect(dialogo).toHaveTextContent('Hx7nRq4tWp2m');
    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(chamadas[0]).toMatchObject({
      metodo: 'POST',
      xPelada: '1',
      corpo: { nome: 'Rodrigo', email: 'rodrigo@exemplo.com.br' },
    });
  });

  it('conta existente mostra o aviso de vínculo', async () => {
    api({
      escrita: (metodo) =>
        metodo === 'POST' ? HttpResponse.json(fixture('admin-vinculado.json'), { status: 201 }) : undefined,
    });
    montar();
    await userEvent.type(await screen.findByLabelText('Nome'), 'Carlos');
    await userEvent.type(screen.getByLabelText('E-mail'), 'carlos@exemplo.com.br');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar admin' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Admin existente vinculado ao grupo.');
  });
});
