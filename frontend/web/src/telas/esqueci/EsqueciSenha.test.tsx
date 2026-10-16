import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { Component as EsqueciSenha } from './EsqueciSenha';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

interface Pedido {
  corpo: unknown;
  xPelada: string | null;
}
let pedidos: Pedido[] = [];

function api(resposta: () => Response | Promise<Response>) {
  pedidos = [];
  servidor.use(
    http.post('/api/sessao/esqueci-senha', async ({ request }) => {
      pedidos.push({ corpo: await request.json(), xPelada: request.headers.get('x-pelada') });
      return resposta();
    }),
  );
}

function montar(rota = '/entrar/esqueci') {
  const roteador = createMemoryRouter([{ path: '/entrar/esqueci', Component: EsqueciSenha }], {
    initialEntries: [rota],
  });
  return render(<RouterProvider router={roteador} />);
}

async function enviar(email = 'ninguem@exemplo.com.br') {
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
}

describe('EsqueciSenha (T05)', () => {
  it('vazio: rótulo, autocomplete e Voltar para entrar', () => {
    montar();
    expect(screen.getByRole('heading', { level: 1, name: 'Esqueci a senha' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByRole('link', { name: 'Voltar para entrar' })).toHaveAttribute('href', '/entrar');
  });

  it('o destino recebido segue no Voltar para entrar', () => {
    montar('/entrar/esqueci?destino=%2Fadmin%2Fg-quinta');
    expect(screen.getByRole('link', { name: 'Voltar para entrar' })).toHaveAttribute(
      'href',
      '/entrar?destino=%2Fadmin%2Fg-quinta',
    );
  });

  it('envia só o e-mail, com X-Pelada, e mostra Enviando… com aria-busy', async () => {
    let liberar: () => void = () => undefined;
    const portao = new Promise<void>((resolver) => (liberar = resolver));
    api(async () => {
      await portao;
      return HttpResponse.json(fixture('esqueci-senha.json'));
    });
    montar();
    await enviar();
    const botao = await screen.findByRole('button', { name: 'Enviando…' });
    expect(botao).toHaveAttribute('aria-busy', 'true');
    expect(pedidos[0]).toEqual({ corpo: { email: 'ninguem@exemplo.com.br' }, xPelada: '1' });
    liberar();
    await screen.findByRole('status');
  });

  it('200, 422 e 429 levam à mesma tela, com DOM idêntico', async () => {
    const htmls: string[] = [];
    for (const resposta of [
      () => HttpResponse.json(fixture('esqueci-senha.json')),
      () => HttpResponse.json(fixture('erro-validacao.json'), { status: 422 }),
      () => HttpResponse.json(fixture('sessao-entrar-bloqueado.json'), { status: 429 }),
    ]) {
      api(resposta);
      const { container, unmount } = montar();
      await enviar();
      expect(await screen.findByRole('status')).toHaveTextContent('Solicite o reset de senha a outro admin.');
      expect(screen.queryByLabelText('E-mail')).toBeNull();
      expect(screen.getByRole('link', { name: 'Voltar para entrar' })).toHaveAttribute('href', '/entrar');
      htmls.push(container.innerHTML);
      unmount();
    }
    expect(htmls[1]).toBe(htmls[0]);
    expect(htmls[2]).toBe(htmls[0]);
  });

  it('falha de rede mostra o erro, mantém o e-mail e permite reenviar', async () => {
    api(() => HttpResponse.error());
    montar();
    await enviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar. Verifique a conexão.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ninguem@exemplo.com.br');
    api(() => HttpResponse.json(fixture('esqueci-senha.json')));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('erro 5xx também mostra o erro de envio', async () => {
    api(() => HttpResponse.json(fixture('erro-interno.json'), { status: 500 }));
    montar();
    await enviar();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('sem violações do axe: vazio, enviado e erro', async () => {
    const vazio = montar();
    expect(await violacoes(vazio.container)).toEqual([]);
    vazio.unmount();
    api(() => HttpResponse.json(fixture('esqueci-senha.json')));
    const enviado = montar();
    await enviar();
    await screen.findByRole('status');
    expect(await violacoes(enviado.container)).toEqual([]);
    enviado.unmount();
    api(() => HttpResponse.error());
    const erro = montar();
    await enviar();
    await screen.findByRole('alert');
    expect(await violacoes(erro.container)).toEqual([]);
  });
});
