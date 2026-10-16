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
import { Component as Entrar } from './Entrar';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

type Entrada = { status: number; corpo?: JsonBodyType } | 'rede';
interface Pedido {
  corpo: unknown;
  xPelada: string | null;
}
let pedidos: Pedido[] = [];

/** `antes`: resposta do GET eu antes de entrar (null = 401); `depois`: a de depois do POST. */
function api(entrada: Entrada, antes: JsonBodyType | null, depois: JsonBodyType | null = null) {
  pedidos = [];
  let entrou = false;
  servidor.use(
    http.get('/api/sessao/eu', () => {
      const corpo = entrou ? depois : antes;
      return corpo
        ? HttpResponse.json(corpo)
        : HttpResponse.json(fixture('erro-nao-autenticado.json'), { status: 401 });
    }),
    http.post('/api/sessao/entrar', async ({ request }) => {
      pedidos.push({ corpo: await request.json(), xPelada: request.headers.get('x-pelada') });
      if (entrada === 'rede') return HttpResponse.error();
      if (entrada.status >= 400) return HttpResponse.json(entrada.corpo ?? null, { status: entrada.status });
      entrou = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
}

function montar(rota = '/entrar') {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/entrar', Component: Entrar },
      { path: '/', element: <p>Início</p> },
      { path: '/dono', element: <p>Área do dono</p> },
      { path: '/admin', element: <p>Lista de grupos</p> },
      { path: '/admin/:grupoId', element: <p>Admin do grupo</p> },
      { path: '/entrar/nova-senha', element: <p>Nova senha</p> },
      { path: '/entrar/esqueci', element: <p>Esqueci a senha</p> },
    ],
    { initialEntries: [rota] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

async function preencherEEnviar() {
  await userEvent.type(await screen.findByLabelText('E-mail'), 'leandro@exemplo.com.br');
  await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('Entrar (T04): formulário', () => {
  it('rótulos, autocomplete, Mostrar senha e ajuda do iPhone', async () => {
    api({ status: 204 }, null);
    montar();
    const email = await screen.findByLabelText('E-mail');
    const senha = screen.getByLabelText('Senha');
    expect(email).toHaveAttribute('autocomplete', 'username');
    expect(email).toHaveAttribute('type', 'email');
    expect(senha).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByText('No iPhone, o app instalado e o Safari pedem login separadamente.')).toBeInTheDocument();
    const mostrar = screen.getByRole('button', { name: 'Mostrar' });
    await userEvent.click(mostrar);
    expect(senha).toHaveAttribute('type', 'text');
    expect(mostrar).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'Voltar ao ranking' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Esqueci a senha' })).toHaveAttribute('href', '/entrar/esqueci');
  });

  it('o link Esqueci a senha mantém o destino', async () => {
    api({ status: 204 }, null);
    montar('/entrar?destino=%2Fadmin%2Fg-quinta');
    expect(await screen.findByRole('link', { name: 'Esqueci a senha' })).toHaveAttribute(
      'href',
      '/entrar/esqueci?destino=%2Fadmin%2Fg-quinta',
    );
  });

  it('sem violações do axe', async () => {
    api({ status: 204 }, null);
    const { container } = montar();
    await screen.findByLabelText('E-mail');
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('Entrar (T04): envio e erros', () => {
  it('envia só e-mail e senha, com X-Pelada, e mostra Entrando… com aria-busy', async () => {
    let liberar: () => void = () => undefined;
    const portao = new Promise<void>((resolver) => (liberar = resolver));
    pedidos = [];
    servidor.use(
      http.get('/api/sessao/eu', () => HttpResponse.json(fixture('erro-nao-autenticado.json'), { status: 401 })),
      http.post('/api/sessao/entrar', async ({ request }) => {
        pedidos.push({ corpo: await request.json(), xPelada: request.headers.get('x-pelada') });
        await portao;
        return HttpResponse.json(fixture('sessao-entrar-erro.json'), { status: 401 });
      }),
    );
    montar();
    await preencherEEnviar();
    const botao = await screen.findByRole('button', { name: 'Entrando…' });
    expect(botao).toHaveAttribute('aria-busy', 'true');
    expect(botao.closest('form')).toHaveAttribute('aria-busy', 'true');
    expect(pedidos[0]).toEqual({ corpo: { email: 'leandro@exemplo.com.br', senha: 'segredo123' }, xPelada: '1' });
    liberar();
    await screen.findByRole('alert');
  });

  it('401 e 422 dizem a mesma coisa; a senha é limpa e o e-mail mantido', async () => {
    api({ status: 401, corpo: fixture('sessao-entrar-erro.json') }, null);
    montar();
    await preencherEEnviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('leandro@exemplo.com.br');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });

  it('422 usa o mesmo texto do 401', async () => {
    api({ status: 422, corpo: fixture('erro-validacao.json') }, null);
    montar();
    await preencherEEnviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });

  it('429 mostra o texto de bloqueio', async () => {
    api({ status: 429, corpo: fixture('sessao-entrar-bloqueado.json') }, null);
    montar();
    await preencherEEnviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas. Tente de novo em 15 minutos.');
  });

  it('falha de rede mostra o erro de envio', async () => {
    api('rede', null);
    montar();
    await preencherEEnviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar. Verifique a conexão.');
  });
});

describe('Entrar (T04): para onde vai depois de entrar', () => {
  it('troca de senha obrigatória → nova senha, levando o destino', async () => {
    api({ status: 204 }, null, fixture('sessao-eu-troca-de-senha.json'));
    const { roteador } = montar('/entrar?destino=%2Fadmin%2Fg-quinta');
    await preencherEEnviar();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar/nova-senha'));
    expect(roteador.state.location.search).toBe('?destino=%2Fadmin%2Fg-quinta');
  });

  it('dono sem destino → /dono; não dono sem destino → /admin', async () => {
    api({ status: 204 }, null, fixture('sessao-eu-admin.json'));
    const primeiro = montar();
    await preencherEEnviar();
    await waitFor(() => expect(primeiro.roteador.state.location.pathname).toBe('/dono'));
  });

  it('não dono sem destino → /admin', async () => {
    api({ status: 204 }, null, fixture('sessao-eu-carlos.json'));
    const { roteador } = montar();
    await preencherEEnviar();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin'));
  });

  it('destino válido é seguido; destino malicioso é ignorado', async () => {
    api({ status: 204 }, null, fixture('sessao-eu-admin.json'));
    const valido = montar('/entrar?destino=%2Fadmin%2Fg-quinta');
    await preencherEEnviar();
    await waitFor(() => expect(valido.roteador.state.location.pathname).toBe('/admin/g-quinta'));
  });

  it('destino //evil.com vai ao padrão do papel', async () => {
    api({ status: 204 }, null, fixture('sessao-eu-carlos.json'));
    const { roteador } = montar('/entrar?destino=%2F%2Fevil.com');
    await preencherEEnviar();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin'));
  });

  it('sessão já válida ao abrir redireciona sem mostrar o formulário', async () => {
    api({ status: 204 }, fixture('sessao-eu-carlos.json'));
    const { roteador } = montar();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin'));
    expect(screen.queryByLabelText('E-mail')).toBeNull();
  });
});
