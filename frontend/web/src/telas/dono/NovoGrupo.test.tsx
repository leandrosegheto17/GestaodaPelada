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
import { chavesDono } from '../../dados/dono/chaves';
import { Component as NovoGrupo } from './NovoGrupo';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

let envios: { corpo: Record<string, unknown>; xPelada: string | null }[] = [];
function api(resposta: () => Response | Promise<Response>) {
  envios = [];
  servidor.use(
    http.post('/api/dono/grupos', async ({ request }) => {
      envios.push({
        corpo: (await request.json()) as Record<string, unknown>,
        xPelada: request.headers.get('x-pelada'),
      });
      return resposta();
    }),
    http.get('/api/dono/painel', () => HttpResponse.json(fixture('dono-painel.json'))),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/dono/grupos/novo', Component: NovoGrupo },
      { path: '/dono/grupos/:id', element: <p>Grupo do dono</p> },
      { path: '/dono', element: <p>Área do dono</p> },
    ],
    { initialEntries: ['/dono/grupos/novo'] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, cliente, container };
}

async function preencher() {
  await userEvent.type(await screen.findByLabelText('Nome do grupo'), 'Racha de Sábado');
  await userEvent.selectOptions(screen.getByLabelText('Dia da semana'), 'sabado');
  await userEvent.type(screen.getByLabelText('Horário'), '16:00');
  await userEvent.type(screen.getByLabelText('Nome'), 'Rodrigo');
  await userEvent.type(screen.getByLabelText('E-mail'), 'rodrigo@exemplo.com.br');
}

describe('NovoGrupo (T27)', () => {
  it('campos, ajudas, dias em ordem e frequência semanal marcada', async () => {
    api(() => HttpResponse.json(fixture('dono-grupo-criado-novo-admin.json'), { status: 201 }));
    const { container } = montar();
    expect(await screen.findByLabelText('Nome do grupo')).toHaveAccessibleDescription(
      'O link do ranking será criado a partir do nome e não muda depois.',
    );
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
      'Se o e-mail já for de um admin, ele só é vinculado ao grupo.',
    );
    const opcoes = within(screen.getByLabelText('Dia da semana'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opcoes).toEqual(['Escolha', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']);
    expect(screen.getByRole('radio', { name: 'Semanal' })).toBeChecked();
    expect(screen.getByRole('link', { name: 'Área do dono' })).toHaveAttribute('href', '/dono');
    expect(await violacoes(container)).toEqual([]);
  });

  it('envia o corpo exato (sem slug), com X-Pelada; conta nova mostra o D1 e depois vai ao grupo', async () => {
    api(() => HttpResponse.json(fixture('dono-grupo-criado-novo-admin.json'), { status: 201 }));
    const { roteador, cliente } = montar();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar grupo' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Senha temporária de Rodrigo' });
    expect(dialogo).toHaveTextContent('Pv8cNz5hKt2r');
    expect(envios[0]).toEqual({
      corpo: {
        nome: 'Racha de Sábado',
        diaSemana: 'sabado',
        frequencia: 'semanal',
        horario: '16:00',
        adminNome: 'Rodrigo',
        adminEmail: 'rodrigo@exemplo.com.br',
      },
      xPelada: '1',
    });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Já copiei' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/dono/grupos/g-sabado'));
    expect(document.body).not.toHaveTextContent('Pv8cNz5hKt2r');
    await waitFor(() =>
      expect(
        JSON.stringify(
          cliente
            .getMutationCache()
            .getAll()
            .map((m) => m.state.data),
        ),
      ).not.toContain('senhaTemporaria'),
    );
    expect(roteador.state.location.state).toBeNull();
  });

  it('vínculo de conta existente não mostra D1 e navega com o aviso', async () => {
    api(() => HttpResponse.json(fixture('dono-grupo-criado-vinculo.json'), { status: 201 }));
    const { roteador } = montar();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar grupo' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/dono/grupos/g-sabado'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(roteador.state.location.state).toEqual({ aviso: 'vinculo' });
  });

  it('422 com 3 erros: resumo, links que focam e mensagens da API nos campos', async () => {
    api(() => HttpResponse.json(fixture('erro-validacao-novo-grupo.json'), { status: 422 }));
    const { container } = montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Criar grupo' }));
    expect(await screen.findByText('Corrija 3 campos:')).toBeInTheDocument();
    expect(screen.getByText('O nome precisa ter de 3 a 60 caracteres.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'E-mail do primeiro admin' }));
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(screen.getByLabelText('Horário')).toBeInvalid();
    expect(await violacoes(container)).toEqual([]);
  });

  it('um único erro vai no campo, sem resumo', async () => {
    api(() =>
      HttpResponse.json(
        { erro: { codigo: 'validacao', mensagem: 'x', campos: { adminEmail: 'Informe um e-mail válido.' } } },
        { status: 422 },
      ),
    );
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Criar grupo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um e-mail válido.');
    expect(screen.queryByText(/Corrija \d campos/)).toBeNull();
  });

  it('falha de rede mostra o erro de envio e mantém os valores', async () => {
    api(() => HttpResponse.error());
    montar();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar grupo' }));
    expect(await screen.findByText('Não foi possível enviar. Verifique a conexão.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do grupo')).toHaveValue('Racha de Sábado');
  });

  it('cada link do resumo foca o seu campo', async () => {
    api(() => HttpResponse.json(fixture('erro-validacao-novo-grupo.json'), { status: 422 }));
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Criar grupo' }));
    await screen.findByText('Corrija 3 campos:');
    for (const [link, campo] of [
      ['Nome do grupo', 'Nome do grupo'],
      ['Horário', 'Horário'],
      ['E-mail do primeiro admin', 'E-mail'],
    ] as const) {
      await userEvent.click(screen.getByRole('link', { name: link }));
      expect(screen.getByLabelText(campo)).toHaveFocus();
    }
  });

  it('pendente mostra "Criando…" e o clique duplo envia um único POST', async () => {
    let liberar: () => void = () => undefined;
    const espera = new Promise<void>((r) => {
      liberar = r;
    });
    api(async () => {
      await espera;
      return HttpResponse.json(fixture('dono-grupo-criado-vinculo.json'), { status: 201 });
    });
    const { roteador } = montar();
    await preencher();
    const botao = screen.getByRole('button', { name: 'Criar grupo' });
    await userEvent.dblClick(botao);
    expect(await screen.findByRole('button', { name: 'Criando…' })).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(envios).toHaveLength(1));
    liberar();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/dono/grupos/g-sabado'));
    expect(envios).toHaveLength(1);
  });

  it.each([
    ['conta nova', 'dono-grupo-criado-novo-admin.json'],
    ['vínculo', 'dono-grupo-criado-vinculo.json'],
  ])('201 (%s) invalida o painel do dono', async (_nome, arquivo) => {
    api(() => HttpResponse.json(fixture(arquivo), { status: 201 }));
    const { cliente } = montar();
    cliente.setQueryData(chavesDono.painel, fixture('dono-painel.json'));
    expect(cliente.getQueryState(chavesDono.painel)?.isInvalidated).toBe(false);
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar grupo' }));
    await waitFor(() => expect(cliente.getQueryState(chavesDono.painel)?.isInvalidated).toBe(true));
  });

  it('500 mostra a faixa de erro de envio e mantém os valores', async () => {
    api(() => HttpResponse.json(fixture('erro-interno.json'), { status: 500 }));
    montar();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar grupo' }));
    expect(await screen.findByText('Não foi possível enviar. Verifique a conexão.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do grupo')).toHaveValue('Racha de Sábado');
    expect(screen.getByLabelText('Horário')).toHaveValue('16:00');
    expect(screen.getByLabelText('E-mail')).toHaveValue('rodrigo@exemplo.com.br');
    expect(screen.getByRole('button', { name: 'Criar grupo' })).toBeInTheDocument();
  });

  it('axe sem violação com o D1 aberto', async () => {
    api(() => HttpResponse.json(fixture('dono-grupo-criado-novo-admin.json'), { status: 201 }));
    const { container } = montar();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar grupo' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Senha temporária de Rodrigo' });
    expect(await violacoes(container)).toEqual([]);
    expect(await violacoes(dialogo)).toEqual([]);
  });
});
