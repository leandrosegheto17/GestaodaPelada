import { avaliacaoSimulador } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });

async function cenario(quantos: number) {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const ids: string[] = [];
  for (let i = 0; i < quantos; i += 1) {
    ids.push(await criarJogador(db, cen.grupoA.id, cen.adminA.id, { apelido: `Jog${i}`, ano: 1980 + i }));
  }
  return { db, cen, ids, url: `/api/grupos/${cen.grupoA.id}/simulador/avaliar` };
}

const jt = (id: string, so1oTempo = false) => ({ id, so1oTempo });

function corpoDois(ids: string[], so1o: readonly string[] = []) {
  const [a, b, c, d, e, f, g, h] = ids as [string, string, string, string, string, string, string, string];
  return {
    formato: 'dois_times',
    data: '2026-10-22',
    n: 3,
    k: 'ilimitado',
    aptos: ids.map((id) => jt(id, so1o.includes(id))),
    composicao: {
      times: [
        { titulares: [a, b, c].map((id) => jt(id, so1o.includes(id))), entramNo2oTempo: [jt(g)] },
        { titulares: [d, e, f].map((id) => jt(id, so1o.includes(id))), entramNo2oTempo: [jt(h)] },
      ],
      naoEntra: [],
    },
  };
}

function corpoVarios(ids: string[], tamanhos: number[]) {
  let inicio = 0;
  const times = tamanhos.map((q) => {
    const jogadores = ids.slice(inicio, inicio + q);
    inicio += q;
    return { jogadores };
  });
  return {
    formato: 'varios_times',
    data: '2026-10-22',
    n: 4,
    aptos: ids.map((id) => ({ id })),
    composicao: { times },
  };
}

describe('POST /api/grupos/:g/simulador/avaliar (workerd)', () => {
  it('dois times: forma do contrato, sem ordem de prioridade, com pares e no-store', async () => {
    const { cen, ids, url } = await cenario(8);
    const r = await cliente(cen.adminA.cookie).post(url, corpoDois(ids));
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const avaliacao = avaliacaoSimulador.parse(r.corpo);
    expect(avaliacao).not.toHaveProperty('ordemPrioridade');
    if (avaliacao.formato !== 'dois_times') throw new Error('esperava dois times');
    expect(avaliacao.times.map((t) => t.trocas.length)).toEqual([1, 1]);
    expect(avaliacao.times.map((t) => t.indicadores.substituicoes)).toEqual([1, 1]);
  });

  it('"só 1º tempo" sem reserva suficiente gera o aviso e o titular sai no intervalo', async () => {
    const { cen, ids, url } = await cenario(8);
    const corpo = corpoDois(ids, [ids[0]!, ids[1]!]);
    const r = await cliente(cen.adminA.cookie).post(url, corpo);
    const avaliacao = avaliacaoSimulador.parse(r.corpo);
    expect(avaliacao.avisos.map((a) => a.tipo)).toContain('so_1o_tempo_sem_reserva');
    if (avaliacao.formato !== 'dois_times') throw new Error('esperava dois times');
    const saem = avaliacao.times[0].titulares.filter((t) => t.saiNoIntervalo).map((t) => t.id);
    expect(saem).toEqual(expect.arrayContaining([ids[0], ids[1]]));
  });

  it('vários times: dois incompletos geram o aviso de composição diferente', async () => {
    const { cen, ids, url } = await cenario(10);
    const r = await cliente(cen.adminA.cookie).post(url, corpoVarios(ids, [4, 3, 3]));
    expect(r.status).toBe(200);
    const avaliacao = avaliacaoSimulador.parse(r.corpo);
    expect(avaliacao.avisos.map((a) => a.tipo)).toContain('composicao_diferente');
    if (avaliacao.formato !== 'varios_times') throw new Error('esperava vários times');
    expect(avaliacao.times.map((t) => t.indicadores.jogadores)).toEqual([4, 3, 3]);
  });

  it('apto sem nota aparece no aviso e com semNota', async () => {
    const { cen, ids, url } = await cenario(10);
    const r = await cliente(cen.adminA.cookie).post(url, corpoVarios(ids, [4, 4, 2]));
    const avaliacao = avaliacaoSimulador.parse(r.corpo);
    expect(avaliacao.avisos.map((a) => a.tipo)).toContain('sem_nota');
    expect(JSON.stringify(avaliacao)).not.toMatch(/goleiro/i);
  });

  it('o mesmo corpo com os aptos em outra ordem dá a mesma resposta', async () => {
    const { cen, ids, url } = await cenario(10);
    const base = corpoVarios(ids, [4, 4, 2]);
    const a = await cliente(cen.adminA.cookie).post(url, base);
    const b = await cliente(cen.adminA.cookie).post(url, { ...base, aptos: [...base.aptos].reverse() });
    expect(b.corpo).toStrictEqual(a.corpo);
  });

  it('422: composição que não cobre todos os aptos, id repetido ou fora dos aptos, apto de outro grupo', async () => {
    const { db, cen, ids, url } = await cenario(10);
    const c = cliente(cen.adminA.cookie);
    const incompleta = corpoVarios(ids, [4, 4, 1]);
    const r1 = await c.post(url, incompleta);
    expect(r1.status).toBe(422);
    expect(Object.keys((r1.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['composicao']);

    const repetido = corpoVarios(ids, [4, 4, 2]);
    repetido.composicao.times[2]!.jogadores[0] = ids[0]!;
    expect((await c.post(url, repetido)).status).toBe(422);

    const fora = corpoVarios(ids, [4, 4, 2]);
    fora.composicao.times[2]!.jogadores[0] = '00000000-0000-4000-8000-0000000000ff';
    expect((await c.post(url, fora)).status).toBe(422);

    const doB = await criarJogador(db, cen.grupoB.id, cen.adminB.id);
    const alheio = corpoVarios([...ids.slice(0, 9), doB], [4, 4, 2]);
    const r4 = await c.post(url, alheio);
    expect(r4.status).toBe(422);
    expect(Object.keys((r4.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['aptos']);
  });

  it('sem X-Pelada 403; sem sessão 401; admin de outro grupo 404', async () => {
    const { cen, ids, url } = await cenario(10);
    const corpo = corpoVarios(ids, [4, 4, 2]);
    expect((await cliente(cen.adminA.cookie, true).post(url, corpo)).status).toBe(403);
    expect((await cliente().post(url, corpo)).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).post(url, corpo)).status).toBe(404);
  });
});
