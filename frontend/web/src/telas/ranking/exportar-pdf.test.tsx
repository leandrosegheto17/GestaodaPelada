import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { recursos } from '../../config/recursos';
import { criarClienteConsultas } from '../../dados/consultas';
import * as eventos from '../../dados/eventos';
import * as entrega from '../../pdf/entregar';
import * as gerador from '../../pdf/gerar-pdf';
import { Component as PaginaRanking } from './PaginaRanking';

vi.mock('../../config/recursos', () => ({ recursos: { ligado: vi.fn(() => true) } }));
vi.mock('../../pwa/armazenamento', () => ({
  grupoLembrado: vi.fn(async () => null),
  esquecerGrupo: vi.fn(),
  rankingAtual: vi.fn(async () => null),
  ultimoRanking: vi.fn(async () => null),
  guardarRankingAtual: vi.fn(async () => undefined),
  guardarUltimoRanking: vi.fn(async () => undefined),
  lembrarGrupo: vi.fn(async () => undefined),
  idAnonimo: vi.fn(async () => '00000000-0000-4000-8000-000000000000'),
}));
vi.mock('../../dados/eventos', () => ({ registrarAbertura: vi.fn(), registrarPdfExportado: vi.fn() }));
vi.mock('../../pdf/gerar-pdf', () => ({ gerarPdf: vi.fn(), precarregarPdf: vi.fn(async () => undefined) }));
vi.mock('../../pdf/entregar', () => ({
  entregarPdf: vi.fn(),
  compartilharArquivo: vi.fn(),
  baixarArquivo: vi.fn(),
}));

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => servidor.close());

const gerarPdf = vi.mocked(gerador.gerarPdf);
const entregarPdf = vi.mocked(entrega.entregarPdf);
const compartilhar = vi.mocked(entrega.compartilharArquivo);
const baixar = vi.mocked(entrega.baixarArquivo);
const registrar = vi.mocked(eventos.registrarPdfExportado);

interface OpcoesApi {
  pdf?: () => Response | Promise<Response>;
  ranking?: string;
}
let pedidosPdf: string[] = [];
function api({
  pdf = () => HttpResponse.json(fixture('publico-pdf-2026-10.json')),
  ranking = 'publico-ranking-2026-10.json',
}: OpcoesApi = {}) {
  pedidosPdf = [];
  servidor.use(
    http.get('/api/publico/pelada-de-quinta/ranking', () => HttpResponse.json(fixture(ranking))),
    http.get('/api/publico/pelada-de-quinta/pdf', ({ request }) => {
      pedidosPdf.push(new URL(request.url).search);
      return pdf();
    }),
  );
}

beforeEach(() => {
  gerarPdf.mockReset().mockResolvedValue(new Blob(['%PDF-'], { type: 'application/pdf' }));
  entregarPdf.mockReset().mockResolvedValue('compartilhado');
  compartilhar.mockReset().mockResolvedValue('compartilhado');
  baixar.mockReset();
  registrar.mockReset();
  vi.mocked(recursos.ligado).mockReset().mockReturnValue(true);
});

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/g/:slug', Component: PaginaRanking }], {
    initialEntries: ['/g/pelada-de-quinta'],
  });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container };
}

const botoes = () => screen.getAllByRole('button', { name: /Exportar PDF|Preparando PDF/ });

describe('Exportar PDF na T01', () => {
  it('pré-carrega a projeção do mês ao abrir', async () => {
    api();
    montar();
    await screen.findAllByRole('button', { name: 'Exportar PDF' });
    await waitFor(() => expect(pedidosPdf).toEqual(['?mes=2026-10']));
  });

  it('com a projeção pronta, gera, entrega pelo compartilhamento e registra o evento', async () => {
    api();
    montar();
    await waitFor(() => expect(pedidosPdf).toHaveLength(1));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    await waitFor(() => expect(entregarPdf).toHaveBeenCalledTimes(1));
    const arquivo = entregarPdf.mock.calls[0]?.[0] as File;
    expect(arquivo.name).toBe('ranking-pelada-de-quinta-2026-10.pdf');
    expect(arquivo.type).toBe('application/pdf');
    expect(entregarPdf.mock.calls[0]?.[1]).toBe('Ranking de outubro de 2026 da Pelada de Quinta');
    await waitFor(() => expect(registrar).toHaveBeenCalledWith('pelada-de-quinta', '2026-10'));
    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it('toque antes da projeção chegar: "Preparando PDF…" até a resposta e depois segue', async () => {
    let liberar!: () => void;
    const sinal = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    api({
      pdf: async () => {
        await sinal;
        return HttpResponse.json(fixture('publico-pdf-2026-10.json'));
      },
    });
    montar();
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    expect(botoes()[0]).toHaveTextContent('Preparando PDF…');
    expect(entregarPdf).not.toHaveBeenCalled();
    liberar();
    await waitFor(() => expect(entregarPdf).toHaveBeenCalledTimes(1));
  });

  it('recusa por falta de gesto abre o D4; Compartilhar e Baixar fazem o que dizem', async () => {
    api();
    entregarPdf.mockResolvedValue('pedir-gesto');
    montar();
    await waitFor(() => expect(pedidosPdf).toHaveLength(1));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    const dialogo = await screen.findByRole('dialog', { name: 'PDF pronto.' });
    expect(within(dialogo).getByText('Ranking de outubro de 2026 da Pelada de Quinta.')).toBeInTheDocument();
    expect(registrar).not.toHaveBeenCalled();

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Compartilhar' }));
    await waitFor(() => expect(compartilhar).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it('D4: Baixar baixa o arquivo, mostra "PDF baixado." e registra', async () => {
    api();
    entregarPdf.mockResolvedValue('pedir-gesto');
    montar();
    await waitFor(() => expect(pedidosPdf).toHaveLength(1));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Baixar' }));
    expect(baixar).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('PDF baixado.')).toBeInTheDocument();
    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it('aparelho sem compartilhamento de arquivo: baixa e a faixa "PDF baixado." some em 4 s', async () => {
    api();
    entregarPdf.mockResolvedValue('baixado');
    montar();
    await waitFor(() => expect(pedidosPdf).toHaveLength(1));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    expect(await screen.findByText('PDF baixado.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('PDF baixado.')).not.toBeInTheDocument(), { timeout: 6000 });
  }, 10_000);

  it('pessoa fechou a folha de compartilhamento: nada acontece e nada é registrado', async () => {
    api();
    entregarPdf.mockResolvedValue('cancelado');
    montar();
    await waitFor(() => expect(pedidosPdf).toHaveLength(1));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    await waitFor(() => expect(entregarPdf).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(registrar).not.toHaveBeenCalled();
  });

  it('falha ao buscar ou ao gerar: "Não foi possível gerar o PDF." com Tentar de novo', async () => {
    api({ pdf: () => new HttpResponse(null, { status: 500 }) });
    montar();
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível gerar o PDF.');

    servidor.use(
      http.get('/api/publico/pelada-de-quinta/pdf', () => HttpResponse.json(fixture('publico-pdf-2026-10.json'))),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(entregarPdf).toHaveBeenCalledTimes(1));
  });

  it('gerarPdf que lança vira a mesma faixa de erro', async () => {
    api();
    gerarPdf.mockRejectedValue(new Error('jsPDF quebrou'));
    montar();
    await waitFor(() => expect(pedidosPdf).toHaveLength(1));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    expect(await screen.findByText('Não foi possível gerar o PDF.')).toBeInTheDocument();
  });

  it('sem jogadores no mês: nenhuma chamada a /pdf e nenhum botão', async () => {
    api({ ranking: 'publico-ranking-vazio.json' });
    montar();
    await screen.findByText('Nenhum jogador no ranking ainda.');
    expect(screen.queryByRole('button', { name: 'Exportar PDF' })).not.toBeInTheDocument();
    expect(pedidosPdf).toEqual([]);
  });

  it('trocar de mês pede a projeção do novo mês', async () => {
    api();
    servidor.use(
      http.get('/api/publico/pelada-de-quinta/ranking', ({ request }) =>
        HttpResponse.json(
          fixture(
            new URL(request.url).searchParams.get('mes') === '2026-09'
              ? 'publico-ranking-2026-07.json'
              : 'publico-ranking-2026-10.json',
          ),
        ),
      ),
    );
    montar();
    await waitFor(() => expect(pedidosPdf).toEqual(['?mes=2026-10']));
    await userEvent.click(await screen.findByRole('button', { name: 'Mês anterior, setembro de 2026' }));
    await waitFor(() => expect(pedidosPdf).toHaveLength(2));
    expect(pedidosPdf[1]).toMatch(/^\?mes=2026-\d{2}$/);
    expect(pedidosPdf[1]).not.toBe('?mes=2026-10');
  });

  it('registro real: POST /eventos com {tipo, mes} e X-Pelada', async () => {
    api();
    const real = await vi.importActual<typeof import('../../dados/eventos')>('../../dados/eventos');
    registrar.mockImplementation(real.registrarPdfExportado);
    const envios: { corpo: unknown; cabecalho: string | null }[] = [];
    servidor.use(
      http.post('/api/publico/pelada-de-quinta/eventos', async ({ request }) => {
        envios.push({ corpo: await request.json(), cabecalho: request.headers.get('X-Pelada') });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    montar();
    await waitFor(() => expect(pedidosPdf).toHaveLength(1));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    await waitFor(() => expect(envios).toHaveLength(1));
    expect(envios[0]).toEqual({ corpo: { tipo: 'pdf_exportado', mes: '2026-10' }, cabecalho: '1' });
  });

  it('recurso pdf desligado: sem botão e nenhuma chamada a /pdf', async () => {
    api();
    vi.mocked(recursos.ligado).mockImplementation((nome) => nome !== 'pdf');
    montar();
    await screen.findAllByRole('rowheader');
    expect(screen.queryByRole('button', { name: 'Exportar PDF' })).not.toBeInTheDocument();
    expect(pedidosPdf).toEqual([]);
  });

  it('axe: sem violações com a faixa de erro', async () => {
    api({ pdf: () => new HttpResponse(null, { status: 500 }) });
    montar();
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    await screen.findByRole('alert');
    expect(await violacoes(document.body)).toEqual([]);
  });

  it('axe: sem violações com a faixa "PDF baixado."', async () => {
    api();
    entregarPdf.mockResolvedValue('baixado');
    montar();
    await waitFor(() => expect(pedidosPdf).toHaveLength(1));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    expect(await screen.findByRole('status')).toHaveTextContent('PDF baixado.');
    expect(await violacoes(document.body)).toEqual([]);
  });

  it('axe: sem violações com o D4 aberto', async () => {
    api();
    entregarPdf.mockResolvedValue('pedir-gesto');
    montar();
    await waitFor(() => expect(pedidosPdf).toHaveLength(1));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Exportar PDF' }))[0]!);
    await screen.findByRole('dialog', { name: 'PDF pronto.' });
    expect(await violacoes(document.body)).toEqual([]);
  });
});
