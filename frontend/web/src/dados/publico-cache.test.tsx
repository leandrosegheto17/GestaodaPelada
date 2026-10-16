import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rankingPublico, type RankingPublico } from '@pelada/contrato';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as armazenamento from '../pwa/armazenamento';
import { criarClienteConsultas } from './consultas';
import { registrarAbertura } from './eventos';
import { useRankingComCache } from './publico';

vi.mock('../pwa/armazenamento', () => ({
  rankingAtual: vi.fn(async () => null),
  ultimoRanking: vi.fn(async () => null),
  guardarRankingAtual: vi.fn(async () => undefined),
  guardarUltimoRanking: vi.fn(async () => undefined),
  lembrarGrupo: vi.fn(async () => undefined),
}));
vi.mock('./eventos', () => ({ registrarAbertura: vi.fn() }));

const RESPOSTAS = join(import.meta.dirname, '../../../../.md/mockup/respostas');
const arquivo = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;
const RANKING = rankingPublico.parse(arquivo('publico-ranking-2026-10.json'));

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const atual = vi.mocked(armazenamento.rankingAtual);
const guardarUltimo = vi.mocked(armazenamento.guardarUltimoRanking);
const guardarAtual = vi.mocked(armazenamento.guardarRankingAtual);
const lembrar = vi.mocked(armazenamento.lembrarGrupo);

beforeEach(() => {
  atual.mockReset().mockResolvedValue(null);
  guardarUltimo.mockClear();
  guardarAtual.mockClear();
  lembrar.mockClear();
  vi.mocked(registrarAbertura).mockClear();
});

const guardadoDe = (ranking: RankingPublico) => ({ geradoEm: ranking.geradoEm, dados: ranking });

function usar(mes?: string) {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRankingComCache('pelada-de-quinta', mes), { wrapper });
}

const ROTA = '/api/publico/pelada-de-quinta/ranking';

describe('useRankingComCache', () => {
  it('rede ok: dados novos, grava o último ranking, lembra o grupo e registra a abertura', async () => {
    servidor.use(http.get(ROTA, () => HttpResponse.json(arquivo('publico-ranking-2026-10.json'))));
    const { result } = usar();
    await waitFor(() =>
      expect(result.current).toMatchObject({ tipo: 'pronto', atualizando: false, semConexaoDesde: null }),
    );
    expect(guardarUltimo).toHaveBeenCalledWith('pelada-de-quinta', '2026-10', guardadoDe(RANKING));
    expect(guardarAtual).toHaveBeenCalledWith('pelada-de-quinta', guardadoDe(RANKING));
    expect(lembrar).toHaveBeenCalledWith('pelada-de-quinta');
    expect(registrarAbertura).toHaveBeenCalledWith('pelada-de-quinta');
  });

  it('guardado + rede lenta: mostra o guardado "atualizando" e depois troca', async () => {
    atual.mockResolvedValue(guardadoDe(RANKING));
    let liberar: () => void = () => undefined;
    const portao = new Promise<void>((resolver) => (liberar = resolver));
    servidor.use(
      http.get(ROTA, async () => {
        await portao;
        return HttpResponse.json(arquivo('publico-ranking-2026-10.json'));
      }),
    );
    const { result } = usar();
    await waitFor(() => expect(result.current).toMatchObject({ tipo: 'pronto', atualizando: true }));
    liberar();
    await waitFor(() => expect(result.current).toMatchObject({ tipo: 'pronto', atualizando: false }));
  });

  it('falha de rede com guardado: mostra o guardado com a hora em que foi gerado', async () => {
    atual.mockResolvedValue(guardadoDe(RANKING));
    servidor.use(http.get(ROTA, () => HttpResponse.error()));
    const { result } = usar();
    await waitFor(() => expect(result.current).toMatchObject({ tipo: 'pronto', semConexaoDesde: RANKING.geradoEm }), {
      timeout: 4000,
    });
    expect(guardarUltimo).not.toHaveBeenCalled();
  });

  it('503 com guardado: também sem conexão', async () => {
    atual.mockResolvedValue(guardadoDe(RANKING));
    servidor.use(http.get(ROTA, () => HttpResponse.json(arquivo('erro-interno.json'), { status: 503 })));
    const { result } = usar();
    await waitFor(() => expect(result.current).toMatchObject({ tipo: 'pronto', semConexaoDesde: RANKING.geradoEm }));
  });

  it('sem guardado e sem rede: erro', async () => {
    servidor.use(http.get(ROTA, () => HttpResponse.json(arquivo('erro-interno.json'), { status: 503 })));
    const { result } = usar();
    await waitFor(() => expect(result.current.tipo).toBe('erro'));
  });

  it('404: indisponível, sem gravar nem lembrar', async () => {
    servidor.use(http.get(ROTA, () => HttpResponse.json(arquivo('erro-nao-encontrado.json'), { status: 404 })));
    const { result } = usar();
    await waitFor(() => expect(result.current.tipo).toBe('indisponivel'));
    expect(guardarUltimo).not.toHaveBeenCalled();
    expect(lembrar).not.toHaveBeenCalled();
  });

  it('resposta do cache do service worker (cabeçalho) é tratada como sem conexão', async () => {
    servidor.use(
      http.get(ROTA, () =>
        HttpResponse.json(arquivo('publico-ranking-2026-10.json'), { headers: { 'X-Pelada-Cache': '1' } }),
      ),
    );
    const { result } = usar();
    await waitFor(() => expect(result.current).toMatchObject({ tipo: 'pronto', semConexaoDesde: RANKING.geradoEm }));
    expect(guardarUltimo).not.toHaveBeenCalled();
    expect(registrarAbertura).not.toHaveBeenCalled();
  });

  it('com ?mes=, não grava como ranking atual', async () => {
    servidor.use(http.get(ROTA, () => HttpResponse.json(arquivo('publico-ranking-2026-10.json'))));
    const { result } = usar('2026-10');
    await waitFor(() => expect(result.current.tipo).toBe('pronto'));
    expect(guardarAtual).not.toHaveBeenCalled();
  });

  it('guardado corrompido é ignorado', async () => {
    atual.mockResolvedValue({ geradoEm: 'x', dados: { qualquer: 'coisa' } });
    servidor.use(http.get(ROTA, () => HttpResponse.json(arquivo('erro-interno.json'), { status: 503 })));
    const { result } = usar();
    await waitFor(() => expect(result.current.tipo).toBe('erro'));
  });
});
