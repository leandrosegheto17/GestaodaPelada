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
import { Component as NovaSenha } from './NovaSenha';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

let envios = 0;
let sair = { chamado: false, xPelada: null as string | null };

type Troca = { status: number; corpo?: JsonBodyType } | 'rede';

function api(
  troca: Troca,
  antes = fixture('sessao-eu-troca-de-senha.json'),
  depois = fixture('sessao-eu-carlos.json'),
) {
  envios = 0;
  sair = { chamado: false, xPelada: null };
  let trocou = false;
  servidor.use(
    http.get('/api/sessao/eu', () => HttpResponse.json(trocou ? depois : antes)),
    http.post('/api/sessao/trocar-senha', () => {
      envios += 1;
      if (troca === 'rede') return HttpResponse.error();
      if (troca.status >= 400) return HttpResponse.json(troca.corpo ?? null, { status: troca.status });
      trocou = true;
      return new HttpResponse(null, { status: 204 });
    }),
    http.post('/api/sessao/sair', ({ request }) => {
      sair = { chamado: true, xPelada: request.headers.get('x-pelada') };
      return new HttpResponse(null, { status: 204 });
    }),
  );
}

function montar(rota = '/entrar/nova-senha') {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/entrar/nova-senha', Component: NovaSenha },
      { path: '/entrar', element: <p>Entrar</p> },
      { path: '/admin', element: <p>Lista de grupos</p> },
      { path: '/admin/:grupoId', element: <p>Admin do grupo</p> },
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

async function preencher(nova: string, confirmacao = nova) {
  await userEvent.type(await screen.findByLabelText('Nova senha'), nova);
  await userEvent.type(screen.getByLabelText('Confirmar nova senha'), confirmacao);
  await userEvent.click(screen.getByRole('button', { name: 'Salvar e continuar' }));
}

describe('NovaSenha (T06)', () => {
  it('vazio: título, parágrafo, regra visível e Sair como única saída', async () => {
    api({ status: 204 });
    montar();
    expect(await screen.findByRole('heading', { level: 1, name: 'Crie sua senha' })).toBeInTheDocument();
    expect(screen.getByText('Por segurança, crie sua senha antes de continuar.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha')).toHaveAccessibleDescription('De 8 a 72 caracteres.');
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Voltar/ })).toBeNull();
  });

  it('7 caracteres: erro no campo e nenhum POST', async () => {
    api({ status: 204 });
    montar();
    await preencher('1234567');
    expect(await screen.findByText('A senha precisa ter de 8 a 72 caracteres.')).toBeInTheDocument();
    expect(envios).toBe(0);
  });

  it('8 e 72 caracteres seguem; 73 não', async () => {
    api({ status: 204 });
    montar();
    await preencher('12345678');
    await waitFor(() => expect(envios).toBe(1));
  });

  it('73 caracteres: erro sem POST', async () => {
    api({ status: 204 });
    montar();
    const longa = 'a'.repeat(73);
    fireEvent.change(await screen.findByLabelText('Nova senha'), { target: { value: longa } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: longa } });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar e continuar' }));
    expect(await screen.findByText('A senha precisa ter de 8 a 72 caracteres.')).toBeInTheDocument();
    expect(envios).toBe(0);
  });

  it('confirmação diferente: erro em Confirmar nova senha, sem POST', async () => {
    api({ status: 204 });
    montar();
    await preencher('12345678', '87654321');
    expect(await screen.findByText('As senhas não conferem.')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInvalid();
    expect(envios).toBe(0);
  });

  it('422 da API: mensagens do arquivo nos campos certos e resumo com os links', async () => {
    api({ status: 422, corpo: fixture('erro-validacao-nova-senha.json') });
    montar();
    await preencher('12345678');
    expect(await screen.findByRole('alert')).toHaveTextContent('Corrija 2 campos:');
    expect(screen.getByText('A nova senha precisa ser diferente da temporária.')).toBeInTheDocument();
    expect(screen.getAllByText('As senhas não conferem.')).toHaveLength(1);
    await userEvent.click(screen.getByRole('link', { name: 'Confirmar nova senha' }));
    expect(screen.getByLabelText('Confirmar nova senha')).toHaveFocus();
  });

  it('falha de rede mostra o erro de envio e mantém os campos', async () => {
    api('rede');
    montar();
    await preencher('12345678');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar. Verifique a conexão.');
    expect(screen.getByLabelText('Nova senha')).toHaveValue('12345678');
  });

  it('sucesso sem destino vai para /admin; com destino, para ele', async () => {
    api({ status: 204 });
    const semDestino = montar();
    await preencher('12345678');
    await waitFor(() => expect(semDestino.roteador.state.location.pathname).toBe('/admin'));
  });

  it('sucesso com destino válido segue o destino', async () => {
    api({ status: 204 });
    const { roteador } = montar('/entrar/nova-senha?destino=%2Fadmin%2Fg-quinta');
    await preencher('12345678');
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta'));
  });

  it('Sair envia POST com X-Pelada e vai para /entrar', async () => {
    api({ status: 204 });
    const { roteador } = montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'));
    expect(sair).toEqual({ chamado: true, xPelada: '1' });
  });

  it('sessão completa ao abrir redireciona', async () => {
    api({ status: 204 }, fixture('sessao-eu-carlos.json'));
    const { roteador } = montar();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin'));
  });

  it('sem violações do axe: vazio e com erros', async () => {
    api({ status: 204 });
    const { container } = montar();
    await screen.findByLabelText('Nova senha');
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar e continuar' }));
    await screen.findByText('A senha precisa ter de 8 a 72 caracteres.');
    expect(await violacoes(container)).toEqual([]);
  });
});
