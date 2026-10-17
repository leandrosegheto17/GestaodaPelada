import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { recursos } from '../../config/recursos';
import { criarClienteConsultas } from '../../dados/consultas';
import { LayoutAdmin } from './index';

vi.mock('../../config/recursos', () => ({ recursos: { ligado: vi.fn(() => true) } }));

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => vi.mocked(recursos.ligado).mockReturnValue(true));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

interface Envio {
  caminho: string;
  cabecalho: string | null;
}
let envios: Envio[] = [];

function api(sessao: string, resposta: () => Response = () => new HttpResponse(null, { status: 204 })) {
  envios = [];
  servidor.use(
    http.get('/api/sessao/eu', () => HttpResponse.json(fixture(sessao))),
    http.get('/api/grupos/g-quinta', () => HttpResponse.json(fixture('grupo-quinta.json'))),
    http.post('/api/sessao/aviso-privacidade', ({ request }) => {
      envios.push({ caminho: new URL(request.url).pathname, cabecalho: request.headers.get('X-Pelada') });
      return resposta();
    }),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      {
        path: '/admin/:grupoId',
        element: <LayoutAdmin />,
        children: [{ index: true, element: <p>Início do admin</p> }],
      },
    ],
    { initialEntries: ['/admin/g-quinta'] },
  );
  return render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
}

describe('LayoutAdmin: aviso de privacidade no 1º acesso', () => {
  it('"Entendi" envia o POST com X-Pelada, o diálogo some e não volta', async () => {
    api('sessao-eu-primeiro-acesso.json');
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Entendi' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(envios).toEqual([{ caminho: '/api/sessao/aviso-privacidade', cabecalho: '1' }]);
    expect(screen.getByText('Início do admin')).toBeInTheDocument();
  });

  it('falha (500 ou rede): erro dentro do diálogo, que continua aberto', async () => {
    for (const falha of [
      () => HttpResponse.json({ erro: { codigo: 'erro_interno', mensagem: 'Falha.' } }, { status: 500 }),
      () => HttpResponse.error(),
    ]) {
      api('sessao-eu-primeiro-acesso.json', falha);
      const { unmount } = montar();
      await userEvent.click(await screen.findByRole('button', { name: 'Entendi' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar. Verifique a conexão.');
      expect(screen.getByRole('dialog', { name: 'Privacidade' })).toBeInTheDocument();
      unmount();
    }
  });

  it('aviso já visto: sem diálogo', async () => {
    api('sessao-eu-admin.json');
    montar();
    await screen.findByText('Início do admin');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('recurso desligado: sem diálogo mesmo no 1º acesso', async () => {
    vi.mocked(recursos.ligado).mockImplementation((nome) => nome !== 'privacidade');
    api('sessao-eu-primeiro-acesso.json');
    montar();
    await screen.findByText('Início do admin');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
