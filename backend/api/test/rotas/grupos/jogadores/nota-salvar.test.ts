import { notaSalva } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import * as habilidades from '../../../../src/infraestrutura/db/repositorios/habilidades.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });

async function cenarioComNota() {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const jogador = await criarJogador(db, g, cen.adminA.id);
  const habilidade = await habilidades.criar(db, g, 'Chute');
  return { db, cen, g, jogador, habilidade, url: `/api/grupos/${g}/jogadores/${jogador}/notas/${habilidade}` };
}

describe('PUT /api/grupos/:g/jogadores/:id/notas/:habilidadeId (workerd)', () => {
  it('200 com a nota salva e o nível; o segundo PUT atualiza sem duplicar', async () => {
    const { db, cen, g, url } = await cenarioComNota();
    const r = await cliente(cen.adminA.cookie).put(url, { nota: 9 });
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(notaSalva.parse(r.corpo)).toMatchObject({ nota: 9, nivel: 9, semNota: false });
    await cliente(cen.adminA.cookie).put(url, { nota: 4 });
    expect(await habilidades.notasDoGrupo(db, g)).toHaveLength(1);
  });

  it.each([1, 10])('nota %i é aceita', async (nota) => {
    const { cen, url } = await cenarioComNota();
    expect((await cliente(cen.adminA.cookie).put(url, { nota })).status).toBe(200);
  });

  it.each([{ nota: 0 }, { nota: 11 }, { nota: 7.5 }, { nota: '7' }, {}, { nota: 5, extra: 1 }])(
    'corpo %j → 422',
    async (corpo) => {
      const { cen, url } = await cenarioComNota();
      expect((await cliente(cen.adminA.cookie).put(url, corpo)).status).toBe(422);
    },
  );

  it('{ nota: null } apaga a nota', async () => {
    const { db, cen, g, url } = await cenarioComNota();
    await cliente(cen.adminA.cookie).put(url, { nota: 8 });
    const r = await cliente(cen.adminA.cookie).put(url, { nota: null });
    expect(r.status).toBe(200);
    expect(notaSalva.parse(r.corpo)).toMatchObject({ nota: null, semNota: true });
    expect(await habilidades.notasDoGrupo(db, g)).toEqual([]);
  });

  it('uuid malformado e ids de B em A: 404', async () => {
    const { db, cen, g, jogador, habilidade } = await cenarioComNota();
    const doB = await habilidades.criar(db, cen.grupoB.id, 'Drible');
    const c = cliente(cen.adminA.cookie);
    expect((await c.put(`/api/grupos/${g}/jogadores/nao-e-uuid/notas/${habilidade}`, { nota: 5 })).status).toBe(404);
    expect((await c.put(`/api/grupos/${g}/jogadores/${jogador}/notas/nao-e-uuid`, { nota: 5 })).status).toBe(404);
    expect((await c.put(`/api/grupos/${g}/jogadores/${jogador}/notas/${doB}`, { nota: 5 })).status).toBe(404);
    expect(await habilidades.notasDoGrupo(db, cen.grupoB.id)).toEqual([]);
  });

  it('sem X-Pelada 403; sem sessão 401; admin de B em A 404', async () => {
    const { cen, url } = await cenarioComNota();
    expect((await cliente(cen.adminA.cookie, true).put(url, { nota: 5 })).status).toBe(403);
    expect((await cliente().put(url, { nota: 5 })).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).put(url, { nota: 5 })).status).toBe(404);
  });
});
