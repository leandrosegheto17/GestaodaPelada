import { sugestaoDois, sugestaoVarios } from '@pelada/contrato';
import { describe, expect, it, vi } from 'vitest';
import * as habilidades from '../../../src/infraestrutura/db/repositorios/habilidades.js';
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
const APELIDOS = [
  'Toninho',
  'Bigode',
  'Careca',
  'Juninho',
  'Marcão',
  'Paulinho',
  'Zé Carlos',
  'Dudu',
  'Gordo',
  'Tiago',
];

async function cenario(quantos = 10) {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const ids: string[] = [];
  for (const [i, apelido] of APELIDOS.slice(0, quantos).entries()) {
    ids.push(await criarJogador(db, g, cen.adminA.id, { apelido, ano: 1980 + i }));
  }
  const h = await habilidades.criar(db, g, 'Passe');
  for (const [i, id] of ids.slice(0, quantos - 1).entries()) await habilidades.gravarNota(db, g, id, h, 4 + (i % 6));
  return { db, cen, g, ids, url: `/api/grupos/${g}/simulador/sugerir` };
}

const dois = (ids: string[]) => ({
  formato: 'dois_times',
  data: '2026-10-22',
  n: 4,
  k: 'ilimitado',
  aptos: ids.map((id, i) => ({ id, so1oTempo: i === 3 })),
});
const varios = (ids: string[]) => ({
  formato: 'varios_times',
  data: '2026-10-22',
  n: 4,
  aptos: ids.map((id) => ({ id })),
});

describe('POST /api/grupos/:g/simulador/sugerir (workerd)', () => {
  it('dois times: 200 na forma do contrato, no-store, e determinístico com os aptos embaralhados', async () => {
    const { cen, ids, url } = await cenario();
    const c = cliente(cen.adminA.cookie);
    const a = await c.post(url, dois(ids));
    expect(a.status).toBe(200);
    expect(a.headers.get('Cache-Control')).toBe('no-store');
    const sugestao = sugestaoDois.parse(a.corpo);
    expect(sugestao.times[0].titulares).toHaveLength(4);
    const repetida = await c.post(url, dois(ids));
    expect(repetida.corpo).toStrictEqual(a.corpo);
  });

  it('vários times: 10 aptos e N=4 → 4, 4 e um incompleto de 2', async () => {
    const { cen, ids, url } = await cenario();
    const r = await cliente(cen.adminA.cookie).post(url, varios(ids));
    expect(r.status).toBe(200);
    const sugestao = sugestaoVarios.parse(r.corpo);
    expect(sugestao.times.map((t) => t.jogadores.length)).toEqual([4, 4, 2]);
    expect(sugestao.times[2]?.incompleto).toBe(true);
    const embaralhado = await cliente(cen.adminA.cookie).post(url, varios([...ids].reverse()));
    expect(embaralhado.corpo).toStrictEqual(r.corpo);
  });

  it('log estruturado sem id, apelido nem grupo', async () => {
    const { cen, g, ids, url } = await cenario();
    const espiao = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await cliente(cen.adminA.cookie).post(url, dois(ids));
      const linhas = espiao.mock.calls.map((chamada) => String(chamada[0]));
      const linha = linhas.find((l) => l.includes('simulador_sugerir'));
      expect(JSON.parse(linha ?? '{}')).toEqual({
        evento: 'simulador_sugerir',
        formato: 'dois_times',
        n: 4,
        k: 'ilimitado',
        aptos: 10,
      });
      expect(linha).not.toContain(g);
      for (const id of ids) expect(linha).not.toContain(id);
      for (const apelido of APELIDOS) expect(linha).not.toContain(apelido);
    } finally {
      espiao.mockRestore();
    }
  });

  it('aptos de outro grupo, inexistentes ou insuficientes → 422 em aptos', async () => {
    const { db, cen, ids, url } = await cenario();
    const doB = await criarJogador(db, cen.grupoB.id, cen.adminB.id);
    const c = cliente(cen.adminA.cookie);
    const alheio = await c.post(url, dois([...ids.slice(0, 9), doB]));
    expect(alheio.status).toBe(422);
    expect(Object.keys((alheio.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['aptos']);
    const inexistente = await c.post(url, dois([...ids.slice(0, 9), '00000000-0000-4000-8000-000000000000']));
    expect(inexistente.corpo).toEqual(alheio.corpo);
    const poucos = await c.post(url, dois(ids.slice(0, 7)));
    expect(poucos.status).toBe(422);
  });

  it('N 12 e 61 aptos → 422; sem X-Pelada 403; sem sessão 401; outro grupo 404', async () => {
    const { cen, ids, url } = await cenario();
    expect((await cliente(cen.adminA.cookie).post(url, { ...dois(ids), n: 12 })).status).toBe(422);
    const muitos = Array.from({ length: 61 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`);
    expect((await cliente(cen.adminA.cookie).post(url, dois(muitos))).status).toBe(422);
    expect((await cliente(cen.adminA.cookie, true).post(url, dois(ids))).status).toBe(403);
    expect((await cliente().post(url, dois(ids))).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).post(url, dois(ids))).status).toBe(404);
  });
});
