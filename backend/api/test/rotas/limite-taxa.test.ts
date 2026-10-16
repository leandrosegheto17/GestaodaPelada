import { erroPadrao } from '@pelada/contrato';
import { describe, expect, it, vi } from 'vitest';
import type { Limitador } from '../../src/entrada/middlewares/limite-taxa.js';
import { montarCenario } from '../apoio/cenario-acesso.js';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

/** Limitador falso com contador por chave, como o binding de verdade (janela única, sem tempo). */
function limitadorDe(limite: number): Limitador & { chaves: string[] } {
  const contagem = new Map<string, number>();
  const chaves: string[] = [];
  return {
    chaves,
    limit: async ({ key }) => {
      chaves.push(key);
      const n = (contagem.get(key) ?? 0) + 1;
      contagem.set(key, n);
      return { success: n <= limite };
    },
  };
}

describe('limite de taxa por IP (workerd)', () => {
  it('login: a 11ª tentativa do mesmo IP dá 429 no formato padrão, sem abrir conexão', async () => {
    const limitador = limitadorDe(10);
    const cliente = clienteTeste({ relogio: relogioFixo('2026-10-22'), limitadores: { entrar: limitador } });
    const corpo = { email: 'ninguem@teste.invalid', senha: 'qualquer-123' };
    for (let i = 0; i < 10; i++) expect((await cliente.post('/api/sessao/entrar', corpo)).status).not.toBe(429);
    const r = await cliente.post('/api/sessao/entrar', corpo);
    expect(r.status).toBe(429);
    expect(erroPadrao.safeParse(r.corpo).success).toBe(true);
    expect(r.corpo).toMatchObject({ erro: { codigo: 'muitas_requisicoes' } });
    expect(r.texto).not.toContain('liberaEm');
  });

  it('público: 60 por IP; rotas do admin não passam pelo limitador público', async () => {
    const publico = limitadorDe(60);
    const cen = await montarCenario(await abrir(), fabrica);
    const cliente = clienteTeste({ relogio: relogioFixo('2026-10-22'), limitadores: { publico } });
    for (let i = 0; i < 60; i++) await cliente.get('/api/publico/nao-existe/ranking');
    expect((await cliente.get('/api/publico/nao-existe/ranking')).status).toBe(429);
    const admin = clienteTeste({
      relogio: relogioFixo('2026-10-22'),
      cookie: cen.adminA.cookie,
      limitadores: { publico },
    });
    expect((await admin.get(`/api/grupos/${cen.grupoA.id}`)).status).toBe(200);
  });

  it('o IP só é chave: sem cabeçalho usa chave fixa; nunca aparece na resposta nem no log', async () => {
    const limitador = limitadorDe(0);
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const cliente = clienteTeste({ relogio: relogioFixo('2026-10-22'), limitadores: { entrar: limitador } });
    const r = await cliente.post('/api/sessao/entrar', { email: 'a@b.com', senha: 'x' });
    expect(r.status).toBe(429);
    expect(limitador.chaves).toEqual(['sem-ip']);
    expect(JSON.stringify(espiao.mock.calls)).not.toContain('sem-ip');
    espiao.mockRestore();
  });

  it('falha do próprio limitador deixa passar e registra só "limitador indisponível"', async () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const quebrado: Limitador = {
      limit: async () => {
        throw new Error('segredo-interno');
      },
    };
    const cliente = clienteTeste({ relogio: relogioFixo('2026-10-22'), limitadores: { publico: quebrado } });
    expect((await cliente.get('/api/publico/nao-existe/ranking')).status).toBe(404);
    expect(JSON.stringify(espiao.mock.calls)).toContain('limitador indisponível');
    expect(JSON.stringify(espiao.mock.calls)).not.toContain('segredo-interno');
    espiao.mockRestore();
  });
});
