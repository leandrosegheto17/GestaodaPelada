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
import { Component as GrupoDono } from './GrupoDono';
import { estadoVinculo } from './navegacao';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;
const URL_PUBLICA = (fixture('dono-grupo-quinta.json') as { urlPublica: string }).urlPublica;

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
  grupo?: () => Response;
  escrita?: (metodo: string, caminho: string) => Response | undefined;
}

function api({ grupo = () => HttpResponse.json(fixture('dono-grupo-quinta.json')), escrita }: Opcoes = {}) {
  chamadas = [];
  const tratar = async (metodo: string, request: Request, padrao: () => Response) => {
    const texto = await request.text();
    const caminho = new URL(request.url).pathname;
    chamadas.push({
      metodo,
      caminho,
      corpo: texto ? JSON.parse(texto) : null,
      xPelada: request.headers.get('x-pelada'),
    });
    return escrita?.(metodo, caminho) ?? padrao();
  };
  servidor.use(
    http.get('/api/dono/grupos/g-quinta', () => grupo()),
    http.get('/api/sessao/eu', () => HttpResponse.json(fixture('sessao-eu-admin.json'))),
    http.get('/api/dono/painel', () => HttpResponse.json(fixture('dono-painel.json'))),
    http.patch('/api/dono/grupos/g-quinta/situacao', ({ request }) =>
      tratar('PATCH', request, () => HttpResponse.json(fixture('dono-grupo-quinta.json'))),
    ),
    http.post('/api/dono/grupos/g-quinta/arquivar', ({ request }) =>
      tratar('POST', request, () => HttpResponse.json(fixture('dono-grupo-firma-arquivado.json'))),
    ),
    http.post('/api/dono/grupos/g-quinta/reativar', ({ request }) =>
      tratar('POST', request, () => HttpResponse.json(fixture('dono-grupo-quinta.json'))),
    ),
    http.post('/api/dono/contas/:id/redefinir-senha', ({ request }) =>
      tratar('POST', request, () => HttpResponse.json(fixture('senha-redefinida.json'))),
    ),
  );
}

function montar(state?: unknown) {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/dono/grupos/:grupoId', Component: GrupoDono },
      { path: '/dono', element: <p>Área do dono</p> },
    ],
    { initialEntries: [{ pathname: '/dono/grupos/g-quinta', state }] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, cliente, container };
}

describe('GrupoDono (T28): visão geral', () => {
  it('metadados, link exatamente como a API, situação e admins', async () => {
    api();
    const { container } = montar();
    expect(await screen.findByRole('heading', { level: 1, name: 'Pelada de Quinta' })).toBeInTheDocument();
    expect(screen.getByText('Quinta, semanal')).toBeInTheDocument();
    expect(screen.getByText('20:00')).toBeInTheDocument();
    expect(screen.getByText('05/02/2026')).toBeInTheDocument();
    expect(screen.getByText(URL_PUBLICA)).toBeInTheDocument();
    expect(screen.getByLabelText('Situação comercial')).toHaveValue('uso_proprio');
    expect(screen.getByText('marquinhos@exemplo.com.br')).toBeInTheDocument();
    expect(document.querySelector('a[href^="/admin"]')).toBeNull();
    expect(await violacoes(container)).toEqual([]);
  });

  it('o dono não tem "Redefinir senha" na própria conta', async () => {
    api();
    montar();
    await screen.findByText('marquinhos@exemplo.com.br');
    expect(screen.getAllByRole('button', { name: 'Redefinir senha' })).toHaveLength(1);
  });

  it('Copiar escreve a URL e anuncia', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar' }));
    expect(escrever).toHaveBeenCalledWith(URL_PUBLICA);
    expect(await screen.findByText('Link copiado')).toBeInTheDocument();
  });

  it('aviso de vínculo vem do estado de navegação; sem estado, sem faixa', async () => {
    api();
    montar(estadoVinculo);
    expect(await screen.findByText('Admin existente vinculado; senha mantida.')).toBeInTheDocument();
  });

  it('404 volta para a área do dono; erro de rede mostra Tentar de novo', async () => {
    api({ grupo: () => HttpResponse.json(fixture('erro-nao-encontrado.json'), { status: 404 }) });
    const { roteador } = montar();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/dono'));
  });
});

describe('GrupoDono (T28): situação', () => {
  it('Trial mostra a data e envia o início; Ativo envia null', async () => {
    api();
    montar();
    await userEvent.selectOptions(await screen.findByLabelText('Situação comercial'), 'trial');
    await userEvent.type(screen.getByLabelText('Início do trial'), '2026-10-22');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar situação' }));
    expect(await screen.findByText('Situação salva.')).toBeInTheDocument();
    expect(chamadas[0]).toMatchObject({
      metodo: 'PATCH',
      xPelada: '1',
      corpo: { situacaoComercial: 'trial', inicioTrial: '2026-10-22' },
    });
  });

  it('Trial sem data é recusado no cliente', async () => {
    api();
    montar();
    await userEvent.selectOptions(await screen.findByLabelText('Situação comercial'), 'trial');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar situação' }));
    expect(await screen.findByText('Informe o início do trial.')).toBeInTheDocument();
    expect(chamadas).toHaveLength(0);
  });
});

describe('GrupoDono (T28): senha e arquivamento', () => {
  it('Redefinir senha abre o D1; fechar apaga a senha do DOM e do cache', async () => {
    api();
    const { cliente } = montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Redefinir senha' }));
    const dialogo = await screen.findByRole('dialog', { name: /Senha temporária/ });
    expect(chamadas[0]).toMatchObject({ caminho: '/api/dono/contas/c-marquinhos/redefinir-senha', xPelada: '1' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Já copiei' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      JSON.stringify(
        cliente
          .getMutationCache()
          .getAll()
          .map((m) => m.state.data),
      ),
    ).not.toContain('senhaTemporaria');
  });

  it('Arquivar: D2 por digitação; nome exato habilita; arquivado mostra selo, data e só Reativar', async () => {
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Arquivar grupo' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Arquivar “Pelada de Quinta”?' });
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    const confirmar = within(dialogo).getByRole('button', { name: 'Arquivar grupo' });
    expect(confirmar).toBeDisabled();
    const campo = within(dialogo).getByLabelText('Digite o nome do grupo para confirmar');
    await userEvent.type(campo, 'Pelada de');
    expect(confirmar).toBeDisabled();
    await userEvent.type(campo, ' Quinta');
    expect(confirmar).toBeEnabled();
    await userEvent.click(confirmar);
    expect(await screen.findByText('Grupo arquivado.')).toBeInTheDocument();
    expect(chamadas[0]).toMatchObject({
      caminho: '/api/dono/grupos/g-quinta/arquivar',
      corpo: { nomeConfirmacao: 'Pelada de Quinta' },
    });
    expect(screen.getByText('arquivado')).toBeInTheDocument();
    expect(screen.getByText('Arquivado em')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reativar grupo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Arquivar grupo' })).toBeNull();
    expect(screen.queryByLabelText('Situação comercial')).toBeNull();
  });

  it('422 do arquivamento aparece dentro do diálogo', async () => {
    api({
      escrita: (_metodo, caminho) =>
        caminho.endsWith('/arquivar')
          ? HttpResponse.json(
              { erro: { codigo: 'validacao', mensagem: 'x', campos: { nomeConfirmacao: 'O nome não confere.' } } },
              { status: 422 },
            )
          : undefined,
    });
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Arquivar grupo' }));
    const dialogo = await screen.findByRole('alertdialog');
    await userEvent.type(within(dialogo).getByLabelText('Digite o nome do grupo para confirmar'), 'Pelada de Quinta');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Arquivar grupo' }));
    expect(await within(dialogo).findByText('O nome não confere.')).toBeInTheDocument();
  });
});
