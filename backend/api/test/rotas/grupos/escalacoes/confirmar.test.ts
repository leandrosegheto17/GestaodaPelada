import { escalacaoConfirmada } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as escalacoes from '../../../../src/infraestrutura/db/repositorios/escalacoes.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { diaRelativo, HOJE_TESTE, relogioFixo } from '../../../apoio/relogio.js';

const D1 = diaRelativo(1);
const D2 = diaRelativo(8);
const D3 = `${HOJE_TESTE.slice(0, 4)}-02-30`;

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo(HOJE_TESTE, '12:00'), semCsrf, ...(cookie ? { cookie } : {}) });

async function cenario() {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const a = await criarJogador(db, cen.grupoA.id, cen.adminA.id);
  const b = await criarJogador(db, cen.grupoA.id, cen.adminA.id);
  return { db, cen, a, b, url: `/api/grupos/${cen.grupoA.id}/escalacoes` };
}

const varios = (data: string, jogadores: string[]) => ({
  formato: 'varios_times',
  data,
  n: 2,
  composicao: { times: [{ jogadores }] },
});

describe('POST /api/grupos/:g/escalacoes (workerd)', () => {
  it('201 e grava a escalação e o evento; confirmar de novo substitui; outra data cria outra', async () => {
    const { db, cen, a, b, url } = await cenario();
    const c = cliente(cen.adminA.cookie);
    const r = await c.post(url, varios(D1, [a]));
    expect(r.status).toBe(201);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(escalacaoConfirmada.parse(r.corpo).data).toBe(D1);

    await c.post(url, varios(D1, [a, b]));
    await c.post(url, varios(D2, [b]));
    const g = cen.grupoA.id;
    const lida = await escalacoes.porData(db, g, D1);
    expect(lida?.confirmadaPor).toBe(cen.adminA.id);
    expect(lida?.confirmadaEm).toEqual(new Date(relogioFixo(HOJE_TESTE, '12:00').agoraIso()));
    expect(JSON.stringify(lida?.composicao)).not.toMatch(/apelido|nivel/);
    expect(lida?.composicao).toEqual({ times: [{ jogadores: [a, b] }] });
    expect(await escalacoes.porData(db, g, D2)).not.toBeNull();
    const eventos = await kyselyDe(db).selectFrom('eventos_uso').select('tipo').where('grupo_id', '=', g).execute();
    expect(eventos).toHaveLength(3);
  });

  it('dois times com K "ilimitado"', async () => {
    const { cen, a, b, url } = await cenario();
    const r = await cliente(cen.adminA.cookie).post(url, {
      formato: 'dois_times',
      data: D1,
      n: 2,
      k: 'ilimitado',
      composicao: {
        times: [
          { titulares: [{ id: a, so1oTempo: false }], entramNo2oTempo: [] },
          { titulares: [{ id: b, so1oTempo: false }], entramNo2oTempo: [] },
        ],
        naoEntra: [],
      },
    });
    expect(r.status).toBe(201);
  });

  it.each([
    ['sem composição', { formato: 'varios_times', data: D1, n: 2 }],
    ['K em vários times', { ...varios(D1, []), k: 2 }],
    ['campo extra', { ...varios(D1, []), eDono: true }],
    ['grupoId no corpo', { ...varios(D1, []), grupoId: 'x' }],
    ['data inexistente', varios(D3, [])],
  ])('%s → 422', async (_, corpo) => {
    const { cen, url } = await cenario();
    expect((await cliente(cen.adminA.cookie).post(url, corpo)).status).toBe(422);
  });

  it('id repetido na composição → 422 em composicao e nada gravado', async () => {
    const { db, cen, a, url } = await cenario();
    const r = await cliente(cen.adminA.cookie).post(url, varios(D1, [a, a]));
    expect(r.status).toBe(422);
    expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['composicao']);
    expect(await escalacoes.porData(db, cen.grupoA.id, D1)).toBeNull();
  });

  it('jogador de outro grupo → 422 em composicao e nada gravado; a escalação de B não é tocada', async () => {
    const { db, cen, a, url } = await cenario();
    const doB = await criarJogador(db, cen.grupoB.id, cen.adminB.id);
    const r = await cliente(cen.adminA.cookie).post(url, varios(D1, [a, doB]));
    expect(r.status).toBe(422);
    expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['composicao']);
    expect(await escalacoes.porData(db, cen.grupoA.id, D1)).toBeNull();
    expect(await escalacoes.porData(db, cen.grupoB.id, D1)).toBeNull();
  });

  it('sem X-Pelada 403; sem sessão 401; admin de outro grupo 404', async () => {
    const { cen, a, url } = await cenario();
    const corpo = varios(D1, [a]);
    expect((await cliente(cen.adminA.cookie, true).post(url, corpo)).status).toBe(403);
    expect((await cliente().post(url, corpo)).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).post(url, corpo)).status).toBe(404);
  });
});
