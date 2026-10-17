import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as MinhaSenha } from './MinhaSenha';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  servidor.resetHandlers();
});
afterAll(() => servidor.close());

interface Envio {
  corpo: unknown;
  xPelada: string | null;
}
let envios: Envio[] = [];

function api(sessao: JsonBodyType, troca: { status: number; corpo?: JsonBodyType } | 'rede' = { status: 204 }) {
  envios = [];
  servidor.use(
    http.get('/api/sessao/eu', () => HttpResponse.json(sessao)),
    http.post('/api/sessao/trocar-senha', async ({ request }) => {
      envios.push({ corpo: await request.json(), xPelada: request.headers.get('x-pelada') });
      if (troca === 'rede') return HttpResponse.error();
      if (troca.status >= 400) return HttpResponse.json(troca.corpo ?? null, { status: troca.status });
      return new HttpResponse(null, { status: 204 });
    }),
  );
}

function montar(rota = '/conta/senha') {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/conta/senha', Component: MinhaSenha }], { initialEntries: [rota] });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

async function preencher(atual: string, nova: string, confirmacao = nova) {
  await userEvent.type(await screen.findByLabelText('Senha atual'), atual);
  await userEvent.type(screen.getByLabelText('Nova senha'), nova);
  await userEvent.type(screen.getByLabelText('Confirmar nova senha'), confirmacao);
  await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
}

describe('MinhaSenha (T25): tela', () => {
  it('rótulos, autocomplete, ajuda, barra com o grupo e Início', async () => {
    api(fixture('sessao-eu-admin.json'));
    montar();
    expect(await screen.findByLabelText('Senha atual')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Nova senha')).toHaveAccessibleDescription('De 8 a 72 caracteres.');
    expect(await screen.findByText('Pelada de Quinta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/admin/g-quinta');
    expect(screen.getByRole('heading', { level: 1, name: 'Minha senha' })).toBeInTheDocument();
  });

  it('?grupo= do próprio usuário troca o grupo; de outro cai no primeiro', async () => {
    api(fixture('sessao-eu-admin.json'));
    const dele = montar('/conta/senha?grupo=g-domingo');
    expect(await screen.findByText('Racha de Domingo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/admin/g-domingo');
    dele.container.remove();
  });

  it('?grupo= alheio cai no primeiro grupo', async () => {
    api(fixture('sessao-eu-admin.json'));
    montar('/conta/senha?grupo=g-outro');
    expect(await screen.findByText('Pelada de Quinta')).toBeInTheDocument();
  });

  it('sem grupos: Gestão da Pelada e Início para /dono', async () => {
    api(fixture('sessao-eu-sem-grupos.json'));
    montar();
    expect(await screen.findByText('Gestão da Pelada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/dono');
  });

  it('sem violações do axe', async () => {
    api(fixture('sessao-eu-admin.json'));
    const { container } = montar();
    await screen.findByText('Pelada de Quinta');
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('MinhaSenha (T25): validação e envio', () => {
  it('senha atual vazia: erro no campo (alerta, sem resumo) e nenhum POST', async () => {
    api(fixture('sessao-eu-admin.json'));
    montar();
    await userEvent.type(await screen.findByLabelText('Nova senha'), '12345678');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), '12345678');
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe a senha atual.');
    expect(screen.getByLabelText('Senha atual')).toBeInvalid();
    expect(envios).toHaveLength(0);
  });

  it('nova com 7 caracteres e confirmação diferente: erros no cliente, resumo com 2+', async () => {
    api(fixture('sessao-eu-admin.json'));
    montar();
    await preencher('atual-123', '1234567', 'outra');
    expect(await screen.findByText('Corrija 2 campos:')).toBeInTheDocument();
    expect(envios).toHaveLength(0);
  });

  it('73 caracteres: erro sem POST', async () => {
    api(fixture('sessao-eu-admin.json'));
    montar();
    const longa = 'a'.repeat(73);
    fireEvent.change(await screen.findByLabelText('Senha atual'), { target: { value: 'atual-123' } });
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: longa } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: longa } });
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
    expect(await screen.findByText('A senha precisa ter de 8 a 72 caracteres.')).toBeInTheDocument();
    expect(envios).toHaveLength(0);
  });

  it('422 da API: "Senha atual incorreta." no campo, com alerta e sem resumo', async () => {
    api(fixture('sessao-eu-admin.json'), { status: 422, corpo: fixture('erro-validacao-senha-atual.json') });
    montar();
    await preencher('errada-123', '12345678');
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha atual incorreta.');
    expect(screen.getByLabelText('Senha atual')).toBeInvalid();
    expect(screen.queryByText(/Corrija \d campos/)).toBeNull();
  });

  it('sucesso: POST com X-Pelada e os campos, faixa de sucesso, campos vazios e URL inalterada', async () => {
    api(fixture('sessao-eu-admin.json'));
    const { roteador } = montar();
    await preencher('atual-123', '12345678');
    expect(await screen.findByRole('status')).toHaveTextContent('Senha trocada. Outros aparelhos foram desconectados.');
    expect(envios[0]).toEqual({
      corpo: { senhaAtual: 'atual-123', novaSenha: '12345678', confirmacao: '12345678' },
      xPelada: '1',
    });
    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
    expect(roteador.state.location.pathname).toBe('/conta/senha');
  });

  it('a faixa de sucesso some depois de 4 s', async () => {
    api(fixture('sessao-eu-admin.json'));
    montar();
    await preencher('atual-123', '12345678');
    await screen.findByRole('status');
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull(), { timeout: 5000 });
  }, 8000);

  it('falha de rede mostra o erro de envio e mantém os campos', async () => {
    api(fixture('sessao-eu-admin.json'), 'rede');
    montar();
    await preencher('atual-123', '12345678');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar. Verifique a conexão.');
    expect(screen.getByLabelText('Nova senha')).toHaveValue('12345678');
    await waitFor(() => expect(envios).toHaveLength(1));
  });
});
