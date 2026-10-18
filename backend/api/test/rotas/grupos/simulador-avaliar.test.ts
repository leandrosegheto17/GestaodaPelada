import { avaliacaoSimulador, sugestaoDois, sugestaoVarios } from '@pelada/contrato';
import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import * as jogadoresRepo from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
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
  await pesos.criarPadrao(db, cen.grupoA.id, {
    pesos: PESOS_PADRAO,
    vigenteDesde: '2026-01-01',
    registradoPor: cen.adminA.id,
    agora: new Date('2026-10-16T12:00:00Z'),
  });
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

  it('404 para grupoId malformado', async () => {
    const { cen, ids } = await cenario(10);
    const r = await cliente(cen.adminA.cookie).post(
      '/api/grupos/nao-e-uuid/simulador/avaliar',
      corpoVarios(ids, [4, 4, 2]),
    );
    expect(r.status).toBe(404);
  });
});

describe('POST /api/grupos/:g/simulador/avaliar: casos do plano (workerd)', () => {
  it('dois times: a composição da própria sugestão devolve os mesmos indicadores e pares', async () => {
    const { cen, ids, url } = await cenario(10);
    const c = cliente(cen.adminA.cookie);
    const entrada = {
      formato: 'dois_times',
      data: '2026-10-22',
      n: 4,
      k: 'ilimitado',
      aptos: ids.map((id, i) => ({ id, so1oTempo: i === 3 })),
    };
    const sugerida = sugestaoDois.parse((await c.post(url.replace('avaliar', 'sugerir'), entrada)).corpo);
    const corpo = {
      ...entrada,
      composicao: {
        times: sugerida.times.map((t) => ({
          titulares: t.titulares.map((j) => ({ id: j.id, so1oTempo: j.so1oTempo })),
          entramNo2oTempo: t.entramNo2oTempo.map((j) => ({ id: j.id, so1oTempo: j.so1oTempo })),
        })),
        naoEntra: sugerida.naoEntra.map((j) => j.id),
      },
    };
    const r = await c.post(url, corpo);
    expect(r.status).toBe(200);
    const avaliada = avaliacaoSimulador.parse(r.corpo);
    if (avaliada.formato !== 'dois_times') throw new Error('esperava dois times');
    expect(avaliada.times.map((t) => t.indicadores)).toEqual(sugerida.times.map((t) => t.indicadores));
    expect(avaliada.times.map((t) => t.trocas)).toEqual(sugerida.times.map((t) => t.trocas));
    expect(avaliada.avisos).toEqual(sugerida.avisos);
  });

  it('vários times: a composição da própria sugestão devolve os mesmos indicadores', async () => {
    const { cen, ids, url } = await cenario(10);
    const c = cliente(cen.adminA.cookie);
    const entrada = corpoVarios(ids, [4, 4, 2]);
    const paraSugerir = { formato: entrada.formato, data: entrada.data, n: entrada.n, aptos: entrada.aptos };
    const sugerida = sugestaoVarios.parse((await c.post(url.replace('avaliar', 'sugerir'), paraSugerir)).corpo);
    const corpo = {
      ...entrada,
      composicao: { times: sugerida.times.map((t) => ({ jogadores: t.jogadores.map((j) => j.id) })) },
    };
    const avaliada = avaliacaoSimulador.parse((await c.post(url, corpo)).corpo);
    if (avaliada.formato !== 'varios_times') throw new Error('esperava vários times');
    expect(avaliada.times.map((t) => t.indicadores)).toEqual(sugerida.times.map((t) => t.indicadores));
    expect(avaliada.avisos).toEqual(sugerida.avisos);
  });

  it('trocar um titular entre os times muda os indicadores e mantém o resto', async () => {
    const { cen, ids, url } = await cenario(8);
    const c = cliente(cen.adminA.cookie);
    const base = corpoDois(ids);
    // Troca o primeiro titular do time 1 com o primeiro do time 2 (posições 0 e 3 dos ids).
    const trocado = corpoDois([ids[3]!, ids[1]!, ids[2]!, ids[0]!, ...ids.slice(4)]);
    const antes = avaliacaoSimulador.parse((await c.post(url, base)).corpo);
    const depois = avaliacaoSimulador.parse((await c.post(url, trocado)).corpo);
    if (antes.formato !== 'dois_times' || depois.formato !== 'dois_times') throw new Error('esperava dois times');
    expect(depois.times.map((t) => t.indicadores)).not.toEqual(antes.times.map((t) => t.indicadores));
    expect(depois.times.map((t) => t.titulares.length)).toEqual(antes.times.map((t) => t.titulares.length));
    expect(depois.avisos).toEqual(antes.avisos);
    expect(depois.n).toBe(antes.n);
  });

  it('aviso (d): incompleto menor que N/2 gera incompleto_pequeno; incompleto de metade não gera', async () => {
    const { cen, ids, url } = await cenario(10);
    const c = cliente(cen.adminA.cookie);
    const pequeno = avaliacaoSimulador.parse((await c.post(url, corpoVarios(ids.slice(0, 9), [4, 4, 1]))).corpo);
    expect(pequeno.avisos.map((a) => a.tipo)).toContain('incompleto_pequeno');
    const meio = avaliacaoSimulador.parse((await c.post(url, corpoVarios(ids, [4, 4, 2]))).corpo);
    expect(meio.avisos.map((a) => a.tipo)).not.toContain('incompleto_pequeno');
  });

  it('apto inativo na data: 422 em aptos, sem revelar o id', async () => {
    const { db, cen, ids, url } = await cenario(10);
    await jogadoresRepo.inativar(db, cen.grupoA.id, ids[9]!, '2026-10-20');
    const r = await cliente(cen.adminA.cookie).post(url, corpoVarios(ids, [4, 4, 2]));
    expect(r.status).toBe(422);
    const { erro } = r.corpo as { erro: { campos: Record<string, string> } };
    expect(Object.keys(erro.campos)).toEqual(['aptos']);
    expect(JSON.stringify(r.corpo)).not.toContain(ids[9]!);
  });

  it('422 no contrato: 3 times no formato dois, N 12, 61 aptos e campo extra', async () => {
    const { cen, ids, url } = await cenario(8);
    const c = cliente(cen.adminA.cookie);
    const base = corpoDois(ids);
    const tres = {
      ...base,
      composicao: { ...base.composicao, times: [...base.composicao.times, base.composicao.times[0]] },
    };
    expect((await c.post(url, tres)).status).toBe(422);
    expect((await c.post(url, { ...base, n: 12 })).status).toBe(422);
    const muitos = Array.from({ length: 61 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    const r61 = await c.post(url, { ...corpoVarios(ids, [4, 4]), aptos: muitos.map((id) => ({ id })) });
    expect(r61.status).toBe(422);
    expect((await c.post(url, { ...base, extra: 1 })).status).toBe(422);
  });
});
