import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { QueryClient } from '@tanstack/react-query';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { chaveGrupo } from '../../dados/grupo';
import { compartilharLink, copiarLink } from './compartilhar';
import { Component as PaginaGrupo } from './PaginaGrupo';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;
const URL_PUBLICA = (fixture('grupo-quinta.json') as { grupo: { urlPublica: string } }).grupo.urlPublica;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  servidor.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => servidor.close());

let envios: { corpo: Record<string, unknown>; xPelada: string | null }[] = [];
function api(patch: () => Response = () => HttpResponse.json(fixture('grupo-quinta.json'))) {
  envios = [];
  servidor.use(
    http.get('/api/grupos/g-quinta', () => HttpResponse.json(fixture('grupo-quinta.json'))),
    http.patch('/api/grupos/g-quinta', async ({ request }) => {
      envios.push({
        corpo: (await request.json()) as Record<string, unknown>,
        xPelada: request.headers.get('x-pelada'),
      });
      return patch();
    }),
  );
}

let clienteAtual: QueryClient | undefined;
function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  clienteAtual = cliente;
  const roteador = createMemoryRouter([{ path: '/admin/:grupoId/grupo', Component: PaginaGrupo }], {
    initialEntries: ['/admin/g-quinta/grupo'],
  });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container };
}

describe('PaginaGrupo (T20): formulário', () => {
  it('campos preenchidos, ajuda do nome e URL exatamente como a API devolveu', async () => {
    api();
    montar();
    expect(await screen.findByLabelText('Nome')).toHaveValue('Pelada de Quinta');
    expect(screen.getByLabelText('Nome')).toHaveAccessibleDescription('Mudar o nome não muda o link do ranking.');
    expect(screen.getByLabelText('Dia da semana')).toHaveValue('quinta');
    expect(screen.getByLabelText('Horário')).toHaveValue('20:00');
    expect(screen.getByRole('radio', { name: 'Semanal' })).toBeChecked();
    expect(screen.getByText(URL_PUBLICA)).toBeInTheDocument();
  });

  it.each(['Pe', 'a'.repeat(61)])('nome %j é recusado no cliente, sem PATCH', async (nome) => {
    api();
    montar();
    const campo = await screen.findByLabelText('Nome');
    await userEvent.clear(campo);
    // maxlength do campo corta o 61º caractere: usa o valor direto
    await userEvent.type(campo, nome.slice(0, 60));
    if (nome.length > 60) return;
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('O nome precisa ter de 3 a 60 caracteres.')).toBeInTheDocument();
    expect(envios).toHaveLength(0);
  });

  it('salva só nome, dia, frequência e horário, com X-Pelada, e mostra "Dados salvos."', async () => {
    api();
    montar();
    const campo = await screen.findByLabelText('Nome');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Pelada de Sábado');
    await userEvent.selectOptions(screen.getByLabelText('Dia da semana'), 'sabado');
    await userEvent.click(screen.getByRole('radio', { name: 'Quinzenal' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(envios).toHaveLength(1));
    expect(envios[0]).toEqual({
      corpo: { nome: 'Pelada de Sábado', diaSemana: 'sabado', frequencia: 'quinzenal', horario: '20:00' },
      xPelada: '1',
    });
    expect(await screen.findByText('Dados salvos.')).toBeInTheDocument();
    expect(clienteAtual?.getQueryData(chaveGrupo('g-quinta'))).toMatchObject({ grupo: { nome: 'Pelada de Quinta' } });
  });

  it('horário 24:00 é recusado no cliente, sem PATCH', async () => {
    api();
    montar();
    const horario = await screen.findByLabelText('Horário');
    fireEvent.change(horario, { target: { value: '24:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(envios).toHaveLength(0);
  });

  it('422 do servidor mostra o erro no nome', async () => {
    api(() => HttpResponse.json(fixture('erro-validacao-grupo.json'), { status: 422 }));
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('O nome precisa ter de 3 a 60 caracteres.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toBeInvalid();
  });

  it('falha de rede mantém o que foi digitado', async () => {
    api(() => HttpResponse.error());
    montar();
    const campo = await screen.findByLabelText('Nome');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Outro nome');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar. Verifique a conexão.');
    expect(screen.getByLabelText('Nome')).toHaveValue('Outro nome');
  });

  it('sem violações do axe', async () => {
    api();
    const { container } = montar();
    await screen.findByLabelText('Nome');
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('PaginaGrupo (T20): link', () => {
  it('Copiar link escreve a URL e mostra "Link copiado"', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar link' }));
    expect(escrever).toHaveBeenCalledWith(URL_PUBLICA);
    expect(await screen.findByText('Link copiado')).toBeInTheDocument();
  });

  it('cópia negada mostra a mensagem', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('negado')) },
      configurable: true,
    });
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar link' }));
    expect(await screen.findByText('Não foi possível copiar. Selecione o link e copie.')).toBeInTheDocument();
  });
});

describe('PaginaGrupo (T20): compartilhar e carregando', () => {
  it('botão Compartilhar chama share; cancelar não mostra mensagem', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelou', 'AbortError'));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Compartilhar' }));
    expect(share).toHaveBeenCalledWith({ title: 'Pelada de Quinta', url: URL_PUBLICA });
    expect(screen.queryByText('Link copiado')).not.toBeInTheDocument();
    expect(screen.queryByText(/Não foi possível copiar/)).not.toBeInTheDocument();
  });

  it('carregando: título já presente e esqueleto só após 300 ms; axe sem violação', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      servidor.use(http.get('/api/grupos/g-quinta', () => new Promise<Response>(() => undefined)));
      const { container } = montar();
      expect(screen.getByRole('heading', { name: 'Dados do grupo' })).toBeInTheDocument();
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
      vi.useRealTimers();
      expect(await violacoes(container)).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('axe sem violação com erro de validação do servidor', async () => {
    api(() => HttpResponse.json(fixture('erro-validacao-grupo.json'), { status: 422 }));
    const { container } = montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }));
    await screen.findByText('O nome precisa ter de 3 a 60 caracteres.');
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('compartilhar', () => {
  it('usa navigator.share quando existe; cancelar não é erro', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    expect(await compartilharLink('Pelada', URL_PUBLICA)).toBe('compartilhado');
    expect(share).toHaveBeenCalledWith({ title: 'Pelada', url: URL_PUBLICA });
    share.mockRejectedValue(new DOMException('cancelou', 'AbortError'));
    expect(await compartilharLink('Pelada', URL_PUBLICA)).toBe('cancelado');
  });

  it('sem Web Share, faz o mesmo que copiar', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
    expect(await compartilharLink('Pelada', URL_PUBLICA)).toBe('copiado');
    expect(await copiarLink(URL_PUBLICA)).toBe('copiado');
  });
});
