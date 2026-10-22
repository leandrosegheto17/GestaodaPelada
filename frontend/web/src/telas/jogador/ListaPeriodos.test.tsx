import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PeriodosResposta } from '@pelada/contrato';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { ListaPeriodos } from './ListaPeriodos';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => servidor.close());

const API = '/api/grupos/g-quinta/jogadores/j-gil/periodos';
let chamadas = 0;

function api(resposta: () => Response | Promise<Response>) {
  chamadas = 0;
  servidor.use(
    http.get(API, () => {
      chamadas += 1;
      return resposta();
    }),
  );
}

function montar() {
  const aoCorrigir = vi.fn();
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <ListaPeriodos grupoId="g-quinta" jogadorId="j-gil" aoCorrigir={aoCorrigir} />
    </QueryClientProvider>,
  );
  return { aoCorrigir, container };
}

const periodo = (corrigivel: { saida: boolean; retorno: boolean }): PeriodosResposta => ({
  periodos: [{ id: 'p1', tipo: 'entrada', inicio: '2026-02-05', fim: null, corrigivel }],
});

describe('ListaPeriodos: dados', () => {
  it('Gil: dois períodos com intervalo, rótulo e botão habilitado', async () => {
    api(() => HttpResponse.json(fixture('jogador-gil-periodos.json')));
    const { aoCorrigir } = montar();
    const lista = await screen.findByRole('list', { name: 'Períodos de atividade' });
    const itens = within(lista).getAllByRole('listitem');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent('05/02/2026');
    expect(itens[0]).toHaveTextContent('05/10/2026');
    expect(itens[0]).toHaveTextContent('Entrada');
    expect(itens[1]).toHaveTextContent('20/10/2026');
    expect(itens[1]).toHaveTextContent('atual');
    expect(itens[1]).toHaveTextContent('Retorno');
    const botoes = within(lista).getAllByRole('button', { name: /Corrigir datas/ });
    expect(botoes[0]).not.toHaveAttribute('aria-disabled');
    await userEvent.click(botoes[1] as HTMLElement);
    expect(aoCorrigir).toHaveBeenCalledWith(expect.objectContaining({ id: 'p-gil-2', tipo: 'retorno' }));
  });

  it('o botão é descrito pelo intervalo do período', async () => {
    api(() => HttpResponse.json(fixture('jogador-gil-periodos.json')));
    montar();
    const botoes = await screen.findAllByRole('button', { name: 'Corrigir datas' });
    expect(botoes[0]).toHaveAccessibleDescription('05/02/2026 até 05/10/2026');
  });

  it('Toninho (um período aberto, nada corrigível): aria-disabled focável, explicação visível, clique sem efeito', async () => {
    api(() => HttpResponse.json(fixture('jogador-toninho-periodos.json')));
    const { aoCorrigir } = montar();
    const botao = await screen.findByRole('button', { name: 'Corrigir datas' });
    expect(botao).toHaveAttribute('aria-disabled', 'true');
    expect(botao).not.toBeDisabled();
    const explicacao =
      'Nada a corrigir: a data de entrada é a data de início da pontuação (use Alterar data de início).';
    expect(screen.getByText(explicacao)).toBeVisible();
    expect(botao).toHaveAccessibleDescription(expect.stringContaining(explicacao));
    botao.focus();
    expect(botao).toHaveFocus();
    await userEvent.click(botao);
    expect(aoCorrigir).not.toHaveBeenCalled();
  });

  it('Beto inativo: período fechado', async () => {
    api(() => HttpResponse.json(fixture('jogador-toninho-inativo-periodos.json')));
    montar();
    const lista = await screen.findByRole('list', { name: 'Períodos de atividade' });
    expect(within(lista).queryByText('atual')).toBeNull();
  });

  it.each([
    [{ saida: true, retorno: false }, true],
    [{ saida: false, retorno: true }, true],
    [{ saida: true, retorno: true }, true],
    [{ saida: false, retorno: false }, false],
  ])('corrigivel %j habilita=%s', async (corrigivel, habilita) => {
    api(() => HttpResponse.json(periodo(corrigivel)));
    const { aoCorrigir } = montar();
    const botao = await screen.findByRole('button', { name: 'Corrigir datas' });
    if (habilita) expect(botao).not.toHaveAttribute('aria-disabled');
    else expect(botao).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(botao);
    expect(aoCorrigir).toHaveBeenCalledTimes(habilita ? 1 : 0);
  });

  it('sem violação de acessibilidade', async () => {
    api(() => HttpResponse.json(fixture('jogador-gil-periodos.json')));
    const { container } = montar();
    await screen.findByRole('list', { name: 'Períodos de atividade' });
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('ListaPeriodos: estados', () => {
  it('esqueleto só depois de 300 ms', async () => {
    vi.useFakeTimers();
    api(
      () =>
        new Promise<Response>(() => {
          /* nunca responde */
        }),
    );
    const { container } = montar();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('erro de rede: "Tentar de novo" refaz a chamada', async () => {
    api(() => HttpResponse.error());
    montar();
    const tentar = await screen.findByRole('button', { name: 'Tentar de novo' }, { timeout: 8000 });
    const antes = chamadas;
    api(() => HttpResponse.json(fixture('jogador-gil-periodos.json')));
    chamadas = antes;
    await userEvent.click(tentar);
    expect(await screen.findByRole('list', { name: 'Períodos de atividade' })).toBeInTheDocument();
    expect(chamadas).toBeGreaterThan(antes);
  }, 15000);
});
